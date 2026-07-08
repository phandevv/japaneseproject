package com.flashcard.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_settings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "level"})
})
public class UserSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @Column(name = "level", nullable = false)
    private String level;

    @Column(name = "words_per_day", nullable = false)
    private Integer wordsPerDay;

    @Column(name = "completed_days", length = 1000)
    private String completedDays = "";

    public UserSetting() {}

    public UserSetting(User user, String level, Integer wordsPerDay) {
        this.user = user;
        this.level = level;
        this.wordsPerDay = wordsPerDay;
        this.completedDays = "";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public Integer getWordsPerDay() { return wordsPerDay; }
    public void setWordsPerDay(Integer wordsPerDay) { this.wordsPerDay = wordsPerDay; }
    public String getCompletedDays() { return completedDays; }
    public void setCompletedDays(String completedDays) { this.completedDays = completedDays; }
}
