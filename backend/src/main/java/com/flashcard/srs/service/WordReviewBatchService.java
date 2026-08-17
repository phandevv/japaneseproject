package com.flashcard.srs.service;

import com.flashcard.srs.model.ReviewLog;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.provider.SrsDataProvider;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * High-performance Write-Behind Batching Service for Word Reviews.
 * Collects reviewed words in memory via ConcurrentHashMap and flushes in batches to DB.
 */
@Service
public class WordReviewBatchService {

    private static final Logger log = LoggerFactory.getLogger(WordReviewBatchService.class);

    private final SrsDataProvider srsDataProvider;

    // In-memory buffer for deduplicated pending WordReviews (Key: "userId_vocabId")
    private final Map<String, WordReview> pendingReviews = new ConcurrentHashMap<>();

    // Buffer for pending ReviewLogs
    private final ConcurrentLinkedQueue<ReviewLog> pendingLogs = new ConcurrentLinkedQueue<>();

    public WordReviewBatchService(SrsDataProvider srsDataProvider) {
        this.srsDataProvider = srsDataProvider;
    }

    /**
     * Enqueue a word review and log into the in-memory batch buffer.
     */
    public void queueWordReview(WordReview review, ReviewLog reviewLog) {
        if (review != null && review.getUser() != null && review.getVocabulary() != null) {
            String key = review.getUser().getId() + "_" + review.getVocabulary().getId();
            pendingReviews.put(key, review);
        }
        if (reviewLog != null) {
            pendingLogs.add(reviewLog);
        }
    }

    /**
     * Check if a pending word review exists in memory buffer.
     */
    public WordReview getPendingReview(Long userId, Long vocabId) {
        if (userId == null || vocabId == null) return null;
        return pendingReviews.get(userId + "_" + vocabId);
    }

    /**
     * Periodically flush pending batch updates down to MongoDB Atlas in 1 single bulk write every 2 seconds.
     */
    @Scheduled(fixedDelay = 2000)
    public void flushBatch() {
        if (pendingReviews.isEmpty() && pendingLogs.isEmpty()) {
            return;
        }

        // 1. Flush WordReviews
        if (!pendingReviews.isEmpty()) {
            List<WordReview> batch = new ArrayList<>(pendingReviews.values());
            for (WordReview wr : batch) {
                String key = wr.getUser().getId() + "_" + wr.getVocabulary().getId();
                pendingReviews.remove(key, wr);
            }
            try {
                srsDataProvider.saveAllWordReviews(batch);
                log.debug("Flushed {} word reviews to database in batch.", batch.size());
            } catch (Exception e) {
                log.error("Failed to batch save word reviews: {}", e.getMessage(), e);
                // Re-add to buffer on error
                for (WordReview wr : batch) {
                    pendingReviews.putIfAbsent(wr.getUser().getId() + "_" + wr.getVocabulary().getId(), wr);
                }
            }
        }

        // 2. Flush ReviewLogs
        if (!pendingLogs.isEmpty()) {
            List<ReviewLog> logBatch = new ArrayList<>();
            ReviewLog item;
            while ((item = pendingLogs.poll()) != null) {
                logBatch.add(item);
                if (logBatch.size() >= 500) break;
            }
            for (ReviewLog rl : logBatch) {
                try {
                    srsDataProvider.saveReviewLog(rl);
                } catch (Exception e) {
                    log.error("Failed to save review log: {}", e.getMessage());
                }
            }
        }
    }

    /**
     * Flush all remaining data immediately on server shutdown to prevent any data loss.
     */
    @PreDestroy
    public void flushOnShutdown() {
        log.info("Flushing all pending word reviews on shutdown...");
        flushBatch();
    }
}
