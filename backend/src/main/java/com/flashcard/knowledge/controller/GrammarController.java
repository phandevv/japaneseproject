package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/grammar")
public class GrammarController {

    private static final Logger log = LoggerFactory.getLogger(GrammarController.class);

    private final GrammarCardRepository grammarCardRepository;
    private final DeepSeekEnrichmentService enrichmentService;

    @Autowired
    public GrammarController(GrammarCardRepository grammarCardRepository,
                             DeepSeekEnrichmentService enrichmentService) {
        this.grammarCardRepository = grammarCardRepository;
        this.enrichmentService = enrichmentService;
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
        Page<GrammarCard> resultPage = grammarCardRepository.searchGrammarCards(jlpt, week, day, query, pageable);

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
    public ResponseEntity<?> getNavigation(@RequestParam(name = "jlpt", defaultValue = "N3") String jlpt) {
        List<String> weeks = grammarCardRepository.findDistinctWeeksByJlpt(jlpt);
        List<Map<String, Object>> navList = new ArrayList<>();

        for (String week : weeks) {
            List<String> days = grammarCardRepository.findDistinctDaysByJlptAndWeek(jlpt, week);
            Map<String, Object> weekObj = new HashMap<>();
            weekObj.put("week", week);
            weekObj.put("days", days);
            navList.add(weekObj);
        }

        return ResponseEntity.ok(navList);
    }

    /**
     * Get single GrammarCard details by ID
     * GET /api/grammar/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getGrammarDetail(@PathVariable(name = "id") Long id) {
        return grammarCardRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Trigger DeepSeek AI enrichment for a specific GrammarCard by ID.
     * POST /api/grammar/{id}/enrich?force=false
     */
    @PostMapping("/{id}/enrich")
    public ResponseEntity<?> enrichGrammar(@PathVariable(name = "id") Long id, @RequestParam(name = "force", defaultValue = "false") boolean force) {
        java.util.Optional<GrammarCard> existingOpt = grammarCardRepository.findById(id);
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
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Force grammar enrichment failed for grammar ID {}: {}", id, e.getMessage());
            return ResponseEntity.ok(existing);
        }
    }
}
