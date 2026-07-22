package com.flashcard.achievement.model;

import jakarta.persistence.*;

@Entity
@Table(name = "achievements")
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 255)
    private String description;

    @Column(nullable = false, length = 50)
    private String category; // STREAK, VOCABULARY, QUIZ, AI_KAIWA, COMMUNITY

    @Column(length = 255)
    private String icon;

    private int points;

    private int targetValue;

    @Column(length = 50)
    private String parentCode;

    private int treeLevel; // 1, 2, 3, 4, 5

    private int orderInLevel;

    public Achievement() {}

    public Achievement(String code, String title, String description, String category, String icon, int points, int targetValue, String parentCode, int treeLevel, int orderInLevel) {
        this.code = code;
        this.title = title;
        this.description = description;
        this.category = category;
        this.icon = icon;
        this.points = points;
        this.targetValue = targetValue;
        this.parentCode = parentCode;
        this.treeLevel = treeLevel;
        this.orderInLevel = orderInLevel;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public int getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(int targetValue) {
        this.targetValue = targetValue;
    }

    public String getParentCode() {
        return parentCode;
    }

    public void setParentCode(String parentCode) {
        this.parentCode = parentCode;
    }

    public int getTreeLevel() {
        return treeLevel;
    }

    public void setTreeLevel(int treeLevel) {
        this.treeLevel = treeLevel;
    }

    public int getOrderInLevel() {
        return orderInLevel;
    }

    public void setOrderInLevel(int orderInLevel) {
        this.orderInLevel = orderInLevel;
    }
}
