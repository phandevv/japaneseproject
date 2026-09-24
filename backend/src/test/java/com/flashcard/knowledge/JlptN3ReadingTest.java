package com.flashcard.knowledge;

import com.flashcard.knowledge.model.JlptN3Reading;
import com.flashcard.knowledge.repository.JlptN3ReadingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class JlptN3ReadingTest {

    @Autowired(required = false)
    private JlptN3ReadingRepository readingRepository;

    @Test
    void testJlptN3ReadingEntityAndRepository() {
        if (readingRepository == null) return;

        JlptN3Reading reading = new JlptN3Reading(
                1, 1,
                "テストの読解",
                "これは[日本語|にほんご]の[勉強|べんきょう]のための[文章|ぶんしょう]です。",
                "Đây là đoạn văn để học tiếng Nhật.",
                "[{\"id\":1,\"question\":\"Bài đọc nói về cái gì?\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":\"A\",\"explanation\":\"Giải thích A đúng\"}]"
        );

        JlptN3Reading saved = readingRepository.save(reading);
        assertNotNull(saved.getId());
        assertEquals("テストの読解", saved.getTitle());
        assertEquals(1, saved.getChapterId());
        assertEquals(1, saved.getLessonId());

        Optional<JlptN3Reading> found = readingRepository.findByChapterIdAndLessonId(1, 1);
        assertTrue(found.isPresent());
        assertEquals("テストの読解", found.get().getTitle());

        // Cleanup
        readingRepository.delete(saved);
    }

    @Autowired(required = false)
    private com.flashcard.knowledge.service.JlptN3CourseService courseService;

    @Test
    void testSubmitReadingQuizPassAndFail() {
        if (courseService == null) return;

        // Test fail when score < 8
        java.util.Map<String, Object> failResult = courseService.submitReadingQuiz(99999L, 1, 1, 7, 10);
        assertNotNull(failResult);
        assertEquals(7, failResult.get("score"));
        assertEquals(10, failResult.get("total"));
        assertEquals(70, failResult.get("accuracy"));
        assertEquals(false, failResult.get("passed"));
        assertEquals(false, failResult.get("readingPassed"));

        // Test pass when score >= 8
        java.util.Map<String, Object> passResult = courseService.submitReadingQuiz(99999L, 1, 1, 8, 10);
        assertNotNull(passResult);
        assertEquals(8, passResult.get("score"));
        assertEquals(80, passResult.get("accuracy"));
        assertEquals(true, passResult.get("passed"));
        assertEquals(true, passResult.get("readingPassed"));
        assertEquals(8, passResult.get("readingScore"));
    }
}
