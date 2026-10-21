package com.flashcard.exam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.exam.dto.*;
import com.flashcard.exam.model.*;
import com.flashcard.exam.repository.MockExamAnswerRepository;
import com.flashcard.exam.repository.MockExamAttemptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class MockExamService {

    private static final Logger log = LoggerFactory.getLogger(MockExamService.class);

    private final MockExamAttemptRepository attemptRepository;
    private final MockExamAnswerRepository answerRepository;
    private final ExamDataService examDataService;
    private final ObjectMapper objectMapper;

    public MockExamService(MockExamAttemptRepository attemptRepository,
                           MockExamAnswerRepository answerRepository,
                           ExamDataService examDataService,
                           ObjectMapper objectMapper) {
        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.examDataService = examDataService;
        this.objectMapper = objectMapper;
    }

    public List<ExamListItemDto> getExamList(Long userId) {
        List<ExamListItemDto> exams = examDataService.getAllExams();
        if (userId == null) {
            return exams;
        }

        List<MockExamAttempt> userAttempts = attemptRepository.findAllByUserIdOrderByStartedAtDesc(userId);
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
        return examDataService.getExamDetail(examId);
    }

    @Transactional
    public AttemptDto startOrResumeAttempt(Long userId, String examId) {
        JlptExam exam = examDataService.getExam(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        ExamDetailDto examDetail = examDataService.getExamDetail(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam details could not be loaded: " + examId));

        Optional<MockExamAttempt> existingOpt = attemptRepository.findInProgressAttempt(userId, examId);
        MockExamAttempt attempt;
        Map<String, Integer> savedAnswers = new HashMap<>();

        if (existingOpt.isPresent()) {
            attempt = existingOpt.get();
            List<MockExamAnswer> answers = answerRepository.findByAttemptId(attempt.getId());
            for (MockExamAnswer ans : answers) {
                if (ans.getSelectedChoice() != null) {
                    savedAnswers.put(ans.getQuestionId(), ans.getSelectedChoice());
                }
            }
        } else {
            attempt = new MockExamAttempt(
                    userId,
                    examId,
                    exam.getLevel(),
                    exam.getYear(),
                    exam.getMonth(),
                    exam.getTotalQuestions()
            );
            attempt = attemptRepository.save(attempt);
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

        return dto;
    }

    @Transactional
    public void saveProgress(Long userId, Long attemptId, SaveProgressRequest request) {
        MockExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized attempt access");
        }

        if (!"IN_PROGRESS".equals(attempt.getStatus())) {
            return;
        }

        attempt.setCurrentSectionIndex(request.getCurrentSectionIndex());
        attempt.setSectionTimeLeftSec(request.getSectionTimeLeftSec());
        attemptRepository.save(attempt);

        if (request.getAnswers() != null && !request.getAnswers().isEmpty()) {
            List<JlptExamQuestion> allQuestions = examDataService.getAllQuestions(attempt.getExamId());
            Map<String, String> qSecMap = new HashMap<>();
            for (JlptExamQuestion q : allQuestions) {
                qSecMap.put(q.getId(), q.getSectionId());
            }

            for (Map.Entry<String, Integer> entry : request.getAnswers().entrySet()) {
                String qId = entry.getKey();
                Integer choice = entry.getValue();
                String sectionId = qSecMap.getOrDefault(qId, "unknown");

                Optional<MockExamAnswer> existingAns = answerRepository.findByAttemptIdAndQuestionId(attemptId, qId);
                MockExamAnswer ans;
                if (existingAns.isPresent()) {
                    ans = existingAns.get();
                    ans.setSelectedChoice(choice);
                } else {
                    ans = new MockExamAnswer(attemptId, sectionId, qId, choice, null);
                }
                answerRepository.save(ans);
            }
        }
    }

    @Transactional
    public AttemptResultDto submitExam(Long userId, Long attemptId, SubmitExamRequest request) {
        MockExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized attempt access");
        }

        if ("COMPLETED".equals(attempt.getStatus())) {
            return getAttemptResult(userId, attemptId);
        }

        JlptExam exam = examDataService.getExam(attempt.getExamId())
                .orElseThrow(() -> new IllegalStateException("Exam not found in database: " + attempt.getExamId()));

        List<JlptExamSection> dbSections = examDataService.getSections(attempt.getExamId());
        List<JlptExamQuestion> dbQuestions = examDataService.getAllQuestions(attempt.getExamId());

        Map<String, String> qSecMap = new HashMap<>();
        for (JlptExamQuestion q : dbQuestions) {
            qSecMap.put(q.getId(), q.getSectionId());
        }

        // Apply any final answers submitted in request
        if (request != null && request.getAnswers() != null && !request.getAnswers().isEmpty()) {
            for (Map.Entry<String, Integer> entry : request.getAnswers().entrySet()) {
                String qId = entry.getKey();
                Integer choice = entry.getValue();
                String sectionId = qSecMap.getOrDefault(qId, "unknown");

                Optional<MockExamAnswer> existingAns = answerRepository.findByAttemptIdAndQuestionId(attemptId, qId);
                MockExamAnswer ans;
                if (existingAns.isPresent()) {
                    ans = existingAns.get();
                    ans.setSelectedChoice(choice);
                } else {
                    ans = new MockExamAnswer(attemptId, sectionId, qId, choice, null);
                }
                answerRepository.save(ans);
            }
        }

        // Fetch all saved answers from DB and merge with submission answers
        List<MockExamAnswer> allSavedAnswers = answerRepository.findByAttemptId(attemptId);
        Map<String, Integer> answerChoiceMap = new HashMap<>();
        Map<String, MockExamAnswer> answerEntityMap = new HashMap<>();
        for (MockExamAnswer a : allSavedAnswers) {
            answerChoiceMap.put(a.getQuestionId(), a.getSelectedChoice());
            answerEntityMap.put(a.getQuestionId(), a);
        }
        if (request != null && request.getAnswers() != null) {
            answerChoiceMap.putAll(request.getAnswers());
        }

        // Group questions by sectionRecordId / sectionId
        Map<String, List<JlptExamQuestion>> sectionQuestions = new LinkedHashMap<>();
        for (JlptExamSection s : dbSections) {
            sectionQuestions.put(s.getSectionId(), new ArrayList<>());
        }
        for (JlptExamQuestion q : dbQuestions) {
            sectionQuestions.computeIfAbsent(q.getSectionId(), k -> new ArrayList<>()).add(q);
        }

        int totalCorrect = 0;
        int totalQuestions = dbQuestions.size();
        List<SectionResultDto> sectionResults = new ArrayList<>();

        for (JlptExamSection sec : dbSections) {
            SectionResultDto secRes = new SectionResultDto();
            secRes.setSectionId(sec.getSectionId());
            secRes.setTitle(sec.getTitle());
            secRes.setTitleVi(sec.getTitleVi());

            List<JlptExamQuestion> qList = sectionQuestions.getOrDefault(sec.getSectionId(), Collections.emptyList());
            secRes.setTotalQuestions(qList.size());

            int secCorrect = 0;
            List<QuestionReviewDto> qReviews = new ArrayList<>();

            for (JlptExamQuestion q : qList) {
                QuestionReviewDto qRev = new QuestionReviewDto();
                qRev.setQuestionId(q.getId());
                qRev.setMondai(q.getMondai());
                qRev.setQuestionNumber(q.getQuestionNumber());
                qRev.setQuestionType(q.getQuestionType());
                qRev.setQuestionText(q.getQuestionText());
                qRev.setPassage(q.getPassage());
                qRev.setChoices(examDataService.parseChoices(q.getChoicesJson()));
                qRev.setImageRef(q.getImageRef());
                qRev.setAudioStartSec(q.getAudioStartSec());
                qRev.setAudioEndSec(q.getAudioEndSec());

                Integer correctAns = q.getCorrectAnswer();
                qRev.setCorrectAnswer(correctAns);

                MockExamAnswer userAns = answerEntityMap.get(q.getId());
                Integer userChoice = answerChoiceMap.get(q.getId());
                qRev.setSelectedChoice(userChoice);

                boolean isCorrect = (correctAns != null && correctAns.equals(userChoice));
                qRev.setIsCorrect(isCorrect);

                if (isCorrect) {
                    secCorrect++;
                    totalCorrect++;
                }

                if (userAns != null) {
                    userAns.setCorrect(isCorrect);
                    userAns.setSelectedChoice(userChoice);
                    answerRepository.save(userAns);
                } else if (userChoice != null) {
                    MockExamAnswer newAns = new MockExamAnswer(attemptId, sec.getSectionId(), q.getId(), userChoice, isCorrect);
                    answerRepository.save(newAns);
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

        attemptRepository.save(attempt);

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

    @Transactional(readOnly = true)
    public AttemptResultDto getAttemptResult(Long userId, Long attemptId) {
        MockExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized attempt access");
        }

        JlptExam exam = examDataService.getExam(attempt.getExamId())
                .orElseThrow(() -> new IllegalStateException("Exam not found: " + attempt.getExamId()));

        List<JlptExamSection> dbSections = examDataService.getSections(attempt.getExamId());
        List<JlptExamQuestion> dbQuestions = examDataService.getAllQuestions(attempt.getExamId());

        List<MockExamAnswer> answers = answerRepository.findByAttemptId(attemptId);
        Map<String, Integer> userAnswers = new HashMap<>();
        for (MockExamAnswer a : answers) {
            userAnswers.put(a.getQuestionId(), a.getSelectedChoice());
        }

        Map<String, List<JlptExamQuestion>> sectionQuestions = new LinkedHashMap<>();
        for (JlptExamSection s : dbSections) {
            sectionQuestions.put(s.getSectionId(), new ArrayList<>());
        }
        for (JlptExamQuestion q : dbQuestions) {
            sectionQuestions.computeIfAbsent(q.getSectionId(), k -> new ArrayList<>()).add(q);
        }

        List<SectionResultDto> sectionResults = new ArrayList<>();

        for (JlptExamSection sec : dbSections) {
            SectionResultDto secRes = new SectionResultDto();
            secRes.setSectionId(sec.getSectionId());
            secRes.setTitle(sec.getTitle());
            secRes.setTitleVi(sec.getTitleVi());

            List<JlptExamQuestion> qList = sectionQuestions.getOrDefault(sec.getSectionId(), Collections.emptyList());
            secRes.setTotalQuestions(qList.size());

            int secCorrect = 0;
            List<QuestionReviewDto> qReviews = new ArrayList<>();

            for (JlptExamQuestion q : qList) {
                QuestionReviewDto qRev = new QuestionReviewDto();
                qRev.setQuestionId(q.getId());
                qRev.setMondai(q.getMondai());
                qRev.setQuestionNumber(q.getQuestionNumber());
                qRev.setQuestionType(q.getQuestionType());
                qRev.setQuestionText(q.getQuestionText());
                qRev.setPassage(q.getPassage());
                qRev.setChoices(examDataService.parseChoices(q.getChoicesJson()));
                qRev.setImageRef(q.getImageRef());
                qRev.setAudioStartSec(q.getAudioStartSec());
                qRev.setAudioEndSec(q.getAudioEndSec());

                Integer correctAns = q.getCorrectAnswer();
                qRev.setCorrectAnswer(correctAns);

                Integer userChoice = userAnswers.get(q.getId());
                qRev.setSelectedChoice(userChoice);

                boolean isCorrect = (correctAns != null && correctAns.equals(userChoice));
                qRev.setIsCorrect(isCorrect);
                if (isCorrect) secCorrect++;

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

        AttemptResultDto result = new AttemptResultDto();
        result.setAttemptId(attempt.getId());
        result.setExamId(attempt.getExamId());
        result.setExamTitle(exam.getTitle());
        result.setStatus(attempt.getStatus());
        result.setTotalCorrect(attempt.getTotalCorrect());
        result.setTotalQuestions(attempt.getTotalQuestions());
        result.setPercentage(attempt.getPercentage());
        result.setSectionResults(sectionResults);

        return result;
    }

    @Transactional(readOnly = true)
    public List<AttemptHistoryDto> getUserHistory(Long userId) {
        List<MockExamAttempt> attempts = attemptRepository.findAllByUserIdOrderByStartedAtDesc(userId);
        List<AttemptHistoryDto> list = new ArrayList<>();

        for (MockExamAttempt att : attempts) {
            AttemptHistoryDto dto = new AttemptHistoryDto();
            dto.setAttemptId(att.getId());
            dto.setExamId(att.getExamId());
            Optional<JlptExam> examOpt = examDataService.getExam(att.getExamId());
            dto.setExamTitle(examOpt.map(JlptExam::getTitle).orElse(att.getExamId()));
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
