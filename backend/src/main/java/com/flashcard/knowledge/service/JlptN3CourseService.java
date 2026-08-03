package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import com.flashcard.knowledge.repository.JlptN3ProgressRepository;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
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
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class JlptN3CourseService {

    private static final Logger log = LoggerFactory.getLogger(JlptN3CourseService.class);

    private final JlptN3ProgressRepository progressRepository;
    private final VocabularyRepository vocabularyRepository;
    private final GrammarCardRepository grammarCardRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public JlptN3CourseService(JlptN3ProgressRepository progressRepository,
                               VocabularyRepository vocabularyRepository,
                               GrammarCardRepository grammarCardRepository,
                               ObjectMapper objectMapper) {
        this.progressRepository = progressRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.grammarCardRepository = grammarCardRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Resolve the JSON file location from filesystem if available.
     */
    private File getLessonJsonFile(int chapter, int lesson) {
        String fileName = String.format("Chuong%d_Bai%d_Data.json", chapter, lesson);
        String chapterDirName = String.format("Chuong %d", chapter);

        String[] candidateBaseDirs = {
            "data/tổng ôn N3/data",
            "data/tong on N3/data",
            "../data/tổng ôn N3/data",
            "c:/Users/bbqdd/Documents/_my/japaneseproject/data/tổng ôn N3/data"
        };

        for (String baseDir : candidateBaseDirs) {
            Path path = Paths.get(baseDir, chapterDirName, fileName);
            File file = path.toFile();
            if (file.exists() && file.isFile()) {
                return file;
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

    /**
     * Get Course Overview of 9 Chapters and 27 Lessons, including progress for the user.
     */
    public Map<String, Object> getCourseOverview(Long userId) {
        List<JlptN3Progress> userProgressList = userId != null ? progressRepository.findByUserId(userId) : Collections.emptyList();
        Map<String, JlptN3Progress> progressMap = new HashMap<>();
        for (JlptN3Progress p : userProgressList) {
            String key = p.getChapterId() + "_" + p.getLessonId();
            progressMap.put(key, p);
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

                boolean available = (getUploadedFile(c, l) != null) || (getLessonJsonFile(c, l) != null) || isResourceAvailable(c, l);
                lessonData.put("available", available);

                String key = c + "_" + l;
                JlptN3Progress progress = progressMap.get(key);

                boolean isCompleted = progress != null && Boolean.TRUE.equals(progress.getCompleted());
                int bestScore = progress != null ? progress.getBestScore() : 0;

                lessonData.put("completed", isCompleted);
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
        result.put("progressPercentage", percentage);

        return result;
    }

    /**
     * Get details for a specific Chapter and Lesson.
     */
    public Map<String, Object> getLessonData(int chapter, int lesson) {
        JsonNode root = null;

        // Strategy 1: Check user-uploaded JSON file first
        File uploadedFile = getUploadedFile(chapter, lesson);
        if (uploadedFile != null) {
            try {
                root = objectMapper.readTree(uploadedFile);
            } catch (Exception e) {
                log.warn("Failed to read uploaded file for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
            }
        }

        // Strategy 2: Try reading from filesystem
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

        // Strategy 3: Fallback to Classpath resource
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
        return data;
    }

    /**
     * Dynamically process JSON files uploaded via File Picker (No hardcoded paths!)
     */
    @Transactional
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
                JsonNode root = objectMapper.readTree(file.getInputStream());
                int chuong = root.path("chuong").asInt(1);
                int bai = root.path("bai").asInt(1);

                // 1. Save uploaded file to persistent storage directory uploads/n3/Chuong_{c}/Bai_{l}.json
                Path targetDir = Paths.get("uploads", "n3", "Chuong_" + chuong);
                Files.createDirectories(targetDir);
                Path targetPath = targetDir.resolve("Bai_" + bai + ".json");
                Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

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

                        List<String> tuVungList = new ArrayList<>();
                        if (kNode.has("tu_vung") && kNode.get("tu_vung").isArray()) {
                            for (JsonNode tv : kNode.get("tu_vung")) {
                                tuVungList.add(tv.asText());
                            }
                        }

                        Optional<Vocabulary> existingOpt = vocabularyRepository.findFirstByKanji(kanji);
                        Vocabulary v = existingOpt.orElseGet(Vocabulary::new);
                        v.setKanji(kanji);
                        if (v.getHiragana() == null || v.getHiragana().isEmpty()) {
                            v.setHiragana(kanji);
                        }
                        if (hanViet != null && !hanViet.isEmpty()) v.setHanViet(hanViet);
                        if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                        v.setLevel("N3");
                        v.setCategory("Tổng ôn N3 - Bài " + bai);

                        if (!tuVungList.isEmpty()) {
                            try {
                                v.setKanjiWords(objectMapper.writeValueAsString(tuVungList));
                            } catch (Exception ignored) {}
                        }

                        vocabularyRepository.save(v);
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

                        Optional<Vocabulary> existingOpt = vocabularyRepository.findFirstByKanji(tu);
                        if (existingOpt.isEmpty()) {
                            existingOpt = vocabularyRepository.findFirstByHiragana(tu);
                        }
                        Vocabulary v = existingOpt.orElseGet(Vocabulary::new);

                        boolean isKanji = tu.codePoints().anyMatch(Character::isIdeographic);
                        if (isKanji) {
                            v.setKanji(tu);
                            if (v.getHiragana() == null || v.getHiragana().isEmpty()) {
                                v.setHiragana(tu);
                            }
                        } else {
                            v.setHiragana(tu);
                            if (v.getKanji() == null || v.getKanji().isEmpty()) {
                                v.setKanji(tu);
                            }
                        }

                        if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                        if (loaiTu != null && !loaiTu.isEmpty()) v.setWordType(loaiTu);
                        if (viDu != null && !viDu.isEmpty()) v.setSampleSentence(viDu);
                        v.setLevel("N3");
                        v.setCategory("Tổng ôn N3 - Bài " + bai);

                        vocabularyRepository.save(v);
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

                        Optional<GrammarCard> existingOpt = grammarCardRepository.findByGrammar(cauTruc);
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

                        grammarCardRepository.save(g);
                        fileGrammar++;
                    }
                }

                processedFilesCount++;
                importedVocab += fileVocab;
                importedKanji += fileKanji;
                importedGrammar += fileGrammar;

                details.add(String.format("Đã nạp %s (Chương %d - Bài %d): %d từ vựng, %d chữ Hán, %d ngữ pháp", originalName, chuong, bai, fileVocab, fileKanji, fileGrammar));
            } catch (Exception e) {
                log.error("Failed to process uploaded file {}: {}", originalName, e.getMessage());
                details.add("Lỗi khi đọc " + originalName + ": " + e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("processedFiles", processedFilesCount);
        response.put("importedVocab", importedVocab);
        response.put("importedKanji", importedKanji);
        response.put("importedGrammar", importedGrammar);
        response.put("details", details);

        return response;
    }

    /**
     * Submit Quiz Score for a lesson and update completion status if accuracy >= 90%.
     */
    @Transactional
    public Map<String, Object> submitQuiz(Long userId, int chapter, int lesson, int score, int total) {
        if (total <= 0) {
            throw new IllegalArgumentException("Tổng số câu hỏi phải lớn hơn 0");
        }

        int accuracy = Math.round((float) score * 100 / total);
        boolean passed = (accuracy >= 90);

        JlptN3Progress progress = null;
        if (userId != null) {
            progress = progressRepository.findByUserIdAndChapterIdAndLessonId(userId, chapter, lesson)
                    .orElseGet(() -> new JlptN3Progress(userId, chapter, lesson, false, 0));

            if (accuracy > progress.getBestScore()) {
                progress.setBestScore(accuracy);
            }

            if (passed) {
                progress.setCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
            }

            progressRepository.save(progress);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("chapterId", chapter);
        result.put("lessonId", lesson);
        result.put("score", score);
        result.put("total", total);
        result.put("accuracy", accuracy);
        result.put("passed", passed);
        result.put("completed", progress != null && Boolean.TRUE.equals(progress.getCompleted()));
        result.put("bestScore", progress != null ? progress.getBestScore() : accuracy);

        return result;
    }
}
