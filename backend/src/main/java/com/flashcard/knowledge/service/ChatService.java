package com.flashcard.knowledge.service;

import com.flashcard.knowledge.model.Conversation;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.user.model.User;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.GrammarReview;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.srs.repository.GrammarReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    // Maximum conversation history turns to keep (each turn = user + assistant)
    private static final int MAX_HISTORY_TURNS = 8;

    // Maximum characters per user message (~150 words)
    public static final int MAX_USER_MESSAGE_CHARS = 600;

    // Compact, token-efficient system prompt
    private static final String SYSTEM_PROMPT =
        "Bạn là trợ lý học tiếng Nhật. Trả lời ngắn gọn, đúng trọng tâm bằng tiếng Việt. " +
        "Chỉ hỗ trợ: dịch thuật, ngữ pháp, từ vựng, phát âm, văn hóa Nhật. " +
        "Nếu câu hỏi ngoài phạm vi, từ chối lịch sự. " +
        "Dùng định dạng rõ ràng: Kanji (ふりがな) - nghĩa.";

    // Bulkhead: limit concurrent chat requests to 50
    private final Semaphore bulkheadSemaphore = new Semaphore(50);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final WordReviewRepository wordReviewRepository;
    private final GrammarReviewRepository grammarReviewRepository;

    @Autowired
    public ChatService(ObjectMapper objectMapper,
                       WordReviewRepository wordReviewRepository,
                       GrammarReviewRepository grammarReviewRepository) {
        this.objectMapper = objectMapper;
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Send a chat message to DeepSeek AI and return the response.
     *
     * @param user      The authenticated user (can be null for guest)
     * @param history   The conversation history (alternating user/assistant messages, limited to last MAX_HISTORY_TURNS)
     * @param userMessage The new user message
     * @return CompletableFuture containing the assistant's reply text
     */
    public CompletableFuture<String> chat(User user, List<Map<String, String>> history, String userMessage) {
        if (!bulkheadSemaphore.tryAcquire()) {
            return CompletableFuture.completedFuture(
                "⚠️ Hệ thống AI đang bận. Vui lòng thử lại sau vài giây!"
            );
        }

        String apiKey = System.getenv("DEEPSEEK_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = System.getProperty("DEEPSEEK_API_KEY");
        }

        if (apiKey == null || apiKey.isBlank()) {
            bulkheadSemaphore.release();
            log.warn("DEEPSEEK_API_KEY not set — chat service unavailable.");
            return CompletableFuture.completedFuture(
                "⚠️ Chưa cấu hình API key cho dịch vụ AI. Vui lòng liên hệ quản trị viên."
            );
        }

        try {
            // Build dynamic system prompt incorporating user's personal corpus (already learned items)
            StringBuilder dynamicSystemPrompt = new StringBuilder(SYSTEM_PROMPT);
            if (user != null) {
                // Fetch up to 20 learned words
                List<WordReview> learnedWords = wordReviewRepository.findAllLearnedByUser(user);
                List<String> words = learnedWords.stream()
                        .map(wr -> wr.getVocabulary().getKanji() != null && !wr.getVocabulary().getKanji().isEmpty()
                                ? wr.getVocabulary().getKanji()
                                : wr.getVocabulary().getHiragana())
                        .limit(20)
                        .collect(Collectors.toList());

                // Fetch up to 8 learned grammar cards
                List<GrammarReview> learnedGrammars = grammarReviewRepository.findByUserIdAndIsLearned(user.getId(), true);
                List<String> grammars = learnedGrammars.stream()
                        .map(gr -> gr.getGrammarCard().getGrammar())
                        .limit(8)
                        .collect(Collectors.toList());

                if (!words.isEmpty() || !grammars.isEmpty()) {
                    dynamicSystemPrompt.append("\n\nHọc viên hiện tại đã biết các từ vựng này: ");
                    dynamicSystemPrompt.append(words.isEmpty() ? "(trống)" : String.join(", ", words));
                    dynamicSystemPrompt.append("\nNgữ pháp đã biết: ");
                    dynamicSystemPrompt.append(grammars.isEmpty() ? "(trống)" : String.join(", ", grammars));
                    dynamicSystemPrompt.append("\nKhi giải thích ngữ pháp, dịch thuật hoặc đưa ra câu ví dụ mẫu, hãy cố gắng liên hệ và sử dụng các từ vựng/ngữ pháp mà học viên đã học này để tối đa hóa cá nhân hóa học tập.");
                }
            }

            // Build message list: system + trimmed history + new user message
            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", dynamicSystemPrompt.toString()));

            // Keep at most MAX_HISTORY_TURNS * 2 messages (user + assistant pairs)
            int historyStart = Math.max(0, history.size() - MAX_HISTORY_TURNS * 2);
            for (int i = historyStart; i < history.size(); i++) {
                Map<String, String> msg = history.get(i);
                messages.add(Map.of("role", msg.get("role"), "content", msg.get("content")));
            }

            // Truncate user message if too long
            String truncatedMessage = userMessage.length() > MAX_USER_MESSAGE_CHARS
                    ? userMessage.substring(0, MAX_USER_MESSAGE_CHARS) + "..."
                    : userMessage;
            messages.add(Map.of("role", "user", "content", truncatedMessage));

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-chat",
                "max_tokens", 2048,
                "temperature", 0.6,
                "messages", messages
            );
            String requestBody = objectMapper.writeValueAsString(requestBodyMap);

            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, java.nio.charset.StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString(java.nio.charset.StandardCharsets.UTF_8))
                    .thenApply(response -> {
                        try {
                            if (response.statusCode() == 200) {
                                JsonNode root = objectMapper.readTree(response.body());
                                return root.path("choices").get(0).path("message").path("content").asText("Xin lỗi, tôi không hiểu câu hỏi này.");
                            } else {
                                log.error("DeepSeek chat API error: status={}, body={}", response.statusCode(), response.body());
                                return "⚠️ Dịch vụ AI tạm thời gặp sự cố (" + response.statusCode() + "). Vui lòng thử lại!";
                            }
                        } catch (Exception e) {
                            log.error("Failed to parse DeepSeek chat response: {}", e.getMessage());
                            return "⚠️ Lỗi xử lý phản hồi từ AI.";
                        }
                    })
                    .exceptionally(ex -> {
                        log.error("Chat API call failed: {}", ex.getMessage());
                        return "⚠️ Không thể kết nối tới dịch vụ AI. Vui lòng kiểm tra kết nối mạng.";
                    })
                    .whenComplete((res, ex) -> bulkheadSemaphore.release());

        } catch (Exception e) {
            log.error("Failed to build chat request: {}", e.getMessage());
            bulkheadSemaphore.release();
            return CompletableFuture.completedFuture("⚠️ Lỗi cấu hình yêu cầu AI.");
        }
    }
}

