package com.flashcard.analytics.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Document(collection = "streak_repair_logs")
public class StreakRepairLogDoc {

    @Id
    private Long id;

    @Indexed
    private Long userId;

    private LocalDate targetDate;     // Missed date being repaired
    private LocalDate repairedOnDate; // Date on which the user performed the repair
    private Instant createdAt;

    public StreakRepairLogDoc() {}

    public StreakRepairLogDoc(Long id, Long userId, LocalDate targetDate, LocalDate repairedOnDate, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.targetDate = targetDate;
        this.repairedOnDate = repairedOnDate;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public void setTargetDate(LocalDate targetDate) {
        this.targetDate = targetDate;
    }

    public LocalDate getRepairedOnDate() {
        return repairedOnDate;
    }

    public void setRepairedOnDate(LocalDate repairedOnDate) {
        this.repairedOnDate = repairedOnDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
