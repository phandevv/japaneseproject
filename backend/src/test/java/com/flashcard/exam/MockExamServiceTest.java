package com.flashcard.exam;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.exam.dto.*;
import com.flashcard.exam.model.MockExamAnswer;
import com.flashcard.exam.model.MockExamAttempt;
import com.flashcard.exam.provider.ExamDataProvider;
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
    private ExamDataProvider examDataProvider;

    private ObjectMapper objectMapper = new ObjectMapper();
    private MockExamService mockExamService;

    @BeforeEach
    void setUp() {
        mockExamService = new MockExamService(examDataProvider, objectMapper);
    }

    @Test
    void testStartNewAttempt() {
        String examId = "n3-2020-12";
        Long userId = 100L;

        ExamDetailDto detailDto = new ExamDetailDto();
        detailDto.setExamId(examId);
        detailDto.setLevel("N3");
        detailDto.setYear(2020);
        detailDto.setMonth(12);
        detailDto.setTitle("JLPT N3 — Tháng 12/2020");
        detailDto.setTotalQuestions(101);

        when(examDataProvider.getExamDetail(examId)).thenReturn(Optional.of(detailDto));
        when(examDataProvider.findInProgressAttempt(userId, examId)).thenReturn(Optional.empty());
        when(examDataProvider.saveAttempt(any(MockExamAttempt.class))).thenAnswer(inv -> {
            MockExamAttempt a = inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        AttemptDto result = mockExamService.startOrResumeAttempt(userId, examId);

        assertNotNull(result);
        assertEquals(1L, result.getAttemptId());
        assertEquals("IN_PROGRESS", result.getStatus());
        assertEquals(0, result.getSavedAnswers().size());
        verify(examDataProvider).saveAttempt(any(MockExamAttempt.class));
    }

    @Test
    void testResumeExistingAttempt() {
        String examId = "n3-2020-12";
        Long userId = 100L;

        ExamDetailDto detailDto = new ExamDetailDto();
        detailDto.setExamId(examId);
        detailDto.setLevel("N3");
        detailDto.setYear(2020);
        detailDto.setMonth(12);
        detailDto.setTitle("JLPT N3 — Tháng 12/2020");
        detailDto.setTotalQuestions(101);

        MockExamAttempt existing = new MockExamAttempt(userId, examId, "N3", 2020, 12, 101);
        existing.setId(42L);
        existing.setCurrentSectionIndex(1);
        existing.setSectionTimeLeftSec(1200);

        MockExamAnswer ans = new MockExamAnswer(42L, "vocab", "q1", 2, null);

        when(examDataProvider.getExamDetail(examId)).thenReturn(Optional.of(detailDto));
        when(examDataProvider.findInProgressAttempt(userId, examId)).thenReturn(Optional.of(existing));
        when(examDataProvider.findAnswersByAttemptId(42L)).thenReturn(List.of(ans));

        AttemptDto result = mockExamService.startOrResumeAttempt(userId, examId);

        assertEquals(42L, result.getAttemptId());
        assertEquals(1, result.getCurrentSectionIndex());
        assertEquals(1200, result.getSectionTimeLeftSec());
        assertEquals(2, result.getSavedAnswers().get("q1"));
        verify(examDataProvider, never()).saveAttempt(any());
    }

    @Test
    void testSubmitExamGrading() {
        Long userId = 100L;
        Long attemptId = 55L;
        String examId = "n3-2020-12";

        MockExamAttempt attempt = new MockExamAttempt(userId, examId, "N3", 2020, 12, 2);
        attempt.setId(attemptId);

        ExamDetailDto detailDto = new ExamDetailDto();
        detailDto.setExamId(examId);
        detailDto.setLevel("N3");
        detailDto.setYear(2020);
        detailDto.setMonth(12);
        detailDto.setTitle("JLPT N3 — 12/2020");
        detailDto.setTotalQuestions(2);

        SectionDto sec = new SectionDto();
        sec.setSectionId("vocab");
        sec.setTitle("Từ vựng");
        sec.setTitleVi("Văn tự");
        sec.setTimeLimitSec(1800);
        sec.setTotalQuestions(2);

        QuestionDto q1 = new QuestionDto();
        q1.setId("q1");
        q1.setSection("vocab");
        q1.setMondai(1);
        q1.setQuestionNumber(1);
        q1.setQuestionType("vocab");
        q1.setChoices(List.of("A", "B", "C", "D"));

        QuestionDto q2 = new QuestionDto();
        q2.setId("q2");
        q2.setSection("vocab");
        q2.setMondai(1);
        q2.setQuestionNumber(2);
        q2.setQuestionType("vocab");
        q2.setChoices(List.of("A", "B", "C", "D"));

        sec.setQuestions(List.of(q1, q2));
        detailDto.setSections(List.of(sec));

        Map<String, Integer> correctAnswers = Map.of("q1", 3, "q2", 1);

        when(examDataProvider.findAttemptById(attemptId)).thenReturn(Optional.of(attempt));
        when(examDataProvider.getExamDetail(examId)).thenReturn(Optional.of(detailDto));
        when(examDataProvider.getCorrectAnswers(examId)).thenReturn(correctAnswers);
        when(examDataProvider.findAnswersByAttemptId(attemptId)).thenReturn(Collections.emptyList());

        // User answered q1 correctly (3) and q2 incorrectly (2)
        SubmitExamRequest req = new SubmitExamRequest(Map.of("q1", 3, "q2", 2));

        AttemptResultDto result = mockExamService.submitExam(userId, attemptId, req);

        assertEquals("COMPLETED", result.getStatus());
        assertEquals(1, result.getTotalCorrect());
        assertEquals(2, result.getTotalQuestions());
        assertEquals(50.0, result.getPercentage());
        assertEquals(1, result.getSectionResults().size());
        assertEquals(1, result.getSectionResults().get(0).getCorrectCount());
        verify(examDataProvider).saveAttempt(attempt);
    }
}
