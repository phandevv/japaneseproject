package com.flashcard.srs.config;

import com.flashcard.srs.repository.GrammarReviewRepository;
import com.flashcard.srs.repository.WordReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class SrsResetRunner {

    private static final Logger log = LoggerFactory.getLogger(SrsResetRunner.class);

    private final WordReviewRepository wordReviewRepository;
    private final GrammarReviewRepository grammarReviewRepository;

    public SrsResetRunner(WordReviewRepository wordReviewRepository,
                          GrammarReviewRepository grammarReviewRepository) {
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void markAllSrsItemsDueOnStartup() {
        try {
            Instant now = Instant.now();
            int updatedWords = wordReviewRepository.markAllReviewsAsDue(now);
            int updatedGrammar = grammarReviewRepository.markAllReviewsAsDue(now);
            int clampedWords = wordReviewRepository.clampInflatedIntervals();
            int clampedGrammar = grammarReviewRepository.clampInflatedIntervals();
            log.info("✅ Marked {} vocabulary reviews and {} grammar reviews as DUE. Clamped {} inflated records.", 
                    updatedWords, updatedGrammar, (clampedWords + clampedGrammar));
        } catch (Exception e) {
            log.error("❌ Error marking SRS reviews as due on startup: {}", e.getMessage(), e);
        }
    }
}
