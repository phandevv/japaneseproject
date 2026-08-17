package com.flashcard.knowledge.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "grammar_cards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "jlpt_week_day_idx", def = "{'jlpt': 1, 'weekName': 1, 'dayName': 1}")
public class GrammarCardDoc {

    @Id
    private Long id;

    @Indexed(unique = true)
    @TextIndexed(weight = 5)
    private String grammar;

    @TextIndexed(weight = 4)
    private String meaning;

    private String usageDesc;
    private String usageGuide;
    private String formation;

    @Indexed
    private String jlpt;

    private String similarGrammar;
    private String difference;
    private String commonMistakes;
    private String examples;
    private String readingPassage;
    private String quizzes;
    private String weekName;
    private String dayName;
    private String lessonTitle;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
