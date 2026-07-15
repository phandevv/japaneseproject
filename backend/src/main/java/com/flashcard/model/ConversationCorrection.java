package com.flashcard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_corrections")
public class ConversationCorrection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "original_text", nullable = false, columnDefinition = "TEXT")
    private String originalText;

    @Column(name = "corrected_text", nullable = false, columnDefinition = "TEXT")
    private String correctedText;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "type", nullable = false, length = 50)
    private String type; // 'GRAMMAR', 'VOCABULARY', 'POLITENESS', etc.

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public ConversationCorrection() {}

    public ConversationCorrection(Conversation conversation, String originalText, String correctedText, String explanation, String type) {
        this.conversation = conversation;
        this.originalText = originalText;
        this.correctedText = correctedText;
        this.explanation = explanation;
        this.type = type;
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

    public String getOriginalText() {
        return originalText;
    }

    public void setOriginalText(String originalText) {
        this.originalText = originalText;
    }

    public String getCorrectedText() {
        return correctedText;
    }

    public void setCorrectedText(String correctedText) {
        this.correctedText = correctedText;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
