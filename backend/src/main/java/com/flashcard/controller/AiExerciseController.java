package com.flashcard.controller;

import com.flashcard.model.User;
import com.flashcard.model.Vocabulary;
import com.flashcard.repository.VocabularyRepository;
import com.flashcard.service.DeepSeekEnrichmentService;
import com.flashcard.service.SrsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AiExerciseController – Handles AI-powered translation exercises.
 *
 * POST /api/ai/exercise/generate  – Generate a Japanese sentence using given vocab IDs.
 * POST /api/ai/exercise/grade     – Grade user's translation and update SRS automatically.
 */
@RestController
@RequestMapping("/api/ai/exercise")
public class AiExerciseController {

    private final DeepSeekEnrichmentService deepSeekService;
    private final VocabularyRepository vocabularyRepository;
    private final SrsService srsService;

    public AiExerciseController(DeepSeekEnrichmentService deepSeekService,
                                VocabularyRepository vocabularyRepository,
                                SrsService srsService) {
        this.deepSeekService = deepSeekService;
        this.vocabularyRepository = vocabularyRepository;
        this.srsService = srsService;
    }

    /**
     * Generate a translation exercise (Japanese sentence) from a list of vocabulary IDs.
     *
     * Request body: { "vocabularyIds": [1, 2, 3] }
     * Response:     { "sentence": "...", "hint": "..." }
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generate(@AuthenticationPrincipal User user,
                                      @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("vocabularyIds");
        if (rawIds == null || rawIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "vocabularyIds is required"));
        }

        List<Long> ids = rawIds.stream().map(Integer::longValue).collect(Collectors.toList());
        List<Vocabulary> vocabs = vocabularyRepository.findAllById(ids);

        if (vocabs.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No vocabulary found for given IDs"));
        }

        try {
            Map<String, String> exercise = deepSeekService.generateTranslationExercise(vocabs);
            return ResponseEntity.ok(exercise);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "AI generation failed: " + e.getMessage()));
        }
    }

    /**
     * Grade a user's Vietnamese translation and auto-update SRS ratings.
     *
     * Request body: { "sentence": "...", "userTranslation": "...", "vocabularyIds": [1, 2, 3] }
     * Response:     { "score": 8, "feedback": "...", "correctTranslation": "..." }
     */
    @PostMapping("/grade")
    public ResponseEntity<?> grade(@AuthenticationPrincipal User user,
                                   @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String sentence = (String) body.get("sentence");
        String userTranslation = (String) body.get("userTranslation");

        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("vocabularyIds");

        if (sentence == null || userTranslation == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "sentence and userTranslation are required"));
        }

        try {
            Map<String, Object> result = deepSeekService.gradeTranslation(sentence, userTranslation);

            // Map AI score (0-10) to FSRS quality (1-4) and auto-update SRS for each vocabulary
            if (rawIds != null && !rawIds.isEmpty()) {
                int score = (int) result.get("score");
                int quality = scoreToQuality(score);

                List<Long> ids = rawIds.stream().map(Integer::longValue).collect(Collectors.toList());
                for (Long vocabId : ids) {
                    try {
                        srsService.reviewWord(user, vocabId, quality);
                    } catch (Exception ex) {
                        // Silently skip individual failures — don't block grading response
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
     * Maps AI score (0-10) to FSRS quality rating (1-4).
     * - 8-10 → Easy (4)
     * - 6-7  → Good (3)
     * - 4-5  → Hard (2)
     * - 0-3  → Forgot (1)
     */
    private int scoreToQuality(int score) {
        if (score >= 8) return 4;
        if (score >= 6) return 3;
        if (score >= 4) return 2;
        return 1;
    }
}
