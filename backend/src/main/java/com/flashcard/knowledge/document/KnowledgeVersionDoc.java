package com.flashcard.knowledge.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "knowledge_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "entity_type_id_ver_idx", def = "{'entityType': 1, 'entityId': 1, 'versionNumber': -1}")
public class KnowledgeVersionDoc {

    @Id
    private Long id;

    private String entityType; // 'VOCABULARY' or 'GRAMMAR'
    private Long entityId;
    private int versionNumber;
    private String contentJson;
    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;
}
