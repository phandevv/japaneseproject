package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.model.Feedback;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import com.flashcard.srs.service.SrsService;
import com.flashcard.srs.repository.WordReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * AiExerciseController – Handles AI-powered translation exercises.
 *
 * POST /api/ai/exercise/batch-generate  – Generates N exercises IN PARALLEL (prefetch all at once).
 * POST /api/ai/exercise/grade           – Grades ONE sentence immediately, updates SRS.
 */
@RestController
@RequestMapping("/api/ai/exercise")
public class AiExerciseController {

    private static final Logger log = LoggerFactory.getLogger(AiExerciseController.class);

    private final DeepSeekEnrichmentService deepSeekService;
    private final VocabularyRepository vocabularyRepository;
    private final WordReviewRepository wordReviewRepository;
    private final SrsService srsService;

    public AiExerciseController(DeepSeekEnrichmentService deepSeekService,
                                VocabularyRepository vocabularyRepository,
                                WordReviewRepository wordReviewRepository,
                                SrsService srsService) {
        this.deepSeekService = deepSeekService;
        this.vocabularyRepository = vocabularyRepository;
        this.wordReviewRepository = wordReviewRepository;
        this.srsService = srsService;
    }

    // ──────────────────────────────────────────────────────────────────────
    // LEGACY: Single generate (kept for backward compat)
    // ──────────────────────────────────────────────────────────────────────

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@AuthenticationPrincipal User user,
                                      @RequestBody Map<String, Object> body) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("vocabularyIds");
        if (rawIds == null || rawIds.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "vocabularyIds is required"));

        List<Long> ids = rawIds.stream().map(Integer::longValue).collect(Collectors.toList());
        List<Vocabulary> vocabs = vocabularyRepository.findAllById(ids);
        if (vocabs.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "No vocabulary found"));

        try {
            List<Vocabulary> fallbackLearned = wordReviewRepository.findLearnedVocabulariesByUser(user, PageRequest.of(0, 50));
            return ResponseEntity.ok(deepSeekService.generateTranslationExercise(vocabs, vocabs, fallbackLearned));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // NEW: Batch parallel generate (prefetch architecture)
    // ──────────────────────────────────────────────────────────────────────

    @PostMapping("/batch-generate")
    public ResponseEntity<?> batchGenerate(@AuthenticationPrincipal User user,
                                           @RequestBody Map<String, Object> body) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("vocabularyIds");
        int count = body.containsKey("count") ? (int) body.get("count") : 3;

        if (rawIds == null || rawIds.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "vocabularyIds is required"));

        List<Long> ids = rawIds.stream().map(Integer::longValue).collect(Collectors.toList());
        List<Vocabulary> allVocabs = vocabularyRepository.findAllById(ids);
        if (allVocabs.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "No vocabulary found"));

        // Primary context: exact session words & grammar of this review session
        List<Vocabulary> sessionVocabs = allVocabs;

        // Secondary fallback context: previously learned words/grammar if needed
        List<Vocabulary> fallbackLearned = wordReviewRepository.findLearnedVocabulariesByUser(user, PageRequest.of(0, 50));

        // Shuffle and chunk the vocab list into `count` groups
        List<Vocabulary> shuffled = new ArrayList<>(allVocabs);
        Collections.shuffle(shuffled);
        int groupSize = Math.max(1, Math.min(3, shuffled.size())); // 1-3 words per exercise

        // Launch all N generation tasks in parallel
        List<CompletableFuture<Map<String, Object>>> futures = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            final int idx = i;
            // Pick a slice of shuffled vocab for this exercise
            int start = (idx * groupSize) % shuffled.size();
            int end = Math.min(start + groupSize, shuffled.size());
            List<Vocabulary> subset = shuffled.subList(start, end);
            List<Long> subsetIds = subset.stream().map(Vocabulary::getId).collect(Collectors.toList());

            CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> {
                try {
                    Map<String, String> exercise = deepSeekService.generateTranslationExercise(subset, sessionVocabs, fallbackLearned);
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("index", idx);
                    result.put("sentence", exercise.get("sentence"));
                    result.put("hint", exercise.getOrDefault("hint", ""));
                    result.put("vocabularyIds", subsetIds);
                    return result;
                } catch (Exception e) {
                    log.error("Failed to generate exercise {}: {}", idx, e.getMessage());
                    return Map.of(
                        "index", idx,
                        "sentence", "今日は良い天気ですね。",
                        "hint", "Gợi ý: thời tiết hôm nay",
                        "vocabularyIds", subsetIds,
                        "error", e.getMessage()
                    );
                }
            });
            futures.add(future);
        }

        // Wait for all parallel tasks and collect results in order
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            List<Map<String, Object>> results = futures.stream()
                    .map(CompletableFuture::join)
                    .sorted(Comparator.comparingInt(m -> (int) m.get("index")))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Batch generation failed: " + e.getMessage()));
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Grade: Per-sentence, called immediately after each submit
    // ──────────────────────────────────────────────────────────────────────

    /**
     * POST /api/ai/exercise/grade
     *
     * Grades ONE sentence immediately. Should be called as soon as user submits each answer
     * (not waiting for all exercises to be done). This keeps context small and responses fast.
     *
     * Request:  { "sentence": "...", "userTranslation": "...", "vocabularyIds": [1, 2] }
     * Response: { "score": 8, "feedback": "...", "correctTranslation": "..." }
     */
    @PostMapping("/grade")
    public ResponseEntity<?> grade(@AuthenticationPrincipal User user,
                                   @RequestBody Map<String, Object> body) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String sentence = (String) body.get("sentence");
        String userTranslation = (String) body.get("userTranslation");

        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("vocabularyIds");

        if (sentence == null || userTranslation == null)
            return ResponseEntity.badRequest().body(Map.of("error", "sentence and userTranslation are required"));

        try {
            // Grade this ONE sentence (small context → fast + accurate)
            Map<String, Object> result = deepSeekService.gradeTranslation(sentence, userTranslation);

            // Immediately update SRS for involved vocabulary words
            if (rawIds != null && !rawIds.isEmpty()) {
                int score = (int) result.get("score");
                int quality = scoreToQuality(score);
                for (Integer rawId : rawIds) {
                    try {
                        srsService.reviewWord(user, rawId.longValue(), quality);
                    } catch (Exception ex) {
                        log.warn("SRS update failed for vocab {}: {}", rawId, ex.getMessage());
                    }
                }
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "AI grading failed: " + e.getMessage()));
        }
    }

    /**
     * Maps AI score (0-10) → FSRS quality (1-4).
     * 8-10 → Easy(4), 6-7 → Good(3), 4-5 → Hard(2), 0-3 → Forgot(1)
     */
    private int scoreToQuality(int score) {
        if (score >= 8) return 4;
        if (score >= 6) return 3;
        if (score >= 4) return 2;
        return 1;
    }
}

