package com.flashcard.exam.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.exam.document.ExamQuestionDoc;
import com.flashcard.exam.document.ExamSectionDoc;
import com.flashcard.exam.document.JlptExamDoc;
import com.flashcard.exam.document.MockExamAnswerItemDoc;
import com.flashcard.exam.document.MockExamAttemptDoc;
import com.flashcard.exam.dto.ExamDetailDto;
import com.flashcard.exam.dto.ExamListItemDto;
import com.flashcard.exam.dto.QuestionDto;
import com.flashcard.exam.dto.QuestionReviewDto;
import com.flashcard.exam.dto.SectionDto;
import com.flashcard.exam.model.MockExamAnswer;
import com.flashcard.exam.model.MockExamAttempt;
import com.flashcard.exam.repository.mongo.JlptExamMongoRepository;
import com.flashcard.exam.repository.mongo.MockExamAttemptMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class ExamMongoDataProvider implements ExamDataProvider {

    private static final Logger log = LoggerFactory.getLogger(ExamMongoDataProvider.class);

    private final JlptExamMongoRepository examMongoRepository;
    private final MockExamAttemptMongoRepository attemptMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired(required = false)
    private MongoTemplate mongoTemplate;

    // Fast in-memory caches to speed up exam listing and exam question loading
    private volatile List<ExamListItemDto> cachedExamList = null;
    private final Map<String, ExamDetailDto> examDetailCache = new ConcurrentHashMap<>();

    @Autowired
    public ExamMongoDataProvider(JlptExamMongoRepository examMongoRepository,
                                 MockExamAttemptMongoRepository attemptMongoRepository,
                                 SequenceGeneratorService sequenceGeneratorService) {
        this.examMongoRepository = examMongoRepository;
        this.attemptMongoRepository = attemptMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @PostConstruct
    public void initIndexes() {
        if (mongoTemplate == null) return;
        try {
            IndexOperations examIndexOps = mongoTemplate.indexOps(JlptExamDoc.class);
            examIndexOps.ensureIndex(new Index().on("level", Sort.Direction.ASC).on("examYear", Sort.Direction.DESC).on("examMonth", Sort.Direction.DESC));
            examIndexOps.ensureIndex(new Index().on("examYear", Sort.Direction.DESC).on("examMonth", Sort.Direction.DESC));
            examIndexOps.ensureIndex(new Index().on("sections.questions.id", Sort.Direction.ASC));

            IndexOperations attemptIndexOps = mongoTemplate.indexOps(MockExamAttemptDoc.class);
            attemptIndexOps.ensureIndex(new Index().on("userId", Sort.Direction.ASC).on("startedAt", Sort.Direction.DESC));
            attemptIndexOps.ensureIndex(new Index().on("userId", Sort.Direction.ASC).on("examId", Sort.Direction.ASC).on("startedAt", Sort.Direction.DESC));
            attemptIndexOps.ensureIndex(new Index().on("userId", Sort.Direction.ASC).on("examId", Sort.Direction.ASC).on("status", Sort.Direction.ASC).on("startedAt", Sort.Direction.DESC));
            attemptIndexOps.ensureIndex(new Index().on("userId", Sort.Direction.ASC).on("completedAt", Sort.Direction.DESC));
            log.info("MongoDB compound indexes for jlpt_exams and mock_exam_attempts verified and initialized.");
        } catch (Exception e) {
            log.warn("Failed to initialize MongoDB indexes for mock exams: {}", e.getMessage());
        }
    }

    @Override
    public long countExams() {
        return examMongoRepository.count();
    }

    @Override
    public long countQuestions() {
        long total = 0;
        List<JlptExamDoc> all = examMongoRepository.findAll();
        for (JlptExamDoc doc : all) {
            if (doc.getTotalQuestions() != null) {
                total += doc.getTotalQuestions();
            } else if (doc.getSections() != null) {
                for (ExamSectionDoc s : doc.getSections()) {
                    if (s.getQuestions() != null) total += s.getQuestions().size();
                }
            }
        }
        return total;
    }

    @Override
    public List<ExamListItemDto> getAllExams() {
        if (cachedExamList != null) {
            return cachedExamList;
        }

        List<JlptExamDoc> docs = examMongoRepository.findAllByOrderByExamYearDescExamMonthDesc();
        List<ExamListItemDto> list = new ArrayList<>();

        for (JlptExamDoc doc : docs) {
            int totalTimeSec = 0;
            int sectionCount = (doc.getSections() != null) ? doc.getSections().size() : 0;
            if (doc.getSections() != null) {
                for (ExamSectionDoc s : doc.getSections()) {
                    totalTimeSec += (s.getTimeLimitMinutes() != null) ? (s.getTimeLimitMinutes() * 60) : 0;
                }
            }

            ExamListItemDto dto = new ExamListItemDto();
            dto.setExamId(doc.getId());
            dto.setLevel(doc.getLevel());
            dto.setYear(doc.getExamYear());
            dto.setMonth(doc.getExamMonth());
            dto.setTitle(doc.getTitle());
            dto.setTotalQuestions(doc.getTotalQuestions());
            dto.setTotalSections(sectionCount);
            dto.setTotalTimeSec(totalTimeSec);

            list.add(dto);
        }

        cachedExamList = list;
        return list;
    }

    @Override
    public Optional<ExamDetailDto> getExamDetail(String examId) {
        if (examId == null) return Optional.empty();
        ExamDetailDto cached = examDetailCache.get(examId);
        if (cached != null) {
            return Optional.of(cached);
        }

        Optional<JlptExamDoc> docOpt = examMongoRepository.findById(examId);
        if (docOpt.isEmpty()) return Optional.empty();

        JlptExamDoc doc = docOpt.get();
        List<SectionDto> sectionDtos = new ArrayList<>();

        if (doc.getSections() != null) {
            int secIdx = 0;
            for (ExamSectionDoc s : doc.getSections()) {
                secIdx++;
                String secId = s.getId();
                if (secId == null || secId.isBlank()) {
                    secId = s.getSectionType() != null ? s.getSectionType().toLowerCase() : ("sec-" + secIdx);
                }

                SectionDto sDto = new SectionDto();
                sDto.setSectionId(secId);
                sDto.setTitle(s.getTitle());
                sDto.setTitleVi(s.getTitle());
                sDto.setTimeLimitSec((s.getTimeLimitMinutes() != null) ? s.getTimeLimitMinutes() * 60 : 1800);
                sDto.setTotalQuestions((s.getQuestions() != null) ? s.getQuestions().size() : 0);

                List<QuestionDto> qDtos = new ArrayList<>();
                if (s.getQuestions() != null) {
                    int qIdx = 0;
                    for (ExamQuestionDoc q : s.getQuestions()) {
                        qIdx++;
                        int mondai = (q.getMondaiNumber() != null) ? q.getMondaiNumber() : 1;
                        int qNum = (q.getQuestionNumber() != null) ? q.getQuestionNumber() : qIdx;

                        String qId = q.getId();
                        if (qId == null || qId.isBlank()) {
                            qId = doc.getId() + "-" + secId + "-m" + mondai + "-q" + qNum;
                        }

                        QuestionDto qDto = new QuestionDto();
                        qDto.setId(qId);
                        qDto.setSection(secId);
                        qDto.setMondai(mondai);
                        qDto.setQuestionNumber(qNum);
                        qDto.setQuestionType(s.getSectionType());
                        qDto.setPassage(q.getPassageText());
                        qDto.setQuestionText(q.getQuestionText());
                        qDto.setChoices(q.getChoices() != null ? q.getChoices() : Collections.emptyList());
                        qDto.setImageRef(q.getImageUrl());
                        if (q.getAudioTimestampSeconds() != null) {
                            qDto.setAudioStartSec(q.getAudioTimestampSeconds().doubleValue());
                        }
                        qDtos.add(qDto);
                    }
                }
                sDto.setQuestions(qDtos);
                sectionDtos.add(sDto);
            }
        }

        ExamDetailDto dto = new ExamDetailDto();
        dto.setExamId(doc.getId());
        dto.setLevel(doc.getLevel());
        dto.setYear(doc.getExamYear());
        dto.setMonth(doc.getExamMonth());
        dto.setTitle(doc.getTitle());
        dto.setTotalQuestions(doc.getTotalQuestions());
        dto.setAudioFile(doc.getAudioFile());
        dto.setSections(sectionDtos);

        examDetailCache.put(examId, dto);
        return Optional.of(dto);
    }

    @Override
    public Optional<QuestionReviewDto> getQuestionDetail(String examId, String questionId) {
        if (examId == null || examId.isBlank()) {
            int secondDash = questionId.indexOf('-', 3);
            if (secondDash != -1) {
                int thirdDash = questionId.indexOf('-', secondDash + 1);
                if (thirdDash != -1) {
                    examId = questionId.substring(0, thirdDash);
                }
            }
        }

        Optional<JlptExamDoc> docOpt = (examId != null) ? examMongoRepository.findById(examId) : Optional.empty();
        if (docOpt.isEmpty()) {
            List<JlptExamDoc> all = examMongoRepository.findAll();
            for (JlptExamDoc d : all) {
                Optional<QuestionReviewDto> res = findQuestionInDoc(d, questionId);
                if (res.isPresent()) return res;
            }
            return Optional.empty();
        }

        return findQuestionInDoc(docOpt.get(), questionId);
    }

    private Optional<QuestionReviewDto> findQuestionInDoc(JlptExamDoc doc, String questionId) {
        if (doc.getSections() == null) return Optional.empty();
        for (ExamSectionDoc s : doc.getSections()) {
            if (s.getQuestions() == null) continue;
            for (ExamQuestionDoc q : s.getQuestions()) {
                if (questionId.equals(q.getId())) {
                    QuestionReviewDto dto = new QuestionReviewDto();
                    dto.setQuestionId(q.getId());
                    dto.setMondai((q.getMondaiNumber() != null) ? q.getMondaiNumber() : 1);
                    dto.setQuestionNumber((q.getQuestionNumber() != null) ? q.getQuestionNumber() : 1);
                    dto.setQuestionType(s.getSectionType());
                    dto.setPassage(q.getPassageText());
                    dto.setQuestionText(q.getQuestionText());
                    dto.setChoices(q.getChoices() != null ? q.getChoices() : Collections.emptyList());
                    dto.setCorrectAnswer(q.getCorrectAnswer());
                    dto.setImageRef(q.getImageUrl());
                    if (q.getAudioTimestampSeconds() != null) {
                        dto.setAudioStartSec(q.getAudioTimestampSeconds().doubleValue());
                    }
                    return Optional.of(dto);
                }
            }
        }
        return Optional.empty();
    }

    @Override
    public void saveExamDetail(ExamDetailDto dto) {
        JlptExamDoc doc = new JlptExamDoc();
        doc.setId(dto.getExamId());
        doc.setLevel(dto.getLevel());
        doc.setExamYear(dto.getYear());
        doc.setExamMonth(dto.getMonth());
        doc.setTitle(dto.getTitle());
        doc.setTotalQuestions(dto.getTotalQuestions());
        doc.setAudioFile(dto.getAudioFile());
        doc.setCreatedAt(LocalDateTime.now());

        List<ExamSectionDoc> sections = new ArrayList<>();
        if (dto.getSections() != null) {
            int order = 0;
            for (SectionDto sDto : dto.getSections()) {
                order++;
                ExamSectionDoc s = new ExamSectionDoc();
                s.setId(sDto.getSectionId());
                s.setSectionType(sDto.getSectionId());
                s.setTitle(sDto.getTitle());
                s.setTimeLimitMinutes(sDto.getTimeLimitSec() > 0 ? sDto.getTimeLimitSec() / 60 : 30);
                s.setOrderIndex(order);

                List<ExamQuestionDoc> questions = new ArrayList<>();
                if (sDto.getQuestions() != null) {
                    for (QuestionDto qDto : sDto.getQuestions()) {
                        ExamQuestionDoc q = new ExamQuestionDoc();
                        q.setId(qDto.getId());
                        q.setMondaiNumber(qDto.getMondai());
                        q.setQuestionNumber(qDto.getQuestionNumber());
                        q.setPassageText(qDto.getPassage());
                        q.setQuestionText(qDto.getQuestionText());
                        q.setChoices(qDto.getChoices());
                        q.setCorrectAnswer(1);
                        q.setPoints(1);
                        if (qDto.getAudioStartSec() != null) {
                            q.setAudioTimestampSeconds(qDto.getAudioStartSec().intValue());
                        }
                        q.setImageUrl(qDto.getImageRef());
                        questions.add(q);
                    }
                }
                s.setQuestions(questions);
                sections.add(s);
            }
        }
        doc.setSections(sections);
        examMongoRepository.save(doc);
        cachedExamList = null;
        if (dto.getExamId() != null) {
            examDetailCache.remove(dto.getExamId());
        }
    }

    @Override
    public MockExamAttempt saveAttempt(MockExamAttempt attempt) {
        if (attempt.getId() == null) {
            long newId = sequenceGeneratorService.generateSequence("mock_exam_attempts_seq");
            attempt.setId(newId);
        }

        MockExamAttemptDoc doc = toDoc(attempt);
        Optional<MockExamAttemptDoc> existing = attemptMongoRepository.findById(attempt.getId());
        if (existing.isPresent()) {
            doc.setAnswers(existing.get().getAnswers());
        }
        attemptMongoRepository.save(doc);
        return attempt;
    }

    @Override
    public Optional<MockExamAttempt> findAttemptById(Long attemptId) {
        return attemptMongoRepository.findById(attemptId).map(this::toEntity);
    }

    @Override
    public Optional<MockExamAttempt> findAttemptByIdAndUserId(Long attemptId, Long userId) {
        return attemptMongoRepository.findByIdAndUserId(attemptId, userId).map(this::toEntity);
    }

    @Override
    public Optional<MockExamAttempt> findInProgressAttempt(Long userId, String examId) {
        return attemptMongoRepository
                .findFirstByUserIdAndExamIdAndStatusOrderByStartedAtDesc(userId, examId, "IN_PROGRESS")
                .map(this::toEntity);
    }

    @Override
    public List<MockExamAttempt> findAttemptsByUserId(Long userId) {
        List<MockExamAttemptDoc> docs = attemptMongoRepository.findAllByUserIdOrderByStartedAtDesc(userId);
        List<MockExamAttempt> list = new ArrayList<>();
        for (MockExamAttemptDoc d : docs) {
            list.add(toEntity(d));
        }
        return list;
    }

    @Override
    public MockExamAnswer saveAnswer(MockExamAnswer answer) {
        saveAllAnswers(List.of(answer));
        return answer;
    }

    @Override
    public List<MockExamAnswer> saveAllAnswers(List<MockExamAnswer> answers) {
        if (answers == null || answers.isEmpty()) return Collections.emptyList();
        Long attemptId = answers.get(0).getAttemptId();

        Optional<MockExamAttemptDoc> attOpt = attemptMongoRepository.findById(attemptId);
        if (attOpt.isPresent()) {
            MockExamAttemptDoc att = attOpt.get();
            List<MockExamAnswerItemDoc> currentAnswers = att.getAnswers();
            if (currentAnswers == null) currentAnswers = new ArrayList<>();

            for (MockExamAnswer a : answers) {
                currentAnswers.removeIf(item -> a.getQuestionId().equals(item.getQuestionId()));
                MockExamAnswerItemDoc item = new MockExamAnswerItemDoc(
                        a.getQuestionId(),
                        a.getSelectedChoice(),
                        a.getCorrect(),
                        (a.getCreatedAt() != null) ? a.getCreatedAt() : LocalDateTime.now()
                );
                currentAnswers.add(item);
            }
            att.setAnswers(currentAnswers);
            attemptMongoRepository.save(att);
        }

        return answers;
    }

    @Override
    public List<MockExamAnswer> findAnswersByAttemptId(Long attemptId) {
        Optional<MockExamAttemptDoc> attOpt = attemptMongoRepository.findById(attemptId);
        if (attOpt.isEmpty() || attOpt.get().getAnswers() == null) {
            return Collections.emptyList();
        }

        List<MockExamAnswer> list = new ArrayList<>();
        long fakeId = 1;
        for (MockExamAnswerItemDoc item : attOpt.get().getAnswers()) {
            MockExamAnswer a = new MockExamAnswer(
                    attemptId,
                    "section",
                    item.getQuestionId(),
                    item.getSelectedAnswer(),
                    item.getIsCorrect()
            );
            a.setId(fakeId++);
            if (item.getAnsweredAt() != null) {
                a.setCreatedAt(item.getAnsweredAt());
            }
            list.add(a);
        }
        return list;
    }

    @Override
    public Map<String, Integer> getCorrectAnswers(String examId) {
        Optional<JlptExamDoc> docOpt = examMongoRepository.findById(examId);
        if (docOpt.isEmpty()) return Collections.emptyMap();
        JlptExamDoc doc = docOpt.get();
        Map<String, Integer> map = new HashMap<>();
        if (doc.getSections() != null) {
            for (ExamSectionDoc section : doc.getSections()) {
                if (section.getQuestions() != null) {
                    for (ExamQuestionDoc q : section.getQuestions()) {
                        map.put(q.getId(), q.getCorrectAnswer());
                    }
                }
            }
        }
        return map;
    }

    @Override
    public boolean existsExam(String examId) {
        return examMongoRepository.existsById(examId);
    }

    private MockExamAttemptDoc toDoc(MockExamAttempt att) {
        MockExamAttemptDoc doc = new MockExamAttemptDoc();
        doc.setId(att.getId());
        doc.setUserId(att.getUserId());
        doc.setExamId(att.getExamId());
        doc.setStatus(att.getStatus());
        doc.setPercentage(att.getPercentage());
        doc.setTotalCorrect(att.getTotalCorrect());
        doc.setTotalQuestions(att.getTotalQuestions());
        doc.setStartedAt(att.getStartedAt());
        doc.setSubmittedAt(att.getCompletedAt());
        return doc;
    }

    private MockExamAttempt toEntity(MockExamAttemptDoc doc) {
        MockExamAttempt entity = new MockExamAttempt(
                doc.getUserId(),
                doc.getExamId(),
                "N3",
                0,
                0,
                doc.getTotalQuestions() != null ? doc.getTotalQuestions() : 0
        );
        entity.setId(doc.getId());
        entity.setStatus(doc.getStatus());
        entity.setPercentage(doc.getPercentage() != null ? doc.getPercentage() : 0.0);
        entity.setTotalCorrect(doc.getTotalCorrect() != null ? doc.getTotalCorrect() : 0);
        entity.setStartedAt(doc.getStartedAt());
        entity.setCompletedAt(doc.getSubmittedAt());
        return entity;
    }
}
