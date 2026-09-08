package com.flashcard.srs.service;

import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import io.github.openspacedrepetition.Card;
import io.github.openspacedrepetition.CardAndReviewLog;
import io.github.openspacedrepetition.Rating;
import io.github.openspacedrepetition.Scheduler;
import io.github.openspacedrepetition.State;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Service
public class FsrsSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(FsrsSchedulerService.class);

    private final Scheduler scheduler;
    private final int maximumInterval;

    public FsrsSchedulerService(
            @Value("${review.desired-retention:0.9}") double desiredRetention,
            @Value("${review.maximum-interval:36500}") int maximumInterval) {
        this.maximumInterval = maximumInterval;
        this.scheduler = Scheduler.builder()
                .desiredRetention(desiredRetention)
                .maximumInterval(maximumInterval)
                .enableFuzzing(false)
                .build();
        log.info("Initialized FsrsSchedulerService with retention={}, maxInterval={}", desiredRetention, maximumInterval);
    }

    public Scheduler getScheduler() {
        return scheduler;
    }

    public Rating toFsrsRating(ReviewRating rating) {
        if (rating == null) return Rating.GOOD;
        return switch (rating) {
            case AGAIN -> Rating.AGAIN;
            case HARD -> Rating.HARD;
            case GOOD -> Rating.GOOD;
            case EASY -> Rating.EASY;
        };
    }

    public Card toFsrsCard(WordReview review) {
        if (review == null) {
            return Card.builder().build();
        }

        Card.Builder builder = Card.builder();
        if (review.getId() != null) {
            builder.cardId(review.getId().intValue());
        }

        if (review.getStability() > 0) {
            builder.stability((double) review.getStability());
        }
        if (review.getDifficulty() > 0) {
            builder.difficulty((double) review.getDifficulty());
        }
        if (review.getNextReview() != null) {
            builder.due(review.getNextReview());
        } else {
            builder.due(Instant.now());
        }
        if (review.getLastReviewedAt() != null) {
            builder.lastReview(review.getLastReviewedAt());
        }

        if (review.getState() == WordReviewState.MATURE) {
            builder.state(State.REVIEW);
        } else {
            builder.state(State.LEARNING);
        }

        return builder.build();
    }

    public void calculateNextState(WordReview review, ReviewRating rating, Instant reviewTime) {
        if (reviewTime == null) {
            reviewTime = Instant.now();
        }
        Rating fsrsRating = toFsrsRating(rating);
        Card fsrsCard = toFsrsCard(review);

        CardAndReviewLog result = scheduler.reviewCard(fsrsCard, fsrsRating, reviewTime);
        Card nextCard = result.card();

        if (nextCard.getStability() != null) {
            review.setStability(nextCard.getStability().floatValue());
        }
        if (nextCard.getDifficulty() != null) {
            review.setDifficulty(nextCard.getDifficulty().floatValue());
        }
        if (nextCard.getDue() != null) {
            review.setNextReview(nextCard.getDue());
        }

        if (nextCard.getState() == null) {
            review.setState(WordReviewState.NEW);
        } else {
            switch (nextCard.getState()) {
                case LEARNING, RELEARNING -> review.setState(WordReviewState.LEARNING);
                case REVIEW -> review.setState(WordReviewState.MATURE);
            }
        }

        long intervalDays = 1;
        if (nextCard.getDue() != null) {
            long days = ChronoUnit.DAYS.between(reviewTime, nextCard.getDue());
            intervalDays = Math.max(1, days);
        }
        review.setIntervalDays((int) Math.min(intervalDays, maximumInterval));
        review.setLastReviewedAt(reviewTime);
        review.setLastRating(rating != null ? rating.getValue() : 3);
        review.setReviewCount(review.getReviewCount() + 1);

        if (rating == ReviewRating.AGAIN) {
            review.setWrongCount(review.getWrongCount() + 1);
            review.setConsecutiveCorrect(0);
        } else {
            review.setCorrectCount(review.getCorrectCount() + 1);
            review.setConsecutiveCorrect(review.getConsecutiveCorrect() + 1);
        }
    }

    public Map<String, Integer> getProjectedIntervals(WordReview currentReview) {
        Map<String, Integer> projections = new HashMap<>();
        Instant now = Instant.now();

        for (ReviewRating rating : ReviewRating.values()) {
            Card fsrsCard = toFsrsCard(currentReview);
            CardAndReviewLog result = scheduler.reviewCard(fsrsCard, toFsrsRating(rating), now);
            Card nextCard = result.card();

            int days = 0;
            if (nextCard.getDue() != null) {
                long diff = ChronoUnit.DAYS.between(now, nextCard.getDue());
                days = (int) Math.max(0, diff);
            }
            projections.put(rating.name(), days);
        }

        return projections;
    }
}
