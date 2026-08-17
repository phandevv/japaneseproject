package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.Conversation;
import com.flashcard.knowledge.model.ConversationCorrection;
import com.flashcard.knowledge.model.ConversationMessage;
import com.flashcard.knowledge.model.SpeakingStatistics;
import com.flashcard.srs.model.ReviewRecommendation;

import java.util.List;
import java.util.Optional;

public interface ConversationDataProvider {
    Conversation saveConversation(Conversation conversation);
    Optional<Conversation> findConversationById(Long id);
    Optional<Conversation> findConversationByIdAndUser(Long id, Long userId);
    List<Conversation> findConversationsByUser(Long userId);

    ConversationMessage saveMessage(ConversationMessage message);
    List<ConversationMessage> findMessagesByConversation(Long conversationId);

    ConversationCorrection saveCorrection(ConversationCorrection correction);
    List<ConversationCorrection> findCorrectionsByConversation(Long conversationId);

    SpeakingStatistics saveSpeakingStatistics(SpeakingStatistics statistics);
    Optional<SpeakingStatistics> findSpeakingStatisticsByUser(Long userId);

    ReviewRecommendation saveRecommendation(ReviewRecommendation recommendation);
    Optional<ReviewRecommendation> findRecommendationByConversation(Long conversationId);
}
