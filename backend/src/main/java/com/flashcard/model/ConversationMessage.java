package com.flashcard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_messages")
public class ConversationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "sender", nullable = false, length = 50)
    private String sender; // 'USER' or 'AI'

    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "raw_analysis_json", columnDefinition = "TEXT")
    private String rawAnalysisJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public ConversationMessage() {}

    public ConversationMessage(Conversation conversation, String sender, String messageText, String rawAnalysisJson) {
        this.conversation = conversation;
        this.sender = sender;
        this.messageText = messageText;
        this.rawAnalysisJson = rawAnalysisJson;
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

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getMessageText() {
        return messageText;
    }

    public void setMessageText(String messageText) {
        this.messageText = messageText;
    }

    public String getRawAnalysisJson() {
        return rawAnalysisJson;
    }

    public void setRawAnalysisJson(String rawAnalysisJson) {
        this.rawAnalysisJson = rawAnalysisJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
