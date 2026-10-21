package com.flashcard.exam.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.exam.model.JlptExam;
import com.flashcard.exam.model.JlptExamQuestion;
import com.flashcard.exam.model.JlptExamSection;
import com.flashcard.exam.repository.JlptExamQuestionRepository;
import com.flashcard.exam.repository.JlptExamRepository;
import com.flashcard.exam.repository.JlptExamSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@Order(10)
public class ExamDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ExamDataLoader.class);

    private final JlptExamRepository examRepository;
    private final JlptExamSectionRepository sectionRepository;
    private final JlptExamQuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    public ExamDataLoader(JlptExamRepository examRepository,
                          JlptExamSectionRepository sectionRepository,
                          JlptExamQuestionRepository questionRepository,
                          ObjectMapper objectMapper) {
        this.examRepository = examRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) {
        try {
            long existingExams = examRepository.count();
            long existingQuestions = questionRepository.count();

            boolean hasAuthenticData = false;
            if (existingExams >= 30 && existingQuestions > 2500) {
                Optional<JlptExamQuestion> sampleQ = questionRepository.findById("n3-2023-07-vocab-m1-q1");
                if (sampleQ.isPresent() && sampleQ.get().getChoicesJson() != null && sampleQ.get().getChoicesJson().contains("ふくしゅう")) {
                    hasAuthenticData = true;
                }
            }

            if (hasAuthenticData) {
                log.info("JLPT N3 authentic exam data already loaded in database ({} exams, {} questions).",
                        existingExams, existingQuestions);
                return;
            }

            log.info("Seeding authentic JLPT N3 real exam dataset into database...");
            List<InputStream> streams = getExamInputStreams();

            int examsLoaded = 0;
            int sectionsLoaded = 0;
            int questionsLoaded = 0;

            for (InputStream is : streams) {
                try {
                    int[] counts = importSingleExam(is);
                    examsLoaded += counts[0];
                    sectionsLoaded += counts[1];
                    questionsLoaded += counts[2];
                } catch (Exception e) {
                    log.error("Failed to import exam JSON: {}", e.getMessage(), e);
                } finally {
                    try { is.close(); } catch (Exception ignored) {}
                }
            }

            log.info("JLPT N3 real dataset seeded into database successfully: {} exams, {} sections, {} questions.",
                    examsLoaded, sectionsLoaded, questionsLoaded);
        } catch (Exception e) {
            log.error("Error during JLPT N3 real exam data loading: {}", e.getMessage(), e);
        }
    }

    private List<InputStream> getExamInputStreams() {
        List<InputStream> streams = new ArrayList<>();
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath*:static/exams/n3/*.json");
            for (Resource r : resources) {
                try {
                    streams.add(r.getInputStream());
                } catch (Exception e) {
                    log.warn("Could not open stream for resource {}: {}", r.getFilename(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Classpath scanning for exams failed: {}", e.getMessage());
        }

        if (streams.isEmpty()) {
            String[] candidateDirs = {
                "backend/src/main/resources/static/exams/n3",
                "src/main/resources/static/exams/n3"
            };
            for (String dirPath : candidateDirs) {
                File dir = new File(dirPath);
                if (dir.exists() && dir.isDirectory()) {
                    File[] files = dir.listFiles((d, name) -> name.endsWith(".json"));
                    if (files != null) {
                        for (File f : files) {
                            try {
                                streams.add(new FileInputStream(f));
                            } catch (Exception e) {
                                log.warn("Could not open stream for file {}: {}", f.getName(), e.getMessage());
                            }
                        }
                    }
                    if (!streams.isEmpty()) break;
                }
            }
        }

        return streams;
    }

    @Transactional
    public int[] importSingleExam(InputStream is) throws Exception {
        JsonNode root = objectMapper.readTree(is);
        String examId = root.path("examId").asText();
        if (examId == null || examId.isBlank()) return new int[]{0, 0, 0};

        String level = root.path("level").asText("N3");
        int year = root.path("year").asInt();
        int month = root.path("month").asInt();
        String title = root.path("title").asText();
        int totalQuestions = root.path("totalQuestions").asInt();
        String audioFile = root.path("audioFile").asText();

        JlptExam exam = new JlptExam(examId, level, year, month, title, totalQuestions, audioFile);
        examRepository.save(exam);

        int sectionsCount = 0;
        int questionsCount = 0;

        JsonNode sectionsNode = root.path("sections");
        if (sectionsNode.isArray()) {
            int secOrder = 0;
            for (JsonNode secNode : sectionsNode) {
                secOrder++;
                String sectionId = secNode.path("sectionId").asText();
                String sectionRecordId = examId + "-" + sectionId;
                String secTitle = secNode.path("title").asText();
                String secTitleVi = secNode.path("titleVi").asText();
                int timeLimitSec = secNode.path("timeLimitSec").asInt(1800);
                int secTotalQuestions = secNode.path("totalQuestions").asInt();

                JlptExamSection section = new JlptExamSection(
                        sectionRecordId, examId, sectionId, secTitle, secTitleVi,
                        secOrder, timeLimitSec, secTotalQuestions
                );
                sectionRepository.save(section);
                sectionsCount++;

                JsonNode questionsNode = secNode.path("questions");
                if (questionsNode.isArray()) {
                    int qOrder = 0;
                    for (JsonNode qNode : questionsNode) {
                        qOrder++;
                        String qId = qNode.path("id").asText();
                        int mondai = qNode.path("mondai").asInt();
                        int qNum = qNode.path("questionNumber").asInt();
                        String qType = qNode.path("questionType").asText();
                        String qText = qNode.path("questionText").asText();
                        String passage = qNode.hasNonNull("passage") ? qNode.path("passage").asText() : null;
                        String imgRef = qNode.hasNonNull("imageRef") ? qNode.path("imageRef").asText() : null;
                        Double aStart = qNode.hasNonNull("audioStartSec") ? qNode.path("audioStartSec").asDouble() : null;
                        Double aEnd = qNode.hasNonNull("audioEndSec") ? qNode.path("audioEndSec").asDouble() : null;
                        int correctAns = qNode.path("correctAnswer").asInt(1);

                        JsonNode choicesNode = qNode.path("choices");
                        String choicesJson = objectMapper.writeValueAsString(choicesNode);

                        JlptExamQuestion q = new JlptExamQuestion();
                        q.setId(qId);
                        q.setExamId(examId);
                        q.setSectionId(sectionId);
                        q.setSectionRecordId(sectionRecordId);
                        q.setMondai(mondai);
                        q.setQuestionNumber(qNum);
                        q.setQuestionType(qType);
                        q.setQuestionText(qText);
                        q.setPassage(passage);
                        q.setChoicesJson(choicesJson);
                        q.setCorrectAnswer(correctAns);
                        q.setImageRef(imgRef);
                        q.setAudioStartSec(aStart);
                        q.setAudioEndSec(aEnd);
                        q.setQuestionOrder(qOrder);

                        questionRepository.save(q);
                        questionsCount++;
                    }
                }
            }
        }

        return new int[]{1, sectionsCount, questionsCount};
    }
}
