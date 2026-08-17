package com.flashcard.srs.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "grammar_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "user_grammar_unique_idx", def = "{'userId': 1, 'grammarCardId': 1}", unique = true)
public class GrammarReviewDoc {

    @Id
    private Long id;

    private Long userId;
    private Long grammarCardId;

    @Builder.Default
    private double easeFactor = 2.5;
    @Builder.Default
    private int intervalDays = 0;
    @Builder.Default
    private int repetitions = 0;
    @Builder.Default
    private Instant nextReview = Instant.now();
    @Builder.Default
    private boolean isLearned = false;
}
