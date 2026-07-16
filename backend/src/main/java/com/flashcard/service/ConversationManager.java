package com.flashcard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.model.*;
import com.flashcard.repository.*;
import com.flashcard.service.ai.AIProvider;
import com.flashcard.service.ai.PromptBuilder;
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
    
    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final ConversationCorrectionRepository correctionRepository;
    private final SpeakingStatisticsRepository statisticsRepository;
    private final ReviewRecommendationRepository recommendationRepository;
    private final UserRepository userRepository;
    private final PromptBuilder promptBuilder;
    private final AIProvider aiProvider;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConversationManager(ConversationRepository conversationRepository,
                               ConversationMessageRepository messageRepository,
                               ConversationCorrectionRepository correctionRepository,
                               SpeakingStatisticsRepository statisticsRepository,
                               ReviewRecommendationRepository recommendationRepository,
                               UserRepository userRepository,
                               PromptBuilder promptBuilder,
                               AIProvider aiProvider) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.correctionRepository = correctionRepository;
        this.statisticsRepository = statisticsRepository;
        this.recommendationRepository = recommendationRepository;
        this.userRepository = userRepository;
        this.promptBuilder = promptBuilder;
        this.aiProvider = aiProvider;
    }

    @Transactional
    public Conversation startSession(Long userId, String scenario, String jlptLevel) {
        // Deactivate any existing active session first
        Optional<Conversation> activeOpt = conversationRepository.findActiveConversationByUserId(userId);
        activeOpt.ifPresent(c -> {
            c.setStatus("COMPLETED");
            c.setEndedAt(LocalDateTime.now());
            conversationRepository.save(c);
        });

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Conversation conversation = new Conversation(user, scenario, jlptLevel);
        return conversationRepository.save(conversation);
    }

    @Transactional(readOnly = true)
    public List<Conversation> getSessionHistory(Long userId) {
        return conversationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Conversation getSession(Long id) {
        return conversationRepository.findById(id).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ConversationMessage> getSessionMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    @Transactional(readOnly = true)
    public List<ConversationCorrection> getSessionCorrections(Long conversationId) {
        return correctionRepository.findByConversationIdOrderByCreatedAtDesc(conversationId);
    }

    @Transactional(readOnly = true)
    public Optional<ReviewRecommendation> getSessionRecommendations(Long conversationId) {
        return recommendationRepository.findByConversationId(conversationId);
    }

    /**
     * Handles user message, triggers AI streaming, separates Dialogue from JSON Analysis,
     * streams back dialogue text chunks, and saves analytical data asynchronously.
     */
    public void processUserMessage(Long conversationId, String userText, Consumer<String> dialogueChunkConsumer, Runnable onComplete, Consumer<Throwable> onError) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // 1. Save user message to database
        ConversationMessage userMessage = new ConversationMessage(conversation, "USER", userText, null);
        messageRepository.save(userMessage);

        // 2. Load context message history
        List<ConversationMessage> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        
        List<Map<String, String>> promptMessages = new ArrayList<>();
        // Add System Prompt
        String systemPrompt = promptBuilder.buildSystemPrompt(conversation.getUser(), conversation.getScenario(), conversation.getJlptLevel());
        promptMessages.add(Map.of("role", "system", "content", systemPrompt));

        // Add history messages
        for (ConversationMessage msg : history) {
            String role = msg.getSender().equals("USER") ? "user" : "assistant";
            // For assistant, rebuild the prompt format including [DIALOGUE] block to keep context in character
            String content = msg.getSender().equals("USER") 
                    ? msg.getMessageText() 
                    : "[DIALOGUE]\n" + msg.getMessageText() + "\n[ANALYSIS]\n" + (msg.getRawAnalysisJson() != null ? msg.getRawAnalysisJson() : "{}");
            promptMessages.add(Map.of("role", role, "content", content));
        }

        // Keep track of total streaming response to parse later
        final StringBuilder fullResponseBuilder = new StringBuilder();
        // Keep track of how many characters of dialogue have been sent to client
        final int[] sentLength = {0};
        final boolean[] analysisReached = {false};
        
        aiProvider.streamChat(promptMessages, chunk -> {
            if (chunk == null || chunk.equals("null") || chunk.trim().isEmpty()) {
                return;
            }
            
            fullResponseBuilder.append(chunk);
            String fullStr = fullResponseBuilder.toString();
            
            // Check if we reached the [ANALYSIS] section
            int analysisIndex = fullStr.indexOf("[ANALYSIS]");
            if (analysisIndex != -1) {
                analysisReached[0] = true;
                // Send any remaining dialogue before the [ANALYSIS] tag
                if (analysisIndex > sentLength[0]) {
                    String remainingDialogue = fullStr.substring(sentLength[0], analysisIndex);
                    remainingDialogue = remainingDialogue.replace("[DIALOGUE]", "");
                    if (!remainingDialogue.isEmpty()) {
                        dialogueChunkConsumer.accept(remainingDialogue);
                    }
                    sentLength[0] = analysisIndex;
                }
            } else if (!analysisReached[0]) {
                // We are still in [DIALOGUE] section, but keep a safety buffer of 12 characters 
                // to prevent leaking partial "[ANALYSIS]" tag (e.g. "[ANAL")
                int safeLength = fullStr.length() - 12;
                if (safeLength > sentLength[0]) {
                    String safeChunk = fullStr.substring(sentLength[0], safeLength);
                    safeChunk = safeChunk.replace("[DIALOGUE]", "");
                    dialogueChunkConsumer.accept(safeChunk);
                    sentLength[0] = safeLength;
                }
            }
        }, error -> {
            log.error("AI response stream error in session {}", conversationId, error);
            onError.accept(error);
        }, () -> {
            // Processing complete
            try {
                String fullStr = fullResponseBuilder.toString();
                String finalDialogue = "";
                String finalAnalysis = "";
                
                int analysisIndex = fullStr.indexOf("[ANALYSIS]");
                if (analysisIndex != -1) {
                    finalDialogue = fullStr.substring(0, analysisIndex).replace("[DIALOGUE]", "").trim();
                    finalAnalysis = fullStr.substring(analysisIndex + "[ANALYSIS]".length()).trim();
                    
                    // Send any remaining dialogue characters that were held back in buffer
                    if (analysisIndex > sentLength[0]) {
                        String remaining = fullStr.substring(sentLength[0], analysisIndex).replace("[DIALOGUE]", "");
                        if (!remaining.isEmpty()) {
                            dialogueChunkConsumer.accept(remaining);
                        }
                    }
                } else {
                    finalDialogue = fullStr.replace("[DIALOGUE]", "").trim();
                    // Send all remaining dialogue in buffer
                    if (fullStr.length() > sentLength[0]) {
                        String remaining = fullStr.substring(sentLength[0]).replace("[DIALOGUE]", "");
                        if (!remaining.isEmpty()) {
                            dialogueChunkConsumer.accept(remaining);
                        }
                    }
                }

                // Save AI message and background analysis
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
        messageRepository.save(aiMessage);

        if (analysisJson != null && !analysisJson.isEmpty()) {
            try {
                // Parse analysis JSON to create corrections
                JsonNode root = objectMapper.readTree(analysisJson);
                JsonNode correctionsNode = root.path("corrections");
                if (correctionsNode.isArray()) {
                    for (JsonNode corr : correctionsNode) {
                        ConversationCorrection correction = new ConversationCorrection(
                                conversation,
                                corr.path("original").asText(),
                                corr.path("corrected").asText(),
                                corr.path("explanation").asText(),
                                corr.path("type").asText("GRAMMAR")
                        );
                        correctionRepository.save(correction);
                    }
                }
                
                // Update speaking statistics dynamically
                updateUserStats(conversation.getUser().getId(), root);
            } catch (Exception e) {
                log.warn("Failed to parse AI Analysis JSON during conversation stream: {}", analysisJson, e);
            }
        }
    }

    private void updateUserStats(Long userId, JsonNode analysisNode) {
        try {
            SpeakingStatistics stats = statisticsRepository.findByUserId(userId)
                    .orElseGet(() -> {
                        User u = userRepository.findById(userId).orElseThrow();
                        return new SpeakingStatistics(u);
                    });

            double deltaConfidence = analysisNode.path("confidenceScore").asDouble(0.85);
            double deltaPoliteness = analysisNode.path("politenessScore").asDouble(0.85);
            double deltaNaturalness = analysisNode.path("naturalnessScore").asDouble(0.85);
            
            // Increment total session counts and recalculate moving averages
            int count = stats.getTotalSessions();
            stats.setConfidenceScore(((stats.getConfidenceScore() * count) + deltaConfidence) / (count + 1));
            stats.setFluencyScore(((stats.getFluencyScore() * count) + deltaNaturalness) / (count + 1));
            
            // Check corrections to calculate grammar/vocab accuracy
            JsonNode corrections = analysisNode.path("corrections");
            int errorCount = corrections.isArray() ? corrections.size() : 0;
            double currentAccuracy = errorCount == 0 ? 1.0 : Math.max(0.2, 1.0 - (errorCount * 0.15));
            stats.setGrammarAccuracy(((stats.getGrammarAccuracy() * count) + currentAccuracy) / (count + 1));
            stats.setVocabularyScore(((stats.getVocabularyScore() * count) + deltaPoliteness) / (count + 1));
            
            statisticsRepository.save(stats);
        } catch (Exception e) {
            log.error("Failed to update user statistics for user {}", userId, e);
        }
    }

    /**
     * Ends conversation session and generates summary & recommendations
     */
    @Transactional
    public Conversation endSession(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        if (!"ACTIVE".equals(conversation.getStatus())) {
            return conversation;
        }

        conversation.setStatus("COMPLETED");
        conversation.setEndedAt(LocalDateTime.now());

        // Generate session report & reviews asynchronously
        generateEndSessionReport(conversation);

        return conversationRepository.save(conversation);
    }

    private void generateEndSessionReport(Conversation conversation) {
        CompletableFuture.runAsync(() -> {
            try {
                List<ConversationMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
                
                StringBuilder dialogueLog = new StringBuilder();
                for (ConversationMessage msg : messages) {
                    dialogueLog.append(msg.getSender()).append(": ").append(msg.getMessageText()).append("\n");
                }

                String apiKey = getApiKey();
                if (apiKey == null) {
                    log.warn("DEEPSEEK_API_KEY is not configured, skipping end session report generation.");
                    return;
                }

                String prompt = String.format(
                    "Hãy tạo báo cáo tổng kết học tập tiếng Nhật dựa trên nội dung cuộc hội thoại đóng vai sau:\n" +
                    "Kịch bản kịch tính: %s\n" +
                    "Trình độ: %s\n\n" +
                    "Hội thoại:\n%s\n\n" +
                    "Hãy trả về JSON duy nhất không bọc markdown block, chứa các thuộc tính sau:\n" +
                    "{\n" +
                    "  \"summary\": \"Tóm tắt nội dung cuộc trò chuyện ngắn gọn bằng tiếng Việt\",\n" +
                    "  \"grammarScore\": 0.85 (điểm từ 0 đến 1),\n" +
                    "  \"vocabularyScore\": 0.80 (điểm từ 0 đến 1),\n" +
                    "  \"naturalnessScore\": 0.75 (điểm từ 0 đến 1),\n" +
                    "  \"strongPoints\": [\"Điểm mạnh 1\", \"Điểm mạnh 2\"],\n" +
                    "  \"weakPoints\": [\"Điểm yếu cần khắc phục 1\", \"Điểm yếu cần khắc phục 2\"],\n" +
                    "  \"recommendedVocab\": [{\"word\": \"từ mới\", \"reading\": \"cách đọc\", \"meaning\": \"nghĩa tiếng Việt\"}],\n" +
                    "  \"recommendedGrammar\": [{\"grammar\": \"ngữ pháp N3\", \"meaning\": \"nghĩa\", \"example\": \"ví dụ\"}],\n" +
                    "  \"exerciseFlashcards\": [{\"front\": \"Câu hỏi/Mặt trước\", \"back\": \"Giải thích/Đáp án\"}],\n" +
                    "  \"exerciseQuiz\": {\n" +
                    "     \"quizzes\": [\n" +
                    "        { \"question\": \"câu hỏi trắc nghiệm điền từ\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": \"đáp án đúng\", \"explanation\": \"giải thích ngắn gọn\" }\n" +
                    "     ]\n" +
                    "  }\n" +
                    "}",
                    conversation.getScenario(),
                    conversation.getJlptLevel(),
                    dialogueLog.toString()
                );

                Map<String, Object> requestBodyMap = Map.of(
                    "model", "deepseek-v4-flash",
                    "response_format", Map.of("type", "json_object"),
                    "messages", new Object[]{
                        Map.of("role", "system", "content", "Bạn là một giám khảo tiếng Nhật chuyên nghiệp. Bạn trả về duy nhất định dạng JSON báo cáo kết quả buổi học."),
                        Map.of("role", "user", "content", prompt)
                    }
                );
                
                String requestBody = objectMapper.writeValueAsString(requestBodyMap);
                HttpClient client = HttpClient.newHttpClient();
                
                HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .timeout(Duration.ofSeconds(30))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    String contentJson = root.path("choices").get(0).path("message").path("content").asText().trim();
                    
                    // Clean potential markdown wrap
                    if (contentJson.startsWith("```json")) {
                        contentJson = contentJson.substring(7);
                    }
                    if (contentJson.endsWith("```")) {
                        contentJson = contentJson.substring(0, contentJson.length() - 3);
                    }
                    contentJson = contentJson.trim();

                    JsonNode reportNode = objectMapper.readTree(contentJson);

                    // Update conversation summary
                    conversation.setSummary(reportNode.path("summary").asText());
                    conversationRepository.save(conversation);

                    // Save Review Recommendations
                    ReviewRecommendation rec = new ReviewRecommendation(conversation);
                    rec.setRecommendedVocab(objectMapper.writeValueAsString(reportNode.path("recommendedVocab")));
                    rec.setRecommendedGrammar(objectMapper.writeValueAsString(reportNode.path("recommendedGrammar")));
                    rec.setExerciseFlashcards(objectMapper.writeValueAsString(reportNode.path("exerciseFlashcards")));
                    rec.setExerciseQuiz(objectMapper.writeValueAsString(reportNode.path("exerciseQuiz")));
                    recommendationRepository.save(rec);

                    // Update speaking stats sessions
                    SpeakingStatistics stats = statisticsRepository.findByUserId(conversation.getUser().getId())
                            .orElseGet(() -> new SpeakingStatistics(conversation.getUser()));
                    stats.setTotalSessions(stats.getTotalSessions() + 1);
                    statisticsRepository.save(stats);
                    
                    log.info("Successfully generated end of session report for conversation {}", conversation.getId());
                }
            } catch (Exception e) {
                log.error("Failed to generate end of session report for conversationId: {}", conversation.getId(), e);
            }
        });
    }

    private String getApiKey() {
        String apiKey = System.getenv("DEEPSEEK_API_KEY");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getProperty("DEEPSEEK_API_KEY");
        }
        return (apiKey == null || apiKey.trim().isEmpty()) ? null : apiKey;
    }
}
