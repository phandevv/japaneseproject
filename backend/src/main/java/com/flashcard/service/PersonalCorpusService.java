package com.flashcard.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.model.GrammarReview;
import com.flashcard.model.User;
import com.flashcard.model.WordReview;
import com.flashcard.repository.GrammarReviewRepository;
import com.flashcard.repository.WordReviewRepository;

@Service
public class PersonalCorpusService {

    private final WordReviewRepository wordReviewRepository;
    private final GrammarReviewRepository grammarReviewRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    // Bulkhead pattern for personal corpus generation
    private final Semaphore bulkheadSemaphore = new Semaphore(50);

    @Autowired
    public PersonalCorpusService(WordReviewRepository wordReviewRepository,
                                 GrammarReviewRepository grammarReviewRepository,
                                 ObjectMapper objectMapper) {
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    /**
     * Generate customized Japanese reading material prioritizing words and grammar already learned.
     */
    public Map<String, Object> generatePersonalReading(User user) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            throw new RuntimeException("Hệ thống AI đang bận xử lý yêu cầu ngữ liệu. Vui lòng thử lại sau!");
        }

        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                throw new RuntimeException("Chưa cấu hình DEEPSEEK_API_KEY.");
            }

            // 1. Get learned words
            List<WordReview> learnedWords = wordReviewRepository.findAllLearnedByUser(user);
            List<String> words = learnedWords.stream()
                    .map(wr -> wr.getVocabulary().getKanji() != null && !wr.getVocabulary().getKanji().isEmpty() 
                            ? wr.getVocabulary().getKanji() 
                            : wr.getVocabulary().getHiragana())
                    .limit(30) // limit to avoid massive context
                    .collect(Collectors.toList());

            // 2. Get learned grammar
            List<GrammarReview> learnedGrammars = grammarReviewRepository.findByUserIdAndIsLearned(user.getId(), true);
            List<String> grammars = learnedGrammars.stream()
                    .map(gr -> gr.getGrammarCard().getGrammar())
                    .limit(15)
                    .collect(Collectors.toList());

            String prompt = String.format(
                "Bạn là một giảng viên tiếng Nhật bản xứ chuyên nghiệp. Hãy viết một đoạn văn đọc hiểu (Reading Passage) ngắn gọn bằng tiếng Nhật cho học viên.\n\n" +
                "YÊU CẦU QUAN TRỌNG NHẤT:\n" +
                "- ƯU TIÊN tối đa việc sử dụng các từ vựng và ngữ pháp sau mà học viên ĐÃ HỌC:\n" +
                "  + Từ vựng đã học: %s\n" +
                "  + Ngữ pháp đã học: %s\n" +
                "- Nếu học viên chưa học từ nào (danh sách trống), hãy tự động tạo một đoạn văn trình độ N5 đơn giản nhất dùng các từ thông dụng như: 食べる, 食事, 日本, 友達.\n" +
                "- Viết câu văn tự nhiên, có kèm cách đọc Hiragana cho các chữ Hán khó.\n" +
                "- Dịch nghĩa tiếng Việt đầy đủ cho đoạn văn.\n" +
                "- Tạo một câu hỏi trắc nghiệm đọc hiểu (Quiz) liên quan đến nội dung đoạn văn.\n\n" +
                "Trả về duy nhất JSON định dạng sau (không markdown, không giải thích ngoài lề):\n" +
                "{\n" +
                "  \"title\": \"Tiêu đề đoạn văn\",\n" +
                "  \"titleReading\": \"Tiêu đề bằng Hiragana\",\n" +
                "  \"passage\": \"Nội dung đoạn văn tiếng Nhật\",\n" +
                "  \"passageReading\": \"Hiragana toàn bộ đoạn văn\",\n" +
                "  \"translation\": \"Bản dịch nghĩa tiếng Việt\",\n" +
                "  \"quiz\": {\n" +
                "     \"question\": \"Câu hỏi trắc nghiệm tiếng Việt\",\n" +
                "     \"options\": [\"Đáp án A\", \"Đáp án B\", \"Đáp án C\", \"Đáp án D\"],\n" +
                "     \"answer\": \"Đáp án đúng chính xác khớp với options\",\n" +
                "     \"explanation\": \"Lời giải thích tại sao chọn đáp án này bằng tiếng Việt\"\n" +
                "  }\n" +
                "}",
                words.isEmpty() ? "(trống)" : String.join(", ", words),
                grammars.isEmpty() ? "(trống)" : String.join(", ", grammars)
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "max_tokens", 30000,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là trợ lý giảng dạy tiếng Nhật. Bạn chỉ phản hồi bằng định dạng JSON."),
                    Map.of("role", "user", "content", prompt)
                }
            );

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("API error status: " + response.statusCode() + ", body: " + response.body());
            }

            String jsonContent = extractJsonContent(response.body());
            return cleanAndParseJson(jsonContent);
        } finally {
            bulkheadSemaphore.release();
        }
    }

    /**
     * Generate customized conversational dialogues.
     */
    public Map<String, Object> generatePersonalConversation(User user) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            throw new RuntimeException("Hệ thống AI đang bận. Vui lòng thử lại sau!");
        }

        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                throw new RuntimeException("Chưa cấu hình API Key.");
            }

            List<WordReview> learnedWords = wordReviewRepository.findAllLearnedByUser(user);
            List<String> words = learnedWords.stream()
                    .map(wr -> wr.getVocabulary().getKanji() != null && !wr.getVocabulary().getKanji().isEmpty()
                            ? wr.getVocabulary().getKanji()
                            : wr.getVocabulary().getHiragana())
                    .limit(25)
                    .collect(Collectors.toList());

            List<GrammarReview> learnedGrammars = grammarReviewRepository.findByUserIdAndIsLearned(user.getId(), true);
            List<String> grammars = learnedGrammars.stream()
                    .map(gr -> gr.getGrammarCard().getGrammar())
                    .limit(10)
                    .collect(Collectors.toList());

            String prompt = String.format(
                "Bạn là giáo viên tiếng Nhật. Hãy tạo một cuộc hội thoại ngắn (4-6 lượt nói) giữa 2 nhân vật A và B bằng tiếng Nhật.\n\n" +
                "YÊU CẦU:\n" +
                "- Sử dụng tối đa các từ vựng và ngữ pháp học viên đã biết để ôn tập:\n" +
                "  + Từ vựng: %s\n" +
                "  + Ngữ pháp: %s\n" +
                "- Tình huống hội thoại tự nhiên, đời sống.\n" +
                "- Trả về định dạng JSON thuần túy:\n" +
                "{\n" +
                "  \"scenario\": \"Bối cảnh cuộc hội thoại (tiếng Việt)\",\n" +
                "  \"dialogues\": [\n" +
                "     { \"speaker\": \"A\", \"ja\": \"câu tiếng Nhật\", \"reading\": \"Hiragana\", \"vi\": \"dịch tiếng Việt\" }\n" +
                "  ]\n" +
                "}",
                words.isEmpty() ? "(trống)" : String.join(", ", words),
                grammars.isEmpty() ? "(trống)" : String.join(", ", grammars)
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "max_tokens", 30000,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là trợ lý tạo hội thoại tiếng Nhật. Phản hồi dạng JSON."),
                    Map.of("role", "user", "content", prompt)
                }
            );

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("API error status: " + response.statusCode() + ", body: " + response.body());
            }

            String jsonContent = extractJsonContent(response.body());
            return cleanAndParseJson(jsonContent);
        } finally {
            bulkheadSemaphore.release();
        }
    }

    private String extractJsonContent(String responseBody) throws Exception {
        if (responseBody == null || responseBody.trim().isEmpty()) {
            throw new RuntimeException("AI phản hồi body trống rỗng.");
        }
        JsonNode root = objectMapper.readTree(responseBody);
        
        if (root.has("error")) {
            JsonNode errorNode = root.path("error");
            String errMsg = errorNode.has("message") ? errorNode.path("message").asText() : errorNode.toString();
            throw new RuntimeException("DeepSeek API Error: " + errMsg);
        }

        JsonNode choices = root.path("choices");
        if (choices.isMissingNode() || !choices.isArray() || choices.isEmpty()) {
            throw new RuntimeException("AI phản hồi cấu trúc không hợp lệ. Response: " + responseBody);
        }

        JsonNode messageNode = choices.get(0).path("message");
        if (messageNode.isMissingNode()) {
            throw new RuntimeException("Thiếu thẻ message trong choices. Response: " + responseBody);
        }

        String content = messageNode.path("content").asText();
        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("Nội dung text trả về từ AI bị rỗng. Response: " + responseBody);
        }

        return content;
    }

    private Map<String, Object> cleanAndParseJson(String content) throws Exception {
        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("AI phản hồi dữ liệu rỗng. Vui lòng thử lại!");
        }
        String cleaned = content.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();
        if (cleaned.isEmpty()) {
            throw new RuntimeException("Dữ liệu JSON rỗng sau khi giải mã.");
        }
        return objectMapper.readValue(cleaned, Map.class);
    }

    private String getApiKey() {
        String apiKey = System.getenv("DEEPSEEK_API_KEY");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getProperty("DEEPSEEK_API_KEY");
        }
        return (apiKey == null || apiKey.trim().isEmpty()) ? null : apiKey;
    }
}
