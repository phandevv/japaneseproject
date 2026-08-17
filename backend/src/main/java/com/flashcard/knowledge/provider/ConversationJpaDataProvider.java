package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.Conversation;
import com.flashcard.knowledge.model.ConversationCorrection;
import com.flashcard.knowledge.model.ConversationMessage;
import com.flashcard.knowledge.model.SpeakingStatistics;
import com.flashcard.knowledge.repository.ConversationCorrectionRepository;
import com.flashcard.knowledge.repository.ConversationMessageRepository;
import com.flashcard.knowledge.repository.ConversationRepository;
import com.flashcard.knowledge.repository.SpeakingStatisticsRepository;
import com.flashcard.srs.model.ReviewRecommendation;
import com.flashcard.srs.repository.ReviewRecommendationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class ConversationJpaDataProvider implements ConversationDataProvider {

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final ConversationCorrectionRepository correctionRepository;
    private final SpeakingStatisticsRepository statisticsRepository;
    private final ReviewRecommendationRepository recommendationRepository;

    @Autowired
    public ConversationJpaDataProvider(ConversationRepository conversationRepository,
                                       ConversationMessageRepository messageRepository,
                                       ConversationCorrectionRepository correctionRepository,
                                       SpeakingStatisticsRepository statisticsRepository,
                                       ReviewRecommendationRepository recommendationRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.correctionRepository = correctionRepository;
        this.statisticsRepository = statisticsRepository;
        this.recommendationRepository = recommendationRepository;
    }

    @Override
    public Conversation saveConversation(Conversation conversation) {
        return conversationRepository.save(conversation);
    }

    @Override
    public Optional<Conversation> findConversationById(Long id) {
        return conversationRepository.findById(id);
    }

    @Override
    public Optional<Conversation> findConversationByIdAndUser(Long id, Long userId) {
        return conversationRepository.findByIdAndUserId(id, userId);
    }

    @Override
    public List<Conversation> findConversationsByUser(Long userId) {
        return conversationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public ConversationMessage saveMessage(ConversationMessage message) {
        return messageRepository.save(message);
    }

    @Override
    public List<ConversationMessage> findMessagesByConversation(Long conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    @Override
    public ConversationCorrection saveCorrection(ConversationCorrection correction) {
        return correctionRepository.save(correction);
    }

    @Override
    public List<ConversationCorrection> findCorrectionsByConversation(Long conversationId) {
        return correctionRepository.findByConversationIdOrderByCreatedAtDesc(conversationId);
    }

    @Override
    public SpeakingStatistics saveSpeakingStatistics(SpeakingStatistics statistics) {
        return statisticsRepository.save(statistics);
    }

    @Override
    public Optional<SpeakingStatistics> findSpeakingStatisticsByUser(Long userId) {
        return statisticsRepository.findByUserId(userId);
    }

    @Override
    public ReviewRecommendation saveRecommendation(ReviewRecommendation recommendation) {
        return recommendationRepository.save(recommendation);
    }

    @Override
    public Optional<ReviewRecommendation> findRecommendationByConversation(Long conversationId) {
        return recommendationRepository.findByConversationId(conversationId);
    }
}
