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
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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

    public void clearLessonCache() {
        lessonDataCache.clear();
    }

    @jakarta.annotation.PostConstruct
    public void warmupLessonCache() {
        // Asynchronously pre-populate in-memory cache for all lessons in the background
        CompletableFuture.runAsync(() -> {
            log.info("Starting background cache warmup for JLPT N3 lessons...");
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

    /**
     * Resolve the JSON file location from filesystem if available.
     */
    private File getLessonJsonFile(int chapter, int lesson) {
        String[] candidateFileNames = {
            String.format("Chuong%d_Bai%d_Data_v2.json", chapter, lesson),
            String.format("Chuong%d_Bai%d_Data_2.json", chapter, lesson),
            String.format("Chuong%d_Bai%d_Data.json", chapter, lesson)
        };
        String chapterDirName = String.format("Chuong %d", chapter);

        String[] candidateBaseDirs = {
            "data/tổng ôn N3/data",
            "data/tong on N3/data",
            "../data/tổng ôn N3/data"
        };

        for (String baseDir : candidateBaseDirs) {
            for (String fileName : candidateFileNames) {
                Path path = Paths.get(baseDir, chapterDirName, fileName);
                File file = path.toFile();
                if (file.exists() && file.isFile()) {
                    return file;
                }
            }
        }
        return null;
    }

    private boolean isResourceAvailable(int chapter, int lesson) {
        String resourcePath = String.format("data/n3/Chuong %d/Chuong%d_Bai%d_Data.json", chapter, chapter, lesson);
        ClassPathResource res = new ClassPathResource(resourcePath);
        return res.exists();
    }

    private File getUploadedFile(int chapter, int lesson) {
        Path path = Paths.get("uploads", "n3", "Chuong_" + chapter, "Bai_" + lesson + ".json");
        File file = path.toFile();
        if (file.exists() && file.isFile()) {
            return file;
        }
        return null;
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
        if (getUploadedFile(chapter, lesson) != null) return true;
        if (getLessonJsonFile(chapter, lesson) != null) return true;
        return isResourceAvailable(chapter, lesson);
    }

    /**
     * Get Course Overview of 9 Chapters and 27 Lessons, including progress for the user.
     */
    public Map<String, Object> getCourseOverview(Long userId) {
        List<JlptN3Progress> userProgressList = userId != null ? jlptN3DataProvider.findProgressByUser(userId) : Collections.emptyList();
        Map<String, JlptN3Progress> progressMap = new HashMap<>();
        for (JlptN3Progress p : userProgressList) {
            String key = p.getChapterId() + "_" + p.getLessonId();
            progressMap.put(key, p);
        }

        // Cache lesson availability directly from Database
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
        } catch (Exception e) {
            log.warn("Failed to prefetch DB categories for overview: {}", e.getMessage());
        }

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
                int bestScore = progress != null ? progress.getBestScore() : 0;

                lessonData.put("completed", isCompleted);
                lessonData.put("vocabPassed", vocabPassed);
                lessonData.put("kanjiPassed", kanjiPassed);
                lessonData.put("grammarPassed", grammarPassed);
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
        String cacheKey = chapter + "_" + lesson;
        Map<String, Object> cached = lessonDataCache.get(cacheKey);
        if (cached != null) {
            return cached;
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
                item.put("nghia", v.getMeaning());
                item.put("meaning", v.getMeaning());
                item.put("loai_tu", v.getWordType() != null ? v.getWordType() : "N");
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
                kItem.put("am_on", k.getOnReading());
                kItem.put("onReading", k.getOnReading());
                kItem.put("am_kun", k.getKunReading());
                kItem.put("kunReading", k.getKunReading());
                kItem.put("nghia", k.getMeaning());
                kItem.put("meaning", k.getMeaning());
                kItem.put("mnemonic", k.getMnemonic());
                kItem.put("kanjiWords", k.getKanjiWords());
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
            return dbRes;
        }

        // Strategy 2: Fallback to filesystem / user-uploaded JSON file
        JsonNode root = null;
        File uploadedFile = getUploadedFile(chapter, lesson);
        if (uploadedFile != null) {
            try {
                root = objectMapper.readTree(uploadedFile);
            } catch (Exception e) {
                log.warn("Failed to read uploaded file for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
            }
        }

        if (root == null) {
            File jsonFile = getLessonJsonFile(chapter, lesson);
            if (jsonFile != null && jsonFile.exists()) {
                try {
                    root = objectMapper.readTree(jsonFile);
                } catch (Exception e) {
                    log.warn("Failed to read filesystem JSON file for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
                }
            }
        }

        if (root == null) {
            String resourcePath = String.format("data/n3/Chuong %d/Chuong%d_Bai%d_Data.json", chapter, chapter, lesson);
            try {
                ClassPathResource res = new ClassPathResource(resourcePath);
                if (res.exists()) {
                    try (InputStream is = res.getInputStream()) {
                        root = objectMapper.readTree(is);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to read Classpath resource {}: {}", resourcePath, e.getMessage());
            }
        }

        if (root == null) {
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

        @SuppressWarnings("unchecked")
        Map<String, Object> data = objectMapper.convertValue(root, Map.class);
        data.put("available", true);

        // BATCH PRE-FETCH: Fetch all existing vocabs, kanjis, and grammars in 3 single queries (eliminates N+1 DB calls)
        List<Vocabulary> existingVocabs = vocabularyDataProvider.findByCategory(vocabCategory);
        List<Vocabulary> existingKanjis = vocabularyDataProvider.findByCategory(kanjiCategory);
        List<GrammarCard> existingGrammars = knowledgeDataProvider.findGrammarByJlptAndWeekAndDay("N3", "Chương " + chapter, "Bài " + lesson);

        Map<String, Vocabulary> vocabMap = new HashMap<>();
        for (Vocabulary v : existingVocabs) {
            if (v.getKanji() != null && !v.getKanji().isBlank()) vocabMap.put(v.getKanji(), v);
            if (v.getHiragana() != null && !v.getHiragana().isBlank()) vocabMap.put(v.getHiragana(), v);
        }

        Map<String, Vocabulary> kanjiMap = new HashMap<>();
        for (Vocabulary k : existingKanjis) {
            if (k.getKanji() != null && !k.getKanji().isBlank()) kanjiMap.put(k.getKanji(), k);
            if (k.getHiragana() != null && !k.getHiragana().isBlank()) kanjiMap.put(k.getHiragana(), k);
        }

        Map<String, GrammarCard> grammarMap = new HashMap<>();
        for (GrammarCard g : existingGrammars) {
            if (g.getGrammar() != null && !g.getGrammar().isBlank()) {
                grammarMap.put(g.getGrammar().trim(), g);
            }
        }

        List<Vocabulary> toSaveVocabs = new ArrayList<>();
        List<Vocabulary> toSaveKanjis = new ArrayList<>();
        List<GrammarCard> toSaveGrammars = new ArrayList<>();

        // 1. Process tu_vung
        if (data.containsKey("tu_vung") && data.get("tu_vung") instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> vocabList = (List<Map<String, Object>>) data.get("tu_vung");
            for (Map<String, Object> vItem : vocabList) {
                String tu = vItem.containsKey("tu") ? String.valueOf(vItem.get("tu")).trim() : "";
                if (!tu.isEmpty()) {
                    Vocabulary v = vocabMap.get(tu);
                    if (v == null) {
                        v = new Vocabulary();
                        boolean isKanji = tu.codePoints().anyMatch(Character::isIdeographic);
                        v.setKanji(tu);
                        v.setHiragana(vItem.containsKey("furigana") ? String.valueOf(vItem.get("furigana")) : tu);
                        v.setMeaning(vItem.containsKey("nghia") ? String.valueOf(vItem.get("nghia")) : "");
                        String lType = vItem.containsKey("loai_tu") ? String.valueOf(vItem.get("loai_tu")) : "N";
                        v.setWordType(lType != null && !"KANJI".equalsIgnoreCase(lType) ? lType : "N");
                        v.setSampleSentence(vItem.containsKey("vi_du") ? String.valueOf(vItem.get("vi_du")) : "");
                        v.setLevel("N3_COURSE");
                        v.setCategory(vocabCategory);
                        toSaveVocabs.add(v);
                        vocabMap.put(tu, v);
                    }
                }
            }
            if (!toSaveVocabs.isEmpty()) {
                List<Vocabulary> saved = vocabularyDataProvider.saveAll(toSaveVocabs);
                for (Vocabulary sv : saved) {
                    if (sv.getKanji() != null) vocabMap.put(sv.getKanji(), sv);
                    if (sv.getHiragana() != null) vocabMap.put(sv.getHiragana(), sv);
                }
            }

            for (Map<String, Object> vItem : vocabList) {
                String tu = vItem.containsKey("tu") ? String.valueOf(vItem.get("tu")).trim() : "";
                Vocabulary v = vocabMap.get(tu);
                if (v != null) {
                    vItem.put("id", v.getId());
                    if (v.getKanji() != null) vItem.put("kanji", v.getKanji());
                    if (v.getHiragana() != null) vItem.put("hiragana", v.getHiragana());
                    if (v.getHanViet() != null) vItem.put("hanViet", v.getHanViet());
                    if (v.getPitchAccent() != null) vItem.put("pitchAccent", v.getPitchAccent());
                    if (v.getOnReading() != null) vItem.put("onReading", v.getOnReading());
                    if (v.getKunReading() != null) vItem.put("kunReading", v.getKunReading());
                    if (v.getMnemonic() != null) vItem.put("mnemonic", v.getMnemonic());
                    if (v.getSynonyms() != null) vItem.put("synonyms", v.getSynonyms());
                    if (v.getAntonyms() != null) vItem.put("antonyms", v.getAntonyms());
                    if (v.getExampleSentences() != null) vItem.put("exampleSentences", v.getExampleSentences());
                    if (v.getCollocations() != null) vItem.put("collocations", v.getCollocations());
                    if (v.getCommonMistakes() != null) vItem.put("commonMistakes", v.getCommonMistakes());
                    if (v.getConversationExamples() != null) vItem.put("conversationExamples", v.getConversationExamples());
                    if (v.getUsageGuide() != null) vItem.put("usageGuide", v.getUsageGuide());
                    if (v.getKanjiWords() != null) vItem.put("kanjiWords", v.getKanjiWords());

                    boolean isMissing = (v.getUsageGuide() == null || v.getUsageGuide().isBlank())
                        || (v.getMnemonic() == null || v.getMnemonic().isBlank())
                        || (v.getExampleSentences() == null || v.getExampleSentences().isBlank());
                    if (isMissing && aiEnrichmentQueueService != null && v.getId() != null) {
                        aiEnrichmentQueueService.enqueueVocabulary(v.getId(), false);
                    }
                }
            }
        }

        // 2. Process chu_han
        if (data.containsKey("chu_han") && data.get("chu_han") instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> kanjiList = (List<Map<String, Object>>) data.get("chu_han");
            for (Map<String, Object> kItem : kanjiList) {
                String kanji = kItem.containsKey("kanji") ? String.valueOf(kItem.get("kanji")).trim() : "";
                if (!kanji.isEmpty()) {
                    Vocabulary kVocab = kanjiMap.get(kanji);
                    if (kVocab == null) {
                        kVocab = new Vocabulary();
                        kVocab.setKanji(kanji);
                        kVocab.setHiragana(kanji);
                        kVocab.setMeaning(kItem.containsKey("nghia") ? String.valueOf(kItem.get("nghia")) : "");
                        kVocab.setHanViet(kItem.containsKey("han_viet") ? String.valueOf(kItem.get("han_viet")) : "");
                        kVocab.setWordType("KANJI");
                        kVocab.setLevel("N3_COURSE");
                        kVocab.setCategory(kanjiCategory);
                        toSaveKanjis.add(kVocab);
                        kanjiMap.put(kanji, kVocab);
                    }
                }
            }
            if (!toSaveKanjis.isEmpty()) {
                List<Vocabulary> savedK = vocabularyDataProvider.saveAll(toSaveKanjis);
                for (Vocabulary sk : savedK) {
                    if (sk.getKanji() != null) kanjiMap.put(sk.getKanji(), sk);
                }
            }

            for (Map<String, Object> kItem : kanjiList) {
                String kanji = kItem.containsKey("kanji") ? String.valueOf(kItem.get("kanji")).trim() : "";
                Vocabulary kVocab = kanjiMap.get(kanji);
                if (kVocab != null) {
                    kItem.put("id", kVocab.getId());
                    if (kVocab.getKanji() != null) kItem.put("kanji", kVocab.getKanji());
                    if (kVocab.getHiragana() != null) kItem.put("hiragana", kVocab.getHiragana());
                    if (kVocab.getHanViet() != null) kItem.put("hanViet", kVocab.getHanViet());
                    if (kVocab.getHanViet() != null) kItem.put("han_viet", kVocab.getHanViet());
                    if (kVocab.getRomaji() != null) kItem.put("am_doc", kVocab.getRomaji());
                    if (kVocab.getPitchAccent() != null) kItem.put("pitchAccent", kVocab.getPitchAccent());
                    if (kVocab.getOnReading() != null) kItem.put("onReading", kVocab.getOnReading());
                    if (kVocab.getKunReading() != null) kItem.put("kunReading", kVocab.getKunReading());
                    if (kVocab.getMnemonic() != null) kItem.put("mnemonic", kVocab.getMnemonic());
                    if (kVocab.getSynonyms() != null) kItem.put("synonyms", kVocab.getSynonyms());
                    if (kVocab.getAntonyms() != null) kItem.put("antonyms", kVocab.getAntonyms());
                    if (kVocab.getExampleSentences() != null) kItem.put("exampleSentences", kVocab.getExampleSentences());
                    if (kVocab.getCollocations() != null) kItem.put("collocations", kVocab.getCollocations());
                    if (kVocab.getCommonMistakes() != null) kItem.put("commonMistakes", kVocab.getCommonMistakes());
                    if (kVocab.getConversationExamples() != null) kItem.put("conversationExamples", kVocab.getConversationExamples());
                    if (kVocab.getUsageGuide() != null) kItem.put("usageGuide", kVocab.getUsageGuide());
                    if (kVocab.getKanjiWords() != null) kItem.put("kanjiWords", kVocab.getKanjiWords());

                    boolean isKanjiMissing = (kVocab.getUsageGuide() == null || kVocab.getUsageGuide().isBlank())
                        || (kVocab.getMnemonic() == null || kVocab.getMnemonic().isBlank())
                        || (kVocab.getExampleSentences() == null || kVocab.getExampleSentences().isBlank());
                    if (isKanjiMissing && aiEnrichmentQueueService != null && kVocab.getId() != null) {
                        aiEnrichmentQueueService.enqueueVocabulary(kVocab.getId(), false);
                    }
                }
            }
        }

        // 3. Process ngu_phap
        if (data.containsKey("ngu_phap") && data.get("ngu_phap") instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> grammarList = (List<Map<String, Object>>) data.get("ngu_phap");
            for (Map<String, Object> gItem : grammarList) {
                String cauTruc = gItem.containsKey("cau_truc") ? String.valueOf(gItem.get("cau_truc")).trim() : "";
                if (!cauTruc.isEmpty()) {
                    GrammarCard gCard = grammarMap.get(cauTruc);
                    if (gCard == null) {
                        gCard = new GrammarCard();
                        gCard.setGrammar(cauTruc);
                        gCard.setMeaning(gItem.containsKey("y_nghia") ? String.valueOf(gItem.get("y_nghia")) : "");
                        gCard.setFormation(gItem.containsKey("cach_chia") ? String.valueOf(gItem.get("cach_chia")) : "");
                        gCard.setJlpt("N3");
                        gCard.setWeekName("Chương " + chapter);
                        gCard.setDayName("Bài " + lesson);
                        if (gItem.containsKey("vi_du")) {
                            try {
                                gCard.setExamples(objectMapper.writeValueAsString(gItem.get("vi_du")));
                            } catch (Exception e) {}
                        }
                        toSaveGrammars.add(gCard);
                        grammarMap.put(cauTruc, gCard);
                    }
                }
            }
            if (!toSaveGrammars.isEmpty()) {
                List<GrammarCard> savedG = knowledgeDataProvider.saveAllGrammar(toSaveGrammars);
                for (GrammarCard sg : savedG) {
                    if (sg.getGrammar() != null) grammarMap.put(sg.getGrammar().trim(), sg);
                }
            }

            for (Map<String, Object> gItem : grammarList) {
                String cauTruc = gItem.containsKey("cau_truc") ? String.valueOf(gItem.get("cau_truc")).trim() : "";
                GrammarCard gCard = grammarMap.get(cauTruc);
                if (gCard != null) {
                    gItem.put("id", gCard.getId());
                    if (gCard.getFormation() != null) gItem.put("structure", gCard.getFormation());
                    if (gCard.getUsageDesc() != null) gItem.put("explanation", gCard.getUsageDesc());
                    if (gCard.getUsageGuide() != null) gItem.put("notes", gCard.getUsageGuide());

                    boolean isGrammarMissing = (gCard.getUsageDesc() == null || gCard.getUsageDesc().isBlank())
                        || (gCard.getFormation() == null || gCard.getFormation().isBlank())
                        || (gCard.getUsageGuide() == null || gCard.getUsageGuide().isBlank());
                    if (isGrammarMissing && aiEnrichmentQueueService != null && gCard.getId() != null) {
                        aiEnrichmentQueueService.enqueueGrammar(gCard.getId(), false);
                    }
                }
            }
        }

        lessonDataCache.put(cacheKey, data);
        return data;
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

                int fileVocab = 0;
                int fileKanji = 0;
                int fileGrammar = 0;

                // 2. Parse Kanji (chu_han)
                if (root.has("chu_han") && root.get("chu_han").isArray()) {
                    for (JsonNode kNode : root.get("chu_han")) {
                        String kanji = kNode.path("kanji").asText("").trim();
                        if (kanji.isEmpty()) continue;

                        String hanViet = kNode.path("han_viet").asText("").trim();
                        String nghia = kNode.path("nghia").asText("").trim();
                        String amDoc = kNode.path("am_doc").asText("").trim();

                        List<String> tuVungList = new ArrayList<>();
                        if (kNode.has("tu_vung") && kNode.get("tu_vung").isArray()) {
                            for (JsonNode tv : kNode.get("tu_vung")) {
                                tuVungList.add(tv.asText());
                            }
                        }

                        Optional<Vocabulary> existingOpt = vocabularyDataProvider.findFirstByKanjiAndCategory(kanji, kanjiCategory);
                        Vocabulary v = existingOpt.orElseGet(Vocabulary::new);
                        v.setKanji(kanji);
                        if (amDoc != null && !amDoc.isEmpty()) {
                            v.setRomaji(amDoc);
                            v.setHiragana(amDoc);
                        } else if (v.getHiragana() == null || v.getHiragana().isEmpty()) {
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

                        vocabularyDataProvider.save(v);
                        fileKanji++;
                    }
                }

                // 3. Parse Vocab (tu_vung)
                if (root.has("tu_vung") && root.get("tu_vung").isArray()) {
                    for (JsonNode vNode : root.get("tu_vung")) {
                        String tu = vNode.path("tu").asText("").trim();
                        if (tu.isEmpty()) continue;

                        String loaiTu = vNode.path("loai_tu").asText("").trim();
                        String nghia = vNode.path("nghia").asText("").trim();
                        String viDu = vNode.path("vi_du").asText("").trim();
                        String cachDoc = vNode.path("cach_doc").asText("").trim();
                        if (cachDoc.isEmpty()) cachDoc = vNode.path("cách đọc").asText("").trim();
                        if (cachDoc.isEmpty()) cachDoc = vNode.path("hiragana").asText("").trim();
                        if (cachDoc.isEmpty()) cachDoc = vNode.path("furigana").asText("").trim();

                        Optional<Vocabulary> existingOpt = vocabularyDataProvider.findFirstByKanjiAndCategory(tu, vocabCategory);
                        if (existingOpt.isEmpty()) {
                            existingOpt = vocabularyDataProvider.findFirstByHiraganaAndCategory(tu, vocabCategory);
                        }
                        Vocabulary v = existingOpt.orElseGet(Vocabulary::new);

                        boolean isKanji = tu.codePoints().anyMatch(Character::isIdeographic);
                        if (isKanji) {
                            v.setKanji(tu);
                            if (cachDoc != null && !cachDoc.isEmpty()) {
                                v.setHiragana(cachDoc);
                            } else if (v.getHiragana() == null || v.getHiragana().isEmpty() || v.getHiragana().equals(tu)) {
                                v.setHiragana(tu);
                            }
                        } else {
                            v.setHiragana(tu);
                            if (v.getKanji() == null || v.getKanji().isEmpty()) {
                                v.setKanji(tu);
                            }
                        }

                        if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                        v.setWordType(loaiTu != null && !loaiTu.isEmpty() && !"KANJI".equalsIgnoreCase(loaiTu) ? loaiTu : "N");
                        if (viDu != null && !viDu.isEmpty()) v.setSampleSentence(viDu);
                        v.setLevel("N3_COURSE");
                        v.setCategory(vocabCategory);

                        vocabularyDataProvider.save(v);
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

                        Optional<GrammarCard> existingOpt = knowledgeDataProvider.findGrammarByGrammar(cauTruc);
                        GrammarCard g = existingOpt.orElseGet(GrammarCard::new);

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

                        knowledgeDataProvider.saveGrammar(g);
                        fileGrammar++;
                    }
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
}
