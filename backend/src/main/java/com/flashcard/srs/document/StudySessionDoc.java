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

@Document(collection = "study_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "user_studydate_unique_idx", def = "{'userId': 1, 'studyDate': 1}", unique = true)
public class StudySessionDoc {

    @Id
    private Long id;

    private Long userId;
    private LocalDate studyDate;

    @Builder.Default
    private int wordsStudied = 0;
    @Builder.Default
    private int correctAnswers = 0;
    @Builder.Default
    private int totalQuestions = 0;
    @Builder.Default
    private boolean streakFrozen = false;

    @Builder.Default
    private int durationMinutes = 0;

    @Builder.Default
    private boolean isRepaired = false;
}
