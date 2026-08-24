package com.flashcard.knowledge.service;

import com.flashcard.knowledge.model.Feedback;
import com.flashcard.user.model.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.concurrent.Semaphore;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.concurrent.CompletableFuture;

import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import com.flashcard.knowledge.provider.KnowledgeDataProvider;

@Service
public class DeepSeekEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekEnrichmentService.class);

    // Bulkhead Pattern: limit concurrent AI requests to 50 to protect server resources
    private final Semaphore bulkheadSemaphore = new Semaphore(50);

    private final VocabularyDataProvider vocabularyDataProvider;
    private final KnowledgeDataProvider knowledgeDataProvider;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public DeepSeekEnrichmentService(VocabularyDataProvider vocabularyDataProvider, ObjectMapper objectMapper) {
        this(vocabularyDataProvider, null, objectMapper);
    }

    @Autowired
    public DeepSeekEnrichmentService(VocabularyDataProvider vocabularyDataProvider,
                                  @Autowired(required = false) KnowledgeDataProvider knowledgeDataProvider,
                                  ObjectMapper objectMapper) {
        this.vocabularyDataProvider = vocabularyDataProvider;
        this.knowledgeDataProvider = knowledgeDataProvider;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public CompletableFuture<Vocabulary> enrichVocabulary(Vocabulary vocab) {
        if (vocab == null) {
            return CompletableFuture.completedFuture(null);
        }

        boolean hasUsage = vocab.getUsageGuide() != null && !vocab.getUsageGuide().isBlank();
        boolean hasMnemonic = vocab.getMnemonic() != null && !vocab.getMnemonic().isBlank();
        boolean hasExamples = vocab.getExampleSentences() != null && !vocab.getExampleSentences().isBlank() && !"[]".equals(vocab.getExampleSentences().trim()) && !"null".equals(vocab.getExampleSentences().trim());
        boolean isMissingHanViet = vocab.getHanViet() == null || vocab.getHanViet().isBlank();

        // 1. Chia nhỏ gọi riêng: Nếu chỉ thiếu Hán Việt -> Gọi micro-prompt siêu nhẹ (~30 tokens)
        if (hasUsage && hasMnemonic && isMissingHanViet) {
            log.info("Vocab ID {} đã có hầu hết thông tin, CHỈ THIẾU Hán Việt. Kích hoạt micro-prompt lấy Hán Việt viết hoa...", vocab.getId());
            return enrichMissingHanViet(vocab);
        }

        // 2. Chia nhỏ gọi riêng: Nếu chỉ thiếu Mẹo nhớ -> Gọi micro-prompt mẹo nhớ (~50 tokens)
        if (hasUsage && hasExamples && !isMissingHanViet && !hasMnemonic) {
            log.info("Vocab ID {} CHỈ THIẾU Mẹo nhớ. Kích hoạt micro-prompt mẹo nhớ...", vocab.getId());
            return enrichMissingMnemonic(vocab);
        }

        // 3. Chia nhỏ gọi riêng: Nếu chỉ thiếu Hướng dẫn dùng -> Gọi micro-prompt hướng dẫn (~80 tokens)
        if (hasMnemonic && hasExamples && !isMissingHanViet && !hasUsage) {
            log.info("Vocab ID {} CHỈ THIẾU Hướng dẫn sử dụng. Kích hoạt micro-prompt hướng dẫn...", vocab.getId());
            return enrichMissingUsageGuide(vocab);
        }

        if (!bulkheadSemaphore.tryAcquire()) {
            log.warn("Bulkhead rejected AI request for vocabulary ID: {} because concurrent limit of 50 is exceeded.", vocab.getId());
            return CompletableFuture.failedFuture(new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Hệ thống AI đang bận xử lý quá nhiều yêu cầu đồng thời. Vui lòng thử lại sau ít phút!"
            ));
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null || apiKey.trim().isEmpty()) {
                log.warn("DEEPSEEK_API_KEY is not set. Skipping enrichment.");
                bulkheadSemaphore.release();
                return CompletableFuture.completedFuture(vocab);
            }

            try {
                String level = vocab.getLevel() != null ? vocab.getLevel().trim().toUpperCase() : "N3";
                String mainWord = vocab.getKanji() != null && !vocab.getKanji().isEmpty() ? vocab.getKanji() : vocab.getHiragana();

                boolean isKanjiItem = "KANJI".equalsIgnoreCase(vocab.getWordType()) ||
                        (vocab.getCategory() != null && vocab.getCategory().contains("- Kanji")) ||
                        (mainWord != null && mainWord.trim().length() == 1);

                String prompt;
                if (isKanjiItem) {
                    prompt = String.format(
                        "Phân tích chữ Hán \"%s\" (Âm Hán Việt: %s, Nghĩa: %s, JLPT: %s).\n" +
                        "QUY TẮC BẮT BUỘC: Mọi giải thích nghĩa, mẹo nhớ, hướng dẫn dùng, dịch nghĩa ví dụ BẮT BUỘC viết bằng 100%% TIẾNG VIỆT, tuyệt đối không giải thích bằng tiếng Nhật hay tiếng Trung. Âm Hán Việt phải VIẾT HOA TOÀN BỘ.\n" +
                        "Trả về JSON duy nhất không markdown:\n" +
                        "{\n" +
                        "  \"word\": \"%s\",\n" +
                        "  \"hanViet\": \"Âm Hán Việt viết hoa (ví dụ: KHÍ)\",\n" +
                        "  \"onReading\": \"Âm On katakana (ví dụ: カン)\",\n" +
                        "  \"kunReading\": \"Âm Kun hiragana (ví dụ: ほ.す)\",\n" +
                        "  \"reading\": \"Âm On / Âm Kun\",\n" +
                        "  \"meaning\": \"Nghĩa tiếng Việt chuẩn xác\",\n" +
                        "  \"pitchAccent\": \"Trọng âm\",\n" +
                        "  \"wordType\": \"KANJI\",\n" +
                        "  \"mnemonic\": \"Mẹo nhớ chiết tự bộ thủ bằng tiếng Việt ngắn gọn dễ hiểu\",\n" +
                        "  \"usageGuide\": \"Giải thích nghĩa và hoàn cảnh sử dụng bằng 100%% tiếng Việt\",\n" +
                        "  \"kanjiWords\": [{\"word\": \"từ ghép tiếng Nhật\", \"reading\": \"cách đọc\", \"meaning\": \"nghĩa tiếng Việt\"}],\n" +
                        "  \"exampleSentences\": [{\"ja\": \"câu ví dụ tiếng Nhật\", \"reading\": \"cách đọc\", \"vi\": \"dịch nghĩa tiếng Việt\"}]\n" +
                        "}",
                        mainWord,
                        vocab.getHanViet() != null ? vocab.getHanViet() : "",
                        vocab.getMeaning() != null ? vocab.getMeaning() : "",
                        level,
                        mainWord
                    );
                } else {
                    prompt = String.format(
                        "Làm giàu từ vựng \"%s\" (Cách đọc: %s, Nghĩa: %s, JLPT: %s).\n" +
                        "QUY TẮC BẮT BUỘC: Toàn bộ các trường meaning, hanViet, mnemonic, usageGuide, commonMistakes (error và fix), kanjiWords (meaning), exampleSentences (vi), conversationExamples (translationA và translationB) BẮT BUỘC VIẾT BẰNG 100%% TIẾNG VIỆT, tuyệt đối không giải thích bằng tiếng Nhật hay tiếng Trung.\n" +
                        "Trả về JSON duy nhất không markdown:\n" +
                        "{\n" +
                        "  \"word\": \"%s\",\n" +
                        "  \"reading\": \"cách đọc hiragana/katakana chuẩn xác tuyệt đối\",\n" +
                        "  \"meaning\": \"nghĩa tiếng Việt chính xác đầy đủ\",\n" +
                        "  \"hanViet\": \"âm Hán Việt phiên âm từng chữ Hán viết hoa (ví dụ: THỰC SỰ cho 食事, THÁI THÁI cho 態々; TUYỆT ĐỐI KHÔNG lấy nghĩa tiếng Việt như CỐ Ý làm Hán Việt; nếu từ thuần Hiragana/Katakana không có chữ Hán thì để chuỗi rỗng \"\")\",\n" +
                        "  \"jlpt\": \"cấp độ JLPT\",\n" +
                        "  \"pitchAccent\": \"trọng âm (ví dụ: しょくじ [0])\",\n" +
                        "  \"wordType\": \"loại từ\",\n" +
                        "  \"kanjiWords\": [{\"word\": \"từ ghép tiếng Nhật\", \"reading\": \"cách đọc\", \"meaning\": \"nghĩa tiếng Việt\"}],\n" +
                        "  \"synonyms\": [\"từ đồng nghĩa 1\", \"từ đồng nghĩa 2\"],\n" +
                        "  \"antonyms\": [\"từ trái nghĩa 1\", \"từ trái nghĩa 2\"],\n" +
                        "  \"commonMistakes\": [{\"error\": \"lỗi thường gặp viết bằng tiếng Việt\", \"fix\": \"cách dùng đúng viết bằng tiếng Việt\"}],\n" +
                        "  \"exampleSentences\": [{\"ja\": \"câu ví dụ tiếng Nhật\", \"reading\": \"cách đọc hiragana\", \"vi\": \"dịch nghĩa tiếng Việt\"}],\n" +
                        "  \"collocations\": [\"cụm từ hay đi kèm 1\", \"cụm từ 2\"],\n" +
                        "  \"mnemonic\": \"mẹo nhớ ngắn gọn bằng tiếng Việt dễ thuộc\",\n" +
                        "  \"usageGuide\": \"hướng dẫn cách dùng, ngữ cảnh và sắc thái bằng 100%% tiếng Việt\",\n" +
                        "  \"conversationExamples\": [{\"speakerA\": \"câu thoại A tiếng Nhật\", \"speakerB\": \"câu thoại B tiếng Nhật\", \"translationA\": \"dịch tiếng Việt A\", \"translationB\": \"dịch tiếng Việt B\"}]\n" +
                        "}",
                        mainWord,
                        vocab.getHiragana() != null ? vocab.getHiragana() : "",
                        vocab.getMeaning() != null ? vocab.getMeaning() : "",
                        level,
                        mainWord
                    );
                }

                // Construct payload compatible with DeepSeek chat model (Prompt Caching enabled)
                Map<String, Object> requestBodyMap = Map.of(
                    "model", "deepseek-chat",
                    "max_tokens", 1200,
                    "temperature", 0.1,
                    "response_format", Map.of("type", "json_object"),
                    "messages", new Object[]{
                        Map.of("role", "system", "content", "Bạn là trợ lý từ điển tiếng Nhật cao cấp cho người Việt. BẮT BUỘC: Mọi giải thích, dịch nghĩa, mẹo nhớ, hướng dẫn sử dụng, phân biệt và sửa lỗi PHẢI viết bằng 100% TIẾNG VIỆT, tuyệt đối không dùng tiếng Nhật hoặc tiếng Trung trong các trường giải thích. Phản hồi duy nhất bằng JSON hợp lệ."),
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
                                    
                                    // Always update hiragana reading with accurate Hiragana/Katakana reading from DeepSeek AI
                                    String aiReading = contentNode.path("reading").asText();
                                    if (aiReading != null && !aiReading.trim().isEmpty() && !"null".equalsIgnoreCase(aiReading.trim())) {
                                        vocab.setHiragana(aiReading.trim());
                                    }

                                    // Map simple fields
                                    vocab.setPitchAccent(contentNode.path("pitchAccent").asText());
                                    vocab.setWordType(contentNode.path("wordType").asText());
                                    vocab.setMnemonic(contentNode.path("mnemonic").asText());
                                    vocab.setUsageGuide(contentNode.path("usageGuide").asText());

                                    if (contentNode.has("onReading") && !contentNode.path("onReading").isNull()) {
                                        vocab.setOnReading(contentNode.path("onReading").asText());
                                    }
                                    if (contentNode.has("kunReading") && !contentNode.path("kunReading").isNull()) {
                                        vocab.setKunReading(contentNode.path("kunReading").asText());
                                    }
                                    
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

                                     return vocabularyDataProvider.save(vocab);
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

    public CompletableFuture<GrammarCard> enrichGrammarCard(GrammarCard grammarCard) {
        if (!bulkheadSemaphore.tryAcquire()) {
            log.warn("Bulkhead rejected AI request for grammar ID: {} because concurrent limit of 50 is exceeded.", grammarCard.getId());
            return CompletableFuture.failedFuture(new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Hệ thống AI đang bận xử lý quá nhiều yêu cầu đồng thời. Vui lòng thử lại sau ít phút!"
            ));
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                bulkheadSemaphore.release();
                return CompletableFuture.completedFuture(grammarCard);
            }

            String prompt = String.format(
                "Phân tích điểm ngữ pháp \"%s\" (Ý nghĩa: %s, JLPT: %s).\n" +
                "QUY TẮC BẮT BUỘC: Toàn bộ các trường meaning, formation, usageGuide, similarGrammar, difference, commonMistakes, và trường vi trong examples BẮT BUỘC VIẾT BẰNG 100%% TIẾNG VIỆT, tuyệt đối không giải thích bằng tiếng Nhật hay tiếng Trung.\n" +
                "Trả về duy nhất JSON không markdown:\n" +
                "{\n" +
                "  \"grammar\": \"%s\",\n" +
                "  \"meaning\": \"Ý nghĩa tổng quát chuẩn xác bằng tiếng Việt\",\n" +
                "  \"formation\": \"Công thức kết hợp ngắn gọn\",\n" +
                "  \"usageGuide\": \"Giải thích sắc thái, hoàn cảnh sử dụng & lưu ý bằng 100%% tiếng Việt\",\n" +
                "  \"similarGrammar\": \"Điểm ngữ pháp tương tự\",\n" +
                "  \"difference\": \"Phân biệt sắc thái khác nhau bằng tiếng Việt\",\n" +
                "  \"commonMistakes\": \"Lỗi phổ biến học viên hay gặp phải và cách tránh bằng tiếng Việt\",\n" +
                "  \"examples\": [\n" +
                "    {\"ja\": \"Ví dụ tiếng Nhật 1\", \"reading\": \"cách đọc hiragana\", \"vi\": \"dịch nghĩa tiếng Việt\"},\n" +
                "    {\"ja\": \"Ví dụ tiếng Nhật 2\", \"reading\": \"cách đọc hiragana\", \"vi\": \"dịch nghĩa tiếng Việt\"}\n" +
                "  ]\n" +
                "}",
                grammarCard.getGrammar(),
                grammarCard.getMeaning() != null ? grammarCard.getMeaning() : "",
                grammarCard.getJlpt() != null ? grammarCard.getJlpt() : "N3",
                grammarCard.getGrammar()
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(Map.of(
                            "model", "deepseek-chat",
                            "messages", java.util.List.of(
                                Map.of("role", "system", "content", "Bạn là chuyên gia ngữ pháp tiếng Nhật cao cấp cho người Việt. BẮT BUỘC: Mọi giải thích, dịch nghĩa, cấu trúc, phân biệt và sửa lỗi PHẢI viết bằng 100% TIẾNG VIỆT, tuyệt đối không dùng tiếng Nhật hoặc tiếng Trung trong các trường giải thích. Phản hồi duy nhất bằng JSON hợp lệ."),
                                Map.of("role", "user", "content", prompt)
                            ),
                            "max_tokens", 1200,
                            "temperature", 0.1
                        ))
                    ))
                    .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenApply(response -> {
                        try {
                            if (response.statusCode() == 200) {
                                JsonNode responseRoot = objectMapper.readTree(response.body());
                                String rawText = responseRoot.path("choices").get(0).path("message").path("content").asText();
                                String contentJson = cleanJsonContent(rawText);
                                JsonNode contentNode = objectMapper.readTree(contentJson);

                                if (contentNode.has("meaning") && !contentNode.path("meaning").asText().isBlank()) {
                                    grammarCard.setMeaning(contentNode.path("meaning").asText());
                                }
                                if (contentNode.has("formation") && !contentNode.path("formation").asText().isBlank()) {
                                    grammarCard.setFormation(contentNode.path("formation").asText());
                                }
                                if (contentNode.has("usageGuide") && !contentNode.path("usageGuide").asText().isBlank()) {
                                    grammarCard.setUsageGuide(contentNode.path("usageGuide").asText());
                                }
                                if (contentNode.has("similarGrammar") && !contentNode.path("similarGrammar").asText().isBlank()) {
                                    grammarCard.setSimilarGrammar(contentNode.path("similarGrammar").asText());
                                }
                                if (contentNode.has("difference") && !contentNode.path("difference").asText().isBlank()) {
                                    grammarCard.setDifference(contentNode.path("difference").asText());
                                }
                                if (contentNode.has("commonMistakes") && !contentNode.path("commonMistakes").asText().isBlank()) {
                                    grammarCard.setCommonMistakes(contentNode.path("commonMistakes").asText());
                                }
                                if (contentNode.has("examples")) {
                                    grammarCard.setExamples(objectMapper.writeValueAsString(contentNode.path("examples")));
                                }

                                if (knowledgeDataProvider != null) {
                                    return knowledgeDataProvider.saveGrammar(grammarCard);
                                }
                            }
                        } catch (Exception e) {
                            log.error("Failed to parse DeepSeek response for grammar ID {}: {}", grammarCard.getId(), e.getMessage());
                        }
                        return grammarCard;
                    })
                    .exceptionally(ex -> {
                        log.error("Failed to enrich grammar from DeepSeek API: {}", ex.getMessage());
                        return grammarCard;
                    })
                    .whenComplete((res, ex) -> bulkheadSemaphore.release());
        } catch (Exception e) {
            log.error("Grammar request build error: {}", e.getMessage());
            bulkheadSemaphore.release();
            return CompletableFuture.completedFuture(grammarCard);
        }
    }

    private CompletableFuture<GrammarCard> executeGrammarMicroPrompt(GrammarCard card, String apiKey, String prompt, int maxTokens, java.util.function.BiConsumer<JsonNode, GrammarCard> mapper) {
        if (!bulkheadSemaphore.tryAcquire()) {
            return CompletableFuture.completedFuture(card);
        }
        try {
            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-chat",
                "max_tokens", maxTokens,
                "temperature", 0.1,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là chuyên gia ngữ pháp tiếng Nhật cao cấp cho người Việt. BẮT BUỘC: Mọi giải thích, phân tích cấu trúc, dịch nghĩa ví dụ, phân biệt sắc thái, lỗi sai PHẢI viết bằng 100% TIẾNG VIỆT, tuyệt đối không dùng tiếng Nhật hoặc tiếng Trung để giải thích. Phản hồi duy nhất bằng định dạng JSON."),
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

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenApply(response -> {
                        try {
                            if (response.statusCode() == 200) {
                                JsonNode root = objectMapper.readTree(response.body());
                                String contentJson = root.path("choices").get(0).path("message").path("content").asText();
                                contentJson = cleanJsonContent(contentJson);
                                JsonNode contentNode = objectMapper.readTree(contentJson);
                                mapper.accept(contentNode, card);
                                if (knowledgeDataProvider != null) {
                                    return knowledgeDataProvider.saveGrammar(card);
                                }
                            }
                        } catch (Exception e) {
                            log.error("Grammar micro-prompt parse error: {}", e.getMessage());
                        }
                        return card;
                    })
                    .whenComplete((res, ex) -> bulkheadSemaphore.release());
        } catch (Exception e) {
            bulkheadSemaphore.release();
            return CompletableFuture.completedFuture(card);
        }
    }

    public CompletableFuture<GrammarCard> enrichGrammarSection(GrammarCard card, String section) {
        if (card == null || card.getId() == null) {
            return CompletableFuture.completedFuture(card);
        }
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return CompletableFuture.completedFuture(card);
        }

        String grammar = card.getGrammar() != null ? card.getGrammar() : "";
        String meaning = card.getMeaning() != null ? card.getMeaning() : "";
        String jlpt = card.getJlpt() != null ? card.getJlpt() : "N3";

        String prompt;
        int maxTokens = 350;
        java.util.function.BiConsumer<JsonNode, GrammarCard> mapper;

        String sec = section != null ? section.trim().toLowerCase(java.util.Locale.ROOT) : "";
        switch (sec) {
            case "formation":
            case "cach_chia":
                prompt = String.format(
                    "Hãy phân tích và viết công thức kết hợp/cách chia ngữ pháp (Formation) chi tiết bằng 100%% TIẾNG VIỆT cho cấu trúc \"%s\" (Ý nghĩa: %s, JLPT: %s). Ví dụ: V-thể từ điển / N + にかけて...\n" +
                    "Trả về duy nhất JSON: {\"formation\": \"Công thức kết hợp ngắn gọn, rõ ràng bằng 100%% tiếng Việt\"}",
                    grammar, meaning, jlpt
                );
                maxTokens = 250;
                mapper = (node, c) -> {
                    if (node.has("formation") && !node.path("formation").isNull()) {
                        String form = node.path("formation").asText().trim();
                        if (!form.isEmpty()) c.setFormation(form);
                    }
                };
                break;

            case "usageguide":
            case "usage":
            case "usagedesc":
                prompt = String.format(
                    "Hãy viết hướng dẫn sử dụng, sắc thái nghĩa, ngữ cảnh xuất hiện và các lưu ý đặc biệt chi tiết bằng 100%% TIẾNG VIỆT cho điểm ngữ pháp \"%s\" (Ý nghĩa: %s, JLPT: %s). Tuyệt đối không dùng tiếng Nhật/Trung để giải thích.\n" +
                    "Trả về duy nhất JSON: {\"usageGuide\": \"Giải thích sắc thái, hoàn cảnh sử dụng và lưu ý chi tiết bằng 100%% tiếng Việt...\"}",
                    grammar, meaning, jlpt
                );
                maxTokens = 450;
                mapper = (node, c) -> {
                    if (node.has("usageGuide") && !node.path("usageGuide").isNull()) {
                        String ug = node.path("usageGuide").asText().trim();
                        if (!ug.isEmpty()) {
                            c.setUsageGuide(ug);
                            c.setUsageDesc(ug);
                        }
                    }
                };
                break;

            case "examples":
            case "vi_du":
                prompt = String.format(
                    "Hãy tạo 3-4 câu ví dụ tiếng Nhật tự nhiên, chuẩn văn phong JLPT %s cho điểm ngữ pháp \"%s\" (Ý nghĩa: %s). Mọi câu BẮT BUỘC có phiên âm reading và dịch nghĩa 100%% TIẾNG VIỆT.\n" +
                    "Trả về duy nhất JSON: {\"examples\": [{\"ja\": \"Câu ví dụ tiếng Nhật\", \"reading\": \"Cách đọc hiragana\", \"vi\": \"Dịch nghĩa tiếng Việt\"}]}",
                    jlpt, grammar, meaning
                );
                maxTokens = 500;
                mapper = (node, c) -> {
                    if (node.has("examples") && node.path("examples").isArray()) {
                        try {
                            c.setExamples(objectMapper.writeValueAsString(node.path("examples")));
                        } catch (Exception ignored) {}
                    }
                };
                break;

            case "similar":
            case "similar_grammar":
            case "difference":
                prompt = String.format(
                    "Hãy cung cấp các điểm ngữ pháp tiếng Nhật tương tự / dễ nhầm lẫn và so sánh, phân biệt sắc thái khác nhau chi tiết bằng 100%% TIẾNG VIỆT cho điểm ngữ pháp \"%s\" (Ý nghĩa: %s, JLPT: %s).\n" +
                    "Trả về duy nhất JSON: {\"similarGrammar\": \"Điểm ngữ pháp tương tự (ví dụ: ～から～まで)\", \"difference\": \"Phân biệt chi tiết điểm giống và khác nhau bằng 100%% tiếng Việt...\"}",
                    grammar, meaning, jlpt
                );
                maxTokens = 450;
                mapper = (node, c) -> {
                    if (node.has("similarGrammar") && !node.path("similarGrammar").isNull()) {
                        String sg = node.path("similarGrammar").asText().trim();
                        if (!sg.isEmpty()) c.setSimilarGrammar(sg);
                    }
                    if (node.has("difference") && !node.path("difference").isNull()) {
                        String diff = node.path("difference").asText().trim();
                        if (!diff.isEmpty()) c.setDifference(diff);
                    }
                };
                break;

            case "commonmistakes":
            case "mistakes":
                prompt = String.format(
                    "Hãy nêu các lỗi sai học viên người Việt hay mắc phải khi sử dụng mẫu ngữ pháp \"%s\" (Ý nghĩa: %s, JLPT: %s) và cách sửa, giải thích 100%% TIẾNG VIỆT.\n" +
                    "Trả về duy nhất JSON: {\"commonMistakes\": \"Lỗi sai thường gặp và cách khắc phục bằng 100%% tiếng Việt...\"}",
                    grammar, meaning, jlpt
                );
                maxTokens = 350;
                mapper = (node, c) -> {
                    if (node.has("commonMistakes") && !node.path("commonMistakes").isNull()) {
                        String cm = node.path("commonMistakes").asText().trim();
                        if (!cm.isEmpty()) c.setCommonMistakes(cm);
                    }
                };
                break;

            case "header":
            case "basic":
            default:
                prompt = String.format(
                    "Cung cấp thông tin chuẩn xác cho điểm ngữ pháp tiếng Nhật \"%s\" (JLPT: %s): Ý nghĩa tổng quát bằng 100%% TIẾNG VIỆT, Tiêu đề bài học ngắn gọn.\n" +
                    "Trả về duy nhất JSON: {\"meaning\": \"Ý nghĩa tiếng Việt chuẩn xác\", \"lessonTitle\": \"Tiêu đề bài học ngắn\"}",
                    grammar, jlpt
                );
                maxTokens = 200;
                mapper = (node, c) -> {
                    if (node.has("meaning") && !node.path("meaning").isNull()) {
                        String m = node.path("meaning").asText().trim();
                        if (!m.isEmpty()) c.setMeaning(m);
                    }
                    if (node.has("lessonTitle") && !node.path("lessonTitle").isNull()) {
                        String lt = node.path("lessonTitle").asText().trim();
                        if (!lt.isEmpty()) c.setLessonTitle(lt);
                    }
                };
                break;
        }

        return executeGrammarMicroPrompt(card, apiKey, prompt, maxTokens, mapper);
    }

    private CompletableFuture<Vocabulary> executeMicroPrompt(Vocabulary vocab, String apiKey, String prompt, java.util.function.BiConsumer<JsonNode, Vocabulary> mapper) {
        return executeMicroPrompt(vocab, apiKey, prompt, 250, mapper);
    }

    private CompletableFuture<Vocabulary> executeMicroPrompt(Vocabulary vocab, String apiKey, String prompt, int maxTokens, java.util.function.BiConsumer<JsonNode, Vocabulary> mapper) {
        if (!bulkheadSemaphore.tryAcquire()) {
            return CompletableFuture.completedFuture(vocab);
        }
        try {
            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-chat",
                "max_tokens", maxTokens,
                "temperature", 0.1,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là trợ lý từ điển tiếng Nhật cao cấp. BẮT BUỘC: Mọi giải thích, dịch nghĩa, mẹo nhớ, ví dụ PHẢI viết bằng 100% TIẾNG VIỆT, tuyệt đối không dùng tiếng Nhật hoặc tiếng Trung để giải thích. Phản hồi duy nhất bằng định dạng JSON."),
                    Map.of("role", "user", "content", prompt)
                }
            );
            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenApply(response -> {
                        try {
                            if (response.statusCode() == 200) {
                                JsonNode root = objectMapper.readTree(response.body());
                                String contentJson = root.path("choices").get(0).path("message").path("content").asText();
                                contentJson = cleanJsonContent(contentJson);
                                JsonNode contentNode = objectMapper.readTree(contentJson);
                                mapper.accept(contentNode, vocab);
                                return vocabularyDataProvider.save(vocab);
                            }
                        } catch (Exception e) {
                            log.error("Micro-prompt parse error: {}", e.getMessage());
                        }
                        return vocab;
                    })
                    .whenComplete((res, ex) -> bulkheadSemaphore.release());
        } catch (Exception e) {
            bulkheadSemaphore.release();
            return CompletableFuture.completedFuture(vocab);
        }
    }

    public CompletableFuture<Vocabulary> enrichVocabularySection(Vocabulary vocab, String section) {
        if (vocab == null || vocab.getId() == null) {
            return CompletableFuture.completedFuture(vocab);
        }
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return CompletableFuture.completedFuture(vocab);
        }

        String word = vocab.getKanji() != null && !vocab.getKanji().isBlank() ? vocab.getKanji() : vocab.getHiragana();
        String meaning = vocab.getMeaning() != null ? vocab.getMeaning() : "";
        String hanViet = vocab.getHanViet() != null ? vocab.getHanViet() : "";
        String level = vocab.getLevel() != null ? vocab.getLevel() : "N3";

        String prompt;
        int maxTokens = 250;
        java.util.function.BiConsumer<JsonNode, Vocabulary> mapper;

        String sec = section != null ? section.trim().toLowerCase(java.util.Locale.ROOT) : "";
        switch (sec) {
            case "usageguide":
                prompt = String.format(
                    "Hãy viết hướng dẫn sử dụng, sắc thái nghĩa và hoàn cảnh sử dụng chi tiết bằng 100%% TIẾNG VIỆT cho từ tiếng Nhật \"%s\" (Nghĩa: %s, Cấp độ: %s). Tuyệt đối không dùng tiếng Nhật/Trung giải thích. Trả về duy nhất JSON: {\"usageGuide\": \"Giải thích sắc thái, cách dùng chi tiết bằng tiếng Việt...\"}",
                    word, meaning, level
                );
                maxTokens = 350;
                mapper = (node, v) -> {
                    if (node.has("usageGuide") && !node.path("usageGuide").isNull()) {
                        v.setUsageGuide(node.path("usageGuide").asText().trim());
                    }
                };
                break;

            case "mnemonic":
                prompt = String.format(
                    "Hãy tạo 1 mẹo nhớ độc đáo, ấn tượng (chiết tự bộ thủ hoặc câu chuyện liên tưởng) bằng 100%% TIẾNG VIỆT cho từ \"%s\" (Nghĩa: %s, Hán Việt: %s). Trả về duy nhất JSON: {\"mnemonic\": \"Mẹo nhớ bằng tiếng Việt...\"}",
                    word, meaning, hanViet
                );
                maxTokens = 250;
                mapper = (node, v) -> {
                    if (node.has("mnemonic") && !node.path("mnemonic").isNull()) {
                        v.setMnemonic(node.path("mnemonic").asText().trim());
                    }
                };
                break;

            case "kanjiwords":
                prompt = String.format(
                    "Hãy cung cấp 3-5 từ ghép / từ vựng liên quan chứa chữ \"%s\" (Nghĩa: %s). Mọi nghĩa BẮT BUỘC bằng tiếng Việt. Trả về duy nhất JSON: {\"kanjiWords\": [{\"word\": \"từ tiếng Nhật\", \"reading\": \"cách đọc hiragana\", \"meaning\": \"nghĩa tiếng Việt\"}]}",
                    word, meaning
                );
                maxTokens = 400;
                mapper = (node, v) -> {
                    if (node.has("kanjiWords") && node.path("kanjiWords").isArray()) {
                        try {
                            v.setKanjiWords(objectMapper.writeValueAsString(node.path("kanjiWords")));
                        } catch (Exception ignored) {}
                    }
                };
                break;

            case "examplesentences":
                prompt = String.format(
                    "Hãy tạo 3 câu ví dụ tiếng Nhật tự nhiên, chuẩn JLPT %s cho từ \"%s\" (Nghĩa: %s). Mọi câu có phiên âm reading và dịch nghĩa tiếng Việt 100%%. Trả về duy nhất JSON: {\"exampleSentences\": [{\"ja\": \"câu ví dụ tiếng Nhật\", \"reading\": \"phiên âm hiragana\", \"vi\": \"dịch nghĩa tiếng Việt\"}]}",
                    level, word, meaning
                );
                maxTokens = 500;
                mapper = (node, v) -> {
                    if (node.has("exampleSentences") && node.path("exampleSentences").isArray()) {
                        try {
                            v.setExampleSentences(objectMapper.writeValueAsString(node.path("exampleSentences")));
                            if (node.path("exampleSentences").size() > 0) {
                                JsonNode firstEx = node.path("exampleSentences").get(0);
                                v.setSampleSentence(firstEx.path("ja").asText());
                                v.setSampleReading(firstEx.path("reading").asText());
                                v.setSampleTranslation(firstEx.path("vi").asText());
                            }
                        } catch (Exception ignored) {}
                    }
                };
                break;

            case "collocations":
                prompt = String.format(
                    "Hãy cung cấp 3-5 cụm từ / collocations thường đi kèm trong tiếng Nhật cho từ \"%s\" (Nghĩa: %s). Dịch nghĩa 100%% tiếng Việt. Trả về duy nhất JSON: {\"collocations\": [{\"phrase\": \"cụm từ tiếng Nhật\", \"reading\": \"cách đọc hiragana\", \"meaning\": \"nghĩa tiếng Việt\"}]}",
                    word, meaning
                );
                maxTokens = 400;
                mapper = (node, v) -> {
                    if (node.has("collocations") && node.path("collocations").isArray()) {
                        try {
                            v.setCollocations(objectMapper.writeValueAsString(node.path("collocations")));
                        } catch (Exception ignored) {}
                    }
                };
                break;

            case "synonymsantonyms":
            case "synonyms":
            case "antonyms":
                prompt = String.format(
                    "Hãy cung cấp danh sách từ đồng nghĩa (synonyms) và từ trái nghĩa (antonyms) cho từ \"%s\" (Nghĩa: %s). Dịch nghĩa 100%% tiếng Việt. Trả về duy nhất JSON: {\"synonyms\": [{\"word\": \"từ\", \"reading\": \"cách đọc\", \"meaning\": \"nghĩa tiếng Việt\"}], \"antonyms\": [{\"word\": \"từ\", \"reading\": \"cách đọc\", \"meaning\": \"nghĩa tiếng Việt\"}]}",
                    word, meaning
                );
                maxTokens = 400;
                mapper = (node, v) -> {
                    if (node.has("synonyms") && node.path("synonyms").isArray()) {
                        try { v.setSynonyms(objectMapper.writeValueAsString(node.path("synonyms"))); } catch (Exception ignored) {}
                    }
                    if (node.has("antonyms") && node.path("antonyms").isArray()) {
                        try { v.setAntonyms(objectMapper.writeValueAsString(node.path("antonyms"))); } catch (Exception ignored) {}
                    }
                };
                break;

            case "conversations":
            case "conversationexamples":
                prompt = String.format(
                    "Hãy tạo 1 đoạn hội thoại ngắn thực tế (2-4 lượt nói giữa A và B) có sử dụng tự nhiên từ \"%s\" (Nghĩa: %s). Dịch nghĩa 100%% tiếng Việt. Trả về duy nhất JSON: {\"conversationExamples\": [{\"speaker\": \"A\", \"ja\": \"câu tiếng Nhật\", \"reading\": \"cách đọc\", \"vi\": \"dịch tiếng Việt\"}, {\"speaker\": \"B\", \"ja\": \"câu tiếng Nhật\", \"reading\": \"cách đọc\", \"vi\": \"dịch tiếng Việt\"}]}",
                    word, meaning
                );
                maxTokens = 500;
                mapper = (node, v) -> {
                    if (node.has("conversationExamples") && node.path("conversationExamples").isArray()) {
                        try {
                            v.setConversationExamples(objectMapper.writeValueAsString(node.path("conversationExamples")));
                        } catch (Exception ignored) {}
                    }
                };
                break;

            case "commonmistakes":
                prompt = String.format(
                    "Hãy nêu các lỗi sai người Việt hay mắc phải khi dùng từ \"%s\" (Nghĩa: %s). Giải thích 100%% tiếng Việt. Trả về duy nhất JSON: {\"commonMistakes\": [{\"mistake\": \"cách dùng sai\", \"correction\": \"cách dùng đúng\", \"explanation\": \"giải thích lý do bằng tiếng Việt\"}]}",
                    word, meaning
                );
                maxTokens = 400;
                mapper = (node, v) -> {
                    if (node.has("commonMistakes") && node.path("commonMistakes").isArray()) {
                        try {
                            v.setCommonMistakes(objectMapper.writeValueAsString(node.path("commonMistakes")));
                        } catch (Exception ignored) {}
                    }
                };
                break;

            case "hanviet":
            case "han_viet":
            case "am_han":
                prompt = String.format(
                    "Hãy xác định âm Hán Việt chuẩn xác VIẾT HOA TOÀN BỘ cho từ/chữ Hán tiếng Nhật: Kanji=\"%s\", Hiragana=\"%s\", Nghĩa tiếng Việt=\"%s\".\n" +
                    "QUY TẮC BẮT BUỘC VỀ ÂM HÁN VIỆT:\n" +
                    "1. Âm Hán Việt là phiên âm Hán-Việt của từng chữ Hán (Kanji) có trong từ. Ví dụ: 食事 -> THỰC SỰ, 危険 -> NGUY HIỂM, 態々 -> THÁI THÁI, 故意 -> CỐ Ý, 準備 -> CHUẨN BỊ, 先生 -> TIÊN SINH.\n" +
                    "2. TUYỆT ĐỐI KHÔNG ĐƯỢC LẤY NGHĨA TIẾNG VIỆT ĐỂ LÀM ÂM HÁN VIỆT! (Ví dụ: Từ 'わざわざ' có nghĩa là 'cố ý/cất công', chữ Hán nếu có là 態々 thì âm Hán Việt phải là 'THÁI THÁI', TUYỆT ĐỐI KHÔNG ĐƯỢC TRẢ VỀ 'CỐ Ý' vì 'CỐ Ý' là nghĩa tiếng Việt, không phải âm Hán Việt của 態々!).\n" +
                    "3. Nếu từ là từ thuần Hiragana/Katakana không dùng chữ Hán (như とても, ぴったり, パン, コーヒー), hãy trả về \"hanViet\": \"\".\n" +
                    "4. Nếu có chữ Hán, BẮT BUỘC viết hoa toàn bộ.\n" +
                    "Trả về duy nhất JSON: {\"hanViet\": \"ÂM HÁN VIỆT VIẾT HOA HOẶC CHUỖI RỖNG\"}",
                    vocab.getKanji() != null ? vocab.getKanji() : "",
                    vocab.getHiragana() != null ? vocab.getHiragana() : "",
                    meaning
                );
                maxTokens = 150;
                mapper = (node, v) -> {
                    if (node.has("hanViet") && !node.path("hanViet").isNull()) {
                        String hv = node.path("hanViet").asText().trim();
                        if (!hv.isEmpty() && !"null".equalsIgnoreCase(hv)) {
                            v.setHanViet(hv.toUpperCase(java.util.Locale.ROOT));
                        } else {
                            v.setHanViet("");
                        }
                    }
                };
                break;

            case "header":
            case "basic":
            default:
                prompt = String.format(
                    "Cung cấp thông tin chuẩn xác cho từ/chữ Hán tiếng Nhật: Kanji=\"%s\", Hiragana=\"%s\", Nghĩa tiếng Việt=\"%s\":\n" +
                    "- hanViet: Âm Hán Việt phiên âm từng chữ Hán viết hoa (ví dụ: THỰC SỰ cho 食事, THÁI THÁI cho 態々). TUYỆT ĐỐI KHÔNG lấy nghĩa tiếng Việt (như CỐ Ý) làm Hán Việt! Nếu từ thuần Hiragana/Katakana không có chữ Hán thì trả về \"\".\n" +
                    "- pitchAccent: Trọng âm (ví dụ: [0], [1], [2]).\n" +
                    "- onReading: Âm On (nếu là chữ Hán đơn).\n" +
                    "- kunReading: Âm Kun (nếu là chữ Hán đơn).\n" +
                    "- wordType: Loại từ (N, V, Adj, Adv, Conj...).\n" +
                    "Trả về duy nhất JSON: {\"hanViet\": \"HÁN VIỆT VIẾT HOA\", \"pitchAccent\": \"[0]\", \"onReading\": \"âm On\", \"kunReading\": \"âm Kun\", \"wordType\": \"N\"}",
                    vocab.getKanji() != null ? vocab.getKanji() : "",
                    vocab.getHiragana() != null ? vocab.getHiragana() : "",
                    meaning
                );
                maxTokens = 250;
                mapper = (node, v) -> {
                    if (node.has("hanViet") && !node.path("hanViet").isNull()) {
                        String hv = node.path("hanViet").asText().trim();
                        if (!hv.isEmpty() && !"null".equalsIgnoreCase(hv)) v.setHanViet(hv.toUpperCase(java.util.Locale.ROOT));
                    }
                    if (node.has("pitchAccent") && !node.path("pitchAccent").isNull()) {
                        v.setPitchAccent(node.path("pitchAccent").asText().trim());
                    }
                    if (node.has("onReading") && !node.path("onReading").isNull()) {
                        v.setOnReading(node.path("onReading").asText().trim());
                    }
                    if (node.has("kunReading") && !node.path("kunReading").isNull()) {
                        v.setKunReading(node.path("kunReading").asText().trim());
                    }
                    if (node.has("wordType") && !node.path("wordType").isNull()) {
                        v.setWordType(node.path("wordType").asText().trim());
                    }
                };
                break;
        }

        return executeMicroPrompt(vocab, apiKey, prompt, maxTokens, mapper);
    }

    public CompletableFuture<Vocabulary> enrichMissingHanViet(Vocabulary vocab) {
        if (vocab.getHanViet() != null && !vocab.getHanViet().trim().isEmpty()) {
            vocab.setHanViet(vocab.getHanViet().trim().toUpperCase(java.util.Locale.ROOT));
            return CompletableFuture.completedFuture(vocab);
        }
        String apiKey = getApiKey();
        if (apiKey == null) {
            return CompletableFuture.completedFuture(vocab);
        }
        String prompt = String.format(
            "Hãy xác định âm Hán Việt chuẩn xác VIẾT HOA TOÀN BỘ cho từ tiếng Nhật: Kanji=\"%s\", Hiragana=\"%s\", Nghĩa=\"%s\".\n" +
            "QUY TẮC:\n" +
            "1. Âm Hán Việt là phiên âm Hán-Việt của từng chữ Hán trong từ (ví dụ: 食事 -> THỰC SỰ, 態々 -> THÁI THÁI, 故意 -> CỐ Ý, 準備 -> CHUẨN BỊ).\n" +
            "2. TUYỆT ĐỐI KHÔNG lấy nghĩa tiếng Việt làm âm Hán Việt (Ví dụ: 'わざわざ' nghĩa là 'cố ý/cất công', chữ Hán 態々 -> âm Hán Việt là THÁI THÁI, cấm trả về CỐ Ý!).\n" +
            "3. Nếu là từ thuần Hiragana/Katakana không dùng chữ Hán, trả về \"hanViet\": \"\".\n" +
            "Trả về duy nhất JSON: {\"hanViet\": \"ÂM HÁN VIỆT VIẾT HOA HOẶC CHUỖI RỖNG\"}",
            vocab.getKanji() != null ? vocab.getKanji() : "",
            vocab.getHiragana() != null ? vocab.getHiragana() : "",
            vocab.getMeaning() != null ? vocab.getMeaning() : ""
        );
        return executeMicroPrompt(vocab, apiKey, prompt, (node, v) -> {
            if (node.has("hanViet") && !node.path("hanViet").isNull()) {
                String hv = node.path("hanViet").asText().trim();
                if (!hv.isEmpty() && !"null".equalsIgnoreCase(hv)) {
                    v.setHanViet(hv.toUpperCase(java.util.Locale.ROOT));
                } else {
                    v.setHanViet("");
                }
            }
        });
    }

    public CompletableFuture<Vocabulary> enrichMissingMnemonic(Vocabulary vocab) {
        if (vocab.getMnemonic() != null && !vocab.getMnemonic().trim().isEmpty()) {
            return CompletableFuture.completedFuture(vocab);
        }
        String apiKey = getApiKey();
        if (apiKey == null) {
            return CompletableFuture.completedFuture(vocab);
        }
        String word = vocab.getKanji() != null && !vocab.getKanji().isBlank() ? vocab.getKanji() : vocab.getHiragana();
        String prompt = String.format(
            "Tạo 1 mẹo nhớ ngắn gọn bằng 100%% tiếng Việt dễ hiểu (chiết tự hoặc liên tưởng) cho từ tiếng Nhật \"%s\" (Nghĩa: %s, Hán Việt: %s). Tuyệt đối không dùng tiếng Nhật/Trung giải thích. Trả về duy nhất JSON: {\"mnemonic\": \"Mẹo nhớ bằng tiếng Việt...\"}",
            word,
            vocab.getMeaning() != null ? vocab.getMeaning() : "",
            vocab.getHanViet() != null ? vocab.getHanViet() : ""
        );
        return executeMicroPrompt(vocab, apiKey, prompt, (node, v) -> {
            if (node.has("mnemonic") && !node.path("mnemonic").isNull()) {
                String mn = node.path("mnemonic").asText().trim();
                if (!mn.isEmpty() && !"null".equalsIgnoreCase(mn)) {
                    v.setMnemonic(mn);
                }
            }
        });
    }

    public CompletableFuture<Vocabulary> enrichMissingUsageGuide(Vocabulary vocab) {
        if (vocab.getUsageGuide() != null && !vocab.getUsageGuide().trim().isEmpty()) {
            return CompletableFuture.completedFuture(vocab);
        }
        String apiKey = getApiKey();
        if (apiKey == null) {
            return CompletableFuture.completedFuture(vocab);
        }
        String word = vocab.getKanji() != null && !vocab.getKanji().isBlank() ? vocab.getKanji() : vocab.getHiragana();
        String prompt = String.format(
            "Giải thích ngắn gọn ngữ cảnh, sắc thái và cách dùng bằng 100%% TIẾNG VIỆT cho từ tiếng Nhật \"%s\" (Nghĩa: %s). Tuyệt đối không dùng tiếng Nhật/Trung. Trả về duy nhất JSON: {\"usageGuide\": \"Hướng dẫn bằng tiếng Việt...\"}",
            word,
            vocab.getMeaning() != null ? vocab.getMeaning() : ""
        );
        return executeMicroPrompt(vocab, apiKey, prompt, (node, v) -> {
            if (node.has("usageGuide") && !node.path("usageGuide").isNull()) {
                String ug = node.path("usageGuide").asText().trim();
                if (!ug.isEmpty() && !"null".equalsIgnoreCase(ug)) {
                    v.setUsageGuide(ug);
                }
            }
        });
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

    public Map<String, String> generateTranslationExercise(java.util.List<Vocabulary> vocabs) throws Exception {
        return generateTranslationExercise(vocabs, java.util.Collections.emptyList(), java.util.Collections.emptyList());
    }

    public Map<String, String> generateTranslationExercise(java.util.List<Vocabulary> vocabs, java.util.List<Vocabulary> sessionVocabs) throws Exception {
        return generateTranslationExercise(vocabs, sessionVocabs, java.util.Collections.emptyList());
    }

    /**
     * Generate a Japanese sentence using target vocabulary words, prioritizing session words/grammar,
     * with fallback to previously learned words/grammar if needed.
     */
    public Map<String, String> generateTranslationExercise(java.util.List<Vocabulary> targetVocabs,
                                                           java.util.List<Vocabulary> sessionVocabs,
                                                           java.util.List<Vocabulary> fallbackLearnedVocabs) throws Exception {
        String apiKey = getApiKey();
        if (apiKey == null) {
            return Map.of("sentence", "今日は良い天気ですね。", "hint", "Gợi ý: thời tiết hôm nay");
        }

        StringBuilder targetWordList = new StringBuilder();
        String mainLevel = "N5";

        for (Vocabulary v : targetVocabs) {
            String word = v.getKanji() != null && !v.getKanji().trim().isEmpty() ? v.getKanji() : v.getHiragana();
            targetWordList.append("- ").append(word).append(" (nghĩa: ").append(v.getMeaning()).append(")\n");
            if (v.getLevel() != null && !v.getLevel().trim().isEmpty()) {
                mainLevel = v.getLevel();
            }
        }

        StringBuilder sessionGrammar = new StringBuilder();
        StringBuilder contextWordList = new StringBuilder();

        // 1. Primary Grammar & Vocabulary from current study session (Morning Queue or Today's Reviewed)
        if (sessionVocabs != null && !sessionVocabs.isEmpty()) {
            for (Vocabulary sv : sessionVocabs) {
                String word = sv.getKanji() != null && !sv.getKanji().trim().isEmpty() ? sv.getKanji() : sv.getHiragana();
                contextWordList.append(word).append(" (").append(sv.getMeaning()).append("), ");

                if (sv.getSampleSentence() != null && !sv.getSampleSentence().trim().isEmpty()) {
                    sessionGrammar.append("- Mẫu câu của ").append(word).append(": ").append(sv.getSampleSentence()).append("\n");
                }
                if (sv.getCollocations() != null && !sv.getCollocations().trim().isEmpty()) {
                    sessionGrammar.append("- Ngữ pháp/cụm từ của ").append(word).append(": ").append(sv.getCollocations()).append("\n");
                }
            }
        }

        // 2. Secondary Fallback Grammar & Vocabulary from previously learned words
        StringBuilder fallbackGrammar = new StringBuilder();
        if (fallbackLearnedVocabs != null && !fallbackLearnedVocabs.isEmpty()) {
            int count = 0;
            for (Vocabulary fv : fallbackLearnedVocabs) {
                String word = fv.getKanji() != null && !fv.getKanji().trim().isEmpty() ? fv.getKanji() : fv.getHiragana();
                contextWordList.append(word).append(" (").append(fv.getMeaning()).append("), ");

                if (fv.getSampleSentence() != null && !fv.getSampleSentence().trim().isEmpty() && count < 8) {
                    fallbackGrammar.append("- Mẫu câu bổ trợ (").append(word).append("): ").append(fv.getSampleSentence()).append("\n");
                    count++;
                }
            }
        }

        String prompt = "Bạn là trợ lý soạn bài tập tiếng Nhật thông minh.\n" +
                "Nhiệm vụ: Tạo 1 câu tiếng Nhật ngắn gọn, tự nhiên (10 đến 20 từ) để kiểm tra các từ vựng mục tiêu sau:\n" + targetWordList +
                (sessionGrammar.length() > 0 ? "\nNGỮ PHÁP VÀ MẪU CÂU ĐỢT ÔN NÀY (BẮT BUỘC ƯU TIÊN SỬ DỤNG):\n" + sessionGrammar.toString() + "\n" : "") +
                (fallbackGrammar.length() > 0 ? "\nNGỮ PHÁP VÀ MẪU CÂU ĐÃ HỌC BỔ TRỢ (NẾU THIẾU):\n" + fallbackGrammar.toString() + "\n" : "") +
                (contextWordList.length() > 0 ? "\nTỪ VỰNG LIÊN QUAN ĐÃ HỌC:\n" + contextWordList.toString() + "\n" : "") +
                "\nQUY TẮC BẮT BUỘC:\n" +
                "1. ƯU TIÊN HÀNG ĐẦU: Dùng cấu trúc ngữ pháp và mẫu câu của đợt ôn tập này để ghép câu cho các từ vựng mục tiêu.\n" +
                "2. Nếu thiếu cấu trúc, hãy dùng các mẫu ngữ pháp/từ vựng bổ trợ hoặc liên quan đã học ở trên (trình độ " + mainLevel + " trở xuống).\n" +
                "3. Tuyệt đối KHÔNG DÙNG mẫu ngữ pháp hay từ vựng lạ nằm ngoài các ngữ pháp/từ vựng đã học ở trên.\n" +
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
            try {
                java.nio.file.Path envPath = java.nio.file.Paths.get(".env");
                if (!java.nio.file.Files.exists(envPath)) {
                    envPath = java.nio.file.Paths.get("../.env");
                }
                if (!java.nio.file.Files.exists(envPath)) {
                    envPath = java.nio.file.Paths.get("../../.env");
                }
                if (java.nio.file.Files.exists(envPath)) {
                    for (String line : java.nio.file.Files.readAllLines(envPath)) {
                        line = line.trim();
                        if (line.startsWith("DEEPSEEK_API_KEY=")) {
                            apiKey = line.substring("DEEPSEEK_API_KEY=".length()).trim();
                            if (apiKey.startsWith("\"") && apiKey.endsWith("\"")) {
                                apiKey = apiKey.substring(1, apiKey.length() - 1);
                            }
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("DEEPSEEK_API_KEY is not set in env or .env file. Returning fallback.");
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

    /**
     * Evaluate typed quiz answer using Hybrid AI Semantic Evaluation.
     * Step 1: Fast String / Synonym match (0ms)
     * Step 2: Micro-prompt to DeepSeek AI (~0.15s - 0.25s)
     */
    public Map<String, Object> evaluateQuizAnswer(String targetAnswer, String userAnswer, String questionContext) {
        if (targetAnswer == null || targetAnswer.trim().isEmpty() || userAnswer == null || userAnswer.trim().isEmpty()) {
            return Map.of("correct", false, "matchType", "EMPTY", "explanation", "Vui lòng nhập đáp án.");
        }

        String normUser = normalizeText(userAnswer);

        // Step 1: Direct or Fuzzy String Match (0ms)
        String[] targetVariants = targetAnswer.split("[/,;|\n]+");
        for (String variant : targetVariants) {
            String normVar = normalizeText(variant);
            if (normUser.equals(normVar)) {
                return Map.of("correct", true, "matchType", "EXACT", "explanation", "Đáp án chính xác!");
            }
            if (isFuzzyMatch(normUser, normVar)) {
                return Map.of("correct", true, "matchType", "FUZZY", "explanation", "Đáp án đúng (gõ tiệm cận)!");
            }
        }

        // Step 2: AI Micro-Prompt Semantic Check via DeepSeek AI (~0.2s)
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return Map.of("correct", false, "matchType", "STRING_FAIL", "explanation", "Chưa khớp với đáp án mẫu.");
        }

        try {
            String prompt = String.format(
                "Bạn là một chuyên gia ngôn ngữ tiếng Nhật và tiếng Việt.\n" +
                "Hãy kiểm tra xem câu trả lời của học viên có ĐÚNG NGHĨA / ĐỒNG NGHĨA HOẶC CHẤP NHẬN ĐƯỢC không khi dịch từ tiếng Nhật.\n\n" +
                "Từ tiếng Nhật (ngữ cảnh): \"%s\"\n" +
                "Đáp án chuẩn: \"%s\"\n" +
                "Đáp án học viên gõ: \"%s\"\n\n" +
                "Nếu đáp án của học viên đúng nghĩa, diễn đạt tương đương hoặc là từ đồng nghĩa chấp nhận được, hãy đánh giá correct=true.\n" +
                "Trả về duy nhất JSON không markdown:\n" +
                "{\"correct\": true hoặc false, \"explanation\": \"giải thích ngắn gọn 1 câu bằng tiếng Việt\"}",
                questionContext != null ? questionContext : "",
                targetAnswer,
                userAnswer
            );

            String responseBody = callDeepSeekRaw(apiKey, prompt);
            JsonNode root = objectMapper.readTree(cleanJsonContent(responseBody));
            boolean correct = root.path("correct").asBoolean(false);
            String explanation = root.path("explanation").asText(correct ? "Đồng nghĩa chấp nhận được!" : "Chưa chính xác.");

            return Map.of(
                "correct", correct,
                "matchType", "AI_SEMANTIC",
                "explanation", explanation
            );
        } catch (Exception e) {
            log.error("Failed to evaluate quiz answer with DeepSeek AI: {}", e.getMessage());
            return Map.of("correct", false, "matchType", "ERROR", "explanation", "Chưa khớp với đáp án mẫu.");
        }
    }

    private String normalizeText(String text) {
        if (text == null) return "";
        return text.trim().toLowerCase()
                .replaceAll("[\\s\\t\\n\\r]+", " ")
                .replaceAll("^[\\p{Punct}\\s]+|[\\p{Punct}\\s]+$", "");
    }

    private boolean isFuzzyMatch(String s1, String s2) {
        if (s1.equals(s2)) return true;
        int dist = computeLevenshteinDistance(s1, s2);
        return dist <= 1 && Math.max(s1.length(), s2.length()) > 3;
    }

    private int computeLevenshteinDistance(String s1, String s2) {
        int[] costs = new int[s2.length() + 1];
        for (int i = 0; i <= s1.length(); i++) {
            int lastValue = i;
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        int newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length()] = lastValue;
        }
        return costs[s2.length()];
    }

    /**
     * Generate 30 N3 Multiple Choice Questions (MCQ) for Grammar points of a specific lesson.
     */
    public String generateGrammarQuiz30Questions(int chapter, int lesson, java.util.List<Map<String, Object>> grammarList) {
        String apiKey = getApiKey();
        if (apiKey == null) {
            log.warn("DEEPSEEK_API_KEY is not configured. Generating smart local 30 grammar quiz questions fallback.");
            return generateFallback30GrammarQuestions(chapter, lesson, grammarList);
        }

        StringBuilder grammarInfo = new StringBuilder();
        if (grammarList != null) {
            for (Map<String, Object> g : grammarList) {
                String struc = String.valueOf(g.getOrDefault("cau_truc", ""));
                String meaning = String.valueOf(g.getOrDefault("y_nghia", ""));
                grammarInfo.append("- ").append(struc).append(": ").append(meaning).append("\n");
            }
        }

        String prompt = String.format(
            "Bạn là chuyên gia biên soạn đề thi N3 tiếng Nhật theo chuẩn cấu trúc bài thi JLPT N3 chính thức.\n" +
            "Nhiệm vụ: Tạo đúng 30 câu hỏi trắc nghiệm kiểm tra các điểm ngữ pháp JLPT N3 thuộc Chương %d Bài %d sau đây:\n\n" +
            "DANH SÁCH NGỮ PHÁP MỤC TIÊU:\n%s\n\n" +
            "CẤU TRÚC BẮT BUỘC (GỒM 2 DẠNG CHUẨN JLPT N3):\n\n" +
            "● DẠNG 1: CÂU 1 ĐẾN CÂU 15 (Mondai 1 - Điền ngữ pháp vào chỗ trống):\n" +
            "  - Chỗ trống (　　) PHẢI nằm ĐÚNG CHỖ điểm ngữ pháp cần điền TRONG CÂU và TRƯỚC dấu chấm 。.\n" +
            "  - 4 lựa chọn A, B, C, D.\n" +
            "  - Mọi Kanji trong câu PHẢI mở ngoặc đính kèm Furigana cách đọc Hiragana ngay sau đó (ví dụ: 日本(にほん)へ来(き)て...).\n" +
            "  - Ghi \"type\": \"mondai1\".\n\n" +
            "● DẠNG 2: CÂU 16 ĐẾN CÂU 30 (Mondai 2 - Sắp xếp câu tìm vị trí Ngôi Sao ★):\n" +
            "  - Mỗi câu cho 1 câu tiếng Nhật có 4 vị trí gạch chân xáo trộn 1_ 2_ 3★_ 4_ trong đó vị trí thứ 3 là dấu Ngôi Sao ★ (ví dụ: 山田(やまだ)さんは ____ ____ _★_ ____ から、休(やす)むはずがない。).\n" +
            "  - 4 lựa chọn A, B, C, D là 4 cụm từ xáo trộn.\n" +
            "  - Đáp án đúng \"answer\" PHẢI là cụm từ nằm đúng ở vị trí dấu Ngôi Sao ★ khi ghép câu đúng hoàn chỉnh.\n" +
            "  - Ghi \"type\": \"star\".\n\n" +
            "● YÊU CẦU PHẦN GIẢI THÍCH (explanation) PHẢI ĐẦY ĐỦ TIẾNG VIỆT & NGẮN GỌN DỄ HIỂU:\n" +
            "  1. Dịch nghĩa câu hỏi tiếng Nhật sang tiếng Việt.\n" +
            "  2. Nêu rõ lý do chọn đáp án đúng (ý nghĩa & cách chia cấu trúc ngữ pháp).\n" +
            "  3. GIẢI THÍCH NGẮN GỌN TẠI SAO CÁC ĐÁP ÁN CÒN LẠI SAI (ví dụ: B sai vì..., C sai vì..., D sai vì...).\n\n" +
            "Trả về duy nhất 1 JSON Array gồm đúng 30 phần tử (KHÔNG DÙNG MARKDOWN):\n" +
            "[\n" +
            "  {\n" +
            "    \"id\": 1,\n" +
            "    \"type\": \"mondai1\",\n" +
            "    \"question\": \"1. 日本(にほん)へ来(き)て（　　）、ずっとこの町(まち)に住(す)んでいます。\",\n" +
            "    \"options\": [\"A. 以来(いらい)\", \"B. から\", \"C. にかけて\", \"D. について\"],\n" +
            "    \"answer\": \"A. 以来(いらい)\",\n" +
            "    \"explanation\": \"• Dịch nghĩa: Kể từ khi đến Nhật Bản, tôi sống suốt ở thành phố này.\\n• Đáp án A (以来) ĐÚNG: Cấu trúc Vて + 以来 biểu thị kể từ mốc thời gian trong quá khứ kéo dài liên tục.\\n• Tại sao các đáp án khác sai:\\n - B (から) sai: Vてから chỉ thể hiện thứ tự trước sau của hành động, không nhấn mạnh trạng thái kéo dài suốt đến nay.\\n - C (にかけて) sai: Dùng biểu thị phạm vi khoảng thời gian/không gian (từ A đến B).\\n - D (について) sai: Dùng với ý nghĩa 'về vấn đề...'\"\n" +
            "  },\n" +
            "  {\n" +
            "    \"id\": 16,\n" +
            "    \"type\": \"star\",\n" +
            "    \"question\": \"16. 山田(やまだ)さんは ____ ____ _★_ ____ から、休(やす)むはずがない。\",\n" +
            "    \"options\": [\"A. 1. 元気(げんき)な\", \"B. 2. 理由(りゆう)\", \"C. 3. がない\", \"D. 4. はず\"],\n" +
            "    \"answer\": \"C. 3. がない\",\n" +
            "    \"explanation\": \"• Dịch nghĩa: Anh Yamada không có lý do gì để nghỉ cả.\\n• Thứ tự ghép câu đúng: 元気な (1) -> 理由 (2) -> がない (3★) -> はず (4) から.\\n• Đáp án C (3. がない) ĐÚNG vì nằm ở vị trí dấu Ngôi Sao ★.\\n• Tại sao các lựa chọn khác không ở vị trí ★:\\n - A (1. 元気な) đứng ở gạch thứ 1 bổ nghĩa cho 理由.\\n - B (2. 理由) đứng ở gạch thứ 2 đi cùng がない.\\n - D (4. はず) đứng ở gạch thứ 4 ngay trước から.\"\n" +
            "  }\n" +
            "]",
            chapter, lesson, grammarInfo.toString()
        );

        try {
            String rawText = callDeepSeekRaw(apiKey, prompt);
            String cleanJson = cleanJsonContent(rawText);
            JsonNode root = objectMapper.readTree(cleanJson);
            if (root.isArray() && root.size() > 0) {
                return objectMapper.writeValueAsString(root);
            }
        } catch (Exception e) {
            log.error("Failed to generate 30 grammar quiz questions via DeepSeek API: {}", e.getMessage());
        }

        log.info("Falling back to local smart 30 grammar quiz generator for chapter {} lesson {}", chapter, lesson);
        return generateFallback30GrammarQuestions(chapter, lesson, grammarList);
    }

    /**
     * Fallback Smart 30 Grammar Quiz Generator (15 Mondai 1 + 15 Mondai 2 Star).
     * Used whenever DeepSeek API is unavailable, unconfigured, or offline.
     */
    public String generateFallback30GrammarQuestions(int chapter, int lesson, java.util.List<Map<String, Object>> grammarList) {
        java.util.List<Map<String, Object>> questions = new ArrayList<>();

        if (grammarList == null || grammarList.isEmpty()) {
            Map<String, Object> dummy = new HashMap<>();
            dummy.put("cau_truc", "~について");
            dummy.put("y_nghia", "Về vấn đề...");
            grammarList = java.util.List.of(dummy);
        }

        java.util.List<String> distractors = java.util.List.of("について", "にかけて", "にともなって", "にくらべて", "として", "にしては", "にかかわらず", "をはじめ");
        int totalGrammar = grammarList.size();

        // 1. Generate 15 Mondai 1 Questions (Fill in the blank)
        for (int i = 1; i <= 15; i++) {
            Map<String, Object> g = grammarList.get((i - 1) % totalGrammar);
            String struc = String.valueOf(g.getOrDefault("cau_truc", "~について"));
            String meaning = String.valueOf(g.getOrDefault("y_nghia", "Ý nghĩa ngữ pháp"));

            @SuppressWarnings("unchecked")
            java.util.List<String> viDuList = (java.util.List<String>) g.get("vi_du");
            String sampleEx = (viDuList != null && !viDuList.isEmpty()) ? viDuList.get(0) : "この問題（　　）、詳しく説明します。";

            String cleanStruc = struc.replaceAll("^[~～]", "").trim();
            String formattedEx = sampleEx;

            if (formattedEx.contains("（")) {
                // Already contains blank
            } else if (!cleanStruc.isEmpty() && formattedEx.contains(cleanStruc)) {
                formattedEx = formattedEx.replace(cleanStruc, "（　{nbsp}　）");
            } else if (formattedEx.endsWith("。")) {
                formattedEx = formattedEx.substring(0, formattedEx.length() - 1) + "（　{nbsp}　）。";
            } else {
                formattedEx = formattedEx + "（　{nbsp}　）";
            }
            // Replace placeholder string with clean blank
            formattedEx = formattedEx.replace("{nbsp}", "");

            String questionText = String.format("%d. %s", i, formattedEx);

            String d1 = distractors.get(i % distractors.size());
            String d2 = distractors.get((i + 2) % distractors.size());
            String d3 = distractors.get((i + 4) % distractors.size());

            java.util.List<String> options = new ArrayList<>();
            options.add("A. " + struc);
            options.add("B. " + d1);
            options.add("C. " + d2);
            options.add("D. " + d3);

            String explanationStr = String.format(
                "• Dịch nghĩa: Câu hỏi kiểm tra cách dùng điểm ngữ pháp %s.\n" +
                "• Đáp án A (%s) ĐÚNG: Cấu trúc %s biểu thị %s.\n" +
                "• Tại sao các đáp án khác sai:\n" +
                " - B (%s) sai: Không đúng mẫu ngữ pháp hoặc sai ý nghĩa ngữ cảnh trong câu.\n" +
                " - C (%s) sai: Mang ý nghĩa khác, không phù hợp với cấu trúc ngữ pháp cần điền.\n" +
                " - D (%s) sai: Sai cách kết hợp hoặc không đúng logic câu.",
                struc, struc, struc, meaning, d1, d2, d3
            );

            Map<String, Object> q = new HashMap<>();
            q.put("id", i);
            q.put("type", "mondai1");
            q.put("question", questionText);
            q.put("options", options);
            q.put("answer", "A. " + struc);
            q.put("explanation", explanationStr);

            questions.add(q);
        }

        // 2. Generate 15 Mondai 2 Star ★ Questions (Sentence Arrangement)
        for (int i = 16; i <= 30; i++) {
            Map<String, Object> g = grammarList.get((i - 1) % totalGrammar);
            String struc = String.valueOf(g.getOrDefault("cau_truc", "~について"));
            String meaning = String.valueOf(g.getOrDefault("y_nghia", "Ý nghĩa ngữ pháp"));

            String questionText = String.format("%d. 毎日(まいにち) ____ ____ _★_ ____ と思(おも)います。", i);

            java.util.List<String> options = new ArrayList<>();
            options.add("A. 1. 勉强(べんきょう)して");
            options.add("B. 2. 日本語(にほんご)を");
            options.add("C. 3. " + struc);
            options.add("D. 4. 上達(じょうたつ)したい");

            String explanationStr = String.format(
                "• Dịch nghĩa: Tôi nghĩ rằng mình muốn chăm chỉ học tiếng Nhật để trình độ mau nâng cao.\n" +
                "• Thứ tự sắp xếp câu đúng: 日本語を(2) -> 勉強して(1) -> %s(3★) -> 上達したい(4) と思います.\n" +
                "• Đáp án C (3. %s) ĐÚNG vì nằm ở vị trí gạch thứ 3 có dấu Ngôi Sao ★ (Cấu trúc %s: %s).\n" +
                "• Tại sao các lựa chọn khác không ở vị trí ★:\n" +
                " - A (1. 勉強して) sai vị trí ★: Đứng ở vị trí gạch số 2.\n" +
                " - B (2. 日本語を) sai vị trí ★: Đứng ở vị trí gạch số 1.\n" +
                " - D (4. 上達したい) sai vị trí ★: Đứng ở vị trí gạch số 4.",
                struc, struc, struc, meaning
            );

            Map<String, Object> q = new HashMap<>();
            q.put("id", i);
            q.put("type", "star");
            q.put("question", questionText);
            q.put("options", options);
            q.put("answer", "C. 3. " + struc);
            q.put("explanation", explanationStr);

            questions.add(q);
        }

        try {
            return objectMapper.writeValueAsString(questions);
        } catch (Exception e) {
            log.error("Failed to serialize fallback 30 grammar questions: {}", e.getMessage());
            return "[]";
        }
    }
}

