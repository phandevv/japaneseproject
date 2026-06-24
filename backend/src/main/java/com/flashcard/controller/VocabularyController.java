package com.flashcard.controller;

import com.flashcard.model.Vocabulary;
import com.flashcard.service.VocabularyService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vocab")
@CrossOrigin(origins = "*")
public class VocabularyController {

    private final VocabularyService service;

    public VocabularyController(VocabularyService service) {
        this.service = service;
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
}
