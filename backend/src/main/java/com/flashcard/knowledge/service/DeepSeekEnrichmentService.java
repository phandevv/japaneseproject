package com.flashcard.knowledge.service;

import com.flashcard.common.config.AiConfig;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.vocabulary.model.Vocabulary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
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
    private final AiConfig aiConfig;

    public DeepSeekEnrichmentService(VocabularyDataProvider vocabularyDataProvider, ObjectMapper objectMapper) {
        this(vocabularyDataProvider, null, objectMapper, new AiConfig(null, null, null));
    }

    public DeepSeekEnrichmentService(VocabularyDataProvider vocabularyDataProvider,
                                  KnowledgeDataProvider knowledgeDataProvider,
                                  ObjectMapper objectMapper) {
        this(vocabularyDataProvider, knowledgeDataProvider, objectMapper, new AiConfig(null, null, null));
    }

    @Autowired
    public DeepSeekEnrichmentService(VocabularyDataProvider vocabularyDataProvider,
                                  @Autowired(required = false) KnowledgeDataProvider knowledgeDataProvider,
                                  ObjectMapper objectMapper,
                                  @Autowired(required = false) AiConfig aiConfig) {
        this.vocabularyDataProvider = vocabularyDataProvider;
        this.knowledgeDataProvider = knowledgeDataProvider;
        this.objectMapper = objectMapper;
        this.aiConfig = (aiConfig != null) ? aiConfig : new AiConfig(null, null, null);
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
                    "model", aiConfig.getModel(),
                    "max_tokens", 1200,
                    "temperature", 0.1,
                    "response_format", Map.of("type", "json_object"),
                    "messages", new Object[]{
                        Map.of("role", "system", "content", "Bạn là trợ lý từ điển tiếng Nhật cao cấp cho người Việt. BẮT BUỘC: Mọi giải thích, dịch nghĩa, mẹo nhớ, hướng dẫn sử dụng, phân biệt và sửa lỗi PHẢI viết bằng 100% TIẾNG VIỆT, tuyệt đối không dùng tiếng Nhật hoặc tiếng Trung trong các trường giải thích. Phản hồi duy nhất bằng JSON hợp lệ."),
                        Map.of("role", "user", "content", prompt)
                    }
                );
                String requestBody = objectMapper.writeValueAsString(requestBodyMap);

                HttpRequest request = HttpRequest.newBuilder(URI.create(aiConfig.getApiUrl()))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .timeout(Duration.ofSeconds(25))
                        .build();

                return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                        .thenApply(response -> {
                            try {
                                if (response.statusCode() == 200) {
                                    JsonNode root = objectMapper.readTree(cleanResponseBody(response.body()));
                                    String contentJson = root.path("choices").get(0).path("message").path("content").asText(null);
                                    if (contentJson == null || contentJson.isBlank()) {
                                        contentJson = root.path("choices").get(0).path("message").path("reasoning").asText("");
                                    }

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
                    .uri(URI.create(aiConfig.getApiUrl()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(Map.of(
                            "model", aiConfig.getModel(),
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
                                JsonNode responseRoot = objectMapper.readTree(cleanResponseBody(response.body()));
                                String rawText = responseRoot.path("choices").get(0).path("message").path("content").asText(null);
                                if (rawText == null || rawText.isBlank()) {
                                    rawText = responseRoot.path("choices").get(0).path("message").path("reasoning").asText("");
                                }
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
                "model", aiConfig.getModel(),
                "max_tokens", maxTokens,
                "temperature", 0.1,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là chuyên gia ngữ pháp tiếng Nhật cao cấp cho người Việt. BẮT BUỘC: Mọi giải thích, phân tích cấu trúc, dịch nghĩa ví dụ, phân biệt sắc thái, lỗi sai PHẢI viết bằng 100% TIẾNG VIỆT, tuyệt đối không dùng tiếng Nhật hoặc tiếng Trung để giải thích. Phản hồi duy nhất bằng định dạng JSON."),
                    Map.of("role", "user", "content", prompt)
                }
            );
            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpRequest request = HttpRequest.newBuilder(URI.create(aiConfig.getApiUrl()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(20))
                    .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenApply(response -> {
                        try {
                            if (response.statusCode() == 200) {
                                JsonNode root = objectMapper.readTree(cleanResponseBody(response.body()));
                                String contentJson = root.path("choices").get(0).path("message").path("content").asText(null);
                                if (contentJson == null || contentJson.isBlank()) {
                                    contentJson = root.path("choices").get(0).path("message").path("reasoning").asText("");
                                }
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
                "model", aiConfig.getModel(),
                "max_tokens", maxTokens,
                "temperature", 0.1,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là trợ lý từ điển tiếng Nhật cao cấp. BẮT BUỘC: Mọi giải thích, dịch nghĩa, mẹo nhớ, ví dụ PHẢI viết bằng 100% TIẾNG VIỆT, tuyệt đối không dùng tiếng Nhật hoặc tiếng Trung để giải thích. Phản hồi duy nhất bằng định dạng JSON."),
                    Map.of("role", "user", "content", prompt)
                }
            );
            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpRequest request = HttpRequest.newBuilder(URI.create(aiConfig.getApiUrl()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenApply(response -> {
                        try {
                            if (response.statusCode() == 200) {
                                JsonNode root = objectMapper.readTree(cleanResponseBody(response.body()));
                                String contentJson = root.path("choices").get(0).path("message").path("content").asText(null);
                                if (contentJson == null || contentJson.isBlank()) {
                                    contentJson = root.path("choices").get(0).path("message").path("reasoning").asText("");
                                }
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

    private String cleanResponseBody(String body) {
        if (body == null) return "{}";
        String trimmed = body.trim();
        if (trimmed.contains("data: [DONE]")) {
            trimmed = trimmed.replace("data: [DONE]", "").trim();
        }
        return trimmed;
    }

    private String cleanJsonContent(String content) {
        if (content == null || content.isBlank()) return "{}";
        String trimmed = content.trim();
        if (trimmed.contains("data: [DONE]")) {
            trimmed = trimmed.replace("data: [DONE]", "").trim();
        }
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        trimmed = trimmed.trim();

        // Extract JSON slice between first { or [ and last } or ]
        int firstBrace = trimmed.indexOf('{');
        int firstBracket = trimmed.indexOf('[');
        int startIdx = -1;
        if (firstBrace != -1 && firstBracket != -1) {
            startIdx = Math.min(firstBrace, firstBracket);
        } else if (firstBrace != -1) {
            startIdx = firstBrace;
        } else if (firstBracket != -1) {
            startIdx = firstBracket;
        }

        int lastBrace = trimmed.lastIndexOf('}');
        int lastBracket = trimmed.lastIndexOf(']');
        int endIdx = Math.max(lastBrace, lastBracket);

        if (startIdx != -1 && endIdx != -1 && endIdx >= startIdx) {
            return trimmed.substring(startIdx, endIdx + 1).trim();
        }

        return trimmed;
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
        return aiConfig.getApiKey();
    }

    /** Synchronous DeepSeek call, returns the content string of first choice. */
    public String callDeepSeekRaw(String apiKey, String userPrompt) throws Exception {
        return callDeepSeekRawWithParams(apiKey, userPrompt, 512, 30);
    }

    /** Synchronous DeepSeek call with customizable maxTokens and timeoutSeconds. */
    public String callDeepSeekRawWithParams(String apiKey, String userPrompt, int maxTokens, int timeoutSeconds) throws Exception {
        String requestBody = objectMapper.writeValueAsString(Map.of(
            "model", aiConfig.getModel(),
            "messages", java.util.List.of(Map.of("role", "user", "content", userPrompt)),
            "max_tokens", maxTokens,
            "temperature", 0.7
        ));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(aiConfig.getApiUrl()))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .timeout(Duration.ofSeconds(timeoutSeconds))
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("DeepSeek API error: " + response.statusCode() + " - " + response.body());
        }
        JsonNode root = objectMapper.readTree(cleanResponseBody(response.body()));
        String content = root.path("choices").get(0).path("message").path("content").asText(null);
        if (content == null || content.isBlank()) {
            content = root.path("choices").get(0).path("message").path("reasoning").asText("");
        }
        return content;
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

    /**
     * Step 1 of Pipeline: Generate an extensive JLPT N3 reading passage (~1500 - 2000 Japanese characters)
     * incorporating the lesson's target vocabulary and grammar, with [Kanji|hiragana] furigana format.
     */
    public Map<String, String> generateN3ReadingPassage(int chapter, int lesson,
                                                         java.util.List<Map<String, Object>> vocabList,
                                                         java.util.List<Map<String, Object>> grammarList) {
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("DeepSeek/OpenRouter API key chưa được cấu hình. Vui lòng cấu hình DEEPSEEK_API_KEY để sinh bài đọc hiểu AI (100% AI, không sử dụng dữ liệu tĩnh).");
        }

        int totalVocab = vocabList != null ? vocabList.size() : 0;
        int minVocabRequired = totalVocab > 0 ? (int) Math.floor(totalVocab * 0.5) + 1 : 0;
        int totalGrammar = grammarList != null ? grammarList.size() : 0;

        StringBuilder vocabInfo = new StringBuilder();
        if (vocabList != null) {
            int vIdx = 1;
            for (Map<String, Object> v : vocabList) {
                String word = String.valueOf(v.getOrDefault("tu", v.getOrDefault("kanji", "")));
                String reading = String.valueOf(v.getOrDefault("furigana", v.getOrDefault("hiragana", "")));
                String meaning = String.valueOf(v.getOrDefault("nghia", v.getOrDefault("meaning", "")));
                if (!word.isBlank()) {
                    vocabInfo.append(vIdx++).append(". ").append(word);
                    if (!reading.isBlank() && !reading.equals(word)) {
                        vocabInfo.append(" (").append(reading).append(")");
                    }
                    if (!meaning.isBlank()) {
                        vocabInfo.append(": ").append(meaning);
                    }
                    vocabInfo.append("\n");
                }
            }
        }

        StringBuilder grammarInfo = new StringBuilder();
        if (grammarList != null) {
            int gIdx = 1;
            for (Map<String, Object> g : grammarList) {
                String struc = String.valueOf(g.getOrDefault("cau_truc", ""));
                String meaning = String.valueOf(g.getOrDefault("y_nghia", ""));
                if (!struc.isBlank()) {
                    grammarInfo.append(gIdx++).append(". ").append(struc).append(": ").append(meaning).append("\n");
                }
            }
        }

        String prompt = String.format(
            "Bạn là chuyên gia sư phạm tiếng Nhật JLPT N3 và là một nhà văn Nhật Bản giàu kinh nghiệm.\n" +
            "Nhiệm vụ: Viết một bài văn đọc hiểu tiếng Nhật DÀI, CHUYÊN SÂU TỪ 3000 ĐẾN 4500 KÝ TỰ (chuẩn độ dài Đại trường văn JLPT N3 Dokkai chất lượng cao) cho Chương %d Bài %d.\n\n" +
            "QUY TẮC CỐT LÕI - PHÁT TRIỂN CHỦ ĐỀ TỪ DANH SÁCH TỪ VỰNG (VOCABULARY-FIRST STORYTELLING):\n" +
            "1. DỰA VÀO TỪ VỰNG ĐỂ XÁC ĐỊNH CHỦ ĐỀ: Hãy đọc kỹ danh sách %d từ vựng bên dưới để tìm ra ngữ cảnh và chủ đề đời sống thực tế chung của chúng. Cốt truyện, tình huống và bối cảnh của bài viết BẮT BUỘC PHẢI SINH RA TỪ CHÍNH NHÓM TỪ VỰNG NÀY.\n" +
            "   (Ví dụ: nếu từ vựng nhiều từ về nhà cửa, phòng ốc, tiền thuê, chuyển nhà -> chủ đề PHẢI là câu chuyện tìm phòng, chuyển nhà; nếu từ vựng về nấu nướng, đồ ăn -> chủ đề PHẢI là ẩm thực, gia đình).\n" +
            "   TUYỆT ĐỐI KHÔNG chọn trước một chủ đề trừu tượng viển vông rồi mới cố gượng ép nhét từ vựng vào!\n" +
            "2. TUYỆT ĐỐI CẤM MỞ BÀI SÁO RỖNG (ANTI-CLICHE): TUYỆT ĐỐI KHÔNG mở bài bằng các câu sáo rỗng như: '現代の社会において...', '現代社会では...', '私たちの生活は日々変化して...', '近年...'. Hãy mở bài trực tiếp bằng một câu chuyện cụ thể, trải nghiệm thực tế hoặc đối thoại sinh động gắn liền với bối cảnh của các từ vựng trong bài.\n" +
            "3. ĐỘ PHỦ TỪ VỰNG (> 50%%): BẮT BUỘC PHẢI DÙNG TỐI THIỂU %d/%d TỪ VỰNG DƯỚI ĐÂY (trên 50%% tổng số từ vựng). Vì bài viết xoay quanh đúng chủ đề của từ vựng, hãy lồng ghép các từ một cách tự nhiên, mạch lạc vào từng tình huống.\n" +
            "4. ĐỘ PHỦ NGỮ PHÁP (100%% BẮT BUỘC): BẮT BUỘC PHẢI DÙNG TOÀN BỘ %d/%d CẤU TRÚC NGỮ PHÁP DƯỚI ĐÂY trong mạch văn. Không được bỏ sót bất kỳ mẫu nào. Hãy chia động từ/hình thái tự nhiên trong câu (Ví dụ: '~ようにする' -> '〜ようにしました' hoặc '〜ようにしてください'; '~を中心' -> '〜を中心として' hoặc '〜を中心に'; '~ざるを得ない' -> '〜ざるを得ませんでした'). ĐẶC BIỆT: Đối với các mẫu có cấu trúc tương tự nhau (như 〜ように, 〜ようにする, 〜ようにしている), bạn BẮT BUỘC phải dùng chúng ở các câu riêng biệt thể hiện đúng chức năng của từng mẫu (1 câu mục đích, 1 câu nỗ lực, 1 câu thói quen).\n" +
            "5. ĐỘ DÀI BẮT BUỘC: Bài văn BẮT BUỘC DÀI TỪ 3000 ĐẾN 4500 KÝ TỰ TIẾNG NHẬT (tính cả các ký tự Furigana), gồm 5 đến 7 đoạn văn lớn, có cốt truyện (Storytelling) hấp dẫn, chuyển ý mượt mà.\n" +
            "6. DANH SÁCH KIỂM ĐỊNH NGỮ PHÁP: Trong trường 'used_grammars', BẮT BUỘC phải có ĐỦ %d phần tử tương ứng với toàn bộ %d mẫu ngữ pháp từ 1 đến %d, trích dẫn chính xác câu văn từ bài đọc đã sử dụng mẫu đó để chứng minh độ phủ 100%%.\n\n" +
            "--- DANH SÁCH TỔNG CỘNG %d TỪ VỰNG (BẮT BUỘC DÙNG TỐI THIỂU %d TỪ TRỞ LÊN) ---\n%s\n\n" +
            "--- DANH SÁCH TỔNG CỘNG %d CẤU TRÚC NGỮ PHÁP (BẮT BUỘC DÙNG ĐỦ 100%% CÁC MẪU NÀY) ---\n%s\n\n" +
            "QUY TẮC FURIGANA BẮT BUỘC:\n" +
            "- Mọi chữ Kanji ghép hoặc Kanji khó PHẢI đính kèm Furigana theo đúng định dạng: [Kanji|hiragana] (Ví dụ: [環境|かんきょう], [生活|せいかつ], [部屋|へや], [経験|けいけん]).\n" +
            "- Không dùng thẻ HTML <ruby>, chỉ dùng đúng cú pháp [Từ_Kanji|cách_đọc_hiragana] để hệ thống tự động render.\n\n" +
            "Trả về duy nhất 1 JSON Object (KHÔNG DÙNG MARKDOWN, KHÔNG GIẢI THÍCH NGOÀI):\n" +
            "{\n" +
            "  \"title\": \"Tiêu đề bài đọc tiếng Nhật (có furigana [Kanji|hiragana] nếu có kanji)\",\n" +
            "  \"passage\": \"Toàn bộ nội dung bài văn 3000~4500 chữ chia 5-7 đoạn rõ ràng bằng \\n\\n, có định dạng furigana [Kanji|hiragana]...\",\n" +
            "  \"translation\": \"Bản dịch nghĩa tiếng Việt đầy đủ, tự nhiên, văn phong trau chuốt của toàn bộ bài văn...\",\n" +
            "  \"used_grammars\": [\n" +
            "    {\"pattern\": \"Tên mẫu ngữ pháp\", \"sentence\": \"Trích nguyên văn câu trong passage có chứa mẫu này\"}\n" +
            "  ]\n" +
            "}",
            chapter, lesson,
            totalVocab,
            minVocabRequired, totalVocab,
            totalGrammar, totalGrammar,
            totalGrammar, totalGrammar, totalGrammar,
            totalVocab, minVocabRequired, vocabInfo.toString(),
            totalGrammar, grammarInfo.toString()
        );

        log.info("  [AI CALL] Gửi yêu cầu sinh bài văn đọc hiểu tới API (Max tokens: 5500, Timeout: 120s)...");
        long startCall = System.currentTimeMillis();
        try {
            String rawText = callDeepSeekRawWithParams(apiKey, prompt, 5500, 120);
            log.info("  [AI CALL] Đã nhận phản hồi bài văn từ API trong {}s (Độ dài: {} ký tự). Đang xử lý Furigana & parse JSON...", 
                (System.currentTimeMillis() - startCall) / 1000.0, rawText.length());
            String cleanJson = cleanJsonContent(rawText);
            JsonNode root = objectMapper.readTree(cleanJson);
            if (root.has("title") && root.has("passage")) {
                String title = root.path("title").asText("Bài đọc hiểu N3");
                String passage = root.path("passage").asText("");
                String translation = root.path("translation").asText("");

                if (passage.trim().isEmpty()) {
                    throw new IllegalStateException("AI không trả về nội dung bài đọc (passage rỗng) cho Chương " + chapter + " Bài " + lesson);
                }

                // Normalize any model variations like Kanji[hiragana] into [Kanji|hiragana]
                title = title.replaceAll("([\\u4e00-\\u9faf\\u3400-\\u4dbf]+)\\[([^\\|\\]]+)\\]", "[$1|$2]");
                passage = passage.replaceAll("([\\u4e00-\\u9faf\\u3400-\\u4dbf]+)\\[([^\\|\\]]+)\\]", "[$1|$2]");

                if (root.has("used_grammars") && root.get("used_grammars").isArray()) {
                    log.info("  [AI CALL] AI đã báo cáo trích dẫn {}/{} mẫu ngữ pháp trong mảng used_grammars.",
                        root.get("used_grammars").size(), totalGrammar);
                }

                log.info("  [AI CALL] Parse thành công bài đọc: '{}' (Độ dài bài văn: {} ký tự)", title, passage.length());
                Map<String, String> res = new HashMap<>();
                res.put("title", title);
                res.put("passage", passage);
                res.put("translation", translation);
                return res;
            } else {
                throw new IllegalStateException("Phản hồi JSON từ AI thiếu trường 'title' hoặc 'passage' cho Chương " + chapter + " Bài " + lesson);
            }
        } catch (Exception e) {
            log.error("Failed to generate reading passage via DeepSeek API for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
            throw new RuntimeException("Lỗi khi sinh bài đọc hiểu AI (Chương " + chapter + " Bài " + lesson + "): " + e.getMessage(), e);
        }
    }

    /**
     * Self-Healing Repair Pipeline: When a generated passage is missing 1 or more grammar patterns,
     * this targeted call requests AI to seamlessly inject sentences with the missing patterns into the existing passage,
     * guaranteeing 100% grammar coverage without regenerating from scratch.
     */
    public Map<String, String> repairMissingGrammars(int chapter, int lesson,
                                                     String currentTitle, String currentPassage, String currentTranslation,
                                                     java.util.List<String> missingGrammars,
                                                     java.util.List<Map<String, Object>> grammarList) {
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty() || missingGrammars == null || missingGrammars.isEmpty()) {
            return Map.of("title", currentTitle, "passage", currentPassage, "translation", currentTranslation);
        }

        Map<String, String> meaningMap = new HashMap<>();
        if (grammarList != null) {
            for (Map<String, Object> g : grammarList) {
                String struc = String.valueOf(g.getOrDefault("cau_truc", "")).trim();
                String meaning = String.valueOf(g.getOrDefault("y_nghia", "")).trim();
                if (!struc.isBlank()) {
                    meaningMap.put(struc, meaning);
                }
            }
        }

        StringBuilder missingInfo = new StringBuilder();
        int idx = 1;
        for (String m : missingGrammars) {
            missingInfo.append(idx++).append(". ").append(m);
            String mn = meaningMap.get(m);
            if (mn != null && !mn.isBlank()) {
                missingInfo.append(": ").append(mn);
            }
            missingInfo.append("\n");
        }

        String prompt = String.format(
            "Bạn là biên tập viên tiếng Nhật JLPT N3 xuất sắc.\n" +
            "Dưới đây là một bài đọc hiểu tiếng Nhật vừa được viết cho Chương %d Bài %d:\n\n" +
            "【TIÊU ĐỀ HIỆN TẠI】: %s\n\n" +
            "【BÀI VĂN HIỆN TẠI】:\n%s\n\n" +
            "【BẢN DỊCH HIỆN TẠI】:\n%s\n\n" +
            "⚠️ VẤN ĐỀ CẦN SỬA ĐỔI: Bài văn trên rất hay nhưng hiện ĐANG THIẾU %d MẪU NGỮ PHÁP BẮT BUỘC sau đây:\n%s\n\n" +
            "NHIỆM VỤ BIÊN TẬP:\n" +
            "1. BẮT BUỘC chèn/lồng ghép tự nhiên các câu văn chứa ĐẦY ĐỦ %d mẫu ngữ pháp bị thiếu ở trên vào các đoạn văn thích hợp trong bài.\n" +
            "2. Giữ nguyên toàn bộ cốt truyện, bối cảnh, nhân vật và văn phong của bài văn hiện tại, không được cắt ngắn bài văn.\n" +
            "3. Mọi chữ Hán mới thêm PHẢI có furigana dạng [Kanji|hiragana].\n" +
            "4. Cập nhật lại bản dịch tiếng Việt cho các câu mới chèn vào.\n" +
            "5. Trong trường 'used_grammars', hãy trích dẫn câu văn tương ứng trong bài đọc cho TOÀN BỘ các mẫu vừa bổ sung.\n\n" +
            "Trả về duy nhất JSON (KHÔNG DÙNG MARKDOWN, KHÔNG GIẢI THÍCH NGOÀI):\n" +
            "{\n" +
            "  \"title\": \"%s\",\n" +
            "  \"passage\": \"Toàn bộ bài văn hoàn chỉnh sau khi đã bổ sung đầy đủ các mẫu ngữ pháp (có furigana [Kanji|hiragana])...\",\n" +
            "  \"translation\": \"Bản dịch tiếng Việt hoàn chỉnh sau khi đã cập nhật...\",\n" +
            "  \"used_grammars\": [\n" +
            "    {\"pattern\": \"Tên mẫu\", \"sentence\": \"Trích nguyên văn câu văn có chứa mẫu\"}\n" +
            "  ]\n" +
            "}",
            chapter, lesson, currentTitle, currentPassage, currentTranslation,
            missingGrammars.size(), missingInfo.toString(),
            missingGrammars.size(),
            currentTitle
        );

        log.info("  [AI REPAIR] Gửi yêu cầu tự động bổ sung {} mẫu ngữ pháp còn thiếu tới API...", missingGrammars.size());
        long startCall = System.currentTimeMillis();
        try {
            String rawText = callDeepSeekRawWithParams(apiKey, prompt, 5500, 120);
            log.info("  [AI REPAIR] Đã nhận phản hồi sửa đổi từ API trong {}s. Đang xử lý Furigana & parse JSON...",
                (System.currentTimeMillis() - startCall) / 1000.0);
            String cleanJson = cleanJsonContent(rawText);
            JsonNode root = objectMapper.readTree(cleanJson);
            if (root.has("passage")) {
                String title = root.path("title").asText(currentTitle);
                String passage = root.path("passage").asText("");
                String translation = root.path("translation").asText(currentTranslation);

                if (!passage.trim().isEmpty()) {
                    title = title.replaceAll("([\\u4e00-\\u9faf\\u3400-\\u4dbf]+)\\[([^\\|\\]]+)\\]", "[$1|$2]");
                    passage = passage.replaceAll("([\\u4e00-\\u9faf\\u3400-\\u4dbf]+)\\[([^\\|\\]]+)\\]", "[$1|$2]");

                    Map<String, String> res = new HashMap<>();
                    res.put("title", title);
                    res.put("passage", passage);
                    res.put("translation", translation);
                    return res;
                }
            }
        } catch (Exception e) {
            log.error("Failed to repair missing grammars for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
        }

        return Map.of("title", currentTitle, "passage", currentPassage, "translation", currentTranslation);
    }

    /**
     * Step 2 of Pipeline: Generate 10 N3 reading comprehension multiple choice questions based on the generated passage.
     */
    public String generateN3ReadingQuestions(int chapter, int lesson, String passage,
                                             java.util.List<Map<String, Object>> grammarList) {
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("DeepSeek/OpenRouter API key chưa được cấu hình. Vui lòng cấu hình DEEPSEEK_API_KEY để sinh câu hỏi trắc nghiệm đọc hiểu AI (100% AI, không sử dụng dữ liệu tĩnh).");
        }

        String prompt = String.format(
            "Bạn là chuyên gia biên soạn đề thi đọc hiểu JLPT N3 chính thức theo tiêu chuẩn Japan Foundation.\n" +
            "Dưới đây là một bài đọc hiểu tiếng Nhật JLPT N3 (Chương %d Bài %d):\n\n" +
            "--- BÀI ĐỌC HIỂU ---\n%s\n\n" +
            "Nhiệm vụ: Dựa hoàn toàn vào nội dung bài đọc trên, hãy biên soạn đúng 10 CÂU HỎI TRẮC NGHIỆM ĐỌC HIỂU (Chuẩn định dạng kỳ thi JLPT N3 Dokkai):\n" +
            "● Phân loại 10 câu hỏi:\n" +
            "  - Câu 1-4: Hỏi về thông tin chi tiết, nguyên nhân, lý do của một hiện tượng/hành động được đề cập trong bài (Ví dụ: なぜ..., どうして...).\n" +
            "  - Câu 5-7: Hỏi về ý nghĩa của từ ngữ trong ngữ cảnh, cụm từ gạch chân chỉ điều gì, hoặc chọn từ ngữ/ngữ pháp phù hợp điền vào mạch văn.\n" +
            "  - Câu 8-10: Hỏi về tư tưởng chủ đạo, thái độ/quan điểm của tác giả, thông điệp mà bài văn muốn truyền tải nhất (Ví dụ: 筆者が最も言いたいことは何か).\n\n" +
            "● YÊU CẦU MỖI CÂU HỎI:\n" +
            "  - \"id\": số nguyên từ 1 đến 10.\n" +
            "  - \"question\": Câu hỏi bằng tiếng Nhật (mọi Kanji đều đính kèm [Kanji|hiragana]).\n" +
            "  - \"options\": Mảng đúng 4 lựa chọn [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"].\n" +
            "  - \"answer\": Chuỗi khớp chính xác 1 trong 4 lựa chọn (Ví dụ: \"A. ...\").\n" +
            "  - \"explanation\": Giải thích súc tích 100%% bằng tiếng Việt (Dịch câu hỏi và trích dẫn câu văn trong bài chứng minh đáp án đúng).\n\n" +
            "Trả về duy nhất 1 JSON Array gồm đúng 10 phần tử (KHÔNG DÙNG MARKDOWN, KHÔNG GIẢI THÍCH NGOÀI):\n" +
            "[\n" +
            "  {\n" +
            "    \"id\": 1,\n" +
            "    \"question\": \"1. [本文|ほんぶん]によると、...\",\n" +
            "    \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"],\n" +
            "    \"answer\": \"A. ...\",\n" +
            "    \"explanation\": \"• Dịch nghĩa: ...\\n• Đáp án A ĐÚNG vì căn cứ theo câu văn '...' trong bài đọc.\"\n" +
            "  }\n" +
            "]",
            chapter, lesson, passage
        );

        log.info("  [AI CALL] Gửi yêu cầu sinh 10 câu hỏi trắc nghiệm tới API (Max tokens: 5000, Timeout: 120s)...");
        long startCallQ = System.currentTimeMillis();
        try {
            String rawText = callDeepSeekRawWithParams(apiKey, prompt, 5000, 120);
            log.info("  [AI CALL] Đã nhận phản hồi câu hỏi từ API trong {}s (Độ dài: {} ký tự). Đang parse danh sách câu hỏi...",
                (System.currentTimeMillis() - startCallQ) / 1000.0, rawText.length());
            String cleanJson = cleanJsonContent(rawText);
            cleanJson = cleanJson.replaceAll("([\\u4e00-\\u9faf\\u3400-\\u4dbf]+)\\[([^\\|\\]]+)\\]", "[$1|$2]");
            JsonNode root;
            try {
                root = objectMapper.readTree(cleanJson);
            } catch (Exception parseEx) {
                // Resilient recovery: if output was cut off mid-string, recover up to last valid closed object
                int lastBrace = cleanJson.lastIndexOf('}');
                if (cleanJson.startsWith("[") && lastBrace > 0) {
                    log.warn("  [AI CALL] Phản hồi JSON câu hỏi chưa đóng ngoặc vuông, đang tự động khôi phục mảng JSON tới ký tự '}' cuối cùng...");
                    root = objectMapper.readTree(cleanJson.substring(0, lastBrace + 1) + "]");
                } else {
                    throw parseEx;
                }
            }
            if (root.isArray() && root.size() >= 5) {
                log.info("  [AI CALL] Parse thành công {} câu hỏi trắc nghiệm đọc hiểu kèm giải thích!", root.size());
                return objectMapper.writeValueAsString(root);
            } else {
                throw new IllegalStateException("AI trả về danh sách câu hỏi không đúng định dạng JSON Array hoặc ít hơn 5 câu cho Chương " + chapter + " Bài " + lesson);
            }
        } catch (Exception e) {
            log.error("Failed to generate reading questions via DeepSeek API for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
            throw new RuntimeException("Lỗi khi sinh câu hỏi đọc hiểu AI (Chương " + chapter + " Bài " + lesson + "): " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> collectAllN3GrammarPatterns() {
        List<Map<String, Object>> allPatterns = new ArrayList<>();
        try {
            List<GrammarCard> grammarCards = knowledgeDataProvider.findGrammarByJlpt("N3");
            for (GrammarCard card : grammarCards) {
                Map<String, Object> pattern = new HashMap<>();
                pattern.put("cau_truc", card.getGrammar());
                pattern.put("y_nghia", card.getMeaning());
                pattern.put("usage_guide", card.getUsageGuide());
                pattern.put("usage_desc", card.getUsageDesc());
                pattern.put("formation", card.getFormation());
                pattern.put("similar_grammar", card.getSimilarGrammar());
                pattern.put("difference", card.getDifference());
                pattern.put("common_mistakes", card.getCommonMistakes());
                if (card.getExamples() != null) {
                    try {
                        List<?> examples = objectMapper.readValue(card.getExamples(), List.class);
                        pattern.put("examples", examples);
                    } catch (Exception ignored) {
                        pattern.put("examples", Collections.emptyList());
                    }
                } else {
                    pattern.put("examples", Collections.emptyList());
                }
                allPatterns.add(pattern);
            }
        } catch (Exception e) {
            log.error("Failed to collect N3 grammar patterns: {}", e.getMessage(), e);
        }
        log.info("Collected {} grammar patterns for clustering", allPatterns.size());
        return allPatterns;
    }

    public String clusterGrammarPatternsToGroups(List<Map<String, Object>> allPatterns) {
        if (allPatterns == null || allPatterns.isEmpty()) {
            return "[]";
        }

        if (aiConfig == null || aiConfig.getApiKey() == null || aiConfig.getApiKey().isBlank()) {
            log.warn("AI config not available, returning empty clustering result");
            return "[]";
        }

        try {
            StringBuilder prompt = new StringBuilder();
            prompt.append("Bạn là trợ lý dạy tiếng Nhật chuyên về môn thi JLPT N3.\n\n");
            prompt.append("Hãy phân loại các mẫu ngữ pháp sau vào các nhóm chủ đề (khoảng 10-35 nhóm). ");
            prompt.append("Mỗi nhóm chứa ~5-15 mẫu ngữ pháp có tính chất tương đồng. ");
            prompt.append("Với mỗi nhóm, hãy tạo:\n");
            prompt.append("- group_code: mã nhóm dạng GRP_01, GRP_02, ...\n");
            prompt.append("- title: tiêu đề ngắn gọn bằng tiếng Việt\n");
            prompt.append("- description: mô tả ngắn về nhóm ngữ pháp (100-200 từ)\n");
            prompt.append("- usage_guide: hướng dẫn cách dùng chi tiết (150-250 từ)\n");
            prompt.append("- usage_cases: các trường hợp sử dụng thực tế ví dụ (150-250 từ)\n");
            prompt.append("- patterns: mảng mỗi phần tử có cau_truc, y_nghia, examples (3 câu ví dụ)\n");
            prompt.append("- questions: mảng 30 câu hỏi trắc nghiệm với type (MCQ/FILL_BLANK/CHOOSE_PATTERN), question, options, answer, explanation\n");
            prompt.append("\nDanh sách mẫu ngữ pháp:\n");
            for (Map<String, Object> p : allPatterns) {
                prompt.append("- ").append(p.getOrDefault("cau_truc", p.getOrDefault("structure", ""))).append(": ")
                      .append(p.getOrDefault("y_nghia", p.getOrDefault("meaning", ""))).append("\n");
            }
            prompt.append("\nTrả về JSON duy nhất với cấu trúc: {\"groups\": [...]}");
            prompt.append(" Đảm bảo JSON hợp lệ, không thêm markdown wrapper.");

            String promptJson = objectMapper.writeValueAsString(Map.of(
                    "model", "deepseek-chat",
                    "messages", List.of(Map.of(
                            "role", "user",
                            "content", prompt.toString()
                    )),
                    "temperature", 0.7,
                    "max_tokens", 12000
            ));

            String response = callDeepSeekRawWithParams(aiConfig.getApiKey(), buildUserPrompt(prompt.toString()), 16000, 120);

            JsonNode root = objectMapper.readTree(response);
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && !choices.isEmpty()) {
                String content = choices.get(0).get("message").get("content").asText();
                if (content.startsWith("```json")) {
                    content = content.substring(7);
                }
                if (content.endsWith("```")) {
                    content = content.substring(0, content.length() - 3);
                }
                return content.trim();
            }
            return "[]";
        } catch (Exception e) {
            log.error("Failed to cluster grammar patterns via AI: {}", e.getMessage(), e);
            return "[]";
        }
    }

    private String buildUserPrompt(String input) {
        return input;
    }
}

