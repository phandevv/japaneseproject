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
import java.util.concurrent.CompletableFuture;

@Service
public class DeepSeekEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekEnrichmentService.class);

    // Bulkhead Pattern: limit concurrent AI requests to 50 to protect server resources
    private final Semaphore bulkheadSemaphore = new Semaphore(50);

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

    public CompletableFuture<Vocabulary> enrichVocabulary(Vocabulary vocab) {
        if (!bulkheadSemaphore.tryAcquire()) {
            log.warn("Bulkhead rejected AI request for vocabulary ID: {} because concurrent limit of 50 is exceeded.", vocab.getId());
            return CompletableFuture.failedFuture(new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Hệ thống AI đang bận xử lý quá nhiều yêu cầu đồng thời. Vui lòng thử lại sau ít phút!"
            ));
        }
        try {
            // Retrieve API key from environment variable
            String apiKey = System.getenv("DEEPSEEK_API_KEY");
            if (apiKey == null || apiKey.trim().isEmpty()) {
                apiKey = System.getProperty("DEEPSEEK_API_KEY");
            }

            if (apiKey == null || apiKey.trim().isEmpty()) {
                log.warn("DEEPSEEK_API_KEY is not set. Skipping enrichment.");
                bulkheadSemaphore.release();
                return CompletableFuture.completedFuture(vocab);
            }

            try {
                String level = vocab.getLevel() != null ? vocab.getLevel().trim().toUpperCase() : "N3";

                String prompt = String.format(
                    "Bạn là một chuyên gia biên soạn từ điển tiếng Nhật cao cấp. Hãy làm giàu thông tin cho từ vựng sau bằng tiếng Việt:\n" +
                    "Từ: \"%s\"\n" +
                    "Cách đọc: %s\n" +
                    "Nghĩa ban đầu: %s\n" +
                    "Cấp độ JLPT: %s\n\n" +
                    "Yêu cầu dữ liệu cực kỳ chi tiết, chính xác, không dùng tiếng Trung hay tiếng Anh để giải nghĩa. Mọi giải thích, dịch ví dụ bắt buộc phải là tiếng Việt.\n" +
                    "Hãy trả về JSON duy nhất, không markdown:\n" +
                    "{\n" +
                    "  \"word\": \"từ kanji hoặc kana chính xác\",\n" +
                    "  \"reading\": \"hiragana/katakana cách đọc\",\n" +
                    "  \"meaning\": \"nghĩa tiếng Việt chính xác\",\n" +
                    "  \"hanViet\": \"âm Hán Việt (nếu có, viết hoa, ví dụ: THỰC SỰ)\",\n" +
                    "  \"jlpt\": \"cấp độ JLPT từ N5 đến N1\",\n" +
                    "  \"pitchAccent\": \"cách đánh trọng âm (ví dụ: しょくじ [0])\",\n" +
                    "  \"wordType\": \"loại từ (noun, verb, i-adjective, na-adjective...)\",\n" +
                    "  \"kanjiWords\": [\n" +
                    "     { \"word\": \"từ ghép chứa kanji này\", \"reading\": \"cách đọc\", \"meaning\": \"nghĩa tiếng Việt\" }\n" +
                    "  ],\n" +
                    "  \"synonyms\": [\"từ đồng nghĩa 1\", \"từ đồng nghĩa 2\"],\n" +
                    "  \"antonyms\": [\"từ trái nghĩa 1\", \"từ trái nghĩa 2\"],\n" +
                    "  \"commonMistakes\": [\n" +
                    "     { \"error\": \"sai lầm phổ biến\", \"fix\": \"cách sửa\" }\n" +
                    "  ],\n" +
                    "  \"exampleSentences\": [\n" +
                    "     { \"ja\": \"câu ví dụ tiếng Nhật\", \"reading\": \"hiragana câu ví dụ\", \"vi\": \"dịch nghĩa tiếng Việt\" }\n" +
                    "  ],\n" +
                    "  \"collocations\": [\"cụm từ hay đi kèm 1\", \"cụm từ hay đi kèm 2\"],\n" +
                    "  \"mnemonic\": \"mẹo nhớ chữ Hán hoặc từ vựng này. Hãy đưa ra mẹo nhớ cực kỳ sáng tạo, dễ nhớ, có thể dùng chiết tự các bộ thủ chữ Hán (kanji breakdown) hoặc liên tưởng âm thanh/hình ảnh thú vị, tránh giải thích khô khan.\",\n" +
                    "  \"conversationExamples\": [\n" +
                    "     { \"speakerA\": \"hội thoại người A\", \"speakerB\": \"hội thoại người B (phản hồi)\", \"translationA\": \"dịch nghĩa A\", \"translationB\": \"dịch nghĩa B\" }\n" +
                    "  ]\n" +
                    "}",
                    vocab.getKanji() != null && !vocab.getKanji().isEmpty() ? vocab.getKanji() : vocab.getHiragana(),
                    vocab.getHiragana(),
                    vocab.getMeaning(),
                    level
                );


                // Construct payload compatible with DeepSeek chat model
                Map<String, Object> requestBodyMap = Map.of(
                    "model", "deepseek-v4-flash",
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
                        .timeout(Duration.ofSeconds(25))
                        .build();

                return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                        .thenApply(response -> {
                            try {
                                if (response.statusCode() == 200) {
                                    JsonNode root = objectMapper.readTree(response.body());
                                    String contentJson = root.path("choices").get(0).path("message").path("content").asText();

                                    // Clean potential markdown enclosing tags
                                    contentJson = cleanJsonContent(contentJson);

                                    JsonNode contentNode = objectMapper.readTree(contentJson);
                                    
                                    // Map simple fields
                                    vocab.setPitchAccent(contentNode.path("pitchAccent").asText());
                                    vocab.setWordType(contentNode.path("wordType").asText());
                                    vocab.setMnemonic(contentNode.path("mnemonic").asText());
                                    
                                    if (contentNode.has("hanViet") && !contentNode.path("hanViet").isNull()) {
                                        vocab.setHanViet(contentNode.path("hanViet").asText());
                                    }
                                    
                                    // Map complex JSON array/object fields to string columns
                                    vocab.setKanjiWords(objectMapper.writeValueAsString(contentNode.path("kanjiWords")));
                                    vocab.setSynonyms(objectMapper.writeValueAsString(contentNode.path("synonyms")));
                                    vocab.setAntonyms(objectMapper.writeValueAsString(contentNode.path("antonyms")));
                                    vocab.setCommonMistakes(objectMapper.writeValueAsString(contentNode.path("commonMistakes")));
                                    vocab.setCollocations(objectMapper.writeValueAsString(contentNode.path("collocations")));
                                    vocab.setConversationExamples(objectMapper.writeValueAsString(contentNode.path("conversationExamples")));
                                    vocab.setExampleSentences(objectMapper.writeValueAsString(contentNode.path("exampleSentences")));

                                    // Maintain backwards compatibility with older schema fields using first example
                                    JsonNode exampleList = contentNode.path("exampleSentences");
                                    if (exampleList.isArray() && exampleList.size() > 0) {
                                        JsonNode firstEx = exampleList.get(0);
                                        vocab.setSampleSentence(firstEx.path("ja").asText());
                                        vocab.setSampleReading(firstEx.path("reading").asText());
                                        vocab.setSampleTranslation(firstEx.path("vi").asText());
                                    }

                                    return vocabularyRepository.save(vocab);
                                } else {
                                    log.error("DeepSeek API responded with error status: {}, body: {}", response.statusCode(), response.body());
                                }
                            } catch (Exception e) {
                                log.error("Failed to parse DeepSeek response: {}", e.getMessage());
                            }
                            return vocab;
                        })
                        .exceptionally(ex -> {
                            log.error("Failed to enrich vocabulary from DeepSeek API: {}", ex.getMessage());
                            return vocab;
                        })
                        .whenComplete((res, ex) -> {
                            bulkheadSemaphore.release();
                        });

            } catch (Exception e) {
                log.error("Failed to build request: {}", e.getMessage());
                bulkheadSemaphore.release();
                return CompletableFuture.completedFuture(vocab);
            }
        } catch (Exception e) {
            log.error("Outer error: {}", e.getMessage());
            bulkheadSemaphore.release();
            return CompletableFuture.completedFuture(vocab);
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

    // ──────────────────────────────────────────────────────────────────────────
    // AI Translation Exercise Methods
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Generate a Japanese sentence / paragraph that naturally contains the given vocabulary words.
     * Returns: { "sentence": "...", "hint": "..." }
     */
    public Map<String, String> generateTranslationExercise(java.util.List<Vocabulary> vocabs) throws Exception {
        String apiKey = getApiKey();
        if (apiKey == null) {
            return Map.of("sentence", "今日は良い天気ですね。", "hint", "Gợi ý: thời tiết hôm nay");
        }

        StringBuilder wordList = new StringBuilder();
        String mainLevel = "N5";
        for (Vocabulary v : vocabs) {
            String word = v.getKanji() != null && !v.getKanji().trim().isEmpty() ? v.getKanji() : v.getHiragana();
            wordList.append("- ").append(word).append(" (nghĩa: ").append(v.getMeaning()).append(")\n");
            if (v.getLevel() != null && !v.getLevel().trim().isEmpty()) {
                mainLevel = v.getLevel();
            }
        }

        String prompt = "Bạn là trợ lý soạn bài tập tiếng Nhật thông minh.\n" +
                "Nhiệm vụ: Tạo 1 câu tiếng Nhật cực kỳ ngắn gọn, tự nhiên (chỉ từ 8 đến 18 từ) để kiểm tra các từ vựng sau:\n" + wordList +
                "\nQUY TẮC BẮT BUỘC ĐỂ HỌC VIÊN DỄ DỊCH:\n" +
                "1. CHỈ SỬ DỤNG từ vựng và ngữ pháp tương ứng trình độ " + mainLevel + " trở xuống (đây là trình độ học viên ĐÃ HỌC).\n" +
                "2. KHÔNG DÙNG bất kỳ từ vựng hay ngữ pháp lạ nào ngoài trình độ " + mainLevel + ".\n" +
                "3. Các từ nối / từ xung quanh CHỈ dùng các từ siêu cơ bản (như 私, これ, それ, 毎日, 今日, 行く, 見る, 食べる và các trợ từ は, が, を, に, で, と).\n" +
                "4. Mọi Kanji phụ xuất hiện trong câu (nếu có) PHẢI mở ngoặc kèm cách đọc Hiragana ngay sau đó, ví dụ: 本(ほん), 友(とも)だち.\n" +
                "5. Trong ô hint, hãy ghi rõ gợi ý các từ vựng chính cần ôn cùng nghĩa tiếng Việt.\n\n" +
                "Trả về JSON duy nhất không dùng markdown format:\n" +
                "{\"sentence\": \"câu tiếng Nhật ngắn ở đây\", \"hint\": \"Từ vựng: ...\"}";

        String responseBody = callDeepSeekRaw(apiKey, prompt);
        JsonNode root = objectMapper.readTree(cleanJsonContent(responseBody));
        return Map.of(
            "sentence", root.path("sentence").asText("今日は良い天気ですね。"),
            "hint", root.path("hint").asText("")
        );
    }

    /**
     * Grade a user's Vietnamese translation of a Japanese sentence.
     * Returns: { "score": 8, "feedback": "...", "correctTranslation": "..." }
     */
    public Map<String, Object> gradeTranslation(String sentence, String userTranslation) throws Exception {
        String apiKey = getApiKey();
        if (apiKey == null) {
            return Map.of("score", 7, "feedback", "Không thể kết nối AI để chấm điểm.", "correctTranslation", "(Chưa có)");
        }

        String prompt = "Bạn là giáo viên chấm dịch tiếng Nhật chuyên nghiệp.\n" +
                "Câu tiếng Nhật: \"" + sentence + "\"\n" +
                "Bản dịch của học viên: \"" + userTranslation + "\"\n\n" +
                "Hãy chấm điểm từ 0-10, nhận xét chi tiết bằng tiếng Việt, và đưa ra bản dịch chuẩn.\n" +
                "Trả về JSON duy nhất không markdown:\n" +
                "{\"score\": 8, \"feedback\": \"nhận xét chi tiết\", \"correctTranslation\": \"bản dịch chuẩn\"}";

        String responseBody = callDeepSeekRaw(apiKey, prompt);
        JsonNode root = objectMapper.readTree(cleanJsonContent(responseBody));
        return Map.of(
            "score", root.path("score").asInt(5),
            "feedback", root.path("feedback").asText("Không có nhận xét."),
            "correctTranslation", root.path("correctTranslation").asText("")
        );
    }

    private String getApiKey() {
        String apiKey = System.getenv("DEEPSEEK_API_KEY");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getProperty("DEEPSEEK_API_KEY");
        }
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("DEEPSEEK_API_KEY is not set. Returning fallback.");
            return null;
        }
        return apiKey;
    }

    /** Synchronous DeepSeek call, returns the content string of first choice. */
    private String callDeepSeekRaw(String apiKey, String userPrompt) throws Exception {
        String requestBody = objectMapper.writeValueAsString(Map.of(
            "model", "deepseek-chat",
            "messages", java.util.List.of(Map.of("role", "user", "content", userPrompt)),
            "max_tokens", 512,
            "temperature", 0.7
        ));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.deepseek.com/v1/chat/completions"))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .timeout(Duration.ofSeconds(30))
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("DeepSeek API error: " + response.statusCode());
        }
        JsonNode root = objectMapper.readTree(response.body());
        return root.path("choices").get(0).path("message").path("content").asText();
    }
}
