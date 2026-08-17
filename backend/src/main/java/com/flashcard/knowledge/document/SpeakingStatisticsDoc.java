package com.flashcard.knowledge.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "speaking_statistics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeakingStatisticsDoc {

    @Id
    private Long id;

    @Indexed(unique = true)
    private Long userId;

    @Builder.Default
    private Double grammarAccuracy = 0.0;
    @Builder.Default
    private Double vocabularyScore = 0.0;
    @Builder.Default
    private Double fluencyScore = 0.0;
    @Builder.Default
    private Double confidenceScore = 0.0;
    @Builder.Default
    private Integer totalSessions = 0;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
