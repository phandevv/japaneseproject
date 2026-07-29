package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.model.KnowledgeVersion;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.user.model.User;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.GrammarReview;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import com.flashcard.knowledge.repository.KnowledgeVersionRepository;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.srs.repository.GrammarReviewRepository;
import com.flashcard.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

import com.flashcard.srs.service.SrsService;
import com.flashcard.srs.service.GrammarSrsService;

@Service
public class KnowledgeService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeService.class);

    private final VocabularyRepository vocabularyRepository;
    private final GrammarCardRepository grammarCardRepository;
    private final KnowledgeVersionRepository knowledgeVersionRepository;
    private final WordReviewRepository wordReviewRepository;
    private final GrammarReviewRepository grammarReviewRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final SrsService srsService;
    private final GrammarSrsService grammarSrsService;
    private final DeepSeekEnrichmentService deepSeekEnrichmentService;

    // Bulkhead to protect AI APIs
    private final Semaphore bulkheadSemaphore = new Semaphore(50);

    public KnowledgeService(VocabularyRepository vocabularyRepository,
                            GrammarCardRepository grammarCardRepository,
                            KnowledgeVersionRepository knowledgeVersionRepository,
                            WordReviewRepository wordReviewRepository,
                            GrammarReviewRepository grammarReviewRepository,
                            UserRepository userRepository,
                            ObjectMapper objectMapper) {
        this(vocabularyRepository, grammarCardRepository, knowledgeVersionRepository, wordReviewRepository, grammarReviewRepository, userRepository, objectMapper, null, null, null);
    }

    @Autowired
    public KnowledgeService(VocabularyRepository vocabularyRepository,
                            GrammarCardRepository grammarCardRepository,
                            KnowledgeVersionRepository knowledgeVersionRepository,
                            WordReviewRepository wordReviewRepository,
                            GrammarReviewRepository grammarReviewRepository,
                            UserRepository userRepository,
                            ObjectMapper objectMapper,
                            @Autowired(required = false) SrsService srsService,
                            @Autowired(required = false) GrammarSrsService grammarSrsService,
                            @Autowired(required = false) DeepSeekEnrichmentService deepSeekEnrichmentService) {
        this.vocabularyRepository = vocabularyRepository;
        this.grammarCardRepository = grammarCardRepository;
        this.knowledgeVersionRepository = knowledgeVersionRepository;
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
        this.userRepository = userRepository;
        this.srsService = srsService;
        this.grammarSrsService = grammarSrsService;
        this.deepSeekEnrichmentService = deepSeekEnrichmentService;
        this.objectMapper = objectMapper.copy()
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true)
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER, true);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    /**
     * Call DeepSeek to normalize the raw input.
     */
    public Map<String, Object> normalize(String input) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            throw new RuntimeException("Hệ thống AI đang bận. Vui lòng thử lại sau!");
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                return Map.of("error", "Chưa cấu hình DEEPSEEK_API_KEY.");
            }

            String prompt = String.format(
                "Bạn là một chuyên gia từ điển tiếng Nhật. Hãy phân tích từ/cấu trúc đầu vào sau và trả về thông tin chuẩn hóa:\n" +
                "Đầu vào: \"%s\"\n\n" +
                "Trả về JSON duy nhất, không markdown:\n" +
                "{\n" +
                "  \"type\": \"vocabulary hoặc grammar\",\n" +
                "  \"normalizedInput\": \"dạng chuẩn (nếu là romaji/kana sai -> trả về Kanji/Kana đúng; nếu là ngữ pháp -> trả về dạng gốc như 〜ように)\"\n" +
                "}",
                input
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là công cụ phân tích từ vựng/ngữ pháp tiếng Nhật. Chỉ phản hồi bằng định dạng JSON."),
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
                throw new RuntimeException("DeepSeek API error status: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String jsonContent = root.path("choices").get(0).path("message").path("content").asText();

            // Use robust parsing with retry/repair
            Map<String, Object> aiResult = parseAiJsonResponse(jsonContent);

            String type = (String) aiResult.getOrDefault("type", "vocabulary");
            String normalized = (String) aiResult.getOrDefault("normalizedInput", input);

            // Check if normalized item exists in DB
            boolean exists = false;
            Long id = null;
            if ("grammar".equalsIgnoreCase(type)) {
                Optional<GrammarCard> gc = grammarCardRepository.findByGrammar(normalized);
                exists = gc.isPresent();
                if (exists) id = gc.get().getId();
            } else {
                // Find by Kanji or Hiragana
                Optional<Vocabulary> vc = vocabularyRepository.findFirstByKanji(normalized);
                if (vc.isEmpty()) {
                    vc = vocabularyRepository.findFirstByHiragana(normalized);
                }
                exists = vc.isPresent();
                if (exists) id = vc.get().getId();
            }

            return Map.of(
                "type", type,
                "normalizedInput", normalized,
                "existsInDb", exists,
                "dbEntityId", id != null ? id : -1
            );
        } finally {
            bulkheadSemaphore.release();
        }
    }

    /**
     * Perform Single-Call Combined Fast Collect & Normalize (< 1.2s - 1.8s latency).
     */
    public Map<String, Object> collectFast(String input) throws Exception {
        String trimmed = input.trim();

        // 1. Fast Local DB Lookup check (< 5ms)
        Optional<Vocabulary> existingVocab = vocabularyRepository.findFirstByKanji(trimmed);
        if (existingVocab.isEmpty()) {
            existingVocab = vocabularyRepository.findFirstByHiragana(trimmed);
        }
        if (existingVocab.isEmpty()) {
            existingVocab = vocabularyRepository.findFirstByRomaji(trimmed);
        }
        if (existingVocab.isPresent()) {
            Vocabulary v = existingVocab.get();

            boolean isMissingFields = (v.getUsageGuide() == null || v.getUsageGuide().trim().isEmpty())
                || (v.getMnemonic() == null || v.getMnemonic().trim().isEmpty())
                || (v.getExampleSentences() == null || v.getExampleSentences().trim().isEmpty());

            if (isMissingFields && deepSeekEnrichmentService != null) {
                // Trigger enrichment in background asynchronously without blocking (never call .get())
                deepSeekEnrichmentService.enrichVocabulary(v);
            }

            Map<String, Object> fastData = new HashMap<>();
            fastData.put("word", v.getKanji() != null && !v.getKanji().isEmpty() ? v.getKanji() : v.getHiragana());
            fastData.put("reading", v.getHiragana());
            fastData.put("meaning", v.getMeaning());
            fastData.put("hanViet", v.getHanViet());
            fastData.put("jlpt", v.getLevel());
            fastData.put("pitchAccent", v.getPitchAccent());
            fastData.put("wordType", v.getWordType());
            fastData.put("usageGuide", v.getUsageGuide());
            fastData.put("mnemonic", v.getMnemonic());
            fastData.put("kanjiWords", v.getKanjiWords());
            fastData.put("synonyms", v.getSynonyms());
            fastData.put("antonyms", v.getAntonyms());
            fastData.put("exampleSentences", v.getExampleSentences());
            fastData.put("sampleSentence", v.getSampleSentence());
            fastData.put("sampleReading", v.getSampleReading());
            fastData.put("sampleTranslation", v.getSampleTranslation());
            fastData.put("commonMistakes", v.getCommonMistakes());
            fastData.put("collocations", v.getCollocations());
            fastData.put("conversationExamples", v.getConversationExamples());

            Map<String, Object> res = new HashMap<>();
            res.put("type", "vocabulary");
            res.put("normalizedInput", v.getKanji() != null && !v.getKanji().isEmpty() ? v.getKanji() : v.getHiragana());
            res.put("existsInDb", true);
            res.put("dbEntityId", v.getId());
            res.put("enrichmentData", fastData);
            res.put("isFast", true);
            return res;
        }

        Optional<GrammarCard> existingGrammar = grammarCardRepository.findByGrammar(trimmed);
        if (existingGrammar.isPresent()) {
            GrammarCard g = existingGrammar.get();

            if (g.getUsageGuide() == null || g.getUsageGuide().trim().isEmpty()) {
                try {
                    String apiKey = getApiKey();
                    if (apiKey != null) {
                        String microPrompt = String.format("Giải thích chi tiết hướng dẫn sử dụng, sắc thái ngữ pháp và trường hợp dùng thực tế bằng tiếng Việt cho cấu trúc ngữ pháp tiếng Nhật: \"%s\" (Nghĩa: %s). Trả về JSON duy nhất: {\"usageGuide\":\"...\"}", g.getGrammar(), g.getMeaning());
                        Map<String, Object> reqBodyMap = Map.of(
                            "model", "deepseek-chat",
                            "temperature", 0.0,
                            "max_tokens", 150,
                            "response_format", Map.of("type", "json_object"),
                            "messages", new Object[]{
                                Map.of("role", "system", "content", "Fast Grammar Dict. Return ONLY minimal raw JSON in Vietnamese."),
                                Map.of("role", "user", "content", microPrompt)
                            }
                        );
                        String reqBody = objectMapper.writeValueAsString(reqBodyMap);
                        HttpRequest req = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                                .header("Content-Type", "application/json")
                                .header("Authorization", "Bearer " + apiKey)
                                .POST(HttpRequest.BodyPublishers.ofString(reqBody))
                                .timeout(Duration.ofSeconds(10))
                                .build();
                        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                        if (resp.statusCode() == 200) {
                            JsonNode root = objectMapper.readTree(resp.body());
                            String contentStr = cleanJsonContent(root.path("choices").get(0).path("message").path("content").asText());
                            JsonNode contentNode = objectMapper.readTree(contentStr);
                            if (contentNode.has("usageGuide")) {
                                g.setUsageGuide(contentNode.path("usageGuide").asText());
                                grammarCardRepository.save(g);
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to generate grammar usageGuide on-demand: {}", e.getMessage());
                }
            }

            Map<String, Object> fastData = new HashMap<>();
            fastData.put("grammar", g.getGrammar());
            fastData.put("meaning", g.getMeaning());
            fastData.put("formation", g.getFormation());
            fastData.put("usageDesc", g.getUsageDesc());
            fastData.put("usageGuide", g.getUsageGuide());
            fastData.put("jlpt", g.getJlpt());
            fastData.put("similarGrammar", g.getSimilarGrammar());
            fastData.put("difference", g.getDifference());
            fastData.put("commonMistakes", g.getCommonMistakes());
            fastData.put("examples", g.getExamples());
            fastData.put("quizzes", g.getQuizzes());

            Map<String, Object> res = new HashMap<>();
            res.put("type", "grammar");
            res.put("normalizedInput", g.getGrammar());
            res.put("existsInDb", true);
            res.put("dbEntityId", g.getId());
            res.put("enrichmentData", fastData);
            res.put("isFast", true);
            return res;
        }

        // 2. Ultra-Fast DeepSeek API Call (deepseek-chat, max_tokens: 140, temperature: 0.0)
        if (!bulkheadSemaphore.tryAcquire()) {
            return buildFallbackResponse(trimmed);
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                return buildFallbackResponse(trimmed);
            }

            String prompt = String.format(
                "Bạn là từ điển tiếng Nhật cao cấp. Hãy phân tích từ vựng/ngữ pháp \"%s\" và trả về duy nhất 1 JSON raw bằng tiếng Việt:\n" +
                "{\n" +
                "  \"type\": \"vocabulary\",\n" +
                "  \"normalizedInput\": \"%s\",\n" +
                "  \"word\": \"%s\",\n" +
                "  \"reading\": \"hiragana/katakana cách đọc chính xác\",\n" +
                "  \"meaning\": \"nghĩa tiếng Việt chính xác đầy đủ\",\n" +
                "  \"hanViet\": \"âm Hán Việt (nếu có)\",\n" +
                "  \"jlpt\": \"N5..N1\",\n" +
                "  \"pitchAccent\": \"[0]\",\n" +
                "  \"wordType\": \"loại từ\",\n" +
                "  \"usageGuide\": \"hướng dẫn cách dùng và trường hợp sử dụng ngắn gọn bằng tiếng Việt\",\n" +
                "  \"mnemonic\": \"mẹo nhớ từ vựng ngắn gọn (1 câu)\"\n" +
                "}", 
                trimmed, trimmed, trimmed
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-chat",
                "temperature", 0.0,
                "max_tokens", 350,
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là từ điển tiếng Nhật cao cấp. Phản hồi duy nhất bằng JSON nguyên bản bằng tiếng Việt."),
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
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String jsonContent = root.path("choices").get(0).path("message").path("content").asText();

                Map<String, Object> aiResult = parseAiJsonResponse(jsonContent);

                String type = (String) aiResult.getOrDefault("type", "vocabulary");
                String normalized = (String) aiResult.getOrDefault("normalizedInput", trimmed);

                if ("grammar".equalsIgnoreCase(type)) {
                    if (!aiResult.containsKey("grammar") || aiResult.get("grammar") == null) {
                        aiResult.put("grammar", normalized);
                    }
                } else {
                    if (!aiResult.containsKey("word") || aiResult.get("word") == null) {
                        aiResult.put("word", normalized);
                    }
                }

                // Ensure meaning is never empty
                if (!aiResult.containsKey("meaning") || aiResult.get("meaning") == null || ((String) aiResult.get("meaning")).trim().isEmpty()) {
                    aiResult.put("meaning", "Nghĩa từ vựng (" + normalized + ")");
                }

                // Check if normalized item exists in DB
                boolean exists = false;
                Long id = null;
                if ("grammar".equalsIgnoreCase(type)) {
                    Optional<GrammarCard> gc = grammarCardRepository.findByGrammar(normalized);
                    exists = gc.isPresent();
                    if (exists) id = gc.get().getId();
                } else {
                    Optional<Vocabulary> vc = vocabularyRepository.findFirstByKanji(normalized);
                    if (vc.isEmpty()) {
                        vc = vocabularyRepository.findFirstByHiragana(normalized);
                    }
                    exists = vc.isPresent();
                    if (exists) id = vc.get().getId();
                }

                Map<String, Object> result = new HashMap<>();
                result.put("type", type);
                result.put("normalizedInput", normalized);
                result.put("existsInDb", exists);
                result.put("dbEntityId", id != null ? id : -1);
                result.put("enrichmentData", aiResult);
                result.put("isFast", true);

                return result;
            } else {
                log.warn("DeepSeek API responded with non-200 code: {}", response.statusCode());
            }
        } catch (Exception e) {
            log.warn("Error during collectFast DeepSeek API call: {}", e.getMessage(), e);
        } finally {
            bulkheadSemaphore.release();
        }

        return buildFallbackResponse(trimmed);
    }

    private Map<String, Object> buildFallbackResponse(String input) {
        Map<String, Object> fallbackData = new HashMap<>();
        fallbackData.put("word", input);
        fallbackData.put("reading", input);
        fallbackData.put("meaning", "Đang tra cứu nghĩa cho '" + input + "'...");
        fallbackData.put("jlpt", "N3");
        fallbackData.put("pitchAccent", "[0]");
        fallbackData.put("wordType", "vocab");

        Map<String, Object> result = new HashMap<>();
        result.put("type", "vocabulary");
        result.put("normalizedInput", input);
        result.put("existsInDb", false);
        result.put("dbEntityId", -1);
        result.put("enrichmentData", fallbackData);
        result.put("isFast", true);
        return result;
    }

    /**
     * Clean markdown code fences from AI JSON response and extract JSON object.
     */
    private String cleanJsonContent(String content) {
        if (content == null) return "{}";
        String str = content.trim();

        if (str.contains("```json")) {
            int start = str.indexOf("```json") + 7;
            int end = str.lastIndexOf("```");
            if (end > start) {
                str = str.substring(start, end);
            } else {
                str = str.substring(start);
            }
        } else if (str.contains("```")) {
            int start = str.indexOf("```") + 3;
            int end = str.lastIndexOf("```");
            if (end > start) {
                str = str.substring(start, end);
            } else {
                str = str.substring(start);
            }
        }

        str = str.trim();
        int firstBrace = str.indexOf('{');
        int lastBrace = str.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace >= firstBrace) {
            str = str.substring(firstBrace, lastBrace + 1);
        }

        return str.trim();
    }

    /**
     * Parse JSON content from AI response with robust error handling.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseAiJsonResponse(String rawContent) throws Exception {
        String cleaned = cleanJsonContent(rawContent);
        try {
            return objectMapper.readValue(cleaned, Map.class);
        } catch (Exception e) {
            log.warn("Failed to parse AI JSON response on first attempt: {}", e.getMessage());
            log.warn("Cleaned snippet (first 300 chars): {}", 
                cleaned.length() > 300 ? cleaned.substring(0, 300) + "..." : cleaned);
            
            // Remove trailing commas before closing braces/brackets
            String repaired = cleaned.replaceAll(",\\s*([}\\]])", "$1");
            try {
                return objectMapper.readValue(repaired, Map.class);
            } catch (Exception e2) {
                log.error("Failed to parse AI JSON response after repair attempt: {}", e2.getMessage());
                throw new RuntimeException("AI phản hồi dữ liệu không đúng định dạng. Vui lòng thử lại!");
            }
        }
    }

    /**
     * Call DeepSeek to enrich a vocabulary word.
     */
    public Map<String, Object> enrichVocabulary(String word) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            throw new RuntimeException("Hệ thống AI đang bận. Vui lòng thử lại sau!");
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                throw new RuntimeException("Chưa cấu hình API Key.");
            }

            String prompt = String.format(
                "Bạn là một chuyên gia biên soạn từ điển tiếng Nhật cao cấp. Hãy làm giàu thông tin cho từ vựng sau bằng tiếng Việt:\n" +
                "Từ: \"%s\"\n\n" +
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
                "  \"usageGuide\": \"hướng dẫn chi tiết cách dùng, sắc thái (nuance) và trường hợp sử dụng từ này trong thực tế bằng tiếng Việt (ví dụ: dùng trong hoàn cảnh trang trọng/thân mật, văn viết hay văn nói)\",\n" +
                "  \"conversationExamples\": [\n" +
                "     { \"speakerA\": \"hội thoại người A\", \"speakerB\": \"hội thoại người B (phản hồi)\", \"translationA\": \"dịch nghĩa A\", \"translationB\": \"dịch nghĩa B\" }\n" +
                "  ]\n" +
                "}",
                word
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là biên tập viên từ điển tiếng Nhật. Bạn chỉ phản hồi bằng định dạng JSON."),
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
                throw new RuntimeException("API error status: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String jsonContent = root.path("choices").get(0).path("message").path("content").asText();

            return parseAiJsonResponse(jsonContent);
        } finally {
            bulkheadSemaphore.release();
        }
    }

    /**
     * Call DeepSeek for FAST minimal vocabulary data (< 1-1.5s latency).
     */
    public Map<String, Object> enrichVocabularyFast(String word) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            throw new RuntimeException("Hệ thống AI đang bận. Vui lòng thử lại sau!");
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                throw new RuntimeException("Chưa cấu hình API Key.");
            }

            String prompt = String.format(
                "Phân tích từ vựng tiếng Nhật \"%s\" và trả về JSON tối thiểu cực kỳ nhanh:\n" +
                "{\n" +
                "  \"word\": \"từ kanji hoặc kana chính xác\",\n" +
                "  \"reading\": \"hiragana cách đọc\",\n" +
                "  \"meaning\": \"nghĩa tiếng Việt ngắn gọn, chính xác\",\n" +
                "  \"hanViet\": \"âm Hán Việt (nếu có, ví dụ: NAN, THỰC SỰ)\",\n" +
                "  \"jlpt\": \"cấp độ từ N5 đến N1\",\n" +
                "  \"pitchAccent\": \"cách đọc kèm trọng âm (ví dụ: むずかしい [4])\",\n" +
                "  \"wordType\": \"loại từ ngắn (NOUN, VERB, I-ADJECTIVE, NA-ADJECTIVE...)\"\n" +
                "}",
                word
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là từ điển tiếng Nhật siêu tốc. Chỉ trả về định dạng JSON ngắn gọn duy nhất."),
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
                throw new RuntimeException("API error status: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String jsonContent = root.path("choices").get(0).path("message").path("content").asText();

            Map<String, Object> result = parseAiJsonResponse(jsonContent);
            result.put("isFast", true);
            return result;
        } finally {
            bulkheadSemaphore.release();
        }
    }

    /**
     * Call DeepSeek for FAST minimal grammar data (< 1-1.5s latency).
     */
    public Map<String, Object> enrichGrammarFast(String grammar) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            throw new RuntimeException("Hệ thống AI đang bận. Vui lòng thử lại sau!");
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                throw new RuntimeException("Chưa cấu hình API Key.");
            }

            String prompt = String.format(
                "Phân tích cấu trúc ngữ pháp tiếng Nhật \"%s\" và trả về JSON tối thiểu cực kỳ nhanh:\n" +
                "{\n" +
                "  \"grammar\": \"cấu trúc ngữ pháp chính xác (ví dụ: 〜ように)\",\n" +
                "  \"meaning\": \"nghĩa tiếng Việt ngắn gọn\",\n" +
                "  \"usageDesc\": \"ngữ cảnh sử dụng vắn tắt\",\n" +
                "  \"formation\": \"cách kết hợp vắn tắt (ví dụ: V辞書形 + ように)\",\n" +
                "  \"jlpt\": \"cấp độ từ N5 đến N1\"\n" +
                "}",
                grammar
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là công cụ tra cứu ngữ pháp tiếng Nhật siêu tốc. Chỉ trả về định dạng JSON ngắn gọn duy nhất."),
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
                throw new RuntimeException("API error status: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String jsonContent = root.path("choices").get(0).path("message").path("content").asText();

            Map<String, Object> result = parseAiJsonResponse(jsonContent);
            result.put("isFast", true);
            return result;
        } finally {
            bulkheadSemaphore.release();
        }
    }

    /**
     * Call DeepSeek to enrich a grammar item.
     */
    public Map<String, Object> enrichGrammar(String grammar) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            throw new RuntimeException("Hệ thống AI đang bận. Vui lòng thử lại sau!");
        }
        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                throw new RuntimeException("Chưa cấu hình API Key.");
            }

            String prompt = String.format(
                "Bạn là một chuyên gia biên soạn ngữ pháp tiếng Nhật cao cấp. Hãy làm giàu thông tin cho ngữ pháp sau bằng tiếng Việt:\n" +
                "Ngữ pháp: \"%s\"\n\n" +
                "Yêu cầu dữ liệu cực kỳ chi tiết, chính xác, không dùng tiếng Trung hay tiếng Anh để giải nghĩa. Mọi giải thích, dịch ví dụ bắt buộc phải là tiếng Việt.\n" +
                "QUY TẮC BẮT BUỘC KHI TẠO CÁCH KẾT HỢP (FORMATION) VÀ CÂU VÍ DỤ (EXAMPLES):\n" +
                "1. `formation`: Trình bày cách kết hợp chia theo từng dạng (V, A-i, A-na, N), phân tách rõ ràng bằng ' / ' hoặc xuống dòng \\n.\n" +
                "2. `examples`: BẮT BUỘC phải tạo ít nhất 1-2 câu ví dụ minh họa cho CẢ 100%% các trường hợp kết hợp ở `formation` (không được thiếu trường hợp nào). Mỗi câu ví dụ PHẢI có thuộc tính `caseLabel` ghi rõ trường hợp áp dụng (ví dụ: \"[Vば] Dùng với Động từ\", \"[Aい] Dùng với Tính từ -i\", \"[N] Dùng với Danh từ\").\n\n" +
                "Hãy trả về JSON duy nhất, không markdown:\n" +
                "{\n" +
                "  \"grammar\": \"cấu trúc ngữ pháp chính xác (ví dụ: 〜ように)\",\n" +
                "  \"meaning\": \"nghĩa tiếng Việt chính xác (ví dụ: để làm gì đó)\",\n" +
                "  \"usageDesc\": \"cách dùng cụ thể, ngữ cảnh sử dụng\",\n" +
                "  \"formation\": \"cách kết hợp cấu trúc, phân tách từng dạng (V, A-i, A-na, N) bằng ' / ' hoặc \\n (ví dụ: Vば + ほど / Aいければ + ほど / N/Aな + であれば + ほど)\",\n" +
                "  \"jlpt\": \"cấp độ JLPT từ N5 đến N1\",\n" +
                "  \"similarGrammar\": [\"ngữ pháp tương tự 1\", \"ngữ pháp tương tự 2\"],\n" +
                "  \"difference\": \"so sánh và phân biệt với các ngữ pháp tương tự để tránh nhầm lẫn\",\n" +
                "  \"commonMistakes\": [\n" +
                "     { \"error\": \"sai lầm phổ biến khi dùng\", \"fix\": \"cách dùng đúng và giải thích\" }\n" +
                "  ],\n" +
                "  \"examples\": [\n" +
                "     { \"caseLabel\": \"[Vば] Dùng với Động từ\", \"ja\": \"câu ví dụ tiếng Nhật\", \"reading\": \"hiragana câu ví dụ\", \"vi\": \"dịch nghĩa tiếng Việt\" }\n" +
                "  ],\n" +
                "  \"readingPassage\": \"một đoạn văn đọc hiểu ngắn (3-4 câu) áp dụng ngữ pháp này kèm nghĩa dịch tiếng Việt\",\n" +
                "  \"quizzes\": [\n" +
                "     { \"question\": \"câu hỏi trắc nghiệm điền từ (để trống chỗ cần điền)\", \"options\": [\"đáp án A\", \"đáp án B\", \"đáp án C\", \"đáp án D\"], \"answer\": \"đáp án đúng chính xác\", \"explanation\": \"giải thích tại sao chọn đáp án này\" }\n" +
                "  ]\n" +
                "}",
                grammar
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là biên tập viên ngữ pháp tiếng Nhật. Bạn chỉ phản hồi bằng định dạng JSON."),
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
                throw new RuntimeException("API error status: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String jsonContent = root.path("choices").get(0).path("message").path("content").asText();

            return parseAiJsonResponse(jsonContent);
        } finally {
            bulkheadSemaphore.release();
        }
    }

    /**
     * Stream collect and enrich via Server-Sent Events (SSE).
     */
    public void streamCollectAndEnrich(String input, org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter) throws Exception {
        if (!bulkheadSemaphore.tryAcquire()) {
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                    .name("error").data(Map.of("error", "Hệ thống AI đang bận. Vui lòng thử lại sau!")));
            emitter.complete();
            return;
        }

        try {
            String apiKey = getApiKey();
            if (apiKey == null) {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("error").data(Map.of("error", "Chưa cấu hình API Key.")));
                emitter.complete();
                return;
            }

            // Step 1: Normalize input
            Map<String, Object> collectResult = normalize(input);
            String type = (String) collectResult.get("type");
            String normalizedInput = (String) collectResult.get("normalizedInput");

            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                    .name("status")
                    .data(Map.of("step", "normalized", "type", type, "normalizedInput", normalizedInput)));

            // Step 2: Build prompt based on type
            String prompt;
            if ("grammar".equalsIgnoreCase(type)) {
                prompt = String.format(
                    "Bạn là một chuyên gia biên soạn ngữ pháp tiếng Nhật cao cấp. Hãy làm giàu thông tin cho ngữ pháp sau bằng tiếng Việt:\n" +
                    "Ngữ pháp: \"%s\"\n\n" +
                    "Yêu cầu dữ liệu cực kỳ chi tiết, chính xác, không dùng tiếng Trung hay tiếng Anh để giải nghĩa. Mọi giải thích, dịch ví dụ bắt buộc phải là tiếng Việt.\n" +
                    "QUY TẮC BẮT BUỘC KHI TẠO CÁCH KẾT HỢP (FORMATION) VÀ CÂU VÍ DỤ (EXAMPLES):\n" +
                    "1. `formation`: Trình bày cách kết hợp chia theo từng dạng (V, A-i, A-na, N), phân tách rõ ràng bằng ' / ' hoặc xuống dòng \\n.\n" +
                    "2. `examples`: BẮT BUỘC phải tạo ít nhất 1-2 câu ví dụ minh họa cho CẢ 100%% các trường hợp kết hợp ở `formation` (không được thiếu trường hợp nào). Mỗi câu ví dụ PHẢI có thuộc tính `caseLabel` ghi rõ trường hợp áp dụng (ví dụ: \"[Vば] Dùng với Động từ\", \"[Aい] Dùng với Tính từ -i\", \"[N] Dùng với Danh từ\").\n\n" +
                    "Hãy trả về JSON duy nhất, không markdown:\n" +
                    "{\n" +
                    "  \"grammar\": \"cấu trúc ngữ pháp chính xác (ví dụ: 〜ように)\",\n" +
                    "  \"meaning\": \"nghĩa tiếng Việt chính xác (ví dụ: để làm gì đó)\",\n" +
                    "  \"usageDesc\": \"cách dùng cụ thể, ngữ cảnh sử dụng\",\n" +
                    "  \"formation\": \"cách kết hợp cấu trúc, phân tách từng dạng (V, A-i, A-na, N) bằng ' / ' hoặc \\n (ví dụ: Vば + ほど / Aいければ + ほど / N/Aな + であれば + ほど)\",\n" +
                    "  \"jlpt\": \"cấp độ JLPT từ N5 đến N1\",\n" +
                    "  \"similarGrammar\": [\"ngữ pháp tương tự 1\", \"ngữ pháp tương tự 2\"],\n" +
                    "  \"difference\": \"so sánh và phân biệt với các ngữ pháp tương tự để tránh nhầm lẫn\",\n" +
                    "  \"commonMistakes\": [\n" +
                    "     { \"error\": \"sai lầm phổ biến khi dùng\", \"fix\": \"cách dùng đúng và giải thích\" }\n" +
                    "  ],\n" +
                    "  \"examples\": [\n" +
                    "     { \"caseLabel\": \"[Vば] Dùng với Động từ\", \"ja\": \"câu ví dụ tiếng Nhật\", \"reading\": \"hiragana câu ví dụ\", \"vi\": \"dịch nghĩa tiếng Việt\" }\n" +
                    "  ],\n" +
                    "  \"readingPassage\": \"một đoạn văn đọc hiểu ngắn (3-4 câu) áp dụng ngữ pháp này kèm nghĩa dịch tiếng Việt\",\n" +
                    "  \"quizzes\": [\n" +
                    "     { \"question\": \"câu hỏi trắc nghiệm điền từ (để trống chỗ cần điền)\", \"options\": [\"đáp án A\", \"đáp án B\", \"đáp án C\", \"đáp án D\"], \"answer\": \"đáp án đúng chính xác\", \"explanation\": \"giải thích tại sao chọn đáp án này\" }\n" +
                    "  ]\n" +
                    "}",
                    normalizedInput
                );
            } else {
                prompt = String.format(
                    "Bạn là một chuyên gia biên soạn từ điển tiếng Nhật cao cấp. Hãy làm giàu thông tin cho từ vựng sau bằng tiếng Việt:\n" +
                    "Từ: \"%s\"\n\n" +
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
                    normalizedInput
                );
            }

            // Step 3: Stream from DeepSeek with stream: true
            // IMPORTANT: Do NOT use response_format: json_object with streaming.
            // json_object mode forces DeepSeek to buffer until full JSON is ready — killing real-time streaming.
            // Instead stream freely and parse JSON from the accumulated content at the end.
            Map<String, Object> requestBodyMap = new java.util.LinkedHashMap<>();
            requestBodyMap.put("model", "deepseek-v4-flash");
            requestBodyMap.put("stream", true);
            requestBodyMap.put("temperature", 1.0);
            requestBodyMap.put("max_tokens", 2000);
            requestBodyMap.put("messages", new Object[]{
                Map.of("role", "system", "content", "Bạn là biên tập viên tiếng Nhật. Bạn CHỈ phản hồi bằng một đối tượng JSON hợp lệ duy nhất, không có văn bản nào khác bên ngoài."),
                Map.of("role", "user", "content", prompt)
            });

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            StringBuilder fullContent = new StringBuilder();
            HttpResponse<java.util.stream.Stream<String>> response = httpClient.send(request, HttpResponse.BodyHandlers.ofLines());

            if (response.statusCode() != 200) {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("error").data(Map.of("error", "API error status: " + response.statusCode())));
                emitter.complete();
                return;
            }

            try (java.util.stream.Stream<String> lines = response.body()) {
                lines.forEach(line -> {
                    if (line.startsWith("data: ") && !line.contains("[DONE]")) {
                        try {
                            String jsonChunk = line.substring(6).trim();
                            JsonNode node = objectMapper.readTree(jsonChunk);
                            JsonNode delta = node.path("choices").get(0).path("delta").path("content");
                            if (!delta.isMissingNode()) {
                                String textStr = delta.asText();
                                fullContent.append(textStr);
                                try {
                                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                                            .name("chunk").data(Map.of("content", textStr)));
                                } catch (Exception ignored) {}
                            }
                        } catch (Exception ignored) {}
                    }
                });
            }

            // Parse final full JSON content
            String cleaned = cleanJsonContent(fullContent.toString());
            Map<String, Object> enrichmentData = parseAiJsonResponse(cleaned);

            Map<String, Object> finalResult = new HashMap<>(collectResult);
            finalResult.put("enrichmentData", enrichmentData);

            try {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("complete").data(finalResult));
                emitter.complete();
            } catch (Exception ignored) {}
        } finally {
            bulkheadSemaphore.release();
        }
    }

    private boolean isAdmin(User user) {
        if (user == null) return false;
        return "ADMIN".equalsIgnoreCase(user.getRole()) || "admin".equalsIgnoreCase(user.getUsername());
    }

    /**
     * Save Vocabulary card with Versioning and Auto Deduplication.
     */
    @Transactional
    public Vocabulary saveVocabulary(Map<String, Object> data, User user) throws Exception {
        String operator = user.getUsername();
        String word = (String) data.get("word");
        String reading = (String) data.get("reading");
        String meaning = (String) data.get("meaning");
        String hanViet = (String) data.get("hanViet");
        String jlpt = (String) data.get("jlpt");
        String wordType = (String) data.get("wordType");

        // Pitch accent, mnemonic
        String pitchAccent = (String) data.get("pitchAccent");
        String mnemonic = (String) data.get("mnemonic");

        // Stringify nested JSON structures for storage in DB
        String kanjiWords = objectMapper.writeValueAsString(data.get("kanjiWords"));
        String synonyms = objectMapper.writeValueAsString(data.get("synonyms"));
        String antonyms = objectMapper.writeValueAsString(data.get("antonyms"));
        String commonMistakes = objectMapper.writeValueAsString(data.get("commonMistakes"));
        String collocations = objectMapper.writeValueAsString(data.get("collocations"));
        String conversationExamples = objectMapper.writeValueAsString(data.get("conversationExamples"));
        String exampleSentencesJson = objectMapper.writeValueAsString(data.get("exampleSentences"));

        // Extract sample sentences (take the first one as primary sample sentence)
        String sampleSentence = "";
        String sampleTranslation = "";
        String sampleReading = "";
        List<?> exampleSentences = (List<?>) data.get("exampleSentences");
        if (exampleSentences != null && !exampleSentences.isEmpty()) {
            Map<?, ?> firstEx = (Map<?, ?>) exampleSentences.get(0);
            sampleSentence = (String) firstEx.get("ja");
            sampleReading = (String) firstEx.get("reading");
            sampleTranslation = (String) firstEx.get("vi");
        }

        // Deduplication Check (Smart matching by Kanji and Hiragana columns to avoid double insert)
        Optional<Vocabulary> existing = Optional.empty();
        if (word != null && !word.trim().isEmpty()) {
            existing = vocabularyRepository.findFirstByKanji(word.trim());
            if (existing.isEmpty()) {
                existing = vocabularyRepository.findFirstByHiragana(word.trim());
            }
        }
        if (existing.isEmpty() && reading != null && !reading.trim().isEmpty()) {
            existing = vocabularyRepository.findFirstByHiragana(reading.trim());
            if (existing.isEmpty()) {
                existing = vocabularyRepository.findFirstByKanji(reading.trim());
            }
        }

        boolean isAdminUser = isAdmin(user);

        Vocabulary vocab;
        if (existing.isPresent()) {
            vocab = existing.get();
            if (isAdminUser) {
                // Save version history for admin audit
                saveVersionHistory("VOCABULARY", vocab.getId(), vocab, operator);
            }
            // Update fields in place to refresh enrichment data while preserving position & ID
            if (meaning != null && !meaning.trim().isEmpty()) vocab.setMeaning(meaning);
            if (hanViet != null && !hanViet.trim().isEmpty()) vocab.setHanViet(hanViet);
            if (jlpt != null && !jlpt.trim().isEmpty()) vocab.setLevel(jlpt);
            if (wordType != null && !wordType.trim().isEmpty()) vocab.setWordType(wordType);
            if (pitchAccent != null && !pitchAccent.trim().isEmpty()) vocab.setPitchAccent(pitchAccent);
            if (mnemonic != null && !mnemonic.trim().isEmpty()) vocab.setMnemonic(mnemonic);
            if (kanjiWords != null && !kanjiWords.trim().isEmpty()) vocab.setKanjiWords(kanjiWords);
            if (synonyms != null && !synonyms.trim().isEmpty()) vocab.setSynonyms(synonyms);
            if (antonyms != null && !antonyms.trim().isEmpty()) vocab.setAntonyms(antonyms);
            if (commonMistakes != null && !commonMistakes.trim().isEmpty()) vocab.setCommonMistakes(commonMistakes);
            if (collocations != null && !collocations.trim().isEmpty()) vocab.setCollocations(collocations);
            if (conversationExamples != null && !conversationExamples.trim().isEmpty()) vocab.setConversationExamples(conversationExamples);
            if (exampleSentencesJson != null && !exampleSentencesJson.trim().isEmpty()) vocab.setExampleSentences(exampleSentencesJson);
            if (sampleSentence != null && !sampleSentence.trim().isEmpty()) vocab.setSampleSentence(sampleSentence);
            if (sampleReading != null && !sampleReading.trim().isEmpty()) vocab.setSampleReading(sampleReading);
            if (sampleTranslation != null && !sampleTranslation.trim().isEmpty()) vocab.setSampleTranslation(sampleTranslation);
        } else {
            // New vocabulary: Inserted at the VERY END of the database (highest auto-increment ID)
            // to avoid shifting existing daily study words or completed days
            vocab = new Vocabulary();
            vocab.setKanji(word);
            vocab.setHiragana(reading);
            vocab.setMeaning(meaning);
            vocab.setHanViet(hanViet);
            vocab.setLevel(jlpt != null && !jlpt.trim().isEmpty() ? jlpt : "N3");
            vocab.setWordType(wordType);
            vocab.setPitchAccent(pitchAccent);
            vocab.setMnemonic(mnemonic);
            vocab.setKanjiWords(kanjiWords);
            vocab.setSynonyms(synonyms);
            vocab.setAntonyms(antonyms);
            vocab.setCommonMistakes(commonMistakes);
            vocab.setCollocations(collocations);
            vocab.setConversationExamples(conversationExamples);
            vocab.setExampleSentences(exampleSentencesJson);
            vocab.setSampleSentence(sampleSentence);
            vocab.setSampleReading(sampleReading);
            vocab.setSampleTranslation(sampleTranslation);
        }

        Vocabulary savedVocab = vocabularyRepository.save(vocab);

        // Check if WordReview link exists
        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        Optional<WordReview> existingReview = wordReviewRepository.findByUserAndVocabulary(managedUser, savedVocab);
        if (existingReview.isEmpty()) {
            WordReview newReview = new WordReview(managedUser, savedVocab);
            wordReviewRepository.save(newReview);

            // Auto-mark with quality 1 for newly added items only
            if (srsService != null) {
                try {
                    srsService.reviewWord(managedUser, savedVocab.getId(), 1);
                } catch (Exception e) {
                    log.error("Failed to auto-schedule SRS review for saved vocabulary: {}", e.getMessage());
                }
            }
        }

        return savedVocab;
    }

    /**
     * Save Grammar card with Versioning and Auto Deduplication.
     */
    @Transactional
    public GrammarCard saveGrammar(Map<String, Object> data, User user) throws Exception {
        String operator = user.getUsername();
        String grammar = (String) data.get("grammar");
        String meaning = (String) data.get("meaning");
        String usageDesc = (String) data.get("usageDesc");
        String formation = (String) data.get("formation");
        String jlpt = (String) data.get("jlpt");

        String similarGrammar = objectMapper.writeValueAsString(data.get("similarGrammar"));
        String difference = (String) data.get("difference");
        String commonMistakes = objectMapper.writeValueAsString(data.get("commonMistakes"));
        String examples = objectMapper.writeValueAsString(data.get("examples"));
        String readingPassage = (String) data.get("readingPassage");
        String quizzes = objectMapper.writeValueAsString(data.get("quizzes"));

        Optional<GrammarCard> existing = grammarCardRepository.findByGrammar(grammar);
        GrammarCard grammarCard;

        boolean isAdminUser = isAdmin(user);

        if (existing.isPresent()) {
            grammarCard = existing.get();
            if (isAdminUser) {
                saveVersionHistory("GRAMMAR", grammarCard.getId(), grammarCard, operator);
            }
            // Update fields in place while preserving existing weekName/dayName position
            if (meaning != null && !meaning.trim().isEmpty()) grammarCard.setMeaning(meaning);
            if (usageDesc != null && !usageDesc.trim().isEmpty()) grammarCard.setUsageDesc(usageDesc);
            if (formation != null && !formation.trim().isEmpty()) grammarCard.setFormation(formation);
            if (jlpt != null && !jlpt.trim().isEmpty()) grammarCard.setJlpt(jlpt);
            if (similarGrammar != null && !similarGrammar.trim().isEmpty() && !"null".equalsIgnoreCase(similarGrammar)) grammarCard.setSimilarGrammar(similarGrammar);
            if (difference != null && !difference.trim().isEmpty()) grammarCard.setDifference(difference);
            if (commonMistakes != null && !commonMistakes.trim().isEmpty() && !"null".equalsIgnoreCase(commonMistakes)) grammarCard.setCommonMistakes(commonMistakes);
            if (examples != null && !examples.trim().isEmpty() && !"null".equalsIgnoreCase(examples)) grammarCard.setExamples(examples);
            if (readingPassage != null && !readingPassage.trim().isEmpty()) grammarCard.setReadingPassage(readingPassage);
            if (quizzes != null && !quizzes.trim().isEmpty() && !"null".equalsIgnoreCase(quizzes)) grammarCard.setQuizzes(quizzes);
        } else {
            String cardJlpt = (jlpt != null && !jlpt.trim().isEmpty()) ? jlpt : "N3";
            grammarCard = new GrammarCard(grammar, meaning, usageDesc, formation, cardJlpt);
            if (similarGrammar != null && !"null".equalsIgnoreCase(similarGrammar)) grammarCard.setSimilarGrammar(similarGrammar);
            grammarCard.setDifference(difference);
            if (commonMistakes != null && !"null".equalsIgnoreCase(commonMistakes)) grammarCard.setCommonMistakes(commonMistakes);
            if (examples != null && !"null".equalsIgnoreCase(examples)) grammarCard.setExamples(examples);
            grammarCard.setReadingPassage(readingPassage);
            if (quizzes != null && !"null".equalsIgnoreCase(quizzes)) grammarCard.setQuizzes(quizzes);

            // Assign new grammar card to the VERY END of the curriculum (latest week/day)
            String weekName = (String) data.get("weekName");
            String dayName = (String) data.get("dayName");
            if (weekName == null || weekName.trim().isEmpty()) {
                weekName = getLastWeekNameForJlpt(cardJlpt);
            }
            if (dayName == null || dayName.trim().isEmpty()) {
                dayName = getLastDayNameForWeek(cardJlpt, weekName);
            }
            grammarCard.setWeekName(weekName);
            grammarCard.setDayName(dayName);
            grammarCard.setLessonTitle((String) data.get("lessonTitle"));
        }

        GrammarCard savedGrammar = grammarCardRepository.save(grammarCard);

        // Check if GrammarReview link exists
        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        Optional<GrammarReview> existingReview = grammarReviewRepository.findByUserIdAndGrammarCardId(managedUser.getId(), savedGrammar.getId());
        if (existingReview.isEmpty()) {
            GrammarReview newReview = new GrammarReview(managedUser, savedGrammar);
            grammarReviewRepository.save(newReview);

            // Auto-mark with quality 1 for newly added items only
            if (grammarSrsService != null) {
                try {
                    grammarSrsService.reviewGrammar(managedUser, savedGrammar.getId(), 1);
                } catch (Exception e) {
                    log.error("Failed to auto-schedule SRS review for saved grammar: {}", e.getMessage());
                }
            }
        }

        return savedGrammar;
    }

    private String getLastWeekNameForJlpt(String jlpt) {
        String level = (jlpt != null && !jlpt.isEmpty()) ? jlpt : "N3";
        List<String> weeks = grammarCardRepository.findDistinctWeeksByJlpt(level);
        if (weeks != null && !weeks.isEmpty()) {
            return weeks.get(weeks.size() - 1);
        }
        return "Tuần 6";
    }

    private String getLastDayNameForWeek(String jlpt, String weekName) {
        String level = (jlpt != null && !jlpt.isEmpty()) ? jlpt : "N3";
        List<String> days = grammarCardRepository.findDistinctDaysByJlptAndWeek(level, weekName);
        if (days != null && !days.isEmpty()) {
            return days.get(days.size() - 1);
        }
        return "Ngày 6";
    }

    /**
     * Helper to log entity states in knowledge_versions before updating.
     */
    private void saveVersionHistory(String type, Long id, Object entity, String operator) {
        try {
            List<KnowledgeVersion> versions = knowledgeVersionRepository
                    .findByEntityTypeAndEntityIdOrderByVersionNumberDesc(type, id);
            int nextVersionNum = versions.isEmpty() ? 1 : versions.get(0).getVersionNumber() + 1;

            String contentJson = objectMapper.writeValueAsString(entity);

            KnowledgeVersion kv = new KnowledgeVersion(type, id, nextVersionNum, contentJson, operator);
            knowledgeVersionRepository.save(kv);
        } catch (Exception e) {
            log.error("Failed to save history version: {}", e.getMessage());
        }
    }

    private String getApiKey() {
        String apiKey = System.getenv("DEEPSEEK_API_KEY");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getProperty("DEEPSEEK_API_KEY");
        }
        return (apiKey == null || apiKey.trim().isEmpty()) ? null : apiKey;
    }

    /**
     * Get all vocabulary words saved by the user.
     */
    @Transactional(readOnly = true)
    public List<Vocabulary> getSavedVocabulary(User user) {
        return wordReviewRepository.findAllByUserFetchVocabulary(user).stream()
                .map(WordReview::getVocabulary)
                .collect(Collectors.toList());
    }

    /**
     * Get all grammar cards saved by the user.
     */
    @Transactional(readOnly = true)
    public List<GrammarCard> getSavedGrammar(User user) {
        return grammarReviewRepository.findByUserIdFetchGrammarCard(user.getId()).stream()
                .map(GrammarReview::getGrammarCard)
                .collect(Collectors.toList());
    }

    /**
     * Delete vocabulary review card (remove from personal knowledge base).
     */
    @Transactional
    public void deleteSavedVocabulary(User user, Long vocabId) {
        Vocabulary vocab = vocabularyRepository.findById(vocabId)
                .orElseThrow(() -> new IllegalArgumentException("Từ vựng không tồn tại."));
        wordReviewRepository.findByUserAndVocabulary(user, vocab)
                .ifPresent(wordReviewRepository::delete);
    }

    /**
     * Delete grammar review card (remove from personal knowledge base).
     */
    @Transactional
    public void deleteSavedGrammar(User user, Long grammarId) {
        grammarReviewRepository.findByUserIdAndGrammarCardId(user.getId(), grammarId)
                .ifPresent(grammarReviewRepository::delete);
    }

    /**
     * Asynchronously trigger full AI enrichment in background worker thread.
     */
    public void triggerBackgroundFullEnrichment(String type, Long id, String term) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                log.info("Starting background full AI enrichment for type: {}, id: {}, term: {}", type, id, term);
                if ("grammar".equalsIgnoreCase(type)) {
                    Map<String, Object> fullData = enrichGrammar(term);
                    Optional<GrammarCard> optCard = grammarCardRepository.findById(id);
                    if (optCard.isPresent()) {
                        GrammarCard card = optCard.get();
                        String usageDesc = (String) fullData.get("usageDesc");
                        String formation = (String) fullData.get("formation");
                        String jlpt = (String) fullData.get("jlpt");
                        String similarGrammar = objectMapper.writeValueAsString(fullData.get("similarGrammar"));
                        String difference = (String) fullData.get("difference");
                        String commonMistakes = objectMapper.writeValueAsString(fullData.get("commonMistakes"));
                        String examples = objectMapper.writeValueAsString(fullData.get("examples"));
                        String readingPassage = (String) fullData.get("readingPassage");
                        String quizzes = objectMapper.writeValueAsString(fullData.get("quizzes"));

                        if (usageDesc != null && !usageDesc.trim().isEmpty()) card.setUsageDesc(usageDesc);
                        if (formation != null && !formation.trim().isEmpty()) card.setFormation(formation);
                        if (jlpt != null && !jlpt.trim().isEmpty()) card.setJlpt(jlpt);
                        if (similarGrammar != null && !similarGrammar.trim().isEmpty() && !"null".equalsIgnoreCase(similarGrammar)) card.setSimilarGrammar(similarGrammar);
                        if (difference != null && !difference.trim().isEmpty()) card.setDifference(difference);
                        if (commonMistakes != null && !commonMistakes.trim().isEmpty() && !"null".equalsIgnoreCase(commonMistakes)) card.setCommonMistakes(commonMistakes);
                        if (examples != null && !examples.trim().isEmpty() && !"null".equalsIgnoreCase(examples)) card.setExamples(examples);
                        if (readingPassage != null && !readingPassage.trim().isEmpty()) card.setReadingPassage(readingPassage);
                        if (quizzes != null && !quizzes.trim().isEmpty() && !"null".equalsIgnoreCase(quizzes)) card.setQuizzes(quizzes);

                        grammarCardRepository.save(card);
                        log.info("Completed background full AI enrichment for GrammarCard ID: {}", id);
                    }
                } else {
                    Map<String, Object> fullData = enrichVocabulary(term);
                    Optional<Vocabulary> optVocab = vocabularyRepository.findById(id);
                    if (optVocab.isPresent()) {
                        Vocabulary vocab = optVocab.get();
                        String pitchAccent = (String) fullData.get("pitchAccent");
                        String mnemonic = (String) fullData.get("mnemonic");
                        String kanjiWords = objectMapper.writeValueAsString(fullData.get("kanjiWords"));
                        String synonyms = objectMapper.writeValueAsString(fullData.get("synonyms"));
                        String antonyms = objectMapper.writeValueAsString(fullData.get("antonyms"));
                        String commonMistakes = objectMapper.writeValueAsString(fullData.get("commonMistakes"));
                        String collocations = objectMapper.writeValueAsString(fullData.get("collocations"));
                        String conversationExamples = objectMapper.writeValueAsString(fullData.get("conversationExamples"));
                        String exampleSentencesJson = objectMapper.writeValueAsString(fullData.get("exampleSentences"));

                        List<?> exampleSentences = (List<?>) fullData.get("exampleSentences");
                        if (exampleSentences != null && !exampleSentences.isEmpty()) {
                            Map<?, ?> firstEx = (Map<?, ?>) exampleSentences.get(0);
                            vocab.setSampleSentence((String) firstEx.get("ja"));
                            vocab.setSampleReading((String) firstEx.get("reading"));
                            vocab.setSampleTranslation((String) firstEx.get("vi"));
                        }

                        if (pitchAccent != null && !pitchAccent.trim().isEmpty()) vocab.setPitchAccent(pitchAccent);
                        if (mnemonic != null && !mnemonic.trim().isEmpty()) vocab.setMnemonic(mnemonic);
                        if (kanjiWords != null && !kanjiWords.trim().isEmpty() && !"null".equalsIgnoreCase(kanjiWords)) vocab.setKanjiWords(kanjiWords);
                        if (synonyms != null && !synonyms.trim().isEmpty() && !"null".equalsIgnoreCase(synonyms)) vocab.setSynonyms(synonyms);
                        if (antonyms != null && !antonyms.trim().isEmpty() && !"null".equalsIgnoreCase(antonyms)) vocab.setAntonyms(antonyms);
                        if (commonMistakes != null && !commonMistakes.trim().isEmpty() && !"null".equalsIgnoreCase(commonMistakes)) vocab.setCommonMistakes(commonMistakes);
                        if (collocations != null && !collocations.trim().isEmpty() && !"null".equalsIgnoreCase(collocations)) vocab.setCollocations(collocations);
                        if (conversationExamples != null && !conversationExamples.trim().isEmpty() && !"null".equalsIgnoreCase(conversationExamples)) vocab.setConversationExamples(conversationExamples);
                        if (exampleSentencesJson != null && !exampleSentencesJson.trim().isEmpty() && !"null".equalsIgnoreCase(exampleSentencesJson)) vocab.setExampleSentences(exampleSentencesJson);

                        vocabularyRepository.save(vocab);
                        log.info("Completed background full AI enrichment for Vocabulary ID: {}", id);
                    }
                }
            } catch (Exception e) {
                log.error("Failed background AI enrichment for type: {}, id: {}: {}", type, id, e.getMessage(), e);
            }
        });
    }
}

