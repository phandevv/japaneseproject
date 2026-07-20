package com.flashcard.controller;

import com.flashcard.dto.WordReviewDto;
import com.flashcard.model.User;
import com.flashcard.model.WordReview;
import com.flashcard.service.LearningStrategyService;
import com.flashcard.service.SchedulerService;
import com.flashcard.service.SpacedRepetitionAlgorithm;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final SchedulerService schedulerService;
    private final LearningStrategyService learningStrategyService;
    private final SpacedRepetitionAlgorithm spacedRepetitionAlgorithm;

    public StudyController(SchedulerService schedulerService, 
                           LearningStrategyService learningStrategyService,
                           SpacedRepetitionAlgorithm spacedRepetitionAlgorithm) {
        this.schedulerService = schedulerService;
        this.learningStrategyService = learningStrategyService;
        this.spacedRepetitionAlgorithm = spacedRepetitionAlgorithm;
    }

    /**
     * Get the optimized queue of vocabulary words due for study today.
     * Includes both reviews and a calculated number of new cards.
     * 
     * GET /api/study/queue?level={level}
     */
    @GetMapping("/queue")
    public ResponseEntity<?> getStudyQueue(@AuthenticationPrincipal User user,
                                           @RequestParam(defaultValue = "N5") String level) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        // Calculate how many new words the user is allowed to learn today
        int newWordsLimit = learningStrategyService.calculateTodayNewWordsLimit(user, level);
        
        // Let's assume a hard cap of 50 total cards per session to avoid overwhelming
        int totalLimit = 50;

        // Fetch the prioritized queue from the scheduler
        List<WordReview> queue = schedulerService.getReviewQueue(user, totalLimit);

        // Convert to DTO with Projected Intervals for UI
        List<WordReviewDto> dtoList = queue.stream().map(review -> {
            WordReviewDto dto = new WordReviewDto();
            dto.setId(review.getId());
            dto.setVocabulary(review.getVocabulary());
            dto.setState(review.getState());
            dto.setDifficulty(review.getDifficulty());
            dto.setStability(review.getStability());
            dto.setIntervalDays(review.getIntervalDays());
            dto.setConsecutiveCorrect(review.getConsecutiveCorrect());
            
            // Generate projected intervals (AGAIN, HARD, GOOD, EASY) -> (days)
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
}
