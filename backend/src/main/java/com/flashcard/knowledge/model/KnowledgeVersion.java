package com.flashcard.knowledge.model;

import com.flashcard.vocabulary.model.Vocabulary;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "knowledge_versions")
public class KnowledgeVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false)
    private String entityType; // 'VOCABULARY' or 'GRAMMAR'

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "content_json", columnDefinition = "TEXT", nullable = false)
    private String contentJson;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public KnowledgeVersion() {}

    public KnowledgeVersion(String entityType, Long entityId, int versionNumber, String contentJson, String createdBy) {
        this.entityType = entityType;
        this.entityId = entityId;
        this.versionNumber = versionNumber;
        this.contentJson = contentJson;
        this.createdBy = createdBy;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public int getVersionNumber() { return versionNumber; }
    public void setVersionNumber(int versionNumber) { this.versionNumber = versionNumber; }

    public String getContentJson() { return contentJson; }
    public void setContentJson(String contentJson) { this.contentJson = contentJson; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

