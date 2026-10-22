package com.flashcard.exam.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.exam.dto.*;
import com.flashcard.exam.model.MockExamAnswer;
import com.flashcard.exam.model.MockExamAttempt;
import com.flashcard.exam.provider.ExamDataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class MockExamService {

    private static final Logger log = LoggerFactory.getLogger(MockExamService.class);

    private final ExamDataProvider examDataProvider;
    private final ObjectMapper objectMapper;

    @Autowired
    public MockExamService(ExamDataProvider examDataProvider, ObjectMapper objectMapper) {
        this.examDataProvider = examDataProvider;
        this.objectMapper = objectMapper;
    }

    public List<ExamListItemDto> getExamList(Long userId) {
        List<ExamListItemDto> exams = examDataProvider.getAllExams();
        if (userId == null) {
            return exams;
        }

        List<MockExamAttempt> userAttempts = examDataProvider.findAttemptsByUserId(userId);
        Map<String, MockExamAttempt> latestAttempts = new HashMap<>();
        for (MockExamAttempt att : userAttempts) {
            latestAttempts.putIfAbsent(att.getExamId(), att);
        }

        for (ExamListItemDto item : exams) {
            MockExamAttempt latest = latestAttempts.get(item.getExamId());
            if (latest != null) {
                item.setUserAttemptStatus(latest.getStatus());
                item.setUserLastScore(latest.getPercentage());
                item.setUserLastAttemptId(latest.getId());
            } else {
                item.setUserAttemptStatus("NOT_STARTED");
            }
        }

        return exams;
    }

    public Optional<ExamDetailDto> getExamDetail(String examId) {
        return examDataProvider.getExamDetail(examId);
    }

    @Transactional
    public AttemptDto startOrResumeAttempt(Long userId, String examId) {
        ExamDetailDto examDetail = examDataProvider.getExamDetail(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        Optional<MockExamAttempt> existingOpt = examDataProvider.findInProgressAttempt(userId, examId);
        MockExamAttempt attempt;
        Map<String, Integer> savedAnswers = new HashMap<>();

        if (existingOpt.isPresent()) {
            attempt = existingOpt.get();
            List<MockExamAnswer> answers = examDataProvider.findAnswersByAttemptId(attempt.getId());
            for (MockExamAnswer ans : answers) {
                if (ans.getSelectedChoice() != null) {
                    savedAnswers.put(ans.getQuestionId(), ans.getSelectedChoice());
                }
            }
        } else {
            attempt = new MockExamAttempt(
                    userId,
                    examId,
                    examDetail.getLevel(),
                    examDetail.getYear(),
                    examDetail.getMonth(),
                    examDetail.getTotalQuestions()
            );
            attempt = examDataProvider.saveAttempt(attempt);
        }

        AttemptDto dto = new AttemptDto();
        dto.setAttemptId(attempt.getId());
        dto.setExamId(attempt.getExamId());
        dto.setStatus(attempt.getStatus());
        dto.setCurrentSectionIndex(attempt.getCurrentSectionIndex());
        dto.setSectionTimeLeftSec(attempt.getSectionTimeLeftSec());
        dto.setStartedAt(attempt.getStartedAt());
        dto.setSavedAnswers(savedAnswers);
        dto.setExam(examDetail);
        dto.setSectionResultsJson(attempt.getSectionResultsJson());

        return dto;
    }

    @Transactional
    public void saveProgress(Long userId, Long attemptId, SaveProgressRequest request) {
        MockExamAttempt attempt = examDataProvider.findAttemptById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized attempt access");
        }

        if (!"IN_PROGRESS".equals(attempt.getStatus())) {
            return;
        }

        attempt.setCurrentSectionIndex(request.getCurrentSectionIndex());
        attempt.setSectionTimeLeftSec(request.getSectionTimeLeftSec());
        examDataProvider.saveAttempt(attempt);

        if (request.getAnswers() != null && !request.getAnswers().isEmpty()) {
            List<MockExamAnswer> answersToSave = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : request.getAnswers().entrySet()) {
                MockExamAnswer ans = new MockExamAnswer(attemptId, "section", entry.getKey(), entry.getValue(), null);
                answersToSave.add(ans);
            }
            examDataProvider.saveAllAnswers(answersToSave);
        }
    }

    @Transactional
    public AttemptResultDto submitExam(Long userId, Long attemptId, SubmitExamRequest request) {
        MockExamAttempt attempt = examDataProvider.findAttemptById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized attempt access");
        }

        if ("COMPLETED".equals(attempt.getStatus())) {
            return getAttemptResult(userId, attemptId);
        }

        ExamDetailDto exam = examDataProvider.getExamDetail(attempt.getExamId())
                .orElseThrow(() -> new IllegalStateException("Exam not found: " + attempt.getExamId()));

        Map<String, Integer> correctAnswers = examDataProvider.getCorrectAnswers(attempt.getExamId());

        if (request != null && request.getAnswers() != null && !request.getAnswers().isEmpty()) {
            List<MockExamAnswer> answersToSave = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : request.getAnswers().entrySet()) {
                answersToSave.add(new MockExamAnswer(attemptId, "section", entry.getKey(), entry.getValue(), null));
            }
            examDataProvider.saveAllAnswers(answersToSave);
        }

        List<MockExamAnswer> allSavedAnswers = examDataProvider.findAnswersByAttemptId(attemptId);
        Map<String, Integer> answerChoiceMap = new HashMap<>();
        for (MockExamAnswer a : allSavedAnswers) {
            answerChoiceMap.put(a.getQuestionId(), a.getSelectedChoice());
        }
        if (request != null && request.getAnswers() != null) {
            answerChoiceMap.putAll(request.getAnswers());
        }

        int totalCorrect = 0;
        int totalQuestions = (exam.getTotalQuestions() > 0) ? exam.getTotalQuestions() : 0;
        List<SectionResultDto> sectionResults = new ArrayList<>();
        List<MockExamAnswer> gradedAnswers = new ArrayList<>();

        if (exam.getSections() != null) {
            int calculatedTotalQuestions = 0;
            for (SectionDto sec : exam.getSections()) {
                SectionResultDto secRes = new SectionResultDto();
                secRes.setSectionId(sec.getSectionId());
                secRes.setTitle(sec.getTitle());
                secRes.setTitleVi(sec.getTitleVi());

                List<QuestionDto> qList = sec.getQuestions() != null ? sec.getQuestions() : Collections.emptyList();
                secRes.setTotalQuestions(qList.size());
                calculatedTotalQuestions += qList.size();

                int secCorrect = 0;
                List<QuestionReviewDto> qReviews = new ArrayList<>();

                for (QuestionDto q : qList) {
                    QuestionReviewDto qRev = new QuestionReviewDto();
                    qRev.setQuestionId(q.getId());
                    qRev.setMondai(q.getMondai());
                    qRev.setQuestionNumber(q.getQuestionNumber());
                    qRev.setQuestionType(q.getQuestionType());
                    qRev.setQuestionText(q.getQuestionText());
                    qRev.setPassage(q.getPassage());
                    qRev.setChoices(q.getChoices() != null ? q.getChoices() : Collections.emptyList());
                    qRev.setImageRef(q.getImageRef());
                    qRev.setAudioStartSec(q.getAudioStartSec());
                    qRev.setAudioEndSec(q.getAudioEndSec());

                    Integer correctAns = correctAnswers.get(q.getId());
                    qRev.setCorrectAnswer(correctAns);

                    Integer userChoice = answerChoiceMap.get(q.getId());
                    qRev.setSelectedChoice(userChoice);

                    boolean isCorrect = (correctAns != null && correctAns.equals(userChoice));
                    qRev.setIsCorrect(isCorrect);

                    if (isCorrect) {
                        secCorrect++;
                        totalCorrect++;
                    }

                    if (userChoice != null) {
                        gradedAnswers.add(new MockExamAnswer(attemptId, sec.getSectionId(), q.getId(), userChoice, isCorrect));
                    }

                    qReviews.add(qRev);
                }

                secRes.setCorrectCount(secCorrect);
                double secPct = qList.size() > 0
                        ? Math.round((double) secCorrect / qList.size() * 1000.0) / 10.0
                        : 0.0;
                secRes.setPercentage(secPct);
                secRes.setQuestions(qReviews);

                sectionResults.add(secRes);
            }
            if (totalQuestions == 0) totalQuestions = calculatedTotalQuestions;
        }

        examDataProvider.saveAllAnswers(gradedAnswers);

        double totalPct = totalQuestions > 0
                ? Math.round((double) totalCorrect / totalQuestions * 1000.0) / 10.0
                : 0.0;

        attempt.setTotalCorrect(totalCorrect);
        attempt.setTotalQuestions(totalQuestions);
        attempt.setPercentage(totalPct);
        attempt.setStatus("COMPLETED");
        attempt.setCompletedAt(LocalDateTime.now());

        try {
            List<Map<String, Object>> lightSecSummary = new ArrayList<>();
            for (SectionResultDto sr : sectionResults) {
                Map<String, Object> map = new HashMap<>();
                map.put("sectionId", sr.getSectionId());
                map.put("title", sr.getTitle());
                map.put("totalQuestions", sr.getTotalQuestions());
                map.put("correctCount", sr.getCorrectCount());
                map.put("percentage", sr.getPercentage());
                lightSecSummary.add(map);
            }
            attempt.setSectionResultsJson(objectMapper.writeValueAsString(lightSecSummary));
        } catch (Exception e) {
            log.error("Failed to serialize section results: {}", e.getMessage());
        }

        examDataProvider.saveAttempt(attempt);

        AttemptResultDto result = new AttemptResultDto();
        result.setAttemptId(attempt.getId());
        result.setExamId(attempt.getExamId());
        result.setExamTitle(exam.getTitle());
        result.setStatus("COMPLETED");
        result.setTotalCorrect(totalCorrect);
        result.setTotalQuestions(totalQuestions);
        result.setPercentage(totalPct);
        result.setSectionResults(sectionResults);

        return result;
    }

    @Transactional
    public SectionResultDto submitSection(Long userId, Long attemptId, SubmitSectionRequest request) {
        if (request == null || request.getSectionId() == null || request.getSectionId().isBlank()) {
            throw new IllegalArgumentException("Section ID must be provided");
        }

        MockExamAttempt attempt = examDataProvider.findAttemptById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized attempt access");
        }

        ExamDetailDto exam = examDataProvider.getExamDetail(attempt.getExamId())
                .orElseThrow(() -> new IllegalStateException("Exam not found: " + attempt.getExamId()));

        Map<String, Integer> correctAnswers = examDataProvider.getCorrectAnswers(attempt.getExamId());

        SectionDto targetSection = null;
        if (exam.getSections() != null) {
            for (SectionDto sec : exam.getSections()) {
                if (request.getSectionId().equals(sec.getSectionId())) {
                    targetSection = sec;
                    break;
                }
            }
        }
        if (targetSection == null) {
            throw new IllegalArgumentException("Section not found: " + request.getSectionId());
        }

        if (request.getAnswers() != null && !request.getAnswers().isEmpty()) {
            List<MockExamAnswer> answersToSave = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : request.getAnswers().entrySet()) {
                answersToSave.add(new MockExamAnswer(attemptId, targetSection.getSectionId(), entry.getKey(), entry.getValue(), null));
            }
            examDataProvider.saveAllAnswers(answersToSave);
        }

        List<MockExamAnswer> allSavedAnswers = examDataProvider.findAnswersByAttemptId(attemptId);
        Map<String, Integer> answerChoiceMap = new HashMap<>();
        for (MockExamAnswer a : allSavedAnswers) {
            answerChoiceMap.put(a.getQuestionId(), a.getSelectedChoice());
        }
        if (request.getAnswers() != null) {
            answerChoiceMap.putAll(request.getAnswers());
        }

        List<QuestionDto> qList = targetSection.getQuestions() != null ? targetSection.getQuestions() : Collections.emptyList();
        int secCorrect = 0;
        List<QuestionReviewDto> qReviews = new ArrayList<>();
        List<MockExamAnswer> gradedAnswers = new ArrayList<>();

        for (QuestionDto q : qList) {
            QuestionReviewDto qRev = new QuestionReviewDto();
            qRev.setQuestionId(q.getId());
            qRev.setMondai(q.getMondai());
            qRev.setQuestionNumber(q.getQuestionNumber());
            qRev.setQuestionType(q.getQuestionType());
            qRev.setQuestionText(q.getQuestionText());
            qRev.setPassage(q.getPassage());
            qRev.setChoices(q.getChoices() != null ? q.getChoices() : Collections.emptyList());
            qRev.setImageRef(q.getImageRef());
            qRev.setAudioStartSec(q.getAudioStartSec());
            qRev.setAudioEndSec(q.getAudioEndSec());

            Integer correctAns = correctAnswers.get(q.getId());
            qRev.setCorrectAnswer(correctAns);

            Integer userChoice = answerChoiceMap.get(q.getId());
            qRev.setSelectedChoice(userChoice);

            boolean isCorrect = (correctAns != null && correctAns.equals(userChoice));
            qRev.setIsCorrect(isCorrect);

            if (isCorrect) {
                secCorrect++;
            }

            if (userChoice != null) {
                gradedAnswers.add(new MockExamAnswer(attemptId, targetSection.getSectionId(), q.getId(), userChoice, isCorrect));
            }

            qReviews.add(qRev);
        }

        examDataProvider.saveAllAnswers(gradedAnswers);

        SectionResultDto secRes = new SectionResultDto();
        secRes.setSectionId(targetSection.getSectionId());
        secRes.setTitle(targetSection.getTitle());
        secRes.setTitleVi(targetSection.getTitleVi());
        secRes.setTotalQuestions(qList.size());
        secRes.setCorrectCount(secCorrect);
        double secPct = qList.size() > 0
                ? Math.round((double) secCorrect / qList.size() * 1000.0) / 10.0
                : 0.0;
        secRes.setPercentage(secPct);
        secRes.setQuestions(qReviews);

        List<Map<String, Object>> lightSecSummary = new ArrayList<>();
        if (attempt.getSectionResultsJson() != null && !attempt.getSectionResultsJson().isBlank()) {
            try {
                lightSecSummary = objectMapper.readValue(attempt.getSectionResultsJson(), new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse existing sectionResultsJson: {}", e.getMessage());
            }
        }

        final String secIdToRemove = secRes.getSectionId();
        lightSecSummary.removeIf(m -> secIdToRemove.equals(m.get("sectionId")));
        Map<String, Object> currentSecMap = new HashMap<>();
        currentSecMap.put("sectionId", secRes.getSectionId());
        currentSecMap.put("title", secRes.getTitle());
        currentSecMap.put("totalQuestions", secRes.getTotalQuestions());
        currentSecMap.put("correctCount", secRes.getCorrectCount());
        currentSecMap.put("percentage", secRes.getPercentage());
        lightSecSummary.add(currentSecMap);

        try {
            attempt.setSectionResultsJson(objectMapper.writeValueAsString(lightSecSummary));
        } catch (Exception e) {
            log.error("Failed to serialize section results: {}", e.getMessage());
        }

        int totalSectionsInExam = exam.getSections() != null ? exam.getSections().size() : 0;
        if (totalSectionsInExam > 0 && lightSecSummary.size() >= totalSectionsInExam) {
            int totalCorrect = 0;
            int totalQuestions = 0;
            for (Map<String, Object> sm : lightSecSummary) {
                if (sm.get("correctCount") instanceof Number n) totalCorrect += n.intValue();
                if (sm.get("totalQuestions") instanceof Number n) totalQuestions += n.intValue();
            }
            double totalPct = totalQuestions > 0
                    ? Math.round((double) totalCorrect / totalQuestions * 1000.0) / 10.0
                    : 0.0;
            attempt.setTotalCorrect(totalCorrect);
            attempt.setTotalQuestions(totalQuestions);
            attempt.setPercentage(totalPct);
            attempt.setStatus("COMPLETED");
            attempt.setCompletedAt(LocalDateTime.now());
        }

        examDataProvider.saveAttempt(attempt);

        return secRes;
    }

    @Transactional(readOnly = true)
    public AttemptResultDto getAttemptResult(Long userId, Long attemptId) {
        MockExamAttempt attempt = examDataProvider.findAttemptById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized attempt access");
        }

        ExamDetailDto exam = examDataProvider.getExamDetail(attempt.getExamId())
                .orElseThrow(() -> new IllegalStateException("Exam not found: " + attempt.getExamId()));

        Map<String, Integer> correctAnswers = examDataProvider.getCorrectAnswers(attempt.getExamId());
        List<MockExamAnswer> answers = examDataProvider.findAnswersByAttemptId(attemptId);
        Map<String, Integer> userAnswers = new HashMap<>();
        for (MockExamAnswer a : answers) {
            userAnswers.put(a.getQuestionId(), a.getSelectedChoice());
        }

        int totalCorrect = (attempt.getTotalCorrect() != null) ? attempt.getTotalCorrect() : 0;
        int totalQuestions = (attempt.getTotalQuestions() != null) ? attempt.getTotalQuestions() : 0;
        List<SectionResultDto> sectionResults = new ArrayList<>();

        if (exam.getSections() != null) {
            for (SectionDto sec : exam.getSections()) {
                SectionResultDto secRes = new SectionResultDto();
                secRes.setSectionId(sec.getSectionId());
                secRes.setTitle(sec.getTitle());
                secRes.setTitleVi(sec.getTitleVi());

                List<QuestionDto> qList = sec.getQuestions() != null ? sec.getQuestions() : Collections.emptyList();
                secRes.setTotalQuestions(qList.size());

                int secCorrect = 0;
                List<QuestionReviewDto> qReviews = new ArrayList<>();

                for (QuestionDto q : qList) {
                    QuestionReviewDto qRev = new QuestionReviewDto();
                    qRev.setQuestionId(q.getId());
                    qRev.setMondai(q.getMondai());
                    qRev.setQuestionNumber(q.getQuestionNumber());
                    qRev.setQuestionType(q.getQuestionType());
                    qRev.setQuestionText(q.getQuestionText());
                    qRev.setPassage(q.getPassage());
                    qRev.setChoices(q.getChoices() != null ? q.getChoices() : Collections.emptyList());
                    qRev.setImageRef(q.getImageRef());
                    qRev.setAudioStartSec(q.getAudioStartSec());
                    qRev.setAudioEndSec(q.getAudioEndSec());

                    Integer correctAns = correctAnswers.get(q.getId());
                    qRev.setCorrectAnswer(correctAns);

                    Integer userChoice = userAnswers.get(q.getId());
                    qRev.setSelectedChoice(userChoice);

                    boolean isCorrect = (correctAns != null && correctAns.equals(userChoice));
                    qRev.setIsCorrect(isCorrect);
                    if (isCorrect) {
                        secCorrect++;
                    }

                    qReviews.add(qRev);
                }

                secRes.setCorrectCount(secCorrect);
                double secPct = qList.size() > 0
                        ? Math.round((double) secCorrect / qList.size() * 1000.0) / 10.0
                        : 0.0;
                secRes.setPercentage(secPct);
                secRes.setQuestions(qReviews);

                sectionResults.add(secRes);
            }
        }

        AttemptResultDto result = new AttemptResultDto();
        result.setAttemptId(attempt.getId());
        result.setExamId(attempt.getExamId());
        result.setExamTitle(exam.getTitle());
        result.setStatus(attempt.getStatus());
        result.setTotalCorrect(totalCorrect);
        result.setTotalQuestions(totalQuestions);
        result.setPercentage(attempt.getPercentage() != null ? attempt.getPercentage() : 0.0);
        result.setSectionResults(sectionResults);

        return result;
    }

    @Transactional(readOnly = true)
    public List<AttemptHistoryDto> getUserHistory(Long userId) {
        List<MockExamAttempt> attempts = examDataProvider.findAttemptsByUserId(userId);
        List<AttemptHistoryDto> list = new ArrayList<>();

        for (MockExamAttempt att : attempts) {
            AttemptHistoryDto dto = new AttemptHistoryDto();
            dto.setAttemptId(att.getId());
            dto.setExamId(att.getExamId());
            Optional<ExamDetailDto> examOpt = examDataProvider.getExamDetail(att.getExamId());
            dto.setExamTitle(examOpt.map(ExamDetailDto::getTitle).orElse(att.getExamId()));
            dto.setLevel(att.getLevel());
            dto.setYear(att.getExamYear());
            dto.setMonth(att.getExamMonth());
            dto.setStatus(att.getStatus());
            dto.setTotalCorrect(att.getTotalCorrect());
            dto.setTotalQuestions(att.getTotalQuestions());
            dto.setPercentage(att.getPercentage());
            dto.setStartedAt(att.getStartedAt());
            dto.setCompletedAt(att.getCompletedAt());
            list.add(dto);
        }

        return list;
    }
}
