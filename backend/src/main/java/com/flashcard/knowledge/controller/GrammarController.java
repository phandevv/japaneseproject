package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.provider.KnowledgeDataProvider;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import com.flashcard.knowledge.service.JlptN3CourseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/grammar")
public class GrammarController {

    private static final Logger log = LoggerFactory.getLogger(GrammarController.class);

    private final KnowledgeDataProvider knowledgeDataProvider;
    private final DeepSeekEnrichmentService enrichmentService;

    private final JlptN3CourseService courseService;

    @Autowired
    public GrammarController(KnowledgeDataProvider knowledgeDataProvider,
                             DeepSeekEnrichmentService enrichmentService,
                             @Autowired(required = false) JlptN3CourseService courseService) {
        this.knowledgeDataProvider = knowledgeDataProvider;
        this.enrichmentService = enrichmentService;
        this.courseService = courseService;
    }

    /**
     * Get paginated grammar cards with filtering by JLPT, Week, Day, and search query
     * GET /api/grammar?jlpt=N3&week=Tuần 1&day=Ngày 1&query=Vれる&page=0&size=20
     */
    @GetMapping
    public ResponseEntity<?> getGrammarCards(
            @RequestParam(name = "jlpt", defaultValue = "N3") String jlpt,
            @RequestParam(name = "week", required = false) String week,
            @RequestParam(name = "day", required = false) String day,
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
        Page<GrammarCard> resultPage = knowledgeDataProvider.searchGrammarCards(jlpt, week, day, query, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("content", resultPage.getContent());
        response.put("currentPage", resultPage.getNumber());
        response.put("totalItems", resultPage.getTotalElements());
        response.put("totalPages", resultPage.getTotalPages());

        return ResponseEntity.ok(response);
    }

    /**
     * Get navigation structure (list of Weeks and their Days)
     * GET /api/grammar/navigation?jlpt=N3
     */
    @GetMapping("/navigation")
    @org.springframework.cache.annotation.Cacheable(value = "grammar-navigation", key = "(#jlpt != null ? #jlpt : 'N3')")
    public ResponseEntity<?> getNavigation(@RequestParam(name = "jlpt", defaultValue = "N3") String jlpt) {
        return ResponseEntity.ok(knowledgeDataProvider.getGrammarNavigation(jlpt));
    }

    /**
     * Get single GrammarCard details by ID
     * GET /api/grammar/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getGrammarDetail(@PathVariable(name = "id") Long id) {
        return knowledgeDataProvider.findGrammarById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update single GrammarCard details
     * PUT /api/grammar/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateGrammar(@PathVariable(name = "id") Long id, @RequestBody GrammarCard body) {
        return knowledgeDataProvider.findGrammarById(id).map(existing -> {
            if (body.getGrammar() != null) existing.setGrammar(body.getGrammar());
            if (body.getMeaning() != null) existing.setMeaning(body.getMeaning());
            if (body.getUsageDesc() != null) existing.setUsageDesc(body.getUsageDesc());
            if (body.getUsageGuide() != null) existing.setUsageGuide(body.getUsageGuide());
            if (body.getFormation() != null) existing.setFormation(body.getFormation());
            if (body.getJlpt() != null) existing.setJlpt(body.getJlpt());
            if (body.getSimilarGrammar() != null) existing.setSimilarGrammar(body.getSimilarGrammar());
            if (body.getDifference() != null) existing.setDifference(body.getDifference());
            if (body.getCommonMistakes() != null) existing.setCommonMistakes(body.getCommonMistakes());
            if (body.getExamples() != null) existing.setExamples(body.getExamples());
            if (body.getLessonTitle() != null) existing.setLessonTitle(body.getLessonTitle());
            
            GrammarCard saved = knowledgeDataProvider.saveGrammar(existing);
            if (courseService != null) {
                courseService.clearLessonCache();
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Enrich a specific section/field of a grammar card using DeepSeek AI.
     * POST /api/grammar/{id}/enrich-section?section={section}
     */
    @PostMapping("/{id}/enrich-section")
    public ResponseEntity<?> enrichGrammarSection(@PathVariable(name = "id") Long id, @RequestParam(name = "section") String section) {
        java.util.Optional<GrammarCard> existingOpt = knowledgeDataProvider.findGrammarById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        GrammarCard existing = existingOpt.get();

        if (enrichmentService == null) {
            return ResponseEntity.ok(existing);
        }

        try {
            GrammarCard updated = enrichmentService.enrichGrammarSection(existing, section).get(20, java.util.concurrent.TimeUnit.SECONDS);
            if (courseService != null) {
                courseService.clearLessonCache();
            }
            return ResponseEntity.ok(updated != null ? updated : existing);
        } catch (Exception e) {
            log.error("Failed to enrich section {} for grammar ID {}: {}", section, id, e.getMessage());
            return ResponseEntity.ok(existing);
        }
    }

    /**
     * Trigger DeepSeek AI enrichment for a specific GrammarCard by ID.
     * POST /api/grammar/{id}/enrich?force=false
     */
    @PostMapping("/{id}/enrich")
    public ResponseEntity<?> enrichGrammar(@PathVariable(name = "id") Long id, @RequestParam(name = "force", defaultValue = "false") boolean force) {
        java.util.Optional<GrammarCard> existingOpt = knowledgeDataProvider.findGrammarById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        GrammarCard existing = existingOpt.get();

        boolean fullyEnriched = (existing.getUsageGuide() != null && !existing.getUsageGuide().isBlank())
            && (existing.getFormation() != null && !existing.getFormation().isBlank())
            && (existing.getExamples() != null && !existing.getExamples().isBlank());

        if (fullyEnriched && !force) {
            return ResponseEntity.ok(existing);
        }

        try {
            GrammarCard updated = enrichmentService.enrichGrammarCard(existing).get(25, java.util.concurrent.TimeUnit.SECONDS);
            if (courseService != null) {
                courseService.clearLessonCache();
            }
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Force grammar enrichment failed for grammar ID {}: {}", id, e.getMessage());
            return ResponseEntity.ok(existing);
        }
    }
}
