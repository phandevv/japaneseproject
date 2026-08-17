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
import java.util.ArrayList;
import java.util.List;

@Document(collection = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "user_status_created_idx", def = "{'userId': 1, 'status': 1, 'createdAt': -1}")
public class ConversationDoc {

    @Id
    private Long id;

    private Long userId;
    private String scenario;
    private String jlptLevel;

    @Builder.Default
    private String status = "ACTIVE";

    private String summary;

    @CreatedDate
    private LocalDateTime createdAt;
    private LocalDateTime endedAt;

    @Builder.Default
    private List<MessageDoc> messages = new ArrayList<>();

    @Builder.Default
    private List<CorrectionDoc> corrections = new ArrayList<>();

    private RecommendationDoc recommendation;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageDoc {
        private String sender; // 'USER' or 'AI'
        private String messageText;
        private String rawAnalysisJson;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CorrectionDoc {
        private String originalText;
        private String correctedText;
        private String explanation;
        private String type;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecommendationDoc {
        private String recommendedFocus;
        private String suggestedVocab;
        private String suggestedGrammar;
        private LocalDateTime createdAt;
    }
}
