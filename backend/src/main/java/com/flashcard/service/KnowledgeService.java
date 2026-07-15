package com.flashcard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.model.GrammarCard;
import com.flashcard.model.KnowledgeVersion;
import com.flashcard.model.Vocabulary;
import com.flashcard.model.User;
import com.flashcard.model.WordReview;
import com.flashcard.model.GrammarReview;
import com.flashcard.repository.GrammarCardRepository;
import com.flashcard.repository.KnowledgeVersionRepository;
import com.flashcard.repository.VocabularyRepository;
import com.flashcard.repository.WordReviewRepository;
import com.flashcard.repository.GrammarReviewRepository;
import com.flashcard.repository.UserRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

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

    // Bulkhead to protect AI APIs
    private final Semaphore bulkheadSemaphore = new Semaphore(50);

    @Autowired
    public KnowledgeService(VocabularyRepository vocabularyRepository,
                            GrammarCardRepository grammarCardRepository,
                            KnowledgeVersionRepository knowledgeVersionRepository,
                            WordReviewRepository wordReviewRepository,
                            GrammarReviewRepository grammarReviewRepository,
                            UserRepository userRepository,
                            ObjectMapper objectMapper) {
        this.vocabularyRepository = vocabularyRepository;
        this.grammarCardRepository = grammarCardRepository;
        this.knowledgeVersionRepository = knowledgeVersionRepository;
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
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
                "Bạn là một chuyên gia ngôn ngữ học tiếng Nhật. Hãy chuẩn hóa đầu vào sau đây về từ vựng tiếng Nhật chuẩn (Kanji/Kana) hoặc cấu trúc ngữ pháp chuẩn tiếng Nhật.\n" +
                "Đầu vào có thể là: Romaji, Hiragana không dấu, Katakana sai, Hán tự Trung Quốc (giản thể/phồn thể), tiếng Việt giải nghĩa, hoặc viết sai chính tả nhẹ.\n" +
                "Đầu vào: \"%s\"\n\n" +
                "Hãy trả về phản hồi định dạng JSON duy nhất, không có markdown:\n" +
                "{\n" +
                "  \"type\": \"vocabulary\" hoặc \"grammar\",\n" +
                "  \"normalized\": \"Từ hoặc ngữ pháp chuẩn tiếng Nhật (ví dụ: 食事 hoặc 〜ように)\"\n" +
                "}",
                input
            );

            Map<String, Object> requestBodyMap = Map.of(
                "model", "deepseek-v4-flash",
                "response_format", Map.of("type", "json_object"),
                "messages", new Object[]{
                    Map.of("role", "system", "content", "Bạn là trợ lý chuẩn hóa tiếng Nhật. Bạn chỉ phản hồi bằng JSON."),
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
            JsonNode contentNode = objectMapper.readTree(jsonContent);

            String type = contentNode.path("type").asText("vocabulary");
            String normalized = contentNode.path("normalized").asText(input);

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
                "  \"mnemonic\": \"mẹo nhớ chữ hán hoặc từ này\",\n" +
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

            return objectMapper.readValue(jsonContent, Map.class);
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
                "Hãy trả về JSON duy nhất, không markdown:\n" +
                "{\n" +
                "  \"grammar\": \"cấu trúc ngữ pháp chính xác (ví dụ: 〜ように)\",\n" +
                "  \"meaning\": \"nghĩa tiếng Việt chính xác (ví dụ: để làm gì đó)\",\n" +
                "  \"usageDesc\": \"cách dùng cụ thể, ngữ cảnh sử dụng\",\n" +
                "  \"formation\": \"cách kết hợp (ví dụ: V-dict / V-nai + ように)\",\n" +
                "  \"jlpt\": \"cấp độ JLPT từ N5 đến N1\",\n" +
                "  \"similarGrammar\": [\"ngữ pháp tương tự 1\", \"ngữ pháp tương tự 2\"],\n" +
                "  \"difference\": \"so sánh và phân biệt với các ngữ pháp tương tự để tránh nhầm lẫn\",\n" +
                "  \"commonMistakes\": [\n" +
                "     { \"error\": \"sai lầm phổ biến khi dùng\", \"fix\": \"cách dùng đúng và giải thích\" }\n" +
                "  ],\n" +
                "  \"examples\": [\n" +
                "     { \"ja\": \"câu ví dụ tiếng Nhật\", \"reading\": \"hiragana câu ví dụ\", \"vi\": \"dịch nghĩa tiếng Việt\" }\n" +
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

            return objectMapper.readValue(jsonContent, Map.class);
        } finally {
            bulkheadSemaphore.release();
        }
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

        // Deduplication Check
        Optional<Vocabulary> existing = vocabularyRepository.findFirstByKanji(word);
        if (existing.isEmpty()) {
            existing = vocabularyRepository.findFirstByHiragana(word);
        }

        Vocabulary vocab;
        if (existing.isPresent()) {
            vocab = existing.get();
            // Save version history before modifying
            saveVersionHistory("VOCABULARY", vocab.getId(), vocab, operator);

            // Update fields
            vocab.setMeaning(meaning);
            vocab.setLevel(jlpt);
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
        } else {
            vocab = new Vocabulary();
            vocab.setKanji(word);
            vocab.setHiragana(reading);
            vocab.setMeaning(meaning);
            vocab.setLevel(jlpt);
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

        if (existing.isPresent()) {
            grammarCard = existing.get();
            // Save version history before updating
            saveVersionHistory("GRAMMAR", grammarCard.getId(), grammarCard, operator);

            grammarCard.setMeaning(meaning);
            grammarCard.setUsageDesc(usageDesc);
            grammarCard.setFormation(formation);
            grammarCard.setJlpt(jlpt);
            grammarCard.setSimilarGrammar(similarGrammar);
            grammarCard.setDifference(difference);
            grammarCard.setCommonMistakes(commonMistakes);
            grammarCard.setExamples(examples);
            grammarCard.setReadingPassage(readingPassage);
            grammarCard.setQuizzes(quizzes);
        } else {
            grammarCard = new GrammarCard(grammar, meaning, usageDesc, formation, jlpt);
            grammarCard.setSimilarGrammar(similarGrammar);
            grammarCard.setDifference(difference);
            grammarCard.setCommonMistakes(commonMistakes);
            grammarCard.setExamples(examples);
            grammarCard.setReadingPassage(readingPassage);
            grammarCard.setQuizzes(quizzes);
        }

        GrammarCard savedGrammar = grammarCardRepository.save(grammarCard);

        // Check if GrammarReview link exists
        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        Optional<GrammarReview> existingReview = grammarReviewRepository.findByUserIdAndGrammarCardId(managedUser.getId(), savedGrammar.getId());
        if (existingReview.isEmpty()) {
            GrammarReview newReview = new GrammarReview(managedUser, savedGrammar);
            grammarReviewRepository.save(newReview);
        }

        return savedGrammar;
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
        return grammarReviewRepository.findByUserId(user.getId()).stream()
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
}
