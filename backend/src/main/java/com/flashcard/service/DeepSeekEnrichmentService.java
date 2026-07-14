package com.flashcard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.model.Vocabulary;
import com.flashcard.repository.VocabularyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.concurrent.Semaphore;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class DeepSeekEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekEnrichmentService.class);

    // Bulkhead Pattern: limit concurrent AI requests to 5 to protect server resources
    private final Semaphore bulkheadSemaphore = new Semaphore(5);

    private final VocabularyRepository vocabularyRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public DeepSeekEnrichmentService(VocabularyRepository vocabularyRepository, ObjectMapper objectMapper) {
        this.vocabularyRepository = vocabularyRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Vocabulary enrichVocabulary(Vocabulary vocab) {
        if (!bulkheadSemaphore.tryAcquire()) {
            log.warn("Bulkhead rejected AI request for vocabulary ID: {} because concurrent limit of 5 is exceeded.", vocab.getId());
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Hệ thống AI đang bận xử lý quá nhiều yêu cầu đồng thời. Vui lòng thử lại sau ít phút!"
            );
        }
        try {
            // Retrieve API key from environment variable
            String apiKey = System.getenv("DEEPSEEK_API_KEY");
            if (apiKey == null || apiKey.trim().isEmpty()) {
                apiKey = System.getProperty("DEEPSEEK_API_KEY");
            }

            if (apiKey == null || apiKey.trim().isEmpty()) {
                log.warn("DEEPSEEK_API_KEY is not set. Skipping enrichment.");
                return vocab;
            }

            try {
                String level = vocab.getLevel() != null ? vocab.getLevel().trim().toUpperCase() : "N3";

                String prompt = String.format(
                    "Bạn là một chuyên gia tiếng Nhật. Hãy tạo câu ví dụ và tìm các từ liên quan cho từ sau:\n" +
                    "Từ: %s\n" +
                    "Cách đọc: %s\n" +
                    "Nghĩa: %s\n" +
                    "Cấp độ JLPT: %s\n\n" +
                    "Yêu cầu về câu ví dụ:\n" +
                    "- Câu phải tự nhiên, minh họa rõ nghĩa và cách dùng của từ\n" +
                    "- Chọn mẫu ngữ pháp phù hợp nhất với từ này ở trình độ %s (không cần cứng nhắc một mẫu nào, hãy chọn mẫu giúp câu nghe tự nhiên nhất)\n" +
                    "- Độ phức tạp tổng thể của câu tương đương trình độ %s\n" +
                    "- Dịch nghĩa câu ví dụ (sampleTranslation) và nghĩa của các từ kanjiWords (meaning) BẮT BUỘC PHẢI DÙNG TIẾNG VIỆT.\n\n" +
                    "LƯU Ý CỰC KỲ QUAN TRỌNG: Tuyệt đối không được dịch nghĩa hoặc giải thích bằng tiếng Trung Quốc hay tiếng Anh. Tất cả các trường giải nghĩa và dịch thuật đều phải được viết bằng tiếng Việt.\n\n" +
                    "Phản hồi chỉ dưới dạng JSON thuần túy (không markdown, không giải thích thêm):\n" +
                    "{\n" +
                    "  \"sampleSentence\": \"câu ví dụ tiếng Nhật\",\n" +
                    "  \"sampleReading\": \"cách đọc Hiragana của câu\",\n" +
                    "  \"sampleTranslation\": \"dịch nghĩa tiếng Việt của câu\",\n" +
                    "  \"kanjiWords\": [\n" +
                    "    { \"word\": \"từ khác chứa cùng Kanji (tối đa 3)\", \"reading\": \"cách đọc\", \"meaning\": \"nghĩa tiếng Việt của từ đó\" }\n" +
                    "  ]\n" +
                    "}",
                    vocab.getKanji() != null && !vocab.getKanji().isEmpty() ? vocab.getKanji() : vocab.getHiragana(),
                    vocab.getHiragana(),
                    vocab.getMeaning(),
                    level,
                    level,
                    level
                );


                // Construct payload compatible with DeepSeek chat model
                Map<String, Object> requestBodyMap = Map.of(
                    "model", "deepseek-chat",
                    "response_format", Map.of("type", "json_object"),
                    "messages", new Object[]{
                        Map.of("role", "system", "content", "Bạn là một trợ lý chuyên gia tiếng Nhật. Bạn phản hồi duy nhất bằng định dạng JSON. Tất cả nội dung dịch nghĩa và giải thích nghĩa BẮT BUỘC phải viết bằng tiếng Việt (không được dùng tiếng Anh hay tiếng Trung Quốc)."),
                        Map.of("role", "user", "content", prompt)
                    }
                );
                String requestBody = objectMapper.writeValueAsString(requestBodyMap);

                HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .timeout(Duration.ofSeconds(20))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    String contentJson = root.path("choices").get(0).path("message").path("content").asText();

                    // Clean potential markdown enclosing tags
                    contentJson = cleanJsonContent(contentJson);

                    JsonNode contentNode = objectMapper.readTree(contentJson);
                    
                    String sampleSentence = contentNode.path("sampleSentence").asText();
                    String sampleReading = contentNode.path("sampleReading").asText();
                    String sampleTranslation = contentNode.path("sampleTranslation").asText();
                    
                    // Serialize kanjiWords back as JSON string for storage
                    JsonNode kanjiWordsNode = contentNode.path("kanjiWords");
                    String kanjiWordsJson = objectMapper.writeValueAsString(kanjiWordsNode);

                    vocab.setSampleSentence(sampleSentence);
                    vocab.setSampleReading(sampleReading);
                    vocab.setSampleTranslation(sampleTranslation);
                    vocab.setKanjiWords(kanjiWordsJson);

                    return vocabularyRepository.save(vocab);
                } else {
                    log.error("DeepSeek API responded with error status: {}, body: {}", response.statusCode(), response.body());
                }

            } catch (Exception e) {
                log.error("Failed to enrich vocabulary from DeepSeek API: {}", e.getMessage());
            }

            return vocab;
        } finally {
            bulkheadSemaphore.release();
        }
    }

    private String cleanJsonContent(String content) {
        if (content == null) return "{}";
        content = content.trim();
        if (content.startsWith("```json")) {
            content = content.substring(7);
        } else if (content.startsWith("```")) {
            content = content.substring(3);
        }
        if (content.endsWith("```")) {
            content = content.substring(0, content.length() - 3);
        }
        return content.trim();
    }
}
