package com.flashcard.model;

import jakarta.persistence.*;

@Entity
@Table(name = "vocabulary")
public class Vocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "kanji", length = 1000)
    private String kanji;

    @Column(name = "hiragana", length = 1000)
    private String hiragana;

    @Column(name = "han_viet", length = 1000)
    private String hanViet;

    @Column(name = "meaning", columnDefinition = "TEXT")
    private String meaning;

    @Column(name = "word_type")
    private String wordType;

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

    public String getHanViet() { return hanViet; }
    public void setHanViet(String hanViet) { this.hanViet = hanViet; }

    public String getMeaning() { return meaning; }
    public void setMeaning(String meaning) { this.meaning = meaning; }

    public String getWordType() { return wordType; }
    public void setWordType(String wordType) { this.wordType = wordType; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
