package com.flashcard.knowledge.service;

import com.flashcard.knowledge.dto.HighFrequencyGrammarDto;
import com.flashcard.knowledge.model.HighFrequencyGrammar;
import com.flashcard.knowledge.model.HighFrequencyGrammarReview;
import com.flashcard.knowledge.repository.HighFrequencyGrammarRepository;
import com.flashcard.knowledge.repository.HighFrequencyGrammarReviewRepository;
import com.flashcard.user.model.User;
import com.flashcard.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HighFrequencyGrammarService {

    private final HighFrequencyGrammarRepository grammarRepository;
    private final HighFrequencyGrammarReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public HighFrequencyGrammarService(
            HighFrequencyGrammarRepository grammarRepository,
            HighFrequencyGrammarReviewRepository reviewRepository,
            UserRepository userRepository) {
        this.grammarRepository = grammarRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<HighFrequencyGrammarDto> getGrammarList(Long userId, String filter) {
        List<HighFrequencyGrammar> all = grammarRepository.findAllByOrderByRankNumberAsc();
        Map<Long, HighFrequencyGrammarReview> reviewMap = Collections.emptyMap();

        if (userId != null) {
            List<HighFrequencyGrammarReview> reviews = reviewRepository.findByUserId(userId);
            reviewMap = reviews.stream().collect(Collectors.toMap(
                    r -> r.getGrammar().getId(),
                    r -> r,
                    (existing, replacement) -> existing
            ));
        }

        Instant now = Instant.now();
        List<HighFrequencyGrammarDto> dtos = new ArrayList<>();
        String normalizedFilter = (filter == null) ? "all" : filter.trim().toLowerCase();

        for (HighFrequencyGrammar g : all) {
            HighFrequencyGrammarReview r = reviewMap.get(g.getId());
            boolean matches = false;

            switch (normalizedFilter) {
                case "critical":
                    matches = g.getRankNumber() <= 20 || "Critical".equalsIgnoreCase(g.getPriority());
                    break;
                case "n3":
                    matches = "N3".equalsIgnoreCase(g.getLevel());
                    break;
                case "n4":
                    matches = "N4".equalsIgnoreCase(g.getLevel());
                    break;
                case "due":
                    matches = (r != null && r.getNextReview() != null && !r.getNextReview().isAfter(now));
                    break;
                case "all":
                default:
                    matches = true;
                    break;
            }

            if (matches) {
                HighFrequencyGrammarDto dto = new HighFrequencyGrammarDto(g);
                if (r != null) {
                    dto.applyReview(r);
                }
                dtos.add(dto);
            }
        }

        return dtos;
    }

    @Transactional(readOnly = true)
    public HighFrequencyGrammarDto getGrammarDetail(Long id, Long userId) {
        HighFrequencyGrammar g = grammarRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy mẫu ngữ pháp ID: " + id));

        HighFrequencyGrammarDto dto = new HighFrequencyGrammarDto(g);
        if (userId != null) {
            reviewRepository.findByUserIdAndGrammarId(userId, id).ifPresent(dto::applyReview);
        }
        return dto;
    }

    @Transactional
    public HighFrequencyGrammarDto reviewGrammar(Long userId, Long grammarId, int quality) {
        if (quality < 1 || quality > 4) {
            throw new IllegalArgumentException("Điểm đánh giá quality phải từ 1 đến 4 (1: Quên, 2: Khó, 3: Nhớ, 4: Dễ)");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng ID: " + userId));

        HighFrequencyGrammar grammar = grammarRepository.findById(grammarId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy mẫu ngữ pháp ID: " + grammarId));

        HighFrequencyGrammarReview review = reviewRepository.findByUserIdAndGrammarId(userId, grammarId)
                .orElseGet(() -> new HighFrequencyGrammarReview(user, grammar));

        // SM-2 Algorithm calculation
        double ef = review.getEaseFactor();
        int rep = review.getRepetitions();
        int interval = review.getIntervalDays();
        boolean previouslyLearned = review.isLearned();

        // 1. Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        double qScore = quality;
        double newEf = ef + (0.1 - (5.0 - qScore) * (0.08 + (5.0 - qScore) * 0.02));
        if (newEf < 1.3) {
            newEf = 1.3;
        }
        review.setEaseFactor(Math.round(newEf * 100.0) / 100.0);

        // 2. Repetition & Interval Calculation
        if (quality < 3) {
            // Forgotten / Hard -> reset interval to 1 day
            rep = 0;
            interval = 1;
            // CRITICAL IRON INVARIANT: Never clear is_learned if previously learned
            if (previouslyLearned) {
                review.setLearned(true);
            }
        } else {
            // Good (3) or Easy (4)
            rep += 1;
            if (rep == 1) {
                interval = 1;
            } else if (rep == 2) {
                interval = 6;
            } else {
                interval = (int) Math.round(interval * newEf);
            }
            review.setLearned(true);
        }

        review.setRepetitions(rep);
        review.setIntervalDays(interval);
        review.setNextReview(Instant.now().plus(interval, ChronoUnit.DAYS));
        review.setLastQuality(quality);
        review.setUpdatedAt(Instant.now());

        HighFrequencyGrammarReview saved = reviewRepository.save(review);
        HighFrequencyGrammarDto dto = new HighFrequencyGrammarDto(grammar);
        dto.applyReview(saved);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<HighFrequencyGrammarDto> getDueReviews(Long userId) {
        if (userId == null) return Collections.emptyList();
        List<HighFrequencyGrammarReview> dueReviews = reviewRepository.findDueReviews(userId, Instant.now());
        List<HighFrequencyGrammarDto> dtos = new ArrayList<>();
        for (HighFrequencyGrammarReview r : dueReviews) {
            HighFrequencyGrammarDto dto = new HighFrequencyGrammarDto(r.getGrammar());
            dto.applyReview(r);
            dtos.add(dto);
        }
        return dtos;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats(Long userId) {
        long total = grammarRepository.count();
        long learned = 0;
        int dueCount = 0;
        int reviewedCount = 0;

        if (userId != null) {
            learned = reviewRepository.countLearnedByUserId(userId);
            List<HighFrequencyGrammarReview> reviews = reviewRepository.findByUserId(userId);
            reviewedCount = reviews.size();
            Instant now = Instant.now();
            dueCount = (int) reviews.stream().filter(r -> r.getNextReview() != null && !r.getNextReview().isAfter(now)).count();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("learned", learned);
        stats.put("reviewed", reviewedCount);
        stats.put("due", dueCount);
        return stats;
    }
}
