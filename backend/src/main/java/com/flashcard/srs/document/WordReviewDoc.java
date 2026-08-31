package com.flashcard.srs.document;

import com.flashcard.srs.model.WordReviewState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "word_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndexes({
    @CompoundIndex(name = "user_vocab_unique_idx", def = "{'userId': 1, 'vocabularyId': 1}", unique = true),
    @CompoundIndex(name = "user_word_key_idx", def = "{'userId': 1, 'wordKey': 1}"),
    @CompoundIndex(name = "user_srs_due_idx", def = "{'userId': 1, 'nextReview': 1}"),
    @CompoundIndex(name = "user_learned_idx", def = "{'userId': 1, 'intervalDays': 1}"),
    @CompoundIndex(name = "user_last_reviewed_idx", def = "{'userId': 1, 'lastReviewedAt': -1}"),
    @CompoundIndex(name = "user_rating_idx", def = "{'userId': 1, 'lastRating': 1}")
})
public class WordReviewDoc {

    @Id
    private Long id;

    private Long userId;
    private Long vocabularyId;
    private String wordKey;

    @Builder.Default
    private WordReviewState state = WordReviewState.NEW;

    @Builder.Default
    private float difficulty = 0.0f;
    @Builder.Default
    private float stability = 0.0f;
    @Builder.Default
    private double easeFactor = 2.5;
    @Builder.Default
    private int intervalDays = 0;
    @Builder.Default
    private int repetitions = 0;
    @Builder.Default
    private int reviewCount = 0;
    @Builder.Default
    private int correctCount = 0;
    @Builder.Default
    private int wrongCount = 0;
    @Builder.Default
    private int consecutiveCorrect = 0;

    @Builder.Default
    private Instant nextReview = Instant.now();

    private Instant lastReviewedAt;
    private Integer lastRating;
}
