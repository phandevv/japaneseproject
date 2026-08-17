package com.flashcard.knowledge.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.knowledge.document.ConversationDoc;
import com.flashcard.knowledge.document.SpeakingStatisticsDoc;
import com.flashcard.knowledge.model.Conversation;
import com.flashcard.knowledge.model.ConversationCorrection;
import com.flashcard.knowledge.model.ConversationMessage;
import com.flashcard.knowledge.model.SpeakingStatistics;
import com.flashcard.knowledge.repository.mongo.ConversationMongoRepository;
import com.flashcard.knowledge.repository.mongo.SpeakingStatisticsMongoRepository;
import com.flashcard.srs.model.ReviewRecommendation;
import com.flashcard.user.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class ConversationMongoDataProvider implements ConversationDataProvider {

    private final ConversationMongoRepository conversationMongoRepository;
    private final SpeakingStatisticsMongoRepository statisticsMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    public ConversationMongoDataProvider(ConversationMongoRepository conversationMongoRepository,
                                         SpeakingStatisticsMongoRepository statisticsMongoRepository,
                                         SequenceGeneratorService sequenceGeneratorService) {
        this.conversationMongoRepository = conversationMongoRepository;
        this.statisticsMongoRepository = statisticsMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @Override
    public Conversation saveConversation(Conversation conversation) {
        ConversationDoc doc;
        if (conversation.getId() == null) {
            conversation.setId(sequenceGeneratorService.generateSequence("conversations_seq"));
            doc = toDoc(conversation);
        } else {
            doc = conversationMongoRepository.findById(conversation.getId()).orElseGet(() -> toDoc(conversation));
            if (conversation.getUser() != null) {
                doc.setUserId(conversation.getUser().getId());
            }
            doc.setScenario(conversation.getScenario());
            doc.setJlptLevel(conversation.getJlptLevel());
            doc.setStatus(conversation.getStatus());
            doc.setSummary(conversation.getSummary());
            doc.setEndedAt(conversation.getEndedAt());
        }
        ConversationDoc saved = conversationMongoRepository.save(doc);
        return toEntity(saved);
    }

    @Override
    public Optional<Conversation> findConversationById(Long id) {
        return conversationMongoRepository.findById(id).map(this::toEntity);
    }

    @Override
    public Optional<Conversation> findConversationByIdAndUser(Long id, Long userId) {
        return conversationMongoRepository.findByIdAndUserId(id, userId).map(this::toEntity);
    }

    @Override
    public List<Conversation> findConversationsByUser(Long userId) {
        return conversationMongoRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
    }

    @Override
    public ConversationMessage saveMessage(ConversationMessage message) {
        if (message.getId() == null) {
            message.setId(sequenceGeneratorService.generateSequence("conversation_messages_seq"));
        }
        if (message.getConversation() != null && message.getConversation().getId() != null) {
            conversationMongoRepository.findById(message.getConversation().getId()).ifPresent(doc -> {
                if (doc.getMessages() == null) {
                    doc.setMessages(new ArrayList<>());
                }
                ConversationDoc.MessageDoc mDoc = ConversationDoc.MessageDoc.builder()
                        .sender(message.getSender())
                        .messageText(message.getMessageText())
                        .rawAnalysisJson(message.getRawAnalysisJson())
                        .createdAt(message.getCreatedAt())
                        .build();
                doc.getMessages().add(mDoc);
                conversationMongoRepository.save(doc);
            });
        }
        return message;
    }

    @Override
    public List<ConversationMessage> findMessagesByConversation(Long conversationId) {
        return conversationMongoRepository.findById(conversationId)
                .map(doc -> {
                    if (doc.getMessages() == null) return Collections.<ConversationMessage>emptyList();
                    Conversation c = toEntity(doc);
                    return doc.getMessages().stream().map(mDoc -> {
                        ConversationMessage m = new ConversationMessage();
                        m.setConversation(c);
                        m.setSender(mDoc.getSender());
                        m.setMessageText(mDoc.getMessageText());
                        m.setRawAnalysisJson(mDoc.getRawAnalysisJson());
                        m.setCreatedAt(mDoc.getCreatedAt());
                        return m;
                    }).collect(Collectors.toList());
                }).orElse(Collections.emptyList());
    }

    @Override
    public ConversationCorrection saveCorrection(ConversationCorrection correction) {
        if (correction.getId() == null) {
            correction.setId(sequenceGeneratorService.generateSequence("conversation_corrections_seq"));
        }
        return correction;
    }

    @Override
    public List<ConversationCorrection> findCorrectionsByConversation(Long conversationId) {
        return Collections.emptyList();
    }

    @Override
    public SpeakingStatistics saveSpeakingStatistics(SpeakingStatistics statistics) {
        SpeakingStatisticsDoc doc;
        if (statistics.getId() == null) {
            statistics.setId(sequenceGeneratorService.generateSequence("speaking_stats_seq"));
            doc = toDoc(statistics);
        } else {
            doc = statisticsMongoRepository.findById(statistics.getId()).orElseGet(() -> toDoc(statistics));
            updateStatsDoc(doc, statistics);
        }
        SpeakingStatisticsDoc saved = statisticsMongoRepository.save(doc);
        return toEntity(saved);
    }

    @Override
    public Optional<SpeakingStatistics> findSpeakingStatisticsByUser(Long userId) {
        return statisticsMongoRepository.findByUserId(userId).map(this::toEntity);
    }

    @Override
    public ReviewRecommendation saveRecommendation(ReviewRecommendation recommendation) {
        if (recommendation.getId() == null) {
            recommendation.setId(sequenceGeneratorService.generateSequence("review_rec_seq"));
        }
        return recommendation;
    }

    @Override
    public Optional<ReviewRecommendation> findRecommendationByConversation(Long conversationId) {
        return Optional.empty();
    }

    // Mapping
    private Conversation toEntity(ConversationDoc doc) {
        if (doc == null) return null;
        Conversation c = new Conversation();
        c.setId(doc.getId());
        if (doc.getUserId() != null) {
            User u = new User();
            u.setId(doc.getUserId());
            c.setUser(u);
        }
        c.setScenario(doc.getScenario());
        c.setJlptLevel(doc.getJlptLevel());
        c.setStatus(doc.getStatus());
        c.setSummary(doc.getSummary());
        c.setCreatedAt(doc.getCreatedAt());
        c.setEndedAt(doc.getEndedAt());
        return c;
    }

    private ConversationDoc toDoc(Conversation c) {
        return ConversationDoc.builder()
                .id(c.getId())
                .userId(c.getUser() != null ? c.getUser().getId() : null)
                .scenario(c.getScenario())
                .jlptLevel(c.getJlptLevel())
                .status(c.getStatus())
                .summary(c.getSummary())
                .createdAt(c.getCreatedAt())
                .endedAt(c.getEndedAt())
                .messages(new ArrayList<>())
                .corrections(new ArrayList<>())
                .build();
    }

    private SpeakingStatistics toEntity(SpeakingStatisticsDoc doc) {
        if (doc == null) return null;
        SpeakingStatistics s = new SpeakingStatistics();
        s.setId(doc.getId());
        if (doc.getUserId() != null) {
            User u = new User();
            u.setId(doc.getUserId());
            s.setUser(u);
        }
        s.setGrammarAccuracy(doc.getGrammarAccuracy());
        s.setVocabularyScore(doc.getVocabularyScore());
        s.setFluencyScore(doc.getFluencyScore());
        s.setConfidenceScore(doc.getConfidenceScore());
        s.setTotalSessions(doc.getTotalSessions());
        s.setUpdatedAt(doc.getUpdatedAt());
        return s;
    }

    private SpeakingStatisticsDoc toDoc(SpeakingStatistics s) {
        return SpeakingStatisticsDoc.builder()
                .id(s.getId())
                .userId(s.getUser() != null ? s.getUser().getId() : null)
                .grammarAccuracy(s.getGrammarAccuracy())
                .vocabularyScore(s.getVocabularyScore())
                .fluencyScore(s.getFluencyScore())
                .confidenceScore(s.getConfidenceScore())
                .totalSessions(s.getTotalSessions())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private void updateStatsDoc(SpeakingStatisticsDoc doc, SpeakingStatistics s) {
        if (s.getUser() != null) {
            doc.setUserId(s.getUser().getId());
        }
        doc.setGrammarAccuracy(s.getGrammarAccuracy());
        doc.setVocabularyScore(s.getVocabularyScore());
        doc.setFluencyScore(s.getFluencyScore());
        doc.setConfidenceScore(s.getConfidenceScore());
        doc.setTotalSessions(s.getTotalSessions());
        doc.setUpdatedAt(s.getUpdatedAt());
    }
}
