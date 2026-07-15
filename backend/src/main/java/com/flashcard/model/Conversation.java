package com.flashcard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "scenario", nullable = false, length = 100)
    private String scenario;

    @Column(name = "jlpt_level", nullable = false, length = 10)
    private String jlptLevel;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "ACTIVE";

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    public Conversation() {}

    public Conversation(User user, String scenario, String jlptLevel) {
        this.user = user;
        this.scenario = scenario;
        this.jlptLevel = jlptLevel;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getScenario() {
        return scenario;
    }

    public void setScenario(String scenario) {
        this.scenario = scenario;
    }

    public String getJlptLevel() {
        return jlptLevel;
    }

    public void setJlptLevel(String jlptLevel) {
        this.jlptLevel = jlptLevel;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }
}
