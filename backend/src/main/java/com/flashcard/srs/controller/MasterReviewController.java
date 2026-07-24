package com.flashcard.srs.controller;

import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
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

    private final WordReviewRepository wordReviewRepository;

    public MasterReviewController(WordReviewRepository wordReviewRepository) {
        this.wordReviewRepository = wordReviewRepository;
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
            vocabularies = wordReviewRepository.findDistinctVocabularyByUserAndLastReviewedAtBetween(user, start, end);
        } else {
            List<WordReview> learnedReviews = wordReviewRepository.findAllLearnedByUser(user);
            vocabularies = learnedReviews.stream()
                    .map(WordReview::getVocabulary)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(vocabularies);
    }
}
