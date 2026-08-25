package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.provider.JlptN3DataProvider;
import com.flashcard.knowledge.provider.KnowledgeDataProvider;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class JlptN3CourseService {

    private static final Logger log = LoggerFactory.getLogger(JlptN3CourseService.class);

    private final JlptN3DataProvider jlptN3DataProvider;
    private final VocabularyDataProvider vocabularyDataProvider;
    private final KnowledgeDataProvider knowledgeDataProvider;
    private final SrsDataProvider srsDataProvider;
    private final DeepSeekEnrichmentService enrichmentService;
    private final AiEnrichmentQueueService aiEnrichmentQueueService;
    private final ObjectMapper objectMapper;
    private final Map<String, Map<String, Object>> lessonDataCache = new ConcurrentHashMap<>();
    private volatile Set<String> cachedDbCategories = null;
    private volatile long lastCategoriesFetchTime = 0L;
    private static final long CATEGORIES_CACHE_TTL_MS = 10 * 60 * 1000L; // 10 minutes

    @CacheEvict(value = "jlpt-overview", allEntries = true)
    public void clearLessonCache() {
        lessonDataCache.clear();
        cachedDbCategories = null;
    }

    private Set<String> getDbCategoriesFast() {
        long now = System.currentTimeMillis();
        Set<String> cached = cachedDbCategories;
        if (cached != null && (now - lastCategoriesFetchTime < CATEGORIES_CACHE_TTL_MS)) {
            return cached;
        }
        Set<String> dbCategories = new HashSet<>();
        try {
            List<Vocabulary> dbVocabs = vocabularyDataProvider.getByLevel("N3_COURSE");
            for (Vocabulary v : dbVocabs) {
                if (v.getCategory() != null) {
                    dbCategories.add(v.getCategory());
                }
            }
            List<GrammarCard> dbGrammars = knowledgeDataProvider.findAllGrammar();
            for (GrammarCard g : dbGrammars) {
                if (g.getWeekName() != null && g.getDayName() != null) {
                    dbCategories.add(g.getWeekName() + " " + g.getDayName());
                }
            }
            cachedDbCategories = dbCategories;
            lastCategoriesFetchTime = now;
            return dbCategories;
        } catch (Exception e) {
            log.warn("Failed to prefetch DB categories: {}", e.getMessage());
            return cached != null ? cached : dbCategories;
        }
    }

    @jakarta.annotation.PostConstruct
    public void warmupLessonCache() {
        // Asynchronously pre-populate in-memory cache for all lessons in the background
        CompletableFuture.runAsync(() -> {
            log.info("Starting background cache warmup for JLPT N3 lessons...");
            getDbCategoriesFast();
            for (int c = 1; c <= 9; c++) {
                for (int l = 1; l <= 3; l++) {
                    try {
                        getLessonData(c, l);
                    } catch (Exception e) {
                        log.debug("Cache warmup skipped for Chapter {} Lesson {}: {}", c, l, e.getMessage());
                    }
                }
            }
            log.info("JLPT N3 lesson cache warmup completed! ({} lessons cached)", lessonDataCache.size());
        });
    }

    @Autowired
    public JlptN3CourseService(JlptN3DataProvider jlptN3DataProvider,
                               VocabularyDataProvider vocabularyDataProvider,
                               KnowledgeDataProvider knowledgeDataProvider,
                               SrsDataProvider srsDataProvider,
                               DeepSeekEnrichmentService enrichmentService,
                               @Autowired(required = false) AiEnrichmentQueueService aiEnrichmentQueueService,
                               ObjectMapper objectMapper) {
        this.jlptN3DataProvider = jlptN3DataProvider;
        this.vocabularyDataProvider = vocabularyDataProvider;
        this.knowledgeDataProvider = knowledgeDataProvider;
        this.srsDataProvider = srsDataProvider;
        this.enrichmentService = enrichmentService;
        this.aiEnrichmentQueueService = aiEnrichmentQueueService;
        this.objectMapper = objectMapper;
    }



    private boolean isLessonDataAvailableFast(int chapter, int lesson, Set<String> dbAvailableCategories) {
        if (dbAvailableCategories != null) {
            String matchKey = "Chương " + chapter + " Bài " + lesson;
            for (String cat : dbAvailableCategories) {
                if (cat != null && cat.contains(matchKey)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get Course Overview of 9 Chapters and 27 Lessons, including progress for the user.
     */
    @Cacheable(value = "jlpt-overview", key = "(#userId != null ? #userId : 0)")
    public Map<String, Object> getCourseOverview(Long userId) {
        List<JlptN3Progress> userProgressList = userId != null ? jlptN3DataProvider.findProgressByUser(userId) : Collections.emptyList();
        Map<String, JlptN3Progress> progressMap = new HashMap<>();
        for (JlptN3Progress p : userProgressList) {
            String key = p.getChapterId() + "_" + p.getLessonId();
            progressMap.put(key, p);
        }

        // Cache lesson availability directly from Database
        Set<String> dbCategories = getDbCategoriesFast();

        List<Map<String, Object>> chapters = new ArrayList<>();
        int totalLessons = 27;
        int completedLessons = 0;

        for (int c = 1; c <= 9; c++) {
            Map<String, Object> chapterData = new HashMap<>();
            chapterData.put("id", c);
            chapterData.put("title", "Chương " + c);

            List<Map<String, Object>> lessons = new ArrayList<>();
            int chapterCompleted = 0;

            for (int l = 1; l <= 3; l++) {
                Map<String, Object> lessonData = new HashMap<>();
                lessonData.put("id", l);
                lessonData.put("chapterId", c);
                lessonData.put("title", "Bài " + l);

                boolean available = isLessonDataAvailableFast(c, l, dbCategories);
                lessonData.put("available", available);

                String key = c + "_" + l;
                JlptN3Progress progress = progressMap.get(key);

                boolean isCompleted = progress != null && Boolean.TRUE.equals(progress.getCompleted());
                boolean vocabPassed = progress != null && Boolean.TRUE.equals(progress.getVocabPassed());
                boolean kanjiPassed = progress != null && Boolean.TRUE.equals(progress.getKanjiPassed());
                boolean grammarPassed = progress != null && Boolean.TRUE.equals(progress.getGrammarPassed());
                boolean quizPassed = progress != null && Boolean.TRUE.equals(progress.getQuizPassed());
                int bestScore = progress != null ? progress.getBestScore() : 0;

                lessonData.put("completed", isCompleted);
                lessonData.put("vocabPassed", vocabPassed);
                lessonData.put("kanjiPassed", kanjiPassed);
                lessonData.put("grammarPassed", grammarPassed);
                lessonData.put("quizPassed", quizPassed);
                lessonData.put("bestScore", bestScore);

                if (isCompleted) {
                    completedLessons++;
                    chapterCompleted++;
                }

                lessons.add(lessonData);
            }

            chapterData.put("lessons", lessons);
            chapterData.put("completedLessons", chapterCompleted);
            chapterData.put("totalLessons", 3);
            chapters.add(chapterData);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("chapters", chapters);
        result.put("totalLessons", totalLessons);
        result.put("completedLessons", completedLessons);
        int percentage = Math.round((float) completedLessons * 100 / totalLessons);
        result.put("completionPercentage", percentage);

        return result;
    }

    /**
     * Get details for a specific Chapter and Lesson (Kanji, Vocab, Grammar).
     * DATABASE-FIRST: Loads directly from MongoDB collections.
     */
    public Map<String, Object> getLessonData(int chapter, int lesson) {
        return getLessonData(null, chapter, lesson);
    }

    public Map<String, Object> getLessonData(Long userId, int chapter, int lesson) {
        String cacheKey = chapter + "_" + lesson;
        Map<String, Object> cached = lessonDataCache.get(cacheKey);
        if (cached != null) {
            Map<String, Object> copy = new HashMap<>(cached);
            attachUserProgress(copy, userId, chapter, lesson);
            return copy;
        }

        String vocabCategory = "Tổng ôn N3 - Chương " + chapter + " Bài " + lesson;
        String kanjiCategory = "Tổng ôn N3 - Chương " + chapter + " Bài " + lesson + " - Kanji";

        // Strategy 1 (Primary): Fetch directly from Database
        List<Vocabulary> dbVocabs = vocabularyDataProvider.findByCategory(vocabCategory);
        List<Vocabulary> dbKanjis = vocabularyDataProvider.findByCategory(kanjiCategory);
        List<GrammarCard> dbGrammars = knowledgeDataProvider.findGrammarByJlptAndWeekAndDay("N3", "Chương " + chapter, "Bài " + lesson);

        if (dbGrammars.isEmpty()) {
            dbGrammars = knowledgeDataProvider.findAllGrammar().stream()
                    .filter(g -> (g.getWeekName() != null && g.getWeekName().contains("Chương " + chapter)) &&
                                 (g.getDayName() != null && g.getDayName().contains("Bài " + lesson)))
                    .collect(Collectors.toList());
        }

        if (!dbVocabs.isEmpty() || !dbKanjis.isEmpty() || !dbGrammars.isEmpty()) {
            List<Map<String, Object>> tuVungList = new ArrayList<>();
            for (Vocabulary v : dbVocabs) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", v.getId());
                item.put("tu", v.getKanji() != null && !v.getKanji().isBlank() ? v.getKanji() : v.getHiragana());
                item.put("kanji", v.getKanji());
                item.put("furigana", v.getHiragana());
                item.put("hiragana", v.getHiragana());
                item.put("cach_doc", v.getHiragana());
                item.put("nghia", v.getMeaning());
                item.put("meaning", v.getMeaning());
                item.put("loai_tu", v.getWordType() != null ? v.getWordType() : "N");
                item.put("wordType", v.getWordType() != null ? v.getWordType() : "N");
                item.put("vi_du", v.getSampleSentence());
                item.put("sampleSentence", v.getSampleSentence());
                item.put("hanViet", v.getHanViet());
                item.put("am_han", v.getHanViet());
                item.put("pitchAccent", v.getPitchAccent());
                item.put("mnemonic", v.getMnemonic());
                item.put("exampleSentences", v.getExampleSentences());
                item.put("synonyms", v.getSynonyms());
                item.put("antonyms", v.getAntonyms());
                item.put("collocations", v.getCollocations());
                item.put("commonMistakes", v.getCommonMistakes());
                item.put("conversationExamples", v.getConversationExamples());
                item.put("usageGuide", v.getUsageGuide());
                item.put("kanjiWords", v.getKanjiWords());
                tuVungList.add(item);
            }

            List<Map<String, Object>> chuHanList = new ArrayList<>();
            for (Vocabulary k : dbKanjis) {
                Map<String, Object> kItem = new HashMap<>();
                kItem.put("id", k.getId());
                kItem.put("kanji", k.getKanji());
                kItem.put("han_viet", k.getHanViet());
                kItem.put("hanViet", k.getHanViet());
                kItem.put("am_han", k.getHanViet());
                String amDoc = k.getRomaji() != null && !k.getRomaji().isBlank() ? k.getRomaji() : k.getHiragana();
                kItem.put("am_doc", amDoc);
                kItem.put("romaji", amDoc);
                kItem.put("hiragana", amDoc);
                kItem.put("am_on", k.getOnReading());
                kItem.put("onReading", k.getOnReading());
                kItem.put("am_kun", k.getKunReading());
                kItem.put("kunReading", k.getKunReading());
                kItem.put("nghia", k.getMeaning());
                kItem.put("meaning", k.getMeaning());
                kItem.put("mnemonic", k.getMnemonic());
                kItem.put("kanjiWords", k.getKanjiWords());
                if (k.getKanjiWords() != null && !k.getKanjiWords().isBlank()) {
                    try {
                        kItem.put("tu_vung", objectMapper.readValue(k.getKanjiWords(), List.class));
                    } catch (Exception e) {
                        kItem.put("tu_vung", List.of(k.getKanjiWords()));
                    }
                } else {
                    kItem.put("tu_vung", Collections.emptyList());
                }
                kItem.put("exampleSentences", k.getExampleSentences());
                kItem.put("usageGuide", k.getUsageGuide());
                chuHanList.add(kItem);
            }

            List<Map<String, Object>> nguPhapList = new ArrayList<>();
            for (GrammarCard g : dbGrammars) {
                Map<String, Object> gItem = new HashMap<>();
                gItem.put("id", g.getId());
                gItem.put("cau_truc", g.getGrammar());
                gItem.put("grammar", g.getGrammar());
                gItem.put("y_nghia", g.getMeaning());
                gItem.put("meaning", g.getMeaning());
                gItem.put("cach_chia", g.getFormation());
                gItem.put("formation", g.getFormation());
                gItem.put("usageGuide", g.getUsageGuide());
                gItem.put("usageDesc", g.getUsageDesc());
                gItem.put("difference", g.getDifference());
                gItem.put("similarGrammar", g.getSimilarGrammar());
                gItem.put("commonMistakes", g.getCommonMistakes());
                if (g.getExamples() != null && !g.getExamples().isBlank()) {
                    try {
                        gItem.put("vi_du", objectMapper.readValue(g.getExamples(), List.class));
                    } catch (Exception e) {
                        gItem.put("vi_du", List.of(g.getExamples()));
                    }
                }
                nguPhapList.add(gItem);
            }

            Map<String, Object> dbRes = new HashMap<>();
            dbRes.put("chuong", chapter);
            dbRes.put("bai", lesson);
            dbRes.put("available", true);
            dbRes.put("chu_han", chuHanList);
            dbRes.put("tu_vung", tuVungList);
            dbRes.put("ngu_phap", nguPhapList);
            lessonDataCache.put(cacheKey, dbRes);
            Map<String, Object> copy = new HashMap<>(dbRes);
            attachUserProgress(copy, userId, chapter, lesson);
            return copy;
        }

        // If no data exists in database, return available: false.
        // Data is ONLY populated when the user explicitly uploads JSON files via the UI.
        Map<String, Object> emptyRes = new HashMap<>();
        emptyRes.put("chuong", chapter);
        emptyRes.put("bai", lesson);
        emptyRes.put("available", false);
        emptyRes.put("message", "Chưa có dữ liệu cho Chương " + chapter + " Bài " + lesson);
        emptyRes.put("chu_han", Collections.emptyList());
        emptyRes.put("tu_vung", Collections.emptyList());
        emptyRes.put("ngu_phap", Collections.emptyList());
        return emptyRes;
    }

    private void attachUserProgress(Map<String, Object> target, Long userId, int chapter, int lesson) {
        if (target == null) return;
        boolean vocabPassed = false;
        boolean kanjiPassed = false;
        boolean grammarPassed = false;
        boolean quizPassed = false;
        boolean completed = false;
        int bestScore = 0;

        if (userId != null && jlptN3DataProvider != null) {
            Optional<JlptN3Progress> progOpt = jlptN3DataProvider.findProgress(userId, chapter, lesson);
            if (progOpt.isPresent()) {
                JlptN3Progress p = progOpt.get();
                vocabPassed = Boolean.TRUE.equals(p.getVocabPassed());
                kanjiPassed = Boolean.TRUE.equals(p.getKanjiPassed());
                grammarPassed = Boolean.TRUE.equals(p.getGrammarPassed());
                quizPassed = Boolean.TRUE.equals(p.getQuizPassed());
                completed = Boolean.TRUE.equals(p.getCompleted());
                bestScore = p.getBestScore() != null ? p.getBestScore() : 0;
            }
        }

        target.put("vocabPassed", vocabPassed);
        target.put("kanjiPassed", kanjiPassed);
        target.put("grammarPassed", grammarPassed);
        target.put("quizPassed", quizPassed);
        target.put("completed", completed);
        target.put("bestScore", bestScore);
    }

    /**
     * Dynamically process JSON files uploaded via File Picker
     */
    public Map<String, Object> processUploadedJsonFiles(MultipartFile[] files) {
        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất một tệp JSON để tải lên!");
        }

        int processedFilesCount = 0;
        int importedVocab = 0;
        int importedKanji = 0;
        int importedGrammar = 0;
        List<String> details = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String originalName = file.getOriginalFilename();
            try {
                byte[] bytes = file.getBytes();
                if (bytes == null || bytes.length == 0) {
                    details.add("Tệp " + originalName + " trống (0 byte).");
                    continue;
                }

                JsonNode root = objectMapper.readTree(bytes);
                int chuong = root.path("chuong").asInt(1);
                int bai = root.path("bai").asInt(1);

                String vocabCategory = "Tổng ôn N3 - Chương " + chuong + " Bài " + bai;
                String kanjiCategory = "Tổng ôn N3 - Chương " + chuong + " Bài " + bai + " - Kanji";

                List<Vocabulary> oldVocab = vocabularyDataProvider.findByCategory(vocabCategory);
                if (oldVocab != null && !oldVocab.isEmpty()) {
                    srsDataProvider.deleteWordReviewsByVocabularies(oldVocab);
                    vocabularyDataProvider.deleteAll(oldVocab);
                }
                List<Vocabulary> oldKanji = vocabularyDataProvider.findByCategory(kanjiCategory);
                if (oldKanji != null && !oldKanji.isEmpty()) {
                    srsDataProvider.deleteWordReviewsByVocabularies(oldKanji);
                    vocabularyDataProvider.deleteAll(oldKanji);
                }

                List<Vocabulary> toSaveVocabs = new ArrayList<>();
                List<GrammarCard> toSaveGrammars = new ArrayList<>();
                int fileVocab = 0;
                int fileKanji = 0;
                int fileGrammar = 0;

                // 2. Parse Kanji (chu_han)
                if (root.has("chu_han") && root.get("chu_han").isArray()) {
                    for (JsonNode kNode : root.get("chu_han")) {
                        String kanji = kNode.path("kanji").asText("").trim();
                        if (kanji.isEmpty()) continue;

                        String hanViet = kNode.path("han_viet").asText("").trim();
                        if (hanViet.isEmpty()) hanViet = kNode.path("hanViet").asText("").trim();
                        String nghia = kNode.path("nghia").asText("").trim();
                        if (nghia.isEmpty()) nghia = kNode.path("meaning").asText("").trim();
                        String amDoc = kNode.path("am_doc").asText("").trim();
                        if (amDoc.isEmpty()) amDoc = kNode.path("reading").asText("").trim();

                        List<String> tuVungList = new ArrayList<>();
                        if (kNode.has("tu_vung") && kNode.get("tu_vung").isArray()) {
                            for (JsonNode tv : kNode.get("tu_vung")) {
                                tuVungList.add(tv.asText());
                            }
                        }

                        Vocabulary v = new Vocabulary();
                        v.setKanji(kanji);
                        if (amDoc != null && !amDoc.isEmpty()) {
                            v.setRomaji(amDoc);
                            v.setHiragana(amDoc);
                            if (amDoc.contains("/")) {
                                String[] parts = amDoc.split("/", 2);
                                v.setOnReading(parts[0].trim());
                                v.setKunReading(parts[1].trim());
                            } else if (amDoc.matches("^[\\u30A0-\\u30FF\\s、·・,]+$")) {
                                v.setOnReading(amDoc.trim());
                            } else {
                                v.setKunReading(amDoc.trim());
                            }
                        } else {
                            v.setHiragana(kanji);
                        }
                        if (hanViet != null && !hanViet.isEmpty()) v.setHanViet(hanViet);
                        if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                        v.setWordType("KANJI");
                        v.setLevel("N3_COURSE");
                        v.setCategory(kanjiCategory);

                        if (!tuVungList.isEmpty()) {
                            try {
                                v.setKanjiWords(objectMapper.writeValueAsString(tuVungList));
                            } catch (Exception ignored) {}
                        }

                        toSaveVocabs.add(v);
                        fileKanji++;
                    }
                }

                // 3. Parse Vocab (tu_vung)
                if (root.has("tu_vung") && root.get("tu_vung").isArray()) {
                    for (JsonNode vNode : root.get("tu_vung")) {
                        String tu = vNode.path("tu").asText("").trim();
                        if (tu.isEmpty()) continue;

                        String loaiTu = vNode.path("loai_tu").asText("").trim();
                        if (loaiTu.isEmpty()) loaiTu = vNode.path("loại từ").asText("").trim();
                        if (loaiTu.isEmpty()) loaiTu = vNode.path("loaiTu").asText("").trim();
                        if (loaiTu.isEmpty()) loaiTu = vNode.path("wordType").asText("").trim();

                        String nghia = vNode.path("nghia").asText("").trim();
                        if (nghia.isEmpty()) nghia = vNode.path("nghĩa").asText("").trim();
                        if (nghia.isEmpty()) nghia = vNode.path("meaning").asText("").trim();

                        String viDu = vNode.path("vi_du").asText("").trim();
                        if (viDu.isEmpty()) viDu = vNode.path("ví dụ").asText("").trim();
                        if (viDu.isEmpty()) viDu = vNode.path("sampleSentence").asText("").trim();

                        String cachDoc = vNode.path("cach_doc").asText("").trim();
                        if (cachDoc.isEmpty()) cachDoc = vNode.path("cách đọc").asText("").trim();
                        if (cachDoc.isEmpty()) cachDoc = vNode.path("hiragana").asText("").trim();
                        if (cachDoc.isEmpty()) cachDoc = vNode.path("furigana").asText("").trim();
                        if (cachDoc.isEmpty()) cachDoc = vNode.path("reading").asText("").trim();

                        String hanViet = vNode.path("han_viet").asText("").trim();
                        if (hanViet.isEmpty()) hanViet = vNode.path("hanViet").asText("").trim();
                        if (hanViet.isEmpty()) hanViet = vNode.path("am_han").asText("").trim();

                        Vocabulary v = new Vocabulary();
                        boolean isKanji = tu.codePoints().anyMatch(Character::isIdeographic);
                        if (isKanji) {
                            v.setKanji(tu);
                            v.setHiragana(cachDoc != null && !cachDoc.isEmpty() ? cachDoc : tu);
                        } else {
                            v.setHiragana(tu);
                            v.setKanji(tu);
                        }

                        if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                        if (hanViet != null && !hanViet.isEmpty()) v.setHanViet(hanViet);
                        v.setWordType(loaiTu != null && !loaiTu.isEmpty() && !"KANJI".equalsIgnoreCase(loaiTu) ? loaiTu : "N");
                        if (viDu != null && !viDu.isEmpty()) v.setSampleSentence(viDu);
                        v.setLevel("N3_COURSE");
                        v.setCategory(vocabCategory);

                        toSaveVocabs.add(v);
                        fileVocab++;
                    }
                }

                // 4. Parse Grammar (ngu_phap)
                if (root.has("ngu_phap") && root.get("ngu_phap").isArray()) {
                    for (JsonNode gNode : root.get("ngu_phap")) {
                        String cauTruc = gNode.path("cau_truc").asText("").trim();
                        if (cauTruc.isEmpty()) continue;

                        String yNghia = gNode.path("y_nghia").asText("").trim();
                        String cachChia = gNode.path("cach_chia").asText("").trim();

                        List<String> viDuList = new ArrayList<>();
                        if (gNode.has("vi_du") && gNode.get("vi_du").isArray()) {
                            for (JsonNode vd : gNode.get("vi_du")) {
                                viDuList.add(vd.asText());
                            }
                        }

                        GrammarCard g = new GrammarCard();
                        g.setGrammar(cauTruc);
                        g.setMeaning(yNghia);
                        g.setFormation(cachChia);
                        g.setJlpt("N3");
                        g.setWeekName("Chương " + chuong);
                        g.setDayName("Bài " + bai);
                        g.setLessonTitle("Bài " + bai + " (Tổng ôn N3)");

                        if (!viDuList.isEmpty()) {
                            try {
                                g.setExamples(objectMapper.writeValueAsString(viDuList));
                            } catch (Exception ignored) {}
                        }

                        toSaveGrammars.add(g);
                        fileGrammar++;
                    }
                }

                // Batch persist to Database
                if (!toSaveVocabs.isEmpty()) {
                    vocabularyDataProvider.saveAll(toSaveVocabs);
                }
                if (!toSaveGrammars.isEmpty()) {
                    knowledgeDataProvider.saveAllGrammar(toSaveGrammars);
                }

                processedFilesCount++;
                importedVocab += fileVocab;
                importedKanji += fileKanji;
                importedGrammar += fileGrammar;

                details.add(String.format("Đã nạp %s (Chương %d - Bài %d): %d từ vựng, %d chữ Hán, %d ngữ pháp", originalName, chuong, bai, fileVocab, fileKanji, fileGrammar));
            } catch (Exception e) {
                log.error("Failed to process uploaded file {}: {}", originalName, e.getMessage(), e);
                details.add("Lỗi khi đọc " + originalName + ": " + e.getMessage());
            }
        }

        clearLessonCache();
        log.info("Persisted to DB: {} files, {} vocab, {} kanji, {} grammar.", processedFilesCount, importedVocab, importedKanji, importedGrammar);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("processedFilesCount", processedFilesCount);
        response.put("importedVocab", importedVocab);
        response.put("importedKanji", importedKanji);
        response.put("importedGrammar", importedGrammar);
        response.put("details", details);
        return response;
    }

    /**
     * Submit Quiz Score for a lesson component (vocab, kanji, grammar) and update pass status if accuracy >= 90%.
     */
    @Transactional
    @CacheEvict(value = "jlpt-overview", allEntries = true)
    public Map<String, Object> submitQuiz(Long userId, int chapter, int lesson, String quizCategory, int score, int total) {
        if (total <= 0) {
            throw new IllegalArgumentException("Tổng số câu hỏi phải lớn hơn 0");
        }

        int accuracy = Math.round((float) score * 100 / total);
        boolean passed = (accuracy >= 80);
        String category = quizCategory != null ? quizCategory.trim().toLowerCase() : "vocab";

        JlptN3Progress progress = null;
        if (userId != null) {
            progress = jlptN3DataProvider.findProgress(userId, chapter, lesson)
                    .orElseGet(() -> new JlptN3Progress(userId, chapter, lesson, false, 0));

            if (accuracy > progress.getBestScore()) {
                progress.setBestScore(accuracy);
            }

            if (passed) {
                if ("vocab".equals(category)) {
                    progress.setVocabPassed(true);
                } else if ("kanji".equals(category)) {
                    progress.setKanjiPassed(true);
                } else if ("grammar".equals(category)) {
                    progress.setGrammarPassed(true);
                } else if ("all".equals(category)) {
                    progress.setVocabPassed(true);
                    progress.setKanjiPassed(true);
                    progress.setGrammarPassed(true);
                }
            }

            if (Boolean.TRUE.equals(progress.getVocabPassed())
                    && Boolean.TRUE.equals(progress.getKanjiPassed())
                    && Boolean.TRUE.equals(progress.getGrammarPassed())) {
                progress.setCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
            }

            jlptN3DataProvider.saveProgress(progress);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("chapterId", chapter);
        result.put("lessonId", lesson);
        result.put("quizCategory", category);
        result.put("score", score);
        result.put("total", total);
        result.put("accuracy", accuracy);
        result.put("passed", passed);
        result.put("vocabPassed", progress != null && Boolean.TRUE.equals(progress.getVocabPassed()));
        result.put("kanjiPassed", progress != null && Boolean.TRUE.equals(progress.getKanjiPassed()));
        result.put("grammarPassed", progress != null && Boolean.TRUE.equals(progress.getGrammarPassed()));
        result.put("completed", progress != null && Boolean.TRUE.equals(progress.getCompleted()));
        result.put("bestScore", progress != null ? progress.getBestScore() : accuracy);

        return result;
    }

    /**
     * Fetch or generate (ONCE via DeepSeek AI) 30 Grammar Multiple-Choice Questions for a lesson.
     */
    @Transactional
    public List<Map<String, Object>> getOrGenerateGrammarQuiz(int chapter, int lesson) {
        Optional<JlptN3GrammarQuiz> existingOpt = jlptN3DataProvider.findQuiz(chapter, lesson);
        if (existingOpt.isPresent() && existingOpt.get().getQuestionsJson() != null && !existingOpt.get().getQuestionsJson().isBlank()) {
            try {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> cachedList = objectMapper.readValue(existingOpt.get().getQuestionsJson(), List.class);
                if (cachedList != null && cachedList.size() >= 30) {
                    boolean hasStar = cachedList.stream().anyMatch(q -> "star".equalsIgnoreCase(String.valueOf(q.get("type"))) || String.valueOf(q.get("question")).contains("★"));
                    if (hasStar) {
                        return cachedList;
                    }
                }
            } catch (Exception e) {
                log.error("Failed to parse cached grammar quiz questions for chapter {} lesson {}: {}", chapter, lesson, e.getMessage());
            }
        }

        // Generate 30 questions via DeepSeek AI if not cached
        Map<String, Object> lessonData = getLessonData(chapter, lesson);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> grammarList = (List<Map<String, Object>>) lessonData.getOrDefault("ngu_phap", Collections.emptyList());

        String generatedJson = enrichmentService.generateGrammarQuiz30Questions(chapter, lesson, grammarList);
        if (generatedJson != null && !generatedJson.equals("[]")) {
            JlptN3GrammarQuiz quiz = existingOpt.orElseGet(() -> new JlptN3GrammarQuiz(chapter, lesson, generatedJson));
            quiz.setQuestionsJson(generatedJson);
            jlptN3DataProvider.saveQuiz(quiz);

            try {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> questionsList = objectMapper.readValue(generatedJson, List.class);
                return questionsList;
            } catch (Exception e) {
                log.error("Error reading generated quiz JSON: {}", e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    /**
     * Regenerate 30 Grammar Quiz Questions for a lesson.
     */
    @Transactional
    public List<Map<String, Object>> regenerateGrammarQuiz(int chapter, int lesson) {
        Map<String, Object> lessonData = getLessonData(chapter, lesson);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> grammarList = (List<Map<String, Object>>) lessonData.getOrDefault("ngu_phap", Collections.emptyList());

        String generatedJson = enrichmentService.generateGrammarQuiz30Questions(chapter, lesson, grammarList);
        if (generatedJson != null && !generatedJson.equals("[]")) {
            JlptN3GrammarQuiz quiz = new JlptN3GrammarQuiz(chapter, lesson, generatedJson);
            jlptN3DataProvider.saveQuiz(quiz);

            try {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> questionsList = objectMapper.readValue(generatedJson, List.class);
                return questionsList;
            } catch (Exception e) {
                log.error("Error reading generated quiz JSON: {}", e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    /**
     * Get the official 20-Question Comprehensive Lesson Quiz directly from MongoDB database.
     */
    public List<Map<String, Object>> getLessonQuiz(int chapter, int lesson) {
        Optional<com.flashcard.knowledge.model.JlptN3LessonQuiz> quizOpt = jlptN3DataProvider.findLessonQuiz(chapter, lesson);
        if (quizOpt.isPresent() && quizOpt.get().getQuestionsJson() != null && !quizOpt.get().getQuestionsJson().isBlank()) {
            try {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> list = objectMapper.readValue(quizOpt.get().getQuestionsJson(), List.class);
                return list;
            } catch (Exception e) {
                log.error("Failed to parse lesson quiz questions from DB for chapter {} lesson {}: {}", chapter, lesson, e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    /**
     * Submit Comprehensive 20-Question Lesson Quiz.
     * Rule: Pass if and only if score == total (100% correct).
     */
    @Transactional
    @CacheEvict(value = "jlpt-overview", allEntries = true)
    public Map<String, Object> submitLessonQuiz(Long userId, int chapter, int lesson, int score, int total) {
        if (total <= 0) {
            throw new IllegalArgumentException("Tổng số câu hỏi phải lớn hơn 0");
        }

        int accuracy = Math.round((float) score * 100 / total);
        boolean passed = (score == total || accuracy == 100);

        JlptN3Progress progress = null;
        if (userId != null) {
            progress = jlptN3DataProvider.findProgress(userId, chapter, lesson)
                    .orElseGet(() -> new JlptN3Progress(userId, chapter, lesson, false, 0));

            if (accuracy > progress.getBestScore()) {
                progress.setBestScore(accuracy);
            }

            if (passed) {
                progress.setQuizPassed(true);
            }

            // Check if all 4 components (vocab, kanji, grammar, quiz) or completed
            if (Boolean.TRUE.equals(progress.getVocabPassed())
                    && Boolean.TRUE.equals(progress.getKanjiPassed())
                    && Boolean.TRUE.equals(progress.getGrammarPassed())
                    && Boolean.TRUE.equals(progress.getQuizPassed())) {
                progress.setCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
            }

            jlptN3DataProvider.saveProgress(progress);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("chapterId", chapter);
        result.put("lessonId", lesson);
        result.put("score", score);
        result.put("total", total);
        result.put("accuracy", accuracy);
        result.put("passed", passed);
        result.put("quizPassed", progress != null && Boolean.TRUE.equals(progress.getQuizPassed()));
        result.put("vocabPassed", progress != null && Boolean.TRUE.equals(progress.getVocabPassed()));
        result.put("kanjiPassed", progress != null && Boolean.TRUE.equals(progress.getKanjiPassed()));
        result.put("grammarPassed", progress != null && Boolean.TRUE.equals(progress.getGrammarPassed()));
        result.put("completed", progress != null && Boolean.TRUE.equals(progress.getCompleted()));
        result.put("bestScore", progress != null ? progress.getBestScore() : accuracy);

        return result;
    }
}
