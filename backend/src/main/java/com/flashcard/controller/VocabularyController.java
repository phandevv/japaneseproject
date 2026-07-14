package com.flashcard.controller;

import com.flashcard.model.Vocabulary;
import com.flashcard.service.VocabularyService;
import com.flashcard.service.DeepSeekEnrichmentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/vocab")
public class VocabularyController {

    private static final Logger log = LoggerFactory.getLogger(VocabularyController.class);

    private final VocabularyService service;
    private final DeepSeekEnrichmentService enrichmentService;

    public VocabularyController(VocabularyService service, DeepSeekEnrichmentService enrichmentService) {
        this.service = service;
        this.enrichmentService = enrichmentService;
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
        if (level != null && !level.isEmpty()) {
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
            existing.setHanViet(vocabulary.getHanViet());
            existing.setMeaning(vocabulary.getMeaning());
            existing.setWordType(vocabulary.getWordType());
            existing.setLevel(vocabulary.getLevel());
            existing.setCategory(vocabulary.getCategory());
            return ResponseEntity.ok(service.save(existing));
        }).orElse(ResponseEntity.notFound().build());
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
     * POST /api/vocab/{id}/enrich
     */
    @PostMapping("/{id}/enrich")
    public CompletableFuture<ResponseEntity<?>> enrich(@PathVariable Long id) {
        var existingOpt = service.getById(id);
        if (existingOpt.isEmpty()) {
            return CompletableFuture.completedFuture(ResponseEntity.notFound().build());
        }
        Vocabulary existing = existingOpt.get();
        if (existing.getSampleSentence() != null && !existing.getSampleSentence().isBlank()) {
            return CompletableFuture.completedFuture(ResponseEntity.ok(existing));
        }
        return enrichmentService.enrichVocabulary(existing)
                .thenApply(ResponseEntity::ok);
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
