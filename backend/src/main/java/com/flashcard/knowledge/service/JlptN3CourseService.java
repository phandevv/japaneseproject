package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.repository.JlptN3ProgressRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class JlptN3CourseService {

    private static final Logger log = LoggerFactory.getLogger(JlptN3CourseService.class);

    private final JlptN3ProgressRepository progressRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public JlptN3CourseService(JlptN3ProgressRepository progressRepository, ObjectMapper objectMapper) {
        this.progressRepository = progressRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Resolve the JSON file location for a specific chapter and lesson.
     */
    private File getLessonJsonFile(int chapter, int lesson) {
        String fileName = String.format("Chuong%d_Bai%d_Data.json", chapter, lesson);
        String chapterDirName = String.format("Chuong %d", chapter);

        String[] candidateBaseDirs = {
            "data/tổng ôn N3/data",
            "../data/tổng ôn N3/data",
            "../../data/tổng ôn N3/data",
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

                File jsonFile = getLessonJsonFile(c, l);
                boolean available = (jsonFile != null);
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

        // Strategy 1: Try reading from filesystem
        File jsonFile = getLessonJsonFile(chapter, lesson);
        if (jsonFile != null && jsonFile.exists()) {
            try {
                root = objectMapper.readTree(jsonFile);
            } catch (Exception e) {
                log.warn("Failed to read filesystem JSON file for Chapter {} Lesson {}: {}", chapter, lesson, e.getMessage());
            }
        }

        // Strategy 2: Fallback to Classpath resource
        if (root == null) {
            String resourcePath = String.format("data/n3/Chuong %d/Chuong%d_Bai%d_Data.json", chapter, chapter, lesson);
            try {
                org.springframework.core.io.ClassPathResource res = new org.springframework.core.io.ClassPathResource(resourcePath);
                if (res.exists()) {
                    try (java.io.InputStream is = res.getInputStream()) {
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
