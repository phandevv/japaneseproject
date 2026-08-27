package com.flashcard.srs.controller;

import com.flashcard.knowledge.service.SchedulerService;
import com.flashcard.srs.dto.WordReviewDto;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.srs.service.LearningStrategyService;
import com.flashcard.srs.service.SpacedRepetitionAlgorithm;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final SchedulerService schedulerService;
    private final LearningStrategyService learningStrategyService;
    private final SpacedRepetitionAlgorithm spacedRepetitionAlgorithm;
    private final SrsDataProvider srsDataProvider;

    public StudyController(SchedulerService schedulerService,
                           LearningStrategyService learningStrategyService,
                           SpacedRepetitionAlgorithm spacedRepetitionAlgorithm,
                           SrsDataProvider srsDataProvider) {
        this.schedulerService = schedulerService;
        this.learningStrategyService = learningStrategyService;
        this.spacedRepetitionAlgorithm = spacedRepetitionAlgorithm;
        this.srsDataProvider = srsDataProvider;
    }

    /**
     * GET /api/study/queue?level={level}
     * Returns the optimized SRS review queue for today (morning review).
     * Words are ordered strictly by SRS due date (earliest due first).
     */
    @GetMapping("/queue")
    public ResponseEntity<?> getStudyQueue(@AuthenticationPrincipal User user,
                                           @RequestParam(defaultValue = "N5") String level) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        int newWordsLimit = learningStrategyService.calculateTodayNewWordsLimit(user, level);
        int totalLimit = 50;

        List<WordReview> queue = schedulerService.getReviewQueue(user, totalLimit);

        List<WordReviewDto> dtoList = queue.stream().map(review -> {
            WordReviewDto dto = new WordReviewDto();
            dto.setId(review.getId());
            dto.setVocabulary(review.getVocabulary());
            dto.setState(review.getState());
            dto.setDifficulty(review.getDifficulty());
            dto.setStability(review.getStability());
            dto.setIntervalDays(review.getIntervalDays());
            dto.setConsecutiveCorrect(review.getConsecutiveCorrect());

            Map<String, Integer> projections = spacedRepetitionAlgorithm.getProjectedIntervals(review);
            dto.setProjectedIntervals(projections);

            return dto;
        }).collect(Collectors.toList());

        // Queue size: Count total due cards for user today if available
        long totalDueCount = dtoList.size();
        try {
            java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
            java.time.Instant dueThreshold = java.time.ZonedDateTime.now(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();
            long realDue = srsDataProvider.countDueWordReviews(user, dueThreshold);
            if (realDue > 0) {
                totalDueCount = realDue;
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "queue", dtoList,
            "newWordsLimit", newWordsLimit,
            "queueSize", totalDueCount
        ));
    }

    /**
     * GET /api/study/today-reviewed
     * Returns the list of distinct vocabulary words reviewed TODAY (Asia/Ho_Chi_Minh) by the authenticated user.
     * Preserves the most recent review order (lastReviewedAt DESC).
     */
    @GetMapping("/today-reviewed")
    public ResponseEntity<?> getTodayReviewed(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        // Compute start and end of today in local time zone (Asia/Ho_Chi_Minh)
        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime todayStart = ZonedDateTime.now(zone).toLocalDate().atStartOfDay(zone);
        ZonedDateTime todayEnd = todayStart.plusDays(1);

        // Fetch distinct vocabulary words reviewed today through srsDataProvider
        Page<WordReview> todayReviews = srsDataProvider.findByUserAndLastReviewedAtBetween(
                user,
                todayStart.toInstant(),
                todayEnd.toInstant(),
                PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "lastReviewedAt"))
        );

        Set<Long> seenIds = new LinkedHashSet<>();
        List<Vocabulary> result = new ArrayList<>();

        if (todayReviews != null && todayReviews.getContent() != null) {
            for (WordReview wr : todayReviews.getContent()) {
                if (wr != null && wr.getVocabulary() != null && wr.getVocabulary().getId() != null) {
                    if (seenIds.add(wr.getVocabulary().getId())) {
                        result.add(wr.getVocabulary());
                    }
                }
            }
        }

        return ResponseEntity.ok(result);
    }
}
