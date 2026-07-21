package com.flashcard.srs.model;

import com.flashcard.knowledge.model.Conversation;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "review_recommendations")
public class ReviewRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "recommended_vocab", columnDefinition = "TEXT")
    private String recommendedVocab; // JSON Array of recommended words

    @Column(name = "recommended_grammar", columnDefinition = "TEXT")
    private String recommendedGrammar; // JSON Array of recommended grammar rules

    @Column(name = "exercise_flashcards", columnDefinition = "TEXT")
    private String exerciseFlashcards; // JSON Array of generated flashcard data

    @Column(name = "exercise_quiz", columnDefinition = "TEXT")
    private String exerciseQuiz; // JSON of quizzes

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public ReviewRecommendation() {}

    public ReviewRecommendation(Conversation conversation) {
        this.conversation = conversation;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public String getRecommendedVocab() {
        return recommendedVocab;
    }

    public void setRecommendedVocab(String recommendedVocab) {
        this.recommendedVocab = recommendedVocab;
    }

    public String getRecommendedGrammar() {
        return recommendedGrammar;
    }

    public void setRecommendedGrammar(String recommendedGrammar) {
        this.recommendedGrammar = recommendedGrammar;
    }

    public String getExerciseFlashcards() {
        return exerciseFlashcards;
    }

    public void setExerciseFlashcards(String exerciseFlashcards) {
        this.exerciseFlashcards = exerciseFlashcards;
    }

    public String getExerciseQuiz() {
        return exerciseQuiz;
    }

    public void setExerciseQuiz(String exerciseQuiz) {
        this.exerciseQuiz = exerciseQuiz;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

