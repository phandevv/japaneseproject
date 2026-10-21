package com.flashcard.exam;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.exam.dto.*;
import com.flashcard.exam.model.*;
import com.flashcard.exam.repository.MockExamAnswerRepository;
import com.flashcard.exam.repository.MockExamAttemptRepository;
import com.flashcard.exam.service.ExamDataService;
import com.flashcard.exam.service.MockExamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MockExamServiceTest {

    @Mock
    private MockExamAttemptRepository attemptRepository;

    @Mock
    private MockExamAnswerRepository answerRepository;

    @Mock
    private ExamDataService examDataService;

    private ObjectMapper objectMapper = new ObjectMapper();
    private MockExamService mockExamService;

    @BeforeEach
    void setUp() {
        mockExamService = new MockExamService(attemptRepository, answerRepository, examDataService, objectMapper);
    }

    @Test
    void testStartNewAttempt() {
        String examId = "n3-2020-12";
        Long userId = 100L;

        JlptExam exam = new JlptExam(examId, "N3", 2020, 12, "JLPT N3 — Tháng 12/2020", 101, "n3-2020-12.mp3");
        ExamDetailDto detailDto = new ExamDetailDto();
        detailDto.setExamId(examId);
        detailDto.setYear(2020);
        detailDto.setMonth(12);
        detailDto.setTotalQuestions(101);

        when(examDataService.getExam(examId)).thenReturn(Optional.of(exam));
        when(examDataService.getExamDetail(examId)).thenReturn(Optional.of(detailDto));
        when(attemptRepository.findInProgressAttempt(userId, examId)).thenReturn(Optional.empty());
        when(attemptRepository.save(any(MockExamAttempt.class))).thenAnswer(inv -> {
            MockExamAttempt a = inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        AttemptDto result = mockExamService.startOrResumeAttempt(userId, examId);

        assertNotNull(result);
        assertEquals(1L, result.getAttemptId());
        assertEquals("IN_PROGRESS", result.getStatus());
        assertEquals(0, result.getSavedAnswers().size());
        verify(attemptRepository).save(any(MockExamAttempt.class));
    }

    @Test
    void testResumeExistingAttempt() {
        String examId = "n3-2020-12";
        Long userId = 100L;

        JlptExam exam = new JlptExam(examId, "N3", 2020, 12, "JLPT N3 — Tháng 12/2020", 101, "n3-2020-12.mp3");
        ExamDetailDto detailDto = new ExamDetailDto();
        detailDto.setExamId(examId);

        MockExamAttempt existing = new MockExamAttempt(userId, examId, "N3", 2020, 12, 101);
        existing.setId(42L);
        existing.setCurrentSectionIndex(1);
        existing.setSectionTimeLeftSec(1200);

        MockExamAnswer ans = new MockExamAnswer(42L, "vocab", "q1", 2, null);

        when(examDataService.getExam(examId)).thenReturn(Optional.of(exam));
        when(examDataService.getExamDetail(examId)).thenReturn(Optional.of(detailDto));
        when(attemptRepository.findInProgressAttempt(userId, examId)).thenReturn(Optional.of(existing));
        when(answerRepository.findByAttemptId(42L)).thenReturn(List.of(ans));

        AttemptDto result = mockExamService.startOrResumeAttempt(userId, examId);

        assertEquals(42L, result.getAttemptId());
        assertEquals(1, result.getCurrentSectionIndex());
        assertEquals(1200, result.getSectionTimeLeftSec());
        assertEquals(2, result.getSavedAnswers().get("q1"));
        verify(attemptRepository, never()).save(any());
    }

    @Test
    void testSubmitExamGrading() {
        Long userId = 100L;
        Long attemptId = 55L;
        String examId = "n3-2020-12";

        MockExamAttempt attempt = new MockExamAttempt(userId, examId, "N3", 2020, 12, 2);
        attempt.setId(attemptId);

        JlptExam exam = new JlptExam(examId, "N3", 2020, 12, "JLPT N3 — 12/2020", 2, null);

        JlptExamSection sec = new JlptExamSection("s1", examId, "vocab", "Từ vựng", "Văn tự", 1, 1800, 2);
        List<JlptExamSection> sections = List.of(sec);

        JlptExamQuestion q1 = new JlptExamQuestion();
        q1.setId("q1");
        q1.setExamId(examId);
        q1.setSectionId("vocab");
        q1.setSectionRecordId("s1");
        q1.setMondai(1);
        q1.setQuestionNumber(1);
        q1.setCorrectAnswer(3);
        q1.setChoicesJson("[\"A\",\"B\",\"C\",\"D\"]");
        q1.setQuestionOrder(1);

        JlptExamQuestion q2 = new JlptExamQuestion();
        q2.setId("q2");
        q2.setExamId(examId);
        q2.setSectionId("vocab");
        q2.setSectionRecordId("s1");
        q2.setMondai(1);
        q2.setQuestionNumber(2);
        q2.setCorrectAnswer(1);
        q2.setChoicesJson("[\"A\",\"B\",\"C\",\"D\"]");
        q2.setQuestionOrder(2);

        List<JlptExamQuestion> questions = List.of(q1, q2);

        when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
        when(examDataService.getExam(examId)).thenReturn(Optional.of(exam));
        when(examDataService.getSections(examId)).thenReturn(sections);
        when(examDataService.getAllQuestions(examId)).thenReturn(questions);
        when(examDataService.parseChoices(any())).thenReturn(List.of("A", "B", "C", "D"));

        // User answered q1 correctly (3) and q2 incorrectly (2)
        SubmitExamRequest req = new SubmitExamRequest(Map.of("q1", 3, "q2", 2));

        AttemptResultDto result = mockExamService.submitExam(userId, attemptId, req);

        assertEquals("COMPLETED", result.getStatus());
        assertEquals(1, result.getTotalCorrect());
        assertEquals(2, result.getTotalQuestions());
        assertEquals(50.0, result.getPercentage());
        assertEquals(1, result.getSectionResults().size());
        assertEquals(1, result.getSectionResults().get(0).getCorrectCount());
        verify(attemptRepository).save(attempt);
    }
}
