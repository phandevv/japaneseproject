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
                boolean readingPassed = progress != null && Boolean.TRUE.equals(progress.getReadingPassed());
                int bestScore = progress != null ? progress.getBestScore() : 0;
                int readingScore = progress != null ? progress.getReadingScore() : 0;

                lessonData.put("completed", isCompleted);
                lessonData.put("vocabPassed", vocabPassed);
                lessonData.put("kanjiPassed", kanjiPassed);
                lessonData.put("grammarPassed", grammarPassed);
                lessonData.put("quizPassed", quizPassed);
                lessonData.put("readingPassed", readingPassed);
                lessonData.put("readingScore", readingScore);
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
                item.put("category", v.getCategory());
                item.put("level", v.getLevel() != null ? v.getLevel() : "N3");
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
                kItem.put("category", k.getCategory());
                kItem.put("level", k.getLevel() != null ? k.getLevel() : "N3");
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
            Set<String> seenGrammarKeys = new HashSet<>();
            for (GrammarCard g : dbGrammars) {
                String struc = g.getGrammar();
                if (struc == null || struc.isBlank()) continue;
                String normKey = struc.replaceAll("[〜~\\.\\…\\s\\-\\+]", "")
                                      .replaceAll("（", "(").replaceAll("）", ")")
                                      .replaceAll("／", "/")
                                      .toLowerCase();
                if (!seenGrammarKeys.add(normKey)) {
                    // Skip exact duplicate grammar card imported multiple times
                    continue;
                }

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
        boolean readingPassed = false;
        boolean completed = false;
        int bestScore = 0;
        int readingScore = 0;

        if (userId != null && jlptN3DataProvider != null) {
            Optional<JlptN3Progress> progOpt = jlptN3DataProvider.findProgress(userId, chapter, lesson);
            if (progOpt.isPresent()) {
                JlptN3Progress p = progOpt.get();
                vocabPassed = Boolean.TRUE.equals(p.getVocabPassed());
                kanjiPassed = Boolean.TRUE.equals(p.getKanjiPassed());
                grammarPassed = Boolean.TRUE.equals(p.getGrammarPassed());
                quizPassed = Boolean.TRUE.equals(p.getQuizPassed());
                readingPassed = Boolean.TRUE.equals(p.getReadingPassed());
                completed = Boolean.TRUE.equals(p.getCompleted());
                bestScore = p.getBestScore() != null ? p.getBestScore() : 0;
                readingScore = p.getReadingScore() != null ? p.getReadingScore() : 0;
            }
        }

        target.put("vocabPassed", vocabPassed);
        target.put("kanjiPassed", kanjiPassed);
        target.put("grammarPassed", grammarPassed);
        target.put("quizPassed", quizPassed);
        target.put("readingPassed", readingPassed);
        target.put("readingScore", readingScore);
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

        log.info("📥 [UPLOAD JSON] Bắt đầu nạp {} tệp JSON tải lên...", files.length);
        int fileIdx = 0;
        for (MultipartFile file : files) {
            fileIdx++;
            if (file.isEmpty()) continue;

            String originalName = file.getOriginalFilename();
            log.info("⏳ [UPLOAD JSON] Đang nạp tệp [{}/{}] '{}'...", fileIdx, files.length, originalName);
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

                // 4. Parse Grammar (ngu_phap) with Upsert & Overwrite to prevent duplication
                if (root.has("ngu_phap") && root.get("ngu_phap").isArray()) {
                    String weekName = "Chương " + chuong;
                    String dayName = "Bài " + bai;
                    List<GrammarCard> existingWeekGrammars = knowledgeDataProvider.findGrammarByJlptAndWeekAndDay("N3", weekName, dayName);
                    if (existingWeekGrammars == null || existingWeekGrammars.isEmpty()) {
                        existingWeekGrammars = knowledgeDataProvider.findAllGrammar().stream()
                                .filter(g -> "N3".equalsIgnoreCase(g.getJlpt()) &&
                                             g.getWeekName() != null && g.getWeekName().contains(weekName) &&
                                             g.getDayName() != null && g.getDayName().contains(dayName))
                                .collect(Collectors.toList());
                    }
                    Map<String, GrammarCard> existingMap = new HashMap<>();
                    if (existingWeekGrammars != null) {
                        for (GrammarCard eg : existingWeekGrammars) {
                            if (eg.getGrammar() != null) {
                                existingMap.put(eg.getGrammar().trim().toLowerCase(), eg);
                            }
                        }
                    }

                    Set<Long> retainedIds = new HashSet<>();

                    for (JsonNode gNode : root.get("ngu_phap")) {
                        String cauTruc = gNode.path("cau_truc").asText("").trim();
                        if (cauTruc.isEmpty()) continue;

                        String yNghia = gNode.path("y_nghia").asText("").trim();
                        String cachChia = gNode.path("cach_chia").asText("").trim();

                        List<String> viDuList = new ArrayList<>();
                        if (gNode.has("vi_du") && gNode.get("vi_du").isArray()) {
                            for (JsonNode vd : gNode.get("vi_du")) {
                                if (vd.isTextual()) {
                                    viDuList.add(vd.asText());
                                } else {
                                    viDuList.add(vd.toString());
                                }
                            }
                        }

                        GrammarCard g = existingMap.get(cauTruc.toLowerCase());
                        if (g == null) {
                            g = new GrammarCard();
                        } else {
                            retainedIds.add(g.getId());
                        }

                        g.setGrammar(cauTruc);
                        g.setMeaning(yNghia);
                        g.setFormation(cachChia);
                        g.setJlpt("N3");
                        g.setWeekName(weekName);
                        g.setDayName(dayName);
                        g.setLessonTitle("Bài " + bai + " (Tổng ôn N3)");

                        if (!viDuList.isEmpty()) {
                            try {
                                g.setExamples(objectMapper.writeValueAsString(viDuList));
                            } catch (Exception ignored) {}
                        }

                        toSaveGrammars.add(g);
                        fileGrammar++;
                    }

                    // Remove obsolete grammar cards for this lesson that are no longer in uploaded JSON
                    if (existingWeekGrammars != null) {
                        List<GrammarCard> toDelete = existingWeekGrammars.stream()
                                .filter(eg -> eg.getId() != null && !retainedIds.contains(eg.getId()))
                                .collect(Collectors.toList());
                        if (!toDelete.isEmpty()) {
                            knowledgeDataProvider.deleteAllGrammar(toDelete);
                        }
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
                log.info("✅ [UPLOAD JSON] Nạp thành công [{}/{}]: Chương {} Bài {} ({} từ, {} kanji, {} ngữ pháp)",
                    fileIdx, files.length, chuong, bai, fileVocab, fileKanji, fileGrammar);
            } catch (Exception e) {
                log.error("❌ [UPLOAD JSON] Lỗi khi nạp [{}/{}] {}: {}", fileIdx, files.length, originalName, e.getMessage(), e);
                details.add("Lỗi khi đọc " + originalName + ": " + e.getMessage());
            }
        }

        clearLessonCache();
        log.info("🏁 [UPLOAD JSON] Hoàn tất nạp {} tệp! Tổng cộng: {} từ vựng, {} kanji, {} ngữ pháp.", processedFilesCount, importedVocab, importedKanji, importedGrammar);

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
                    && Boolean.TRUE.equals(progress.getGrammarPassed())
                    && Boolean.TRUE.equals(progress.getQuizPassed())
                    && Boolean.TRUE.equals(progress.getReadingPassed())) {
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

            // Check if all 5 components (vocab, kanji, grammar, quiz, reading) are completed
            if (Boolean.TRUE.equals(progress.getVocabPassed())
                    && Boolean.TRUE.equals(progress.getKanjiPassed())
                    && Boolean.TRUE.equals(progress.getGrammarPassed())
                    && Boolean.TRUE.equals(progress.getQuizPassed())
                    && Boolean.TRUE.equals(progress.getReadingPassed())) {
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

    /**
     * Get Reading Comprehension for Chapter and Lesson from Provider (MongoDB or JPA).
     */
    public Map<String, Object> getReadingComprehension(int chapter, int lesson) {
        Optional<com.flashcard.knowledge.model.JlptN3Reading> readingOpt = jlptN3DataProvider.findReading(chapter, lesson);
        if (readingOpt.isEmpty()) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("exists", false);
            empty.put("chapterId", chapter);
            empty.put("lessonId", lesson);
            return empty;
        }

        com.flashcard.knowledge.model.JlptN3Reading reading = readingOpt.get();
        Map<String, Object> res = new HashMap<>();
        res.put("exists", true);
        res.put("id", reading.getId());
        res.put("chapterId", reading.getChapterId());
        res.put("lessonId", reading.getLessonId());
        res.put("title", reading.getTitle());
        res.put("passage", reading.getPassage());
        res.put("translation", reading.getTranslation());
        res.put("updatedAt", reading.getUpdatedAt());

        try {
            if (reading.getQuestionsJson() != null && !reading.getQuestionsJson().isBlank()) {
                res.put("questions", objectMapper.readValue(reading.getQuestionsJson(), Object.class));
            } else {
                res.put("questions", Collections.emptyList());
            }
        } catch (Exception e) {
            log.error("Failed to parse reading questions JSON for chapter {} lesson {}: {}", chapter, lesson, e.getMessage());
            res.put("questions", Collections.emptyList());
        }

        // Attach vocabulary & grammar coverage analysis
        try {
            Map<String, Object> lessonData = getLessonData(chapter, lesson);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> vocabList = (List<Map<String, Object>>) lessonData.getOrDefault("tu_vung", Collections.emptyList());
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> grammarList = (List<Map<String, Object>>) lessonData.getOrDefault("ngu_phap", Collections.emptyList());
            res.put("coverage", calculateReadingCoverage(reading.getPassage(), vocabList, grammarList));
        } catch (Exception e) {
            log.warn("Failed to calculate reading coverage for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
        }

        return res;
    }

    /**
     * Calculate vocabulary and grammar coverage percentage for a reading passage.
     */
    public Map<String, Object> calculateReadingCoverage(String passage,
                                                         List<Map<String, Object>> vocabList,
                                                         List<Map<String, Object>> grammarList) {
        Map<String, Object> result = new HashMap<>();
        if (passage == null) passage = "";
        String cleanPassage = passage.replaceAll("\\[([^\\|\\]]+)\\|[^\\]]+\\]", "$1");

        // 1. Analyze Grammar Coverage (Target: 100%)
        int totalGrammar = grammarList != null ? grammarList.size() : 0;
        List<String> matchedGrammars = new ArrayList<>();
        List<String> missingGrammars = new ArrayList<>();

        if (grammarList != null) {
            for (Map<String, Object> g : grammarList) {
                String struc = String.valueOf(g.getOrDefault("cau_truc", "")).trim();
                if (struc.isBlank()) continue;

                boolean matched = isGrammarPatternMatched(cleanPassage, passage, struc);

                if (matched) {
                    matchedGrammars.add(struc);
                } else {
                    missingGrammars.add(struc);
                }
            }
        }

        int matchedGrammarCount = matchedGrammars.size();
        double grammarCoveragePercent = totalGrammar > 0 ? Math.round(((double) matchedGrammarCount / totalGrammar) * 1000.0) / 10.0 : 100.0;

        // 2. Analyze Vocabulary Coverage (Target: > 50%)
        int totalVocab = vocabList != null ? vocabList.size() : 0;
        int minVocabRequired = totalVocab > 0 ? (int) Math.floor(totalVocab * 0.5) + 1 : 0;
        List<Map<String, String>> matchedVocabs = new ArrayList<>();
        List<Map<String, String>> missingVocabs = new ArrayList<>();

        if (vocabList != null) {
            for (Map<String, Object> v : vocabList) {
                String word = String.valueOf(v.getOrDefault("tu", v.getOrDefault("kanji", ""))).trim();
                String reading = String.valueOf(v.getOrDefault("furigana", v.getOrDefault("hiragana", ""))).trim();
                String meaning = String.valueOf(v.getOrDefault("nghia", v.getOrDefault("meaning", ""))).trim();
                if (word.isBlank() && reading.isBlank()) continue;

                // Clean syllabus notation like "~中 (ちゅう)" -> "中"
                String cleanWord = word.replaceAll("[\\(（][^\\)）]*[\\)）]", "")
                                       .replaceAll("[〜~\\-\\s]", "")
                                       .trim();
                String cleanReading = reading.replaceAll("[\\(（][^\\)）]*[\\)）]", "")
                                             .replaceAll("[〜~\\-\\s]", "")
                                             .trim();

                boolean matched = false;
                if (!cleanWord.isBlank() && (cleanPassage.contains(cleanWord) || passage.contains(cleanWord))) {
                    matched = true;
                } else if (!cleanReading.isBlank() && (cleanPassage.contains(cleanReading) || passage.contains(cleanReading))) {
                    matched = true;
                } else if (!cleanWord.isBlank() && cleanWord.length() >= 2) {
                    // Check verb/adjective stem for conjugated forms e.g. 倒す -> 倒, 積む -> 積, 切れる -> 切れ
                    String stem = cleanWord.substring(0, cleanWord.length() - 1);
                    if (stem.length() >= 1 && (cleanPassage.contains(stem) || passage.contains(stem))) {
                        matched = true;
                    }
                }

                Map<String, String> item = new HashMap<>();
                item.put("word", !word.isBlank() ? word : reading);
                item.put("reading", reading);
                item.put("meaning", meaning);

                if (matched) {
                    matchedVocabs.add(item);
                } else {
                    missingVocabs.add(item);
                }
            }
        }

        int matchedVocabCount = matchedVocabs.size();
        double vocabCoveragePercent = totalVocab > 0 ? Math.round(((double) matchedVocabCount / totalVocab) * 1000.0) / 10.0 : 100.0;
        boolean passedCriteria = (grammarCoveragePercent >= 100.0 && (totalVocab == 0 || matchedVocabCount >= minVocabRequired));

        result.put("totalGrammar", totalGrammar);
        result.put("matchedGrammarCount", matchedGrammarCount);
        result.put("grammarCoveragePercent", grammarCoveragePercent);
        result.put("matchedGrammars", matchedGrammars);
        result.put("missingGrammars", missingGrammars);

        result.put("totalVocab", totalVocab);
        result.put("minVocabRequired", minVocabRequired);
        result.put("matchedVocabCount", matchedVocabCount);
        result.put("vocabCoveragePercent", vocabCoveragePercent);
        result.put("matchedVocabs", matchedVocabs);
        result.put("missingVocabs", missingVocabs);

        result.put("passedCriteria", passedCriteria);
        return result;
    }

    /**
     * Check if a JLPT grammar pattern matches in the reading passage.
     * Supports multi-part patterns, conjugations, polite/past forms, and optional parentheses.
     */
    public boolean isGrammarPatternMatched(String cleanPassage, String passage, String struc) {
        if (struc == null || struc.isBlank()) return false;
        if (cleanPassage == null) cleanPassage = "";
        if (passage == null) passage = "";

        // 1. Check multi-part / split patterns
        if (struc.contains("ば") && struc.contains("ほど")) {
            if (cleanPassage.matches("(?s).*ば.{1,50}ほど.*") || passage.matches("(?s).*ば.{1,50}ほど.*")) return true;
        }
        if (struc.contains("さえ") && struc.contains("ば")) {
            if (cleanPassage.matches("(?s).*さえ.{1,50}ば.*") || passage.matches("(?s).*さえ.{1,50}ば.*")) return true;
        }
        if (struc.contains("から") && struc.contains("にかけて")) {
            if (cleanPassage.matches("(?s).*から.{1,50}にかけて.*") || passage.matches("(?s).*から.{1,50}にかけて.*")) return true;
        }
        if (struc.contains("も") && struc.contains("ば") && struc.lastIndexOf("も") > struc.indexOf("ば")) {
            if (cleanPassage.matches("(?s).*も.{1,40}ば.{1,40}も.*") || passage.matches("(?s).*も.{1,40}ば.{1,40}も.*")) return true;
        }
        if (struc.contains("ほど") && (struc.contains("ない") || struc.contains("客観") || struc.contains("はない"))) {
            if (cleanPassage.matches("(?s).*ほど.{1,40}(ない|なかった|ません|客観|ず).*") || passage.matches("(?s).*ほど.{1,40}(ない|なかった|ません|客観|ず).*")) return true;
        }

        // 2. Normalize and split into alternative variants
        String normalizedStruc = struc.replaceAll("[\\(（][0-9０-９]+[\\)）]", ""); // remove (1), (2), （１）
        List<String> rawParts = new ArrayList<>();
        // If not a paired pattern and contains multiple ~ or 〜 e.g. 〜など〜なんか〜なんて
        if (normalizedStruc.replaceAll("[^〜~]", "").length() > 1 && !normalizedStruc.contains("ほど") && !normalizedStruc.contains("かけて") && !normalizedStruc.contains("ば")) {
            for (String sub : normalizedStruc.split("[〜~]")) {
                if (!sub.isBlank()) rawParts.add(sub);
            }
        } else {
            for (String sub : normalizedStruc.split("[/／,]")) {
                if (!sub.isBlank()) rawParts.add(sub);
            }
        }

        // 3. Expand optional parenthesized variations e.g. 上(に), わりに(は), をもとに(して), ぬき(で)
        List<String> candidateParts = new ArrayList<>();
        for (String raw : rawParts) {
            String trimmed = raw.trim();
            if (trimmed.isBlank()) continue;

            if (trimmed.matches(".*[\\(（][^0-9０-９\\)）]+[\\)）].*")) {
                // Variant 1: include the content inside parentheses e.g. 上(に) -> 上に
                String withParenContent = trimmed.replaceAll("[\\(（]([^\\)）]+)[\\)）]", "$1");
                candidateParts.add(withParenContent);
                // Variant 2: exclude the parentheses and content e.g. 上(に) -> 上
                String withoutParenContent = trimmed.replaceAll("[\\(（][^\\)）]+[\\)）]", "");
                candidateParts.add(withoutParenContent);
            } else {
                candidateParts.add(trimmed);
            }
        }

        // 4. Test each candidate part and its morphological conjugations
        for (String part : candidateParts) {
            String clean = part.replaceAll("[〜~\\.\\…\\s\\-\\+\\(\\)]", "").trim();
            if (clean.isBlank()) continue;

            // Strip leading POS tags e.g. Vたらどう -> たらどう, Vる+ところだ -> ところだ, N向け -> 向け
            clean = clean.replaceAll("^[VvNnA][るたたないて]?[\\+]?", "");
            // Strip trailing copula だ (e.g. ところだ -> ところ, わけだ -> わけ, べきだ -> べき, はずだ -> はず)
            clean = clean.replaceAll("だ$", "");

            // Generate search forms
            Set<String> searchForms = new LinkedHashSet<>();
            searchForms.add(clean);

            // Conjugation 1: ようにする -> ようにし
            if (clean.endsWith("ようにする")) {
                searchForms.add(clean.substring(0, clean.length() - 2) + "し");
            }
            // Conjugation 2: ようにしている -> ようにしてい
            if (clean.endsWith("ようにしている")) {
                searchForms.add(clean.substring(0, clean.length() - 1));
            }
            // Conjugation 3: ようとする -> ようとし
            if (clean.endsWith("ようとする")) {
                searchForms.add(clean.substring(0, clean.length() - 2) + "し");
            }
            // Conjugation 4: ようとしない -> ようとしな, ようとしませ
            if (clean.endsWith("ようとしない")) {
                searchForms.add(clean.substring(0, clean.length() - 1));
                searchForms.add(clean.substring(0, clean.length() - 2) + "ませ");
            }
            // Conjugation 5: わけにはいかない -> わけにはいか, わけにはいき, わけにもいか, わけにもいき
            if (clean.contains("わけにはいかない")) {
                searchForms.add("わけにはいか");
                searchForms.add("わけにはいき");
                searchForms.add("わけにもいか");
                searchForms.add("わけにもいき");
            }
            // Conjugation 6: ざるを得ない -> ざるを得
            if (clean.contains("ざるを得ない")) {
                searchForms.add("ざるを得");
            }
            // Conjugation 7: に違いない / にちがいない -> に違い, にちがい
            if (clean.endsWith("に違いない")) {
                searchForms.add("に違い");
            }
            if (clean.endsWith("にちがいない")) {
                searchForms.add("にちがい");
            }
            // Conjugation 8: に決まっている -> に決まって
            if (clean.endsWith("に決まっている")) {
                searchForms.add("に決まって");
            }
            // Conjugation 9: に相違ない -> に相違
            if (clean.endsWith("に相違ない")) {
                searchForms.add("に相違");
            }
            // Conjugation 10: 恐れがある / おそれがある -> 恐れがあ, おそれがあ
            if (clean.endsWith("恐れがある")) {
                searchForms.add("恐れがあ");
            }
            if (clean.endsWith("おそれがある")) {
                searchForms.add("おそれがあ");
            }
            // Conjugation 11: かねない / かねる -> かね
            if (clean.endsWith("かねない") || clean.endsWith("かねる")) {
                searchForms.add("かね");
            }
            // Conjugation 12: たばかり -> ばかり
            if (clean.startsWith("たばかり")) {
                searchForms.add("ばかり");
            }
            // Conjugation 13: た途端 / たとたん -> 途端, とたん
            if (clean.contains("途端")) {
                searchForms.add("途端");
            }
            if (clean.contains("とたん")) {
                searchForms.add("とたん");
            }
            // Conjugation 14: Verbs ending in ている -> てい (catches ています, ていた)
            if (clean.endsWith("ている") && clean.length() >= 4) {
                searchForms.add(clean.substring(0, clean.length() - 1));
            }
            // Conjugation 15: Verbs ending in する -> し (catches して, した, します)
            if (clean.endsWith("する") && clean.length() >= 3) {
                searchForms.add(clean.substring(0, clean.length() - 2) + "し");
            }
            // Conjugation 16: Patterns starting with を e.g. を中心 -> 中心, 中心に, 中心の, 中心として
            if (clean.startsWith("を") && clean.length() >= 3) {
                String core = clean.substring(1);
                searchForms.add(core + "の");
                searchForms.add(core + "に");
                searchForms.add(core + "として");
                searchForms.add(core + "にして");
            }

            // Test all search forms in passage
            for (String form : searchForms) {
                if (form.length() >= 2) {
                    if (cleanPassage.contains(form) || passage.contains(form)) {
                        return true;
                    }
                } else if (form.length() == 1) {
                    if (cleanPassage.contains(form) || passage.contains(form)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * 2-Step Pipeline: Generate Reading Comprehension for Chapter and Lesson via DeepSeek AI.
     */
    public Map<String, Object> generateReadingComprehension(int chapter, int lesson) {
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("🚀 [NẠP ĐỌC HIỂU AI] Bắt đầu quy trình nạp cho Chương {} Bài {}", chapter, lesson);
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        long startTotal = System.currentTimeMillis();

        Map<String, Object> lessonData = getLessonData(chapter, lesson);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> vocabList = (List<Map<String, Object>>) lessonData.getOrDefault("tu_vung", Collections.emptyList());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> grammarList = (List<Map<String, Object>>) lessonData.getOrDefault("ngu_phap", Collections.emptyList());

        // Step 1: Generate passage with furigana [Kanji|hiragana]
        log.info("▶️ [Bước 1/3] Đang gọi DeepSeek AI sinh bài văn đọc hiểu (Dữ liệu đầu vào: {} từ vựng, {} ngữ pháp)...", vocabList.size(), grammarList.size());
        long startP = System.currentTimeMillis();
        Map<String, String> passageResult = enrichmentService.generateN3ReadingPassage(chapter, lesson, vocabList, grammarList);
        String title = passageResult.getOrDefault("title", "Bài đọc hiểu N3");
        String passage = passageResult.getOrDefault("passage", "");
        String translation = passageResult.getOrDefault("translation", "");
        if (passage == null || passage.trim().isEmpty()) {
            throw new IllegalStateException("Không nhận được nội dung bài đọc từ AI cho Chương " + chapter + " Bài " + lesson);
        }
        log.info("✅ [Bước 1/3] Hoàn thành sinh bài văn trong {}s! Tiêu đề: '{}' (Độ dài: {} ký tự).", 
            (System.currentTimeMillis() - startP) / 1000.0, title, passage.length());

        // Verify grammar coverage and automatically repair if any patterns are missing
        Map<String, Object> initialCoverage = calculateReadingCoverage(passage, vocabList, grammarList);
        @SuppressWarnings("unchecked")
        List<String> missingGrammars = (List<String>) initialCoverage.getOrDefault("missingGrammars", Collections.emptyList());
        if (!missingGrammars.isEmpty()) {
            log.warn("⚠️ [TỰ ĐỘNG BỔ SUNG NGỮ PHÁP] Bài đọc ban đầu còn thiếu {}/{} mẫu: {}. Đang kích hoạt sửa đổi AI...",
                missingGrammars.size(), grammarList.size(), missingGrammars);
            Map<String, String> repaired = enrichmentService.repairMissingGrammars(
                chapter, lesson, title, passage, translation, missingGrammars, grammarList);
            if (repaired != null && repaired.get("passage") != null && !repaired.get("passage").isBlank()) {
                passage = repaired.get("passage");
                if (repaired.containsKey("title") && !repaired.get("title").isBlank()) {
                    title = repaired.get("title");
                }
                if (repaired.containsKey("translation") && !repaired.get("translation").isBlank()) {
                    translation = repaired.get("translation");
                }
                log.info("✅ [TỰ ĐỘNG BỔ SUNG NGỮ PHÁP] Đã sửa đổi bài văn thành công! Tiêu đề: '{}' (Độ dài: {} ký tự).",
                    title, passage.length());
            }
        }

        // Step 2: Generate 10 reading questions
        log.info("▶️ [Bước 2/3] Đang gọi DeepSeek AI sinh 10 câu hỏi trắc nghiệm đọc hiểu...");
        long startQ = System.currentTimeMillis();
        String questionsJson = enrichmentService.generateN3ReadingQuestions(chapter, lesson, passage, grammarList);
        if (questionsJson == null || questionsJson.trim().isEmpty() || "[]".equals(questionsJson.trim())) {
            throw new IllegalStateException("Không nhận được câu hỏi đọc hiểu từ AI cho Chương " + chapter + " Bài " + lesson);
        }
        log.info("✅ [Bước 2/3] Hoàn thành sinh 10 câu hỏi trắc nghiệm đọc hiểu trong {}s!", 
            (System.currentTimeMillis() - startQ) / 1000.0);

        // Step 3: Save to DataProvider (MongoDB / JPA)
        log.info("▶️ [Bước 3/3] Đang lưu bài đọc hiểu và 10 câu hỏi vào CSDL (MongoDB / JPA)...");
        Optional<com.flashcard.knowledge.model.JlptN3Reading> existingOpt = jlptN3DataProvider.findReading(chapter, lesson);
        com.flashcard.knowledge.model.JlptN3Reading reading = existingOpt.orElseGet(com.flashcard.knowledge.model.JlptN3Reading::new);
        reading.setChapterId(chapter);
        reading.setLessonId(lesson);
        reading.setTitle(title);
        reading.setPassage(passage);
        reading.setTranslation(translation);
        reading.setQuestionsJson(questionsJson);
        reading.setUpdatedAt(LocalDateTime.now());

        jlptN3DataProvider.saveReading(reading);
        log.info("💾 [Bước 3/3] Đã lưu bản ghi đọc hiểu ID={} cho Chương {} Bài {} vào CSDL!", reading.getId(), chapter, lesson);

        Map<String, Object> finalResult = getReadingComprehension(chapter, lesson);
        @SuppressWarnings("unchecked")
        Map<String, Object> coverage = (Map<String, Object>) finalResult.get("coverage");
        Object grammarPct = coverage != null ? coverage.get("grammarCoveragePercent") : "N/A";
        Object vocabPct = coverage != null ? coverage.get("vocabCoveragePercent") : "N/A";

        log.info("🎉 [HOÀN TẤT NẠP AI] Chương {} Bài {} nạp thành công trong {}s! Độ phủ: Ngữ pháp {}%, Từ vựng {}%",
            chapter, lesson, (System.currentTimeMillis() - startTotal) / 1000.0, grammarPct, vocabPct);
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        return finalResult;
    }

    /**
     * Update Reading Comprehension manually (Admin Edit feature).
     */
    @Transactional
    public Map<String, Object> updateReadingComprehension(int chapter, int lesson, Map<String, Object> updateDto) {
        Optional<com.flashcard.knowledge.model.JlptN3Reading> existingOpt = jlptN3DataProvider.findReading(chapter, lesson);
        com.flashcard.knowledge.model.JlptN3Reading reading = existingOpt.orElseGet(com.flashcard.knowledge.model.JlptN3Reading::new);
        reading.setChapterId(chapter);
        reading.setLessonId(lesson);

        if (updateDto.containsKey("title")) {
            reading.setTitle(String.valueOf(updateDto.get("title")));
        }
        if (updateDto.containsKey("passage")) {
            reading.setPassage(String.valueOf(updateDto.get("passage")));
        }
        if (updateDto.containsKey("translation")) {
            reading.setTranslation(String.valueOf(updateDto.get("translation")));
        }
        if (updateDto.containsKey("questions")) {
            try {
                reading.setQuestionsJson(objectMapper.writeValueAsString(updateDto.get("questions")));
            } catch (Exception e) {
                log.error("Failed to serialize updated questions: {}", e.getMessage());
            }
        } else if (updateDto.containsKey("questionsJson")) {
            reading.setQuestionsJson(String.valueOf(updateDto.get("questionsJson")));
        }
        reading.setUpdatedAt(LocalDateTime.now());

        jlptN3DataProvider.saveReading(reading);
        return getReadingComprehension(chapter, lesson);
    }

    /**
     * Submit Reading Comprehension Quiz Score (10 Questions).
     * Rule: Pass if score >= 8 (accuracy >= 80%).
     */
    @Transactional
    @CacheEvict(value = "jlpt-overview", allEntries = true)
    public Map<String, Object> submitReadingQuiz(Long userId, int chapter, int lesson, int score, int total) {
        if (total <= 0) {
            throw new IllegalArgumentException("Tổng số câu hỏi phải lớn hơn 0");
        }

        int accuracy = Math.round((float) score * 100 / total);
        boolean passed = (score >= 8 || accuracy >= 80);

        JlptN3Progress progress = null;
        if (userId != null) {
            progress = jlptN3DataProvider.findProgress(userId, chapter, lesson)
                    .orElseGet(() -> new JlptN3Progress(userId, chapter, lesson, false, 0));

            if (score > progress.getReadingScore()) {
                progress.setReadingScore(score);
            }

            if (passed) {
                progress.setReadingPassed(true);
            }

            // Check if all 5 components (vocab, kanji, grammar, quiz, reading) are completed
            if (Boolean.TRUE.equals(progress.getVocabPassed())
                    && Boolean.TRUE.equals(progress.getKanjiPassed())
                    && Boolean.TRUE.equals(progress.getGrammarPassed())
                    && Boolean.TRUE.equals(progress.getQuizPassed())
                    && Boolean.TRUE.equals(progress.getReadingPassed())) {
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
        result.put("readingPassed", progress != null && Boolean.TRUE.equals(progress.getReadingPassed()));
        result.put("readingScore", progress != null ? progress.getReadingScore() : score);
        result.put("completed", progress != null && Boolean.TRUE.equals(progress.getCompleted()));
        return result;
    }
}
