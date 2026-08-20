package com.flashcard.vocabulary.controller;

import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.service.VocabularyService;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.flashcard.knowledge.service.AiEnrichmentQueueService;

@RestController
@RequestMapping("/api/vocab")
public class VocabularyController {

    private static final Logger log = LoggerFactory.getLogger(VocabularyController.class);

    private final VocabularyService service;
    private final DeepSeekEnrichmentService enrichmentService;
    private final AiEnrichmentQueueService queueService;

    public VocabularyController(VocabularyService service, DeepSeekEnrichmentService enrichmentService, AiEnrichmentQueueService queueService) {
        this.service = service;
        this.enrichmentService = enrichmentService;
        this.queueService = queueService;
    }

    /**
     * Get all vocabulary with pagination
     * GET /api/vocab?page=0&size=20
     */
    @GetMapping
    public ResponseEntity<Page<Vocabulary>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getAll(PageRequest.of(page, size)));
    }

    /**
     * Get vocabulary by JLPT level
     * GET /api/vocab/level/N5?page=0&size=20
     */
    @GetMapping("/level/{level}")
    public ResponseEntity<Page<Vocabulary>> getByLevel(
            @PathVariable String level,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        if ("ALL".equalsIgnoreCase(level)) {
            return ResponseEntity.ok(service.getAll(PageRequest.of(page, size)));
        }
        return ResponseEntity.ok(service.getByLevel(level, PageRequest.of(page, size)));
    }

    /**
     * Get all vocabulary for a level (no pagination - for flashcard mode)
     * GET /api/vocab/level/N5/all
     */
    @GetMapping("/level/{level}/all")
    public ResponseEntity<List<Vocabulary>> getAllByLevel(@PathVariable String level) {
        return ResponseEntity.ok(service.getByLevel(level));
    }

    /**
     * Get random vocabulary for flashcard practice
     * GET /api/vocab/random?level=N5&count=20
     */
    @GetMapping("/random")
    public ResponseEntity<List<Vocabulary>> getRandom(
            @RequestParam(required = false) String level,
            @RequestParam(defaultValue = "20") int count) {
        if (level != null && !level.isEmpty() && !"ALL".equalsIgnoreCase(level)) {
            return ResponseEntity.ok(service.getRandomByLevel(level, count));
        }
        return ResponseEntity.ok(service.getRandom(count));
    }

    /**
     * Search vocabulary
     * GET /api/vocab/search?q=keyword&page=0&size=20
     */
    @GetMapping("/search")
    public ResponseEntity<Page<Vocabulary>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(q, PageRequest.of(page, size)));
    }

    /**
     * Get statistics
     * GET /api/vocab/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(service.getStats());
    }

    /**
     * Create new vocabulary word
     * POST /api/vocab
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Vocabulary vocabulary) {
        if ((vocabulary.getKanji() == null || vocabulary.getKanji().isBlank()) && 
            (vocabulary.getHiragana() == null || vocabulary.getHiragana().isBlank())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Kanji or Hiragana is required"));
        }
        return ResponseEntity.ok(service.save(vocabulary));
    }

    /**
     * Update vocabulary word
     * PUT /api/vocab/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Vocabulary vocabulary) {
        return service.getById(id).map(existing -> {
            existing.setKanji(vocabulary.getKanji());
            existing.setHiragana(vocabulary.getHiragana());
            existing.setRomaji(vocabulary.getRomaji());
            existing.setHanViet(vocabulary.getHanViet());
            existing.setMeaning(vocabulary.getMeaning());
            existing.setWordType(vocabulary.getWordType());
            existing.setLevel(vocabulary.getLevel());
            existing.setCategory(vocabulary.getCategory());
            existing.setKanjiWords(vocabulary.getKanjiWords());
            existing.setSampleSentence(vocabulary.getSampleSentence());
            existing.setSampleTranslation(vocabulary.getSampleTranslation());
            existing.setSampleReading(vocabulary.getSampleReading());
            existing.setPitchAccent(vocabulary.getPitchAccent());
            existing.setSynonyms(vocabulary.getSynonyms());
            existing.setAntonyms(vocabulary.getAntonyms());
            existing.setCommonMistakes(vocabulary.getCommonMistakes());
            existing.setCollocations(vocabulary.getCollocations());
            existing.setMnemonic(vocabulary.getMnemonic());
            existing.setConversationExamples(vocabulary.getConversationExamples());
            existing.setExampleSentences(vocabulary.getExampleSentences());
            existing.setUsageGuide(vocabulary.getUsageGuide());
            existing.setOnReading(vocabulary.getOnReading());
            existing.setKunReading(vocabulary.getKunReading());
            return ResponseEntity.ok(service.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get vocabulary by ID
     * GET /api/vocab/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Vocabulary> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(vocab -> {
                    boolean isMissingFields = (vocab.getUsageGuide() == null || vocab.getUsageGuide().isBlank())
                        || (vocab.getMnemonic() == null || vocab.getMnemonic().isBlank())
                        || (vocab.getExampleSentences() == null || vocab.getExampleSentences().isBlank());
                    
                    if (isMissingFields && queueService != null) {
                        log.info("Vocabulary ID {} is missing fields. Enqueueing Virtual Thread AI task...", id);
                        queueService.enqueueVocabulary(id, false);
                    }
                    if (queueService != null) {
                        vocab.setIsEnriching(queueService.isEnriching(AiEnrichmentQueueService.TaskType.VOCABULARY, id));
                    }
                    return ResponseEntity.ok(vocab);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete vocabulary word
     * DELETE /api/vocab/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return service.getById(id).map(existing -> {
            service.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Vocabulary deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Enrich vocabulary word (Kanji-words and sample sentence using DeepSeek)
     * Enqueues task into Virtual Thread Pool Queue.
     * POST /api/vocab/{id}/enrich
     */
    @PostMapping("/{id}/enrich")
    public ResponseEntity<?> enrich(@PathVariable Long id, @RequestParam(name = "force", defaultValue = "false") boolean force) {
        var existingOpt = service.getById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Vocabulary existing = existingOpt.get();
        boolean fullyEnriched = (existing.getUsageGuide() != null && !existing.getUsageGuide().isBlank())
            && (existing.getMnemonic() != null && !existing.getMnemonic().isBlank())
            && (existing.getExampleSentences() != null && !existing.getExampleSentences().isBlank())
            && (existing.getCollocations() != null && !existing.getCollocations().isBlank())
            && (existing.getConversationExamples() != null && !existing.getConversationExamples().isBlank())
            && (existing.getHanViet() != null && !existing.getHanViet().isBlank());
        
        if (fullyEnriched && !force) {
            if (queueService != null) {
                existing.setIsEnriching(queueService.isEnriching(AiEnrichmentQueueService.TaskType.VOCABULARY, id));
            }
            return ResponseEntity.ok(existing);
        }
        
        if (queueService != null) {
            AiEnrichmentQueueService.EnrichTask task = queueService.enqueueVocabulary(id, force);
            if (task != null) {
                try {
                    Object result = task.getCompletionFuture().get(25, java.util.concurrent.TimeUnit.SECONDS);
                    if (result instanceof Vocabulary v) {
                        v.setIsEnriching(false);
                        return ResponseEntity.ok(v);
                    }
                } catch (Exception e) {
                    log.error("Virtual Thread enrichment timed out or failed for vocab ID {}: {}", id, e.getMessage());
                }
            }
            existing.setIsEnriching(queueService.isEnriching(AiEnrichmentQueueService.TaskType.VOCABULARY, id));
        }
        
        // Return existing immediately so client renders fast
        return ResponseEntity.ok(existing);
    }

    /**
     * Trigger sequential batch enrichment for a level in the background
     * POST /api/vocab/enrich/level/{level}
     */
    @PostMapping("/enrich/level/{level}")
    public ResponseEntity<?> enrichLevel(@PathVariable String level) {
        CompletableFuture.runAsync(() -> {
            String targetLevel = level.toUpperCase();
            log.info("Starting background batch enrichment for level {}", targetLevel);
            List<Vocabulary> list = service.getByLevel(targetLevel);
            
            // Filter only unenriched words
            List<Vocabulary> toEnrich = list.stream()
                    .filter(v -> v.getSampleSentence() == null || v.getSampleSentence().isBlank())
                    .collect(java.util.stream.Collectors.toList());
            
            log.info("Found {} unenriched words in level {}", toEnrich.size(), targetLevel);
            
            for (Vocabulary vocab : toEnrich) {
                try {
                    // Enrich word asynchronously and block this background runner thread to wait for it (sequential processing)
                    enrichmentService.enrichVocabulary(vocab).get();
                    
                    // Add 1.5s delay between requests to prevent hitting DeepSeek rate limit/being blocked
                    Thread.sleep(1500);
                } catch (Exception e) {
                    log.error("Error during sequential enrichment of vocab ID: {}: {}", vocab.getId(), e.getMessage());
                }
            }
            log.info("Finished background batch enrichment for level {}", targetLevel);
        });
        
        return ResponseEntity.ok(Map.of("message", "Tiến trình làm giàu từ vựng cho cấp độ " + level.toUpperCase() + " đã được khởi chạy trong nền!"));
    }
}

