package com.flashcard.srs.controller;

import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * MasterReviewController – Handles "Tổng ôn tập" (Master Review) feature endpoints.
 */
@RestController
@RequestMapping("/api/master-review")
public class MasterReviewController {

    private final SrsDataProvider srsDataProvider;

    public MasterReviewController(SrsDataProvider srsDataProvider) {
        this.srsDataProvider = srsDataProvider;
    }

    /**
     * GET /api/master-review/words?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd
     * Fetches distinct learned vocabulary words within an optional date range.
     */
    @GetMapping("/words")
    public ResponseEntity<?> getWordsForMasterReview(@AuthenticationPrincipal User user,
                                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        List<Vocabulary> vocabularies;

        if (startDate != null && endDate != null) {
            Instant start = startDate.atStartOfDay(zone).toInstant();
            Instant end = endDate.plusDays(1).atStartOfDay(zone).toInstant();
            Page<WordReview> page = srsDataProvider.findByUserAndLastReviewedAtBetween(user, start, end, PageRequest.of(0, 10000));
            Map<Long, Vocabulary> distinctMap = new LinkedHashMap<>();
            if (page != null && page.getContent() != null) {
                for (WordReview wr : page.getContent()) {
                    if (wr != null && wr.getVocabulary() != null && wr.getVocabulary().getId() != null) {
                        distinctMap.putIfAbsent(wr.getVocabulary().getId(), wr.getVocabulary());
                    }
                }
            }
            vocabularies = new ArrayList<>(distinctMap.values());
        } else {
            vocabularies = srsDataProvider.findLearnedVocabulariesByUser(user, PageRequest.of(0, 10000));
            if (vocabularies == null || vocabularies.isEmpty()) {
                List<WordReview> allReviews = srsDataProvider.findAllByUser(user);
                if (allReviews != null) {
                    Map<Long, Vocabulary> distinctMap = new LinkedHashMap<>();
                    for (WordReview wr : allReviews) {
                        if (wr != null && wr.getVocabulary() != null && wr.getVocabulary().getId() != null) {
                            distinctMap.putIfAbsent(wr.getVocabulary().getId(), wr.getVocabulary());
                        }
                    }
                    vocabularies = new ArrayList<>(distinctMap.values());
                }
            }
        }

        if (vocabularies == null) {
            vocabularies = Collections.emptyList();
        }

        return ResponseEntity.ok(vocabularies);
    }
}
