package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.common.ai.AIProvider;
import com.flashcard.common.ai.PromptBuilder;
import com.flashcard.knowledge.model.Conversation;
import com.flashcard.knowledge.model.ConversationCorrection;
import com.flashcard.knowledge.model.ConversationMessage;
import com.flashcard.knowledge.model.SpeakingStatistics;
import com.flashcard.knowledge.provider.ConversationDataProvider;
import com.flashcard.srs.model.ReviewRecommendation;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;

@Service
public class ConversationManager {

    private static final Logger log = LoggerFactory.getLogger(ConversationManager.class);

    private final ConversationDataProvider conversationDataProvider;
    private final UserDataProvider userDataProvider;
    private final PromptBuilder promptBuilder;
    private final AIProvider aiProvider;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConversationManager(ConversationDataProvider conversationDataProvider,
                               UserDataProvider userDataProvider,
                               PromptBuilder promptBuilder,
                               AIProvider aiProvider) {
        this.conversationDataProvider = conversationDataProvider;
        this.userDataProvider = userDataProvider;
        this.promptBuilder = promptBuilder;
        this.aiProvider = aiProvider;
    }

    @Transactional
    public Conversation startSession(Long userId, String scenario, String jlptLevel) {
        List<Conversation> history = conversationDataProvider.findConversationsByUser(userId);
        for (Conversation c : history) {
            if ("ACTIVE".equals(c.getStatus())) {
                c.setStatus("COMPLETED");
                c.setEndedAt(LocalDateTime.now());
                conversationDataProvider.saveConversation(c);
            }
        }

        User user = userDataProvider.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Conversation conversation = new Conversation(user, scenario, jlptLevel);
        return conversationDataProvider.saveConversation(conversation);
    }

    @Transactional(readOnly = true)
    public List<Conversation> getSessionHistory(Long userId) {
        return conversationDataProvider.findConversationsByUser(userId);
    }

    @Transactional(readOnly = true)
    public Conversation getSession(Long id) {
        return conversationDataProvider.findConversationById(id).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ConversationMessage> getSessionMessages(Long conversationId) {
        return conversationDataProvider.findMessagesByConversation(conversationId);
    }

    @Transactional(readOnly = true)
    public List<ConversationCorrection> getSessionCorrections(Long conversationId) {
        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public Optional<ReviewRecommendation> getSessionRecommendations(Long conversationId) {
        return Optional.empty();
    }

    /**
     * Handles user message, triggers AI streaming, separates Dialogue from JSON Analysis,
     * streams back dialogue text chunks, and saves analytical data asynchronously.
     */
    public void processUserMessage(Long conversationId, String userText, Consumer<String> dialogueChunkConsumer, Runnable onComplete, Consumer<Throwable> onError) {
        Conversation conversation = conversationDataProvider.findConversationById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // 1. Save user message to database
        ConversationMessage userMessage = new ConversationMessage(conversation, "USER", userText, null);
        conversationDataProvider.saveMessage(userMessage);

        // 2. Load context message history
        List<ConversationMessage> history = conversationDataProvider.findMessagesByConversation(conversationId);

        List<Map<String, String>> promptMessages = new ArrayList<>();
        // Add System Prompt
        String systemPrompt = promptBuilder.buildSystemPrompt(conversation.getUser(), conversation.getScenario(), conversation.getJlptLevel());
        promptMessages.add(Map.of("role", "system", "content", systemPrompt));

        // Add history messages
        for (ConversationMessage msg : history) {
            String role = msg.getSender().equals("USER") ? "user" : "assistant";
            String content = msg.getSender().equals("USER")
                    ? msg.getMessageText()
                    : "[DIALOGUE]\n" + msg.getMessageText() + "\n[ANALYSIS]\n" + (msg.getRawAnalysisJson() != null ? msg.getRawAnalysisJson() : "{}");
            promptMessages.add(Map.of("role", role, "content", content));
        }

        // 3. Setup Streaming State Machine
        StringBuilder fullResponseBuffer = new StringBuilder();
        final boolean[] analysisStarted = {false};
        final int[] sentLength = {0};

        aiProvider.streamChat(promptMessages, chunk -> {
            fullResponseBuffer.append(chunk);
            String currentFull = fullResponseBuffer.toString();

            if (!analysisStarted[0]) {
                if (currentFull.contains("[ANALYSIS]")) {
                    analysisStarted[0] = true;
                    int splitIdx = currentFull.indexOf("[ANALYSIS]");
                    String completeDialogue = currentFull.substring(0, splitIdx);
                    if (completeDialogue.startsWith("[DIALOGUE]")) {
                        completeDialogue = completeDialogue.substring(10);
                    }
                    if (completeDialogue.length() > sentLength[0]) {
                        String remainingChunk = completeDialogue.substring(sentLength[0]);
                        dialogueChunkConsumer.accept(remainingChunk);
                        sentLength[0] = completeDialogue.length();
                    }
                } else {
                    String cleanCurrent = currentFull;
                    if (cleanCurrent.startsWith("[DIALOGUE]")) {
                        cleanCurrent = cleanCurrent.substring(10);
                    }
                    if (cleanCurrent.length() > sentLength[0]) {
                        String incrementalChunk = cleanCurrent.substring(sentLength[0]);
                        dialogueChunkConsumer.accept(incrementalChunk);
                        sentLength[0] = cleanCurrent.length();
                    }
                }
            }
        }, error -> {
            log.error("Failed in streaming AI response", error);
        }, () -> {
            try {
                String fullStr = fullResponseBuffer.toString();
                String finalDialogue = "";
                String finalAnalysis = null;

                if (fullStr.contains("[ANALYSIS]")) {
                    String[] parts = fullStr.split("\\[ANALYSIS\\]", 2);
                    finalDialogue = parts[0].replace("[DIALOGUE]", "").trim();
                    if (parts.length > 1) {
                        finalAnalysis = parts[1].trim();
                        if (finalAnalysis.startsWith("```json")) {
                            finalAnalysis = finalAnalysis.substring(7);
                        }
                        if (finalAnalysis.endsWith("```")) {
                            finalAnalysis = finalAnalysis.substring(0, finalAnalysis.length() - 3);
                        }
                        finalAnalysis = finalAnalysis.trim();
                    }
                } else {
                    finalDialogue = fullStr.replace("[DIALOGUE]", "").trim();
                }

                saveAiResponse(conversation, finalDialogue, finalAnalysis);
            } catch (Exception e) {
                log.error("Failed to save AI response data", e);
            }
            onComplete.run();
        });
    }

    @Transactional
    protected void saveAiResponse(Conversation conversation, String dialogue, String analysisJson) {
        ConversationMessage aiMessage = new ConversationMessage(conversation, "AI", dialogue, analysisJson);
        conversationDataProvider.saveMessage(aiMessage);

        if (analysisJson != null && !analysisJson.isEmpty()) {
            try {
                JsonNode root = objectMapper.readTree(analysisJson);
                updateUserStats(conversation.getUser().getId(), root);
            } catch (Exception e) {
                log.warn("Failed to parse AI Analysis JSON during conversation stream: {}", analysisJson, e);
            }
        }
    }

    private void updateUserStats(Long userId, JsonNode analysisNode) {
        try {
            SpeakingStatistics stats = conversationDataProvider.findSpeakingStatisticsByUser(userId)
                    .orElseGet(() -> {
                        User u = userDataProvider.findById(userId).orElseThrow();
                        return new SpeakingStatistics(u);
                    });

            double deltaConfidence = analysisNode.path("confidenceScore").asDouble(0.85);
            double deltaPoliteness = analysisNode.path("politenessScore").asDouble(0.85);
            double deltaNaturalness = analysisNode.path("naturalnessScore").asDouble(0.85);

            int count = stats.getTotalSessions();
            stats.setConfidenceScore(((stats.getConfidenceScore() * count) + deltaConfidence) / (count + 1));
            stats.setFluencyScore(((stats.getFluencyScore() * count) + deltaNaturalness) / (count + 1));

            JsonNode corrections = analysisNode.path("corrections");
            int errorCount = corrections.isArray() ? corrections.size() : 0;
            double currentAccuracy = errorCount == 0 ? 1.0 : Math.max(0.2, 1.0 - (errorCount * 0.15));
            stats.setGrammarAccuracy(((stats.getGrammarAccuracy() * count) + currentAccuracy) / (count + 1));
            stats.setVocabularyScore(((stats.getVocabularyScore() * count) + deltaPoliteness) / (count + 1));

            conversationDataProvider.saveSpeakingStatistics(stats);
        } catch (Exception e) {
            log.error("Failed to update user statistics for user {}", userId, e);
        }
    }

    @Transactional
    public Conversation endSession(Long conversationId) {
        Conversation conversation = conversationDataProvider.findConversationById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        if (!"ACTIVE".equals(conversation.getStatus())) {
            return conversation;
        }

        conversation.setStatus("COMPLETED");
        conversation.setEndedAt(LocalDateTime.now());
        return conversationDataProvider.saveConversation(conversation);
    }
}
