package com.flashcard.srs.controller;

import com.flashcard.srs.dto.WordReviewDto;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.repository.ReviewLogRepository;
import com.flashcard.srs.service.LearningStrategyService;
import com.flashcard.knowledge.service.SchedulerService;
import com.flashcard.srs.service.SpacedRepetitionAlgorithm;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final SchedulerService schedulerService;
    private final LearningStrategyService learningStrategyService;
    private final SpacedRepetitionAlgorithm spacedRepetitionAlgorithm;
    private final ReviewLogRepository reviewLogRepository;
    private final com.flashcard.srs.repository.WordReviewRepository wordReviewRepository;

    public StudyController(SchedulerService schedulerService,
                           LearningStrategyService learningStrategyService,
                           SpacedRepetitionAlgorithm spacedRepetitionAlgorithm,
                           ReviewLogRepository reviewLogRepository,
                           com.flashcard.srs.repository.WordReviewRepository wordReviewRepository) {
        this.schedulerService = schedulerService;
        this.learningStrategyService = learningStrategyService;
        this.spacedRepetitionAlgorithm = spacedRepetitionAlgorithm;
        this.reviewLogRepository = reviewLogRepository;
        this.wordReviewRepository = wordReviewRepository;
    }

    /**
     * GET /api/study/queue?level={level}
     * Returns the optimized SRS review queue for today (morning review).
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

        return ResponseEntity.ok(Map.of(
            "queue", dtoList,
            "newWordsLimit", newWordsLimit,
            "queueSize", dtoList.size()
        ));
    }

    /**
     * GET /api/study/today-reviewed
     * Returns the list of distinct vocabulary words reviewed TODAY by the authenticated user
     * across Flashcards, Quizzes, AI Exercises, and Knowledge Entry.
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

        // 1. Vocabularies logged in ReviewLog today
        List<Vocabulary> logWords = reviewLogRepository.findDistinctVocabularyByUserAndCreatedAtBetween(
                user,
                todayStart.toInstant(),
                todayEnd.toInstant()
        );

        // 2. Vocabularies updated in WordReview today
        List<WordReview> reviewWords = wordReviewRepository.findByUserAndLastReviewedAtBetween(
                user,
                todayStart.toInstant(),
                todayEnd.toInstant(),
                org.springframework.data.domain.Pageable.unpaged()
        ).getContent();

        // 3. Merge into a distinct list preserving order
        java.util.Set<Long> seenIds = new java.util.HashSet<>();
        List<Vocabulary> result = new java.util.ArrayList<>();

        if (logWords != null) {
            for (Vocabulary v : logWords) {
                if (v != null && seenIds.add(v.getId())) {
                    result.add(v);
                }
            }
        }
        if (reviewWords != null) {
            for (WordReview wr : reviewWords) {
                if (wr != null && wr.getVocabulary() != null && seenIds.add(wr.getVocabulary().getId())) {
                    result.add(wr.getVocabulary());
                }
            }
        }

        return ResponseEntity.ok(result);
    }
}

