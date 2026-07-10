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
            String level = vocab.getLevel() != null ? vocab.getLevel() : "N3";
            // Map level label: trim whitespace, uppercase
            level = level.trim().toUpperCase();

            // Build grammar-level description for the prompt
            String grammarGuide;
            switch (level) {
                case "N5":
                    grammarGuide = "N5 (cơ bản nhất: は、が、を、に、で、も、と、〜ます、〜です、〜ない、〜て、〜たい、〜てください、số đếm, thời gian cơ bản)";
                    break;
                case "N4":
                    grammarGuide = "N4 (sơ cấp: 〜てから、〜たあとで、〜なければならない、〜てもいい、〜てはいけない、〜ために、〜そうだ、〜たことがある、〜ながら、普通形)";
                    break;
                case "N3":
                    grammarGuide = "N3 (trung cấp: 〜ようにする、〜ために、〜わけだ、〜らしい、〜ようだ、〜ば〜ほど、〜に対して、〜について、〜ながらも、〜によって)";
                    break;
                case "N2":
                    grammarGuide = "N2 (trung cấp cao: 〜にもかかわらず、〜に加えて、〜をはじめとして、〜に反して、〜ことなく、〜に際して、〜ものの、〜としては、〜からこそ、〜をきっかけに)";
                    break;
                case "N1":
                    grammarGuide = "N1 (nâng cao: 〜いかんによらず、〜ないまでも、〜とあいまって、〜をものともせず、〜に至っては、〜いかんにかかわらず、〜ならではの、〜をよそに、〜にほかならない)";
                    break;
                default:
                    grammarGuide = "N3 (trung cấp)";
            }

            String prompt = String.format(
                "Bạn là một chuyên gia tiếng Nhật. Hãy giúp tôi tạo câu ví dụ và tìm các từ vựng liên quan cho từ tiếng Nhật sau:\n" +
                "Từ Kanji (hoặc Hiragana nếu không có Kanji): %s\n" +
                "Cách đọc (Hiragana): %s\n" +
                "Nghĩa tiếng Việt: %s\n" +
                "Cấp độ JLPT: %s\n\n" +
                "⚠️ YÊU CẦU QUAN TRỌNG về câu ví dụ:\n" +
                "- Câu ví dụ PHẢI sử dụng ngữ pháp ở cấp độ %s\n" +
                "- Các mẫu ngữ pháp phù hợp cho cấp độ này: %s\n" +
                "- Độ dài câu và từ vựng trong câu cũng phải phù hợp trình độ %s\n" +
                "- Câu phải tự nhiên và minh họa rõ nghĩa của từ gốc\n\n" +
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
                vocab.getMeaning(),
                level,
                level,
                grammarGuide,
                level
            );


            // Construct payload compatible with DeepSeek chat model
            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là một trợ lý thông thái phản hồi duy nhất định dạng JSON."),
                    Map.of("role", "user", "content", prompt)
                }
            );
            String requestBody = objectMapper.writeValueAsString(requestBodyMap);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.deepseek.com/chat/completions"))
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
