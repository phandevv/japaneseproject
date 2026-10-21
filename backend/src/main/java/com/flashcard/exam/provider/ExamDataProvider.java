package com.flashcard.exam.provider;

import com.flashcard.exam.dto.ExamDetailDto;
import com.flashcard.exam.dto.ExamListItemDto;
import com.flashcard.exam.dto.QuestionReviewDto;
import com.flashcard.exam.model.MockExamAnswer;
import com.flashcard.exam.model.MockExamAttempt;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ExamDataProvider {

    long countExams();

    long countQuestions();

    List<ExamListItemDto> getAllExams();

    Optional<ExamDetailDto> getExamDetail(String examId);

    Optional<QuestionReviewDto> getQuestionDetail(String examId, String questionId);

    void saveExamDetail(ExamDetailDto examDetail);

    MockExamAttempt saveAttempt(MockExamAttempt attempt);

    Optional<MockExamAttempt> findAttemptById(Long attemptId);

    Optional<MockExamAttempt> findAttemptByIdAndUserId(Long attemptId, Long userId);

    Optional<MockExamAttempt> findInProgressAttempt(Long userId, String examId);

    List<MockExamAttempt> findAttemptsByUserId(Long userId);

    MockExamAnswer saveAnswer(MockExamAnswer answer);

    List<MockExamAnswer> saveAllAnswers(List<MockExamAnswer> answers);

    List<MockExamAnswer> findAnswersByAttemptId(Long attemptId);

    Map<String, Integer> getCorrectAnswers(String examId);

    boolean existsExam(String examId);
}
