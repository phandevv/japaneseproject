package com.flashcard.srs.document;

import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReviewState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "review_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "word_review_created_idx", def = "{'wordReviewId': 1, 'createdAt': -1}")
public class ReviewLogDoc {

    @Id
    private Long id;

    private Long wordReviewId;
    private ReviewRating rating;
    private WordReviewState stateBefore;
    private WordReviewState stateAfter;
    private float difficultyBefore;
    private float difficultyAfter;
    private float stabilityBefore;
    private float stabilityAfter;
    private Integer durationMs;

    @CreatedDate
    @Indexed(name = "created_at_ttl_idx", expireAfter = "90d")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
