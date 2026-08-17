package com.flashcard.knowledge.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "feedbacks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackDoc {

    @Id
    private Long id;

    private Long userId;
    private String title;
    private String content;
    private String type;

    @Builder.Default
    private String status = "PENDING";

    @CreatedDate
    private LocalDateTime createdAt;
}
