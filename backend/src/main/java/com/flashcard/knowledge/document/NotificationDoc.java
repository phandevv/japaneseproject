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

@Document(collection = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "user_read_idx", def = "{'userId': 1, 'isRead': 1, 'createdAt': -1}")
public class NotificationDoc {

    @Id
    private Long id;

    private Long userId;
    private String title;
    private String message;
    private String type;

    @Builder.Default
    private boolean isRead = false;

    private Long relatedEntityId;

    @CreatedDate
    private LocalDateTime createdAt;
}
