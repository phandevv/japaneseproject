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
import com.flashcard.knowledge.repository.GrammarCardRepository;

@Service
public class DeepSeekEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekEnrichmentService.class);

    // Bulkhead Pattern: limit concurrent AI requests to 50 to protect server resources
    private final Semaphore bulkheadSemaphore = new Semaphore(50);

    private final VocabularyRepository vocabularyRepository;
    private final GrammarCardRepository grammarCardRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public DeepSeekEnrichmentService(VocabularyRepository vocabularyRepository, ObjectMapper objectMapper) {
        this(vocabularyRepository, null, objectMapper);
    }

    @Autowired
    public DeepSeekEnrichmentService(VocabularyRepository vocabularyRepository,
                                  @Autowired(required = false) GrammarCardRepository grammarCardRepository,
                                  ObjectMapper objectMapper) {
        this.vocabularyRepository = vocabularyRepository;
        this.grammarCardRepository = grammarCardRepository;
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
                boolean missingUsageGuide = (vocab.getUsageGuide() == null || vocab.getUsageGuide().trim().isEmpty());
                boolean missingMnemonic = (vocab.getMnemonic() == null || vocab.getMnemonic().trim().isEmpty());
                boolean missingExamples = (vocab.getExampleSentences() == null || vocab.getExampleSentences().trim().isEmpty());

                // If word is only missing usageGuide, execute targeted fast micro-prompt (< 0.25s)
                if (missingUsageGuide && !missingMnemonic && !missingExamples) {
                    String microPrompt = String.format(
                        "Hãy giải thích chi tiết hướng dẫn sử dụng, sắc thái (nuance) và trường hợp dùng thực tế bằng tiếng Việt cho từ tiếng Nhật: \"%s\" (Cách đọc: %s, Nghĩa: %s). Trả về JSON duy nhất: {\"usageGuide\":\"...\"}",
                        vocab.getKanji() != null && !vocab.getKanji().isEmpty() ? vocab.getKanji() : vocab.getHiragana(),
                        vocab.getHiragana() != null ? vocab.getHiragana() : "",
                        vocab.getMeaning() != null ? vocab.getMeaning() : ""
                    );
                    return executeMicroPrompt(vocab, apiKey, microPrompt, (node, v) -> {
                        if (node.has("usageGuide")) {
                            v.setUsageGuide(node.path("usageGuide").asText());
                        }
                    });
                }

                String level = vocab.getLevel() != null ? vocab.getLevel().trim().toUpperCase() : "N3";
                String mainWord = vocab.getKanji() != null && !vocab.getKanji().isEmpty() ? vocab.getKanji() : vocab.getHiragana();

                boolean isKanjiItem = "KANJI".equalsIgnoreCase(vocab.getWordType()) ||
                        (vocab.getCategory() != null && vocab.getCategory().contains("- Kanji")) ||
                        (mainWord != null && mainWord.trim().length() == 1);

                String prompt;
                if (isKanjiItem) {
                    prompt = String.format(
                        "Bạn là một chuyên gia biên soạn từ điển Chữ Hán (Kanji) tiếng Nhật cao cấp. Hãy phân tích và làm giàu ĐẦY ĐỦ THÔNG TIN cho chữ Hán sau bằng tiếng Việt:\n" +
                        "Chữ Hán (Kanji): \"%s\"\n" +
                        "Âm Hán Việt hiện tại: %s\n" +
                        "Nghĩa hiện tại: %s\n" +
                        "Cấp độ JLPT: %s\n\n" +
                        "Yêu cầu dữ liệu cực kỳ chi tiết, chuẩn xác 100%%. BẮT BUỘC cung cấp đầy đủ Âm On (onReading katakana) và Âm Kun (kunReading hiragana). Mọi giải thích, dịch ví dụ BẮT BUỘC bằng tiếng Việt.\n" +
                        "Hãy trả về JSON duy nhất, không markdown:\n" +
                        "{\n" +
                        "  \"word\": \"%s\",\n" +
                        "  \"hanViet\": \"Âm Hán Việt chuẩn viết hoa (ví dụ: NGHI)\",\n" +
                        "  \"onReading\": \"Âm On bằng Katakana (ví dụ: ギ)\",\n" +
                        "  \"kunReading\": \"Âm Kun bằng Hiragana (ví dụ: うたが.う)\",\n" +
                        "  \"reading\": \"Âm On: ギ | Âm Kun: うたが.う\",\n" +
                        "  \"meaning\": \"nghĩa tiếng Việt đầy đủ chính xác\",\n" +
                        "  \"pitchAccent\": \"Âm On: ギ / Âm Kun: うた가.う\",\n" +
                        "  \"wordType\": \"KANJI\",\n" +
                        "  \"mnemonic\": \"Mẹo nhớ chữ Hán này cực kỳ sáng tạo, chiết tự các bộ thủ (kanji breakdown) và liên tưởng âm thanh/hình ảnh thú vị bằng tiếng Việt.\",\n" +
                        "  \"usageGuide\": \"Giải thích bộ thủ cấu thành, sắc thái nghĩa, các từ hay ghép cùng và trường hợp sử dụng thực tế bằng tiếng Việt.\",\n" +
                        "  \"kanjiWords\": [\n" +
                        "     { \"word\": \"từ ghép 1\", \"reading\": \"cách đọc hiragana\", \"meaning\": \"nghĩa tiếng Việt\" },\n" +
                        "     { \"word\": \"từ ghép 2\", \"reading\": \"cách đọc hiragana\", \"meaning\": \"nghĩa tiếng Việt\" },\n" +
                        "     { \"word\": \"từ ghép 3\", \"reading\": \"cách đọc hiragana\", \"meaning\": \"nghĩa tiếng Việt\" }\n" +
                        "  ],\n" +
                        "  \"exampleSentences\": [\n" +
                        "     { \"ja\": \"câu ví dụ chứa chữ hán này\", \"reading\": \"cách đọc hiragana câu ví dụ\", \"vi\": \"dịch nghĩa tiếng Việt\" }\n" +
                        "  ]\n" +
                        "}",
                        mainWord,
                        vocab.getHanViet() != null ? vocab.getHanViet() : "",
                        vocab.getMeaning() != null ? vocab.getMeaning() : "",
                        level,
                        mainWord
                    );
                } else {
                    prompt = String.format(
                        "Bạn là một chuyên gia biên soạn từ điển tiếng Nhật cao cấp. Hãy làm giàu thông tin và ĐÍNH CHÍNH CÁCH ĐỌC Hiragana/Katakana chuẩn xác nhất cho từ vựng sau bằng tiếng Việt:\n" +
                        "Từ kanji/kana chính: \"%s\"\n" +
                        "Cách đọc ban đầu (có thể sai): %s\n" +
                        "Nghĩa ban đầu: %s\n" +
                        "Cấp độ JLPT: %s\n\n" +
                        "Yêu cầu dữ liệu cực kỳ chi tiết, chính xác. ĐẶC BIỆT CHÚ Ý: Kiểm tra kỹ từ kanji chính để cung cấp cách đọc Hiragana/Katakana chuẩn xác tuyệt đối trong trường \"reading\" (ví dụ từ 他 thì cách đọc chuẩn là ほか, nếu cách đọc ban đầu sai thì bắt buộc phải đính chính lại). Mọi giải thích, dịch ví dụ bắt buộc phải là tiếng Việt.\n" +
                        "Hãy trả về JSON duy nhất, không markdown:\n" +
                        "{\n" +
                        "  \"word\": \"từ kanji hoặc kana chính xác\",\n" +
                        "  \"reading\": \"cách đọc hiragana/katakana chuẩn xác nhất tuyệt đối (đã đính chính nếu cách đọc cũ sai)\",\n" +
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
                        "  \"usageGuide\": \"hướng dẫn chi tiết cách dùng, sắc thái (nuance) và trường hợp sử dụng từ này trong thực tế bằng tiếng Việt (ví dụ: dùng trong hoàn cảnh trang trọng/thân mật, văn viết hay văn nói)\",\n" +
                        "  \"conversationExamples\": [\n" +
                        "     { \"speakerA\": \"hội thoại người A\", \"speakerB\": \"hội thoại người B (phản hồi)\", \"translationA\": \"dịch nghĩa A\", \"translationB\": \"dịch nghĩa B\" }\n" +
                        "  ]\n" +
                        "}",
                        mainWord,
                        vocab.getHiragana() != null ? vocab.getHiragana() : "",
                        vocab.getMeaning() != null ? vocab.getMeaning() : "",
                        level
                    );
                }

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
                                    
                                    // Overwrite hiragana reading with accurate reading from DeepSeek AI
                                    String aiReading = contentNode.path("reading").asText();
                                    if (aiReading != null && !aiReading.trim().isEmpty()) {
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

                                    return vocabularyRepository.saveAndFlush(vocab);
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
                "Bạn là một chuyên gia ngữ pháp tiếng Nhật hàng đầu.\n" +
                "Nhiệm vụ: Giải thích chi tiết và phân tích toàn diện điểm ngữ pháp sau.\n\n" +
                "Cấu trúc ngữ pháp: \"%s\"\n" +
                "Ý nghĩa hiện tại: \"%s\"\n" +
                "Cấp độ: \"%s\"\n\n" +
                "Hãy trả về duy nhất JSON (không dùng markdown):\n" +
                "{\n" +
                "  \"grammar\": \"%s\",\n" +
                "  \"meaning\": \"Ý nghĩa tổng quát ngắn gọn chuẩn xác\",\n" +
                "  \"formation\": \"Công thức/Cấu trúc kết hợp chi tiết (ví dụ: V-て + 以来 / N + につき / V-る + にあたって)\",\n" +
                "  \"usageGuide\": \"Giải thích chi tiết sắc thái, hoàn cảnh sử dụng & lưu ý khi dùng (văn viết/văn nói, trang trọng hay thân mật, biểu thị cảm xúc gì)\",\n" +
                "  \"similarGrammar\": \"Các điểm ngữ pháp tương tự hoặc dễ gây nhầm lẫn\",\n" +
                "  \"difference\": \"Phân biệt cụ thể sắc thái khác nhau giữa cấu trúc này với các cấu trúc tương tự\",\n" +
                "  \"commonMistakes\": \"Các lỗi phổ biến học viên hay gặp phải (kèm cách dùng sai vs đúng)\",\n" +
                "  \"examples\": [\n" +
                "    {\"ja\": \"Câu ví dụ tiếng Nhật 1 (có Furigana mở ngoặc cho Kanji)\", \"reading\": \"Cách đọc Hiragana\", \"vi\": \"Dịch nghĩa tiếng Việt\"},\n" +
                "    {\"ja\": \"Câu ví dụ 2\", \"reading\": \"Cách đọc Hiragana\", \"vi\": \"Dịch nghĩa tiếng Việt\"},\n" +
                "    {\"ja\": \"Câu ví dụ 3\", \"reading\": \"Cách đọc Hiragana\", \"vi\": \"Dịch nghĩa tiếng Việt\"}\n" +
                "  ]\n" +
                "}",
                grammarCard.getGrammar(),
                grammarCard.getMeaning() != null ? grammarCard.getMeaning() : "",
                grammarCard.getJlpt() != null ? grammarCard.getJlpt() : "N3",
                grammarCard.getGrammar()
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.deepseek.com/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(Map.of(
                            "model", "deepseek-chat",
                            "messages", java.util.List.of(Map.of("role", "user", "content", prompt)),
                            "max_tokens", 2048,
                            "temperature", 0.3
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

                                if (grammarCardRepository != null) {
                                    return grammarCardRepository.saveAndFlush(grammarCard);
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

    private CompletableFuture<Vocabulary> executeMicroPrompt(Vocabulary vocab, String apiKey, String prompt, java.util.function.BiConsumer<JsonNode, Vocabulary> mapper) {
        try {
            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "max_tokens", 150,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là trợ lý từ điển tiếng Nhật. Phản hồi duy nhất bằng định dạng JSON bằng tiếng Việt."),
                    Map.of("role", "user", "content", prompt)
                }
            );
            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(10))
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
                                return vocabularyRepository.save(vocab);
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
            "  - Mỗi câu hỏi điền cấu trúc ngữ pháp đúng vào vị trí (　　).\n" +
            "  - 4 lựa chọn A, B, C, D.\n" +
            "  - Mọi Kanji trong câu PHẢI mở ngoặc đính kèm Furigana cách đọc Hiragana ngay sau đó (ví dụ: 日本(にほん)へ来(き)て...).\n" +
            "  - Ghi \"type\": \"mondai1\".\n\n" +
            "● DẠNG 2: CÂU 16 ĐẾN CÂU 30 (Mondai 2 - Sắp xếp câu tìm vị trí Ngôi Sao ★):\n" +
            "  - Mỗi câu cho 1 câu tiếng Nhật có 4 vị trí gạch chân xáo trộn 1_ 2_ 3★_ 4_ trong đó vị trí thứ 3 là dấu Ngôi Sao ★ (ví dụ: 山田(やまだ)さんは ____ ____ _★_ ____ から、休(やす)むはずがない。).\n" +
            "  - 4 lựa chọn A, B, C, D là 4 cụm từ xáo trộn (ví dụ: [\"A. 1. 元気(げんき)な\", \"B. 2. 理由(りゆう)\", \"C. 3. がない\", \"D. 4. はず\"]).\n" +
            "  - Đáp án đúng \"answer\" PHẢI là cụm từ nằm đúng ở vị trí dấu Ngôi Sao ★ khi ghép câu đúng hoàn chỉnh (ví dụ: \"C. 3. がない\").\n" +
            "  - Trong phần \"explanation\", ghi rõ thứ tự ghép câu đúng hoàn chỉnh và giải thích vị trí ngôi sao (ví dụ: \"Thứ tự đúng: 1-2-3-4 -> Câu hoàn chỉnh: ... -> Vị trí ngôi sao ★ là C. 3. がない\").\n" +
            "  - Ghi \"type\": \"star\".\n\n" +
            "Trả về duy nhất 1 JSON Array gồm đúng 30 phần tử (KHÔNG DÙNG MARKDOWN):\n" +
            "[\n" +
            "  {\n" +
            "    \"id\": 1,\n" +
            "    \"type\": \"mondai1\",\n" +
            "    \"question\": \"1. 日本(にほん)へ来(き)て（　　）、ずっとこの町(まち)に住(す)んでいます。\",\n" +
            "    \"options\": [\"A. 以来(いらい)\", \"B. から\", \"C. にかけて\", \"D. について\"],\n" +
            "    \"answer\": \"A. 以来(いらい)\",\n" +
            "    \"explanation\": \"Cấu trúc V-て + 以来 biểu thị kể từ mốc thời gian...\"\n" +
            "  },\n" +
            "  {\n" +
            "    \"id\": 16,\n" +
            "    \"type\": \"star\",\n" +
            "    \"question\": \"16. 山田(やまだ)さんは ____ ____ _★_ ____ から、休(やす)むはずがない。\",\n" +
            "    \"options\": [\"A. 1. 元気(げんき)な\", \"B. 2. 理由(りゆう)\", \"C. 3. がない\", \"D. 4. はず\"],\n" +
            "    \"answer\": \"C. 3. がない\",\n" +
            "    \"explanation\": \"Thứ tự ghép đúng: 元気な (1) 理由 (2) がない (3) はず (4) から... -> Vị trí ngôi sao ★ là C. 3. がない\"\n" +
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

            java.util.List<String> options = new ArrayList<>();
            options.add("A. " + struc);
            options.add("B. " + distractors.get(i % distractors.size()));
            options.add("C. " + distractors.get((i + 2) % distractors.size()));
            options.add("D. " + distractors.get((i + 4) % distractors.size()));

            Map<String, Object> q = new HashMap<>();
            q.put("id", i);
            q.put("type", "mondai1");
            q.put("question", questionText);
            q.put("options", options);
            q.put("answer", "A. " + struc);
            q.put("explanation", "Đáp án đúng là " + struc + " (" + meaning + ").");

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

            Map<String, Object> q = new HashMap<>();
            q.put("id", i);
            q.put("type", "star");
            q.put("question", questionText);
            q.put("options", options);
            q.put("answer", "C. 3. " + struc);
            q.put("explanation", "Thứ tự sắp xếp đúng: 日本語を(2) 勉強して(1) " + struc + "(3★) 上達したい(4) と思います. Vị trí ngôi sao ★ rơi vào " + struc + " (" + meaning + ").");

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

