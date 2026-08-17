package com.flashcard.srs.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Document(collection = "daily_study_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "user_date_stats_unique_idx", def = "{'userId': 1, 'date': 1}", unique = true)
public class DailyStudyStatsDoc {

    @Id
    private Long id;

    private Long userId;
    private LocalDate date;

    @Builder.Default
    private int newWordsStudied = 0;
    @Builder.Default
    private int wordsReviewed = 0;
    @Builder.Default
    private float retentionRate = 0.0f;
    @Builder.Default
    private long learningTimeMs = 0;
}
