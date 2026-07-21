package com.flashcard.knowledge.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "grammar_cards")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GrammarCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "grammar", unique = true, nullable = false)
    private String grammar;

    @Column(name = "meaning", columnDefinition = "TEXT", nullable = false)
    private String meaning;

    @Column(name = "usage_desc", columnDefinition = "TEXT")
    private String usageDesc;

    @Column(name = "formation", columnDefinition = "TEXT")
    private String formation;

    @Column(name = "jlpt", nullable = false)
    private String jlpt;

    @Column(name = "similar_grammar", columnDefinition = "TEXT")
    private String similarGrammar;

    @Column(name = "difference", columnDefinition = "TEXT")
    private String difference;

    @Column(name = "common_mistakes", columnDefinition = "TEXT")
    private String commonMistakes;

    @Column(name = "examples", columnDefinition = "TEXT")
    private String examples;

    @Column(name = "reading_passage", columnDefinition = "TEXT")
    private String readingPassage;

    @Column(name = "quizzes", columnDefinition = "TEXT")
    private String quizzes;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public GrammarCard() {}

    public GrammarCard(String grammar, String meaning, String usageDesc, String formation, String jlpt) {
        this.grammar = grammar;
        this.meaning = meaning;
        this.usageDesc = usageDesc;
        this.formation = formation;
        this.jlpt = jlpt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getGrammar() { return grammar; }
    public void setGrammar(String grammar) { this.grammar = grammar; }

    public String getMeaning() { return meaning; }
    public void setMeaning(String meaning) { this.meaning = meaning; }

    public String getUsageDesc() { return usageDesc; }
    public void setUsageDesc(String usageDesc) { this.usageDesc = usageDesc; }

    public String getFormation() { return formation; }
    public void setFormation(String formation) { this.formation = formation; }

    public String getJlpt() { return jlpt; }
    public void setJlpt(String jlpt) { this.jlpt = jlpt; }

    public String getSimilarGrammar() { return similarGrammar; }
    public void setSimilarGrammar(String similarGrammar) { this.similarGrammar = similarGrammar; }

    public String getDifference() { return difference; }
    public void setDifference(String difference) { this.difference = difference; }

    public String getCommonMistakes() { return commonMistakes; }
    public void setCommonMistakes(String commonMistakes) { this.commonMistakes = commonMistakes; }

    public String getExamples() { return examples; }
    public void setExamples(String examples) { this.examples = examples; }

    public String getReadingPassage() { return readingPassage; }
    public void setReadingPassage(String readingPassage) { this.readingPassage = readingPassage; }

    public String getQuizzes() { return quizzes; }
    public void setQuizzes(String quizzes) { this.quizzes = quizzes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

