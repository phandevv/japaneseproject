package com.flashcard.controller;

import com.flashcard.model.User;
import com.flashcard.model.Vocabulary;
import com.flashcard.model.WordReview;
import com.flashcard.service.SrsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/srs")
public class SrsController {

    private final SrsService srsService;

    public SrsController(SrsService srsService) {
        this.srsService = srsService;
    }

    /**
     * Get list of vocabulary words due for SRS review today
     * GET /api/srs/due
     */
    @GetMapping("/due")
    public ResponseEntity<?> getDueWords(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        List<Vocabulary> dueWords = srsService.getDueVocabulary(user);
        return ResponseEntity.ok(dueWords);
    }

    /**
     * Submit quality rating for a vocabulary card
     * POST /api/srs/review
     */
    @PostMapping("/review")
    public ResponseEntity<?> reviewWord(@AuthenticationPrincipal User user,
                                         @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        Number vocabIdNum = (Number) body.get("vocabularyId");
        Number qualityNum = (Number) body.get("quality");

        if (vocabIdNum == null || qualityNum == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing vocabularyId or quality"));
        }

        try {
            WordReview review = srsService.reviewWord(user, vocabIdNum.longValue(), qualityNum.intValue());
            return ResponseEntity.ok(Map.of(
                "message", "Review saved",
                "nextReview", review.getNextReview().toString(),
                "intervalDays", review.getIntervalDays()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
