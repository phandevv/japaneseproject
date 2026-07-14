package com.flashcard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.FullTextField;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.Indexed;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.KeywordField;

@Entity
@Indexed
@Table(name = "vocabulary")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Vocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @FullTextField(analyzer = "default")
    @Column(name = "kanji", length = 1000)
    private String kanji;

    @FullTextField(analyzer = "default")
    @Column(name = "hiragana", length = 1000)
    private String hiragana;

    @FullTextField(analyzer = "default")
    @Column(name = "romaji", length = 1000)
    private String romaji;

    @FullTextField(analyzer = "default")
    @Column(name = "han_viet", length = 1000)
    private String hanViet;

    @FullTextField(analyzer = "default")
    @Column(name = "meaning", columnDefinition = "TEXT")
    private String meaning;

    @KeywordField
    @Column(name = "word_type")
    private String wordType;

    @KeywordField
    @Column(name = "level")
    private String level;

    @Column(name = "category")
    private String category;

    public Vocabulary() {}

    public Vocabulary(String kanji, String hiragana, String hanViet, String meaning, String wordType, String level, String category) {
        this.kanji = kanji;
        this.hiragana = hiragana;
        this.hanViet = hanViet;
        this.meaning = meaning;
        this.wordType = wordType;
        this.level = level;
        this.category = category;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getKanji() { return kanji; }
    public void setKanji(String kanji) { this.kanji = kanji; }

    public String getHiragana() { return hiragana; }
    public void setHiragana(String hiragana) { this.hiragana = hiragana; }

    public String getRomaji() { return romaji; }
    public void setRomaji(String romaji) { this.romaji = romaji; }

    public String getHanViet() { return hanViet; }
    public void setHanViet(String hanViet) { this.hanViet = hanViet; }

    public String getMeaning() { return meaning; }
    public void setMeaning(String meaning) { this.meaning = meaning; }

    public String getWordType() { return wordType; }
    public void setWordType(String wordType) { this.wordType = wordType; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    @Column(name = "kanji_words", columnDefinition = "TEXT")
    private String kanjiWords;

    @Column(name = "sample_sentence", columnDefinition = "TEXT")
    private String sampleSentence;

    @Column(name = "sample_translation", columnDefinition = "TEXT")
    private String sampleTranslation;

    @Column(name = "sample_reading", columnDefinition = "TEXT")
    private String sampleReading;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getKanjiWords() { return kanjiWords; }
    public void setKanjiWords(String kanjiWords) { this.kanjiWords = kanjiWords; }

    public String getSampleSentence() { return sampleSentence; }
    public void setSampleSentence(String sampleSentence) { this.sampleSentence = sampleSentence; }

    public String getSampleTranslation() { return sampleTranslation; }
    public void setSampleTranslation(String sampleTranslation) { this.sampleTranslation = sampleTranslation; }

    public String getSampleReading() { return sampleReading; }
    public void setSampleReading(String sampleReading) { this.sampleReading = sampleReading; }

    // New AI Enrichment fields
    @Column(name = "pitch_accent")
    private String pitchAccent;

    @Column(name = "synonyms", columnDefinition = "TEXT")
    private String synonyms;

    @Column(name = "antonyms", columnDefinition = "TEXT")
    private String antonyms;

    @Column(name = "common_mistakes", columnDefinition = "TEXT")
    private String commonMistakes;

    @Column(name = "collocations", columnDefinition = "TEXT")
    private String collocations;

    @Column(name = "mnemonic", columnDefinition = "TEXT")
    private String mnemonic;

    @Column(name = "conversation_examples", columnDefinition = "TEXT")
    private String conversationExamples;

    public String getPitchAccent() { return pitchAccent; }
    public void setPitchAccent(String pitchAccent) { this.pitchAccent = pitchAccent; }

    public String getSynonyms() { return synonyms; }
    public void setSynonyms(String synonyms) { this.synonyms = synonyms; }

    public String getAntonyms() { return antonyms; }
    public void setAntonyms(String antonyms) { this.antonyms = antonyms; }

    public String getCommonMistakes() { return commonMistakes; }
    public void setCommonMistakes(String commonMistakes) { this.commonMistakes = commonMistakes; }

    public String getCollocations() { return collocations; }
    public void setCollocations(String collocations) { this.collocations = collocations; }

    public String getMnemonic() { return mnemonic; }
    public void setMnemonic(String mnemonic) { this.mnemonic = mnemonic; }

    public String getConversationExamples() { return conversationExamples; }
    public void setConversationExamples(String conversationExamples) { this.conversationExamples = conversationExamples; }
}
