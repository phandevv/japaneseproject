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

@Service
public class DeepSeekEnrichmentService {

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
        // Retrieve API key from environment variable
        String apiKey = System.getenv("DEEPSEEK_API_KEY");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getProperty("DEEPSEEK_API_KEY");
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            System.err.println("WARNING: DEEPSEEK_API_KEY is not set. Skipping enrichment.");
            return vocab;
        }

        try {
            String prompt = String.format(
                "Bạn là một chuyên gia tiếng Nhật. Hãy giúp tôi tạo câu ví dụ và tìm các từ vựng liên quan cho từ tiếng Nhật sau:\n" +
                "Từ Kanji (hoặc Hiragana nếu không có Kanji): %s\n" +
                "Cách đọc (Hiragana): %s\n" +
                "Nghĩa tiếng Việt: %s\n\n" +
                "Hãy phản hồi duy nhất dưới dạng JSON có cấu trúc sau (không kèm markdown block hay bất kỳ văn bản nào khác ngoài JSON):\n" +
                "{\n" +
                "  \"sampleSentence\": \"câu ví dụ tiếng Nhật (có Kanji nếu có)\",\n" +
                "  \"sampleReading\": \"cách đọc Hiragana của câu ví dụ\",\n" +
                "  \"sampleTranslation\": \"dịch nghĩa tiếng Việt của câu ví dụ\",\n" +
                "  \"kanjiWords\": [\n" +
                "    {\n" +
                "      \"word\": \"từ khác chứa Kanji của từ gốc (tối đa 3 từ)\",\n" +
                "      \"reading\": \"cách đọc\",\n" +
                "      \"meaning\": \"nghĩa tiếng Việt\"\n" +
                "    }\n" +
                "  ]\n" +
                "}",
                vocab.getKanji() != null && !vocab.getKanji().isEmpty() ? vocab.getKanji() : vocab.getHiragana(),
                vocab.getHiragana(),
                vocab.getMeaning()
            );

            // Construct payload compatible with DeepSeek chat model
            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-chat",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là một trợ lý thông thái phản hồi duy nhất định dạng JSON."),
                    Map.of("role", "user", "content", prompt)
                }
            );
            String requestBody = objectMapper.writeValueAsString(requestBodyMap);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.deepseek.com/v1/chat/completions"))
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
                System.err.println("DeepSeek API responded with error status: " + response.statusCode() + ", body: " + response.body());
            }

        } catch (Exception e) {
            System.err.println("Failed to enrich vocabulary from DeepSeek API: " + e.getMessage());
            e.printStackTrace();
        }

        return vocab;
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
