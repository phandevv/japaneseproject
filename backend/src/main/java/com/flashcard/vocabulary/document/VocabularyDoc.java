package com.flashcard.vocabulary.document;

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

import java.util.List;

@Document(collection = "vocabularies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "level_wordtype_idx", def = "{'level': 1, 'wordType': 1}")
public class VocabularyDoc {

    @Id
    private Long id;

    @TextIndexed(weight = 5)
    @Indexed
    private String kanji;

    @TextIndexed(weight = 5)
    @Indexed
    private String hiragana;

    @TextIndexed(weight = 3)
    private String romaji;

    @TextIndexed(weight = 3)
    private String hanViet;

    @TextIndexed(weight = 4)
    private String meaning;

    @Indexed
    private String wordType;

    @Indexed
    private String level;

    private String category;
    private String kanjiWords;
    private String sampleSentence;
    private String sampleTranslation;
    private String sampleReading;
    private String pitchAccent;
    private String synonyms;
    private String antonyms;
    private String commonMistakes;
    private String collocations;
    private String mnemonic;
    private String conversationExamples;
    private String exampleSentences;
    private String usageGuide;
    private String onReading;
    private String kunReading;

    private Boolean isEnriching;
}
