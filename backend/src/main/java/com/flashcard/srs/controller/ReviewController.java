package com.flashcard.srs.controller;

import com.flashcard.srs.dto.ReviewCardResponse;
import com.flashcard.srs.dto.ReviewRequest;
import com.flashcard.srs.dto.ReviewResultResponse;
import com.flashcard.srs.service.ReviewService;
import com.flashcard.user.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * GET /api/reviews/today
     * Retrieve vocabulary cards due for review today.
     */
    @GetMapping("/api/reviews/today")
    public ResponseEntity<?> getTodayReviews(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        List<ReviewCardResponse> reviews = reviewService.getTodayReviews(user);
        return ResponseEntity.ok(reviews);
    }

    /**
     * POST /api/reviews/{cardId}
     * Submit user review rating (AGAIN, HARD, GOOD, EASY) for a card.
     */
    @PostMapping("/api/reviews/{cardId}")
    public ResponseEntity<?> reviewCard(@AuthenticationPrincipal User user,
                                        @PathVariable Long cardId,
                                        @RequestBody ReviewRequest request) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (request == null || request.getRating() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rating is required (AGAIN, HARD, GOOD, EASY)"));
        }

        try {
            ReviewResultResponse result = reviewService.reviewCard(user, cardId, request.getRating());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Internal review error: " + e.getMessage()));
        }
    }

    /**
     * POST /api/vocabularies/{vocabularyId}/master
     * Mark a vocabulary word as mastered and initialize its review card in SRS.
     */
    @PostMapping("/api/vocabularies/{vocabularyId}/master")
    public ResponseEntity<?> markVocabularyMastered(@AuthenticationPrincipal User user,
                                                    @PathVariable Long vocabularyId) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        try {
            ReviewCardResponse card = reviewService.markMastered(user, vocabularyId);
            return ResponseEntity.ok(card);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
