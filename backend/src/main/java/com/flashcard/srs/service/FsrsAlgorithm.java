package com.flashcard.srs.service;

import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class FsrsAlgorithm implements SpacedRepetitionAlgorithm {

    private final FsrsSchedulerService fsrsSchedulerService;

    public FsrsAlgorithm(FsrsSchedulerService fsrsSchedulerService) {
        this.fsrsSchedulerService = fsrsSchedulerService;
    }

    @Override
    public void calculateNextState(WordReview currentReview, ReviewRating rating) {
        fsrsSchedulerService.calculateNextState(currentReview, rating, Instant.now());
    }

    @Override
    public Map<String, Integer> getProjectedIntervals(WordReview currentReview) {
        return fsrsSchedulerService.getProjectedIntervals(currentReview);
    }
}


