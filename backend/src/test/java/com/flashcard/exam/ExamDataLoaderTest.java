package com.flashcard.exam;

import com.flashcard.exam.model.JlptExamQuestion;
import com.flashcard.exam.repository.JlptExamQuestionRepository;
import com.flashcard.exam.repository.JlptExamRepository;
import com.flashcard.exam.repository.JlptExamSectionRepository;
import com.flashcard.exam.service.ExamDataLoader;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ExamDataLoaderTest {

    @Autowired
    private ExamDataLoader examDataLoader;

    @Autowired
    private JlptExamRepository examRepository;

    @Autowired
    private JlptExamSectionRepository sectionRepository;

    @Autowired
    private JlptExamQuestionRepository questionRepository;

    @Test
    void testRealExamDataLoadedSuccessfully() {
        // Run loader
        examDataLoader.run();

        long examCount = examRepository.count();
        long sectionCount = sectionRepository.count();
        long questionCount = questionRepository.count();

        System.out.println("Exams in DB: " + examCount);
        System.out.println("Sections in DB: " + sectionCount);
        System.out.println("Questions in DB: " + questionCount);

        assertTrue(examCount >= 30, "Should have at least 30 real exams loaded in database");
        assertTrue(sectionCount >= 90, "Should have at least 90 exam sections loaded in database");
        assertTrue(questionCount >= 3000, "Should have at least 3000 real questions loaded in database");

        // Verify a specific real question has authentic Japanese choices
        Optional<JlptExamQuestion> qOpt = questionRepository.findById("n3-2023-07-vocab-m1-q1");
        assertTrue(qOpt.isPresent(), "Sample question n3-2023-07-vocab-m1-q1 should exist");

        JlptExamQuestion q = qOpt.get();
        assertEquals("毎日復習したので、よくできるようになった。", q.getQuestionText());
        assertNotNull(q.getChoicesJson());
        assertTrue(q.getChoicesJson().contains("ふくしゅう"), "Choices should contain authentic Japanese options");
        assertFalse(q.getChoicesJson().contains("[\"1\",\"2\",\"3\",\"4\"]"), "Choices must NOT be dummy [1, 2, 3, 4]");
        assertEquals(3, q.getCorrectAnswer());
    }
}
