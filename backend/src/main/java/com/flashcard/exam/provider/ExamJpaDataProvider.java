package com.flashcard.exam.provider;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.exam.dto.ExamDetailDto;
import com.flashcard.exam.dto.ExamListItemDto;
import com.flashcard.exam.dto.QuestionDto;
import com.flashcard.exam.dto.QuestionReviewDto;
import com.flashcard.exam.dto.SectionDto;
import com.flashcard.exam.model.JlptExam;
import com.flashcard.exam.model.JlptExamQuestion;
import com.flashcard.exam.model.JlptExamSection;
import com.flashcard.exam.model.MockExamAnswer;
import com.flashcard.exam.model.MockExamAttempt;
import com.flashcard.exam.repository.JlptExamQuestionRepository;
import com.flashcard.exam.repository.JlptExamRepository;
import com.flashcard.exam.repository.JlptExamSectionRepository;
import com.flashcard.exam.repository.MockExamAnswerRepository;
import com.flashcard.exam.repository.MockExamAttemptRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class ExamJpaDataProvider implements ExamDataProvider {

    private final JlptExamRepository examRepository;
    private final JlptExamSectionRepository sectionRepository;
    private final JlptExamQuestionRepository questionRepository;
    private final MockExamAttemptRepository attemptRepository;
    private final MockExamAnswerRepository answerRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public ExamJpaDataProvider(JlptExamRepository examRepository,
                               JlptExamSectionRepository sectionRepository,
                               JlptExamQuestionRepository questionRepository,
                               MockExamAttemptRepository attemptRepository,
                               MockExamAnswerRepository answerRepository,
                               ObjectMapper objectMapper) {
        this.examRepository = examRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public long countExams() {
        return examRepository.count();
    }

    @Override
    public long countQuestions() {
        return questionRepository.count();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExamListItemDto> getAllExams() {
        List<JlptExam> exams = examRepository.findAllByOrderByYearDescMonthDesc();
        List<ExamListItemDto> list = new ArrayList<>();

        for (JlptExam e : exams) {
            List<JlptExamSection> sections = sectionRepository.findByExamIdOrderBySectionOrderAsc(e.getId());
            int totalTimeSec = 0;
            for (JlptExamSection s : sections) {
                totalTimeSec += s.getTimeLimitSec();
            }

            ExamListItemDto dto = new ExamListItemDto();
            dto.setExamId(e.getId());
            dto.setLevel(e.getLevel());
            dto.setYear(e.getYear());
            dto.setMonth(e.getMonth());
            dto.setTitle(e.getTitle());
            dto.setTotalQuestions(e.getTotalQuestions());
            dto.setTotalSections(sections.size());
            dto.setTotalTimeSec(totalTimeSec);

            list.add(dto);
        }

        return list;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ExamDetailDto> getExamDetail(String examId) {
        Optional<JlptExam> examOpt = examRepository.findById(examId);
        if (examOpt.isEmpty()) return Optional.empty();

        JlptExam exam = examOpt.get();
        List<JlptExamSection> dbSections = sectionRepository.findByExamIdOrderBySectionOrderAsc(examId);
        List<SectionDto> sectionDtos = new ArrayList<>();

        for (JlptExamSection dbSec : dbSections) {
            SectionDto secDto = new SectionDto();
            secDto.setSectionId(dbSec.getSectionId());
            secDto.setTitle(dbSec.getTitle());
            secDto.setTitleVi(dbSec.getTitleVi());
            secDto.setTimeLimitSec(dbSec.getTimeLimitSec());
            secDto.setTotalQuestions(dbSec.getTotalQuestions());

            List<JlptExamQuestion> dbQuestions = questionRepository.findBySectionRecordIdOrderByQuestionOrderAsc(dbSec.getId());
            List<QuestionDto> questionDtos = new ArrayList<>();

            for (JlptExamQuestion dbQ : dbQuestions) {
                QuestionDto qDto = new QuestionDto();
                qDto.setId(dbQ.getId());
                qDto.setSection(dbQ.getSectionId());
                qDto.setMondai(dbQ.getMondai());
                qDto.setQuestionNumber(dbQ.getQuestionNumber());
                qDto.setQuestionType(dbQ.getQuestionType());
                qDto.setQuestionText(dbQ.getQuestionText());
                qDto.setPassage(dbQ.getPassage());
                qDto.setImageRef(dbQ.getImageRef());
                qDto.setAudioStartSec(dbQ.getAudioStartSec());
                qDto.setAudioEndSec(dbQ.getAudioEndSec());
                qDto.setChoices(parseChoices(dbQ.getChoicesJson()));

                questionDtos.add(qDto);
            }

            secDto.setQuestions(questionDtos);
            sectionDtos.add(secDto);
        }

        ExamDetailDto dto = new ExamDetailDto();
        dto.setExamId(exam.getId());
        dto.setLevel(exam.getLevel());
        dto.setYear(exam.getYear());
        dto.setMonth(exam.getMonth());
        dto.setTitle(exam.getTitle());
        dto.setTotalQuestions(exam.getTotalQuestions());
        dto.setAudioFile(exam.getAudioFile());
        dto.setSections(sectionDtos);

        return Optional.of(dto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QuestionReviewDto> getQuestionDetail(String examId, String questionId) {
        Optional<JlptExamQuestion> qOpt = questionRepository.findById(questionId);
        if (qOpt.isEmpty()) return Optional.empty();

        JlptExamQuestion dbQ = qOpt.get();
        QuestionReviewDto dto = new QuestionReviewDto();
        dto.setQuestionId(dbQ.getId());
        dto.setMondai(dbQ.getMondai());
        dto.setQuestionNumber(dbQ.getQuestionNumber());
        dto.setQuestionType(dbQ.getQuestionType());
        dto.setPassage(dbQ.getPassage());
        dto.setQuestionText(dbQ.getQuestionText());
        dto.setChoices(parseChoices(dbQ.getChoicesJson()));
        dto.setCorrectAnswer(dbQ.getCorrectAnswer());
        dto.setImageRef(dbQ.getImageRef());
        dto.setAudioStartSec(dbQ.getAudioStartSec());
        dto.setAudioEndSec(dbQ.getAudioEndSec());

        return Optional.of(dto);
    }

    @Override
    @Transactional
    public void saveExamDetail(ExamDetailDto dto) {
        JlptExam exam = new JlptExam(dto.getExamId(), dto.getLevel(), dto.getYear(), dto.getMonth(),
                dto.getTitle(), dto.getTotalQuestions(), dto.getAudioFile());
        examRepository.save(exam);

        if (dto.getSections() != null) {
            int secOrder = 0;
            for (SectionDto secDto : dto.getSections()) {
                secOrder++;
                String sectionRecordId = dto.getExamId() + "-" + secDto.getSectionId();
                JlptExamSection sec = new JlptExamSection(
                        sectionRecordId, dto.getExamId(), secDto.getSectionId(),
                        secDto.getTitle(), secDto.getTitleVi(), secOrder,
                        secDto.getTimeLimitSec(), secDto.getTotalQuestions()
                );
                sectionRepository.save(sec);

                if (secDto.getQuestions() != null) {
                    for (int i = 0; i < secDto.getQuestions().size(); i++) {
                        QuestionDto q = secDto.getQuestions().get(i);
                        String choicesJson = "[]";
                        try {
                            if (q.getChoices() != null) {
                                choicesJson = objectMapper.writeValueAsString(q.getChoices());
                            }
                        } catch (Exception ignored) {}

                        JlptExamQuestion entity = new JlptExamQuestion();
                        entity.setId(q.getId());
                        entity.setExamId(dto.getExamId());
                        entity.setSectionId(secDto.getSectionId());
                        entity.setSectionRecordId(sectionRecordId);
                        entity.setMondai(q.getMondai());
                        entity.setQuestionNumber(q.getQuestionNumber());
                        entity.setQuestionType(q.getQuestionType());
                        entity.setQuestionText(q.getQuestionText());
                        entity.setPassage(q.getPassage());
                        entity.setChoicesJson(choicesJson);
                        entity.setCorrectAnswer(1);
                        entity.setImageRef(q.getImageRef());
                        entity.setAudioStartSec(q.getAudioStartSec());
                        entity.setAudioEndSec(q.getAudioEndSec());
                        entity.setQuestionOrder(i + 1);

                        questionRepository.save(entity);
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public MockExamAttempt saveAttempt(MockExamAttempt attempt) {
        return attemptRepository.save(attempt);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MockExamAttempt> findAttemptById(Long attemptId) {
        return attemptRepository.findById(attemptId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MockExamAttempt> findAttemptByIdAndUserId(Long attemptId, Long userId) {
        return attemptRepository.findByIdAndUserId(attemptId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MockExamAttempt> findInProgressAttempt(Long userId, String examId) {
        return attemptRepository.findInProgressAttempt(userId, examId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockExamAttempt> findAttemptsByUserId(Long userId) {
        return attemptRepository.findAllByUserIdOrderByStartedAtDesc(userId);
    }

    @Override
    @Transactional
    public MockExamAnswer saveAnswer(MockExamAnswer answer) {
        return answerRepository.save(answer);
    }

    @Override
    @Transactional
    public List<MockExamAnswer> saveAllAnswers(List<MockExamAnswer> answers) {
        return answerRepository.saveAll(answers);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockExamAnswer> findAnswersByAttemptId(Long attemptId) {
        return answerRepository.findByAttemptId(attemptId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Integer> getCorrectAnswers(String examId) {
        List<JlptExamQuestion> questions = questionRepository.findByExamIdOrderByQuestionOrderAsc(examId);
        Map<String, Integer> map = new HashMap<>();
        for (JlptExamQuestion q : questions) {
            map.put(q.getId(), q.getCorrectAnswer());
        }
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsExam(String examId) {
        return examRepository.existsById(examId);
    }

    private List<String> parseChoices(String choicesJson) {
        if (choicesJson == null || choicesJson.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(choicesJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
