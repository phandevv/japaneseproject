package com.flashcard.exam.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.exam.dto.ExamDetailDto;
import com.flashcard.exam.dto.ExamListItemDto;
import com.flashcard.exam.dto.QuestionDto;
import com.flashcard.exam.dto.SectionDto;
import com.flashcard.exam.model.JlptExam;
import com.flashcard.exam.model.JlptExamQuestion;
import com.flashcard.exam.model.JlptExamSection;
import com.flashcard.exam.repository.JlptExamQuestionRepository;
import com.flashcard.exam.repository.JlptExamRepository;
import com.flashcard.exam.repository.JlptExamSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ExamDataService {

    private static final Logger log = LoggerFactory.getLogger(ExamDataService.class);

    private final JlptExamRepository examRepository;
    private final JlptExamSectionRepository sectionRepository;
    private final JlptExamQuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    public ExamDataService(JlptExamRepository examRepository,
                           JlptExamSectionRepository sectionRepository,
                           JlptExamQuestionRepository questionRepository,
                           ObjectMapper objectMapper) {
        this.examRepository = examRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.objectMapper = objectMapper;
    }

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
            List<QuestionDto> qDtos = new ArrayList<>();

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

                // NOTE: correctAnswer is intentionally hidden here for exam integrity!
                qDtos.add(qDto);
            }

            secDto.setQuestions(qDtos);
            sectionDtos.add(secDto);
        }

        ExamDetailDto detail = new ExamDetailDto();
        detail.setExamId(exam.getId());
        detail.setLevel(exam.getLevel());
        detail.setYear(exam.getYear());
        detail.setMonth(exam.getMonth());
        detail.setTitle(exam.getTitle());
        detail.setTotalQuestions(exam.getTotalQuestions());
        detail.setAudioFile(exam.getAudioFile());
        detail.setSections(sectionDtos);

        return Optional.of(detail);
    }

    @Transactional(readOnly = true)
    public Map<String, Integer> getCorrectAnswers(String examId) {
        List<JlptExamQuestion> questions = questionRepository.findByExamIdOrderByQuestionOrderAsc(examId);
        Map<String, Integer> map = new HashMap<>();
        for (JlptExamQuestion q : questions) {
            map.put(q.getId(), q.getCorrectAnswer());
        }
        return map;
    }

    @Transactional(readOnly = true)
    public List<JlptExamQuestion> getAllQuestions(String examId) {
        return questionRepository.findByExamIdOrderByQuestionOrderAsc(examId);
    }

    @Transactional(readOnly = true)
    public List<JlptExamSection> getSections(String examId) {
        return sectionRepository.findByExamIdOrderBySectionOrderAsc(examId);
    }

    @Transactional(readOnly = true)
    public Optional<JlptExam> getExam(String examId) {
        return examRepository.findById(examId);
    }

    @Transactional(readOnly = true)
    public boolean exists(String examId) {
        return examRepository.existsById(examId);
    }

    public List<String> parseChoices(String choicesJson) {
        if (choicesJson == null || choicesJson.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(choicesJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.error("Failed to parse choices JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
