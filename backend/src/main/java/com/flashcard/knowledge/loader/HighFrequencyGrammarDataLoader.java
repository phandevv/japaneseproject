package com.flashcard.knowledge.loader;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.document.HighFrequencyGrammarDoc;
import com.flashcard.knowledge.model.HighFrequencyGrammar;
import com.flashcard.knowledge.repository.HighFrequencyGrammarRepository;
import com.flashcard.knowledge.repository.mongo.HighFrequencyGrammarMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Component
public class HighFrequencyGrammarDataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(HighFrequencyGrammarDataLoader.class);

    private final HighFrequencyGrammarRepository repository;
    private final ObjectMapper objectMapper;
    private final HighFrequencyGrammarMongoRepository mongoRepository;

    @Autowired
    public HighFrequencyGrammarDataLoader(
            HighFrequencyGrammarRepository repository,
            ObjectMapper objectMapper,
            @Autowired(required = false) HighFrequencyGrammarMongoRepository mongoRepository) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.mongoRepository = mongoRepository;
    }

    @Override
    public void run(String... args) {
        try {
            boolean needsJpaSeed = false;
            try {
                needsJpaSeed = repository.count() < 79;
            } catch (Exception e) {
                logger.warn("JPA database check skipped or table does not exist: {}", e.getMessage());
            }

            boolean needsMongoSeed = false;
            if (mongoRepository != null) {
                try {
                    needsMongoSeed = mongoRepository.count() < 79;
                } catch (Exception e) {
                    logger.warn("MongoDB check skipped: {}", e.getMessage());
                }
            }

            if (!needsJpaSeed && !needsMongoSeed) {
                logger.info("High frequency grammar already loaded. Skipping seed.");
                return;
            }

            ClassPathResource resource = new ClassPathResource("data/jlpt_n3_high_frequency_grammar.json");
            if (!resource.exists()) {
                logger.warn("Seed file data/jlpt_n3_high_frequency_grammar.json not found on classpath!");
                return;
            }

            logger.info("Loading high frequency grammar patterns from classpath json (JPA need: {}, Mongo need: {})...",
                    needsJpaSeed, needsMongoSeed);
            try (InputStream is = resource.getInputStream()) {
                List<JsonNode> nodes = objectMapper.readValue(is, new TypeReference<List<JsonNode>>() {});

                if (needsJpaSeed) {
                    List<HighFrequencyGrammar> entities = new ArrayList<>();
                    for (JsonNode n : nodes) {
                        HighFrequencyGrammar g = new HighFrequencyGrammar();
                        g.setRankNumber(n.has("rankNumber") ? n.get("rankNumber").asInt() : 0);
                        g.setGrammar(n.has("grammar") ? n.get("grammar").asText() : "");
                        g.setLevel(n.has("level") ? n.get("level").asText() : "N3");
                        g.setTotalOccurrences(n.has("totalOccurrences") ? n.get("totalOccurrences").asInt() : 0);
                        g.setExamCoverage(n.has("examCoverage") ? n.get("examCoverage").asText() : "");
                        g.setAvgPerExam(n.has("avgPerExam") ? n.get("avgPerExam").asDouble() : 0.0);
                        g.setBunpouCount(n.has("bunpouCount") ? n.get("bunpouCount").asInt() : 0);
                        g.setDokkaiCount(n.has("dokkaiCount") ? n.get("dokkaiCount").asInt() : 0);
                        g.setChoukaiCount(n.has("choukaiCount") ? n.get("choukaiCount").asInt() : 0);
                        g.setGoiCount(n.has("goiCount") ? n.get("goiCount").asInt() : 0);
                        g.setPriority(n.has("priority") ? n.get("priority").asText() : "Medium");
                        g.setPriorityStars(n.has("priorityStars") ? n.get("priorityStars").asText() : "");
                        g.setFormation(n.has("formation") ? n.get("formation").asText() : "");
                        g.setMeaning(n.has("meaning") ? n.get("meaning").asText() : "");
                        g.setRecentTrend(n.has("recentTrend") ? n.get("recentTrend").asText() : "");
                        g.setStudyTip(n.has("studyTip") ? n.get("studyTip").asText() : "");

                        if (n.has("examExamples") && n.get("examExamples").isArray()) {
                            g.setExamExamplesJson(n.get("examExamples").toString());
                        } else {
                            g.setExamExamplesJson("[]");
                        }
                        entities.add(g);
                    }
                    if (!entities.isEmpty()) {
                        try {
                            repository.saveAll(entities);
                            logger.info("Successfully seeded {} high frequency grammar patterns into JPA database!", entities.size());
                        } catch (Exception e) {
                            logger.warn("Could not save to JPA database (table may not exist in Mongo mode): {}", e.getMessage());
                        }
                    }
                }

                if (needsMongoSeed) {
                    List<HighFrequencyGrammarDoc> docs = new ArrayList<>();
                    for (JsonNode n : nodes) {
                        HighFrequencyGrammarDoc doc = new HighFrequencyGrammarDoc();
                        int rank = n.has("rankNumber") ? n.get("rankNumber").asInt() : 0;
                        doc.setId((long) rank);
                        doc.setRankNumber(rank);
                        doc.setGrammar(n.has("grammar") ? n.get("grammar").asText() : "");
                        doc.setLevel(n.has("level") ? n.get("level").asText() : "N3");
                        doc.setTotalOccurrences(n.has("totalOccurrences") ? n.get("totalOccurrences").asInt() : 0);
                        doc.setExamCoverage(n.has("examCoverage") ? n.get("examCoverage").asText() : "");
                        doc.setAvgPerExam(n.has("avgPerExam") ? n.get("avgPerExam").asDouble() : 0.0);
                        doc.setBunpouCount(n.has("bunpouCount") ? n.get("bunpouCount").asInt() : 0);
                        doc.setDokkaiCount(n.has("dokkaiCount") ? n.get("dokkaiCount").asInt() : 0);
                        doc.setChoukaiCount(n.has("choukaiCount") ? n.get("choukaiCount").asInt() : 0);
                        doc.setGoiCount(n.has("goiCount") ? n.get("goiCount").asInt() : 0);
                        doc.setPriority(n.has("priority") ? n.get("priority").asText() : "Medium");
                        doc.setPriorityStars(n.has("priorityStars") ? n.get("priorityStars").asText() : "");
                        doc.setFormation(n.has("formation") ? n.get("formation").asText() : "");
                        doc.setMeaning(n.has("meaning") ? n.get("meaning").asText() : "");
                        doc.setRecentTrend(n.has("recentTrend") ? n.get("recentTrend").asText() : "");
                        doc.setStudyTip(n.has("studyTip") ? n.get("studyTip").asText() : "");

                        if (n.has("examExamples") && n.get("examExamples").isArray()) {
                            doc.setExamExamplesJson(n.get("examExamples").toString());
                        } else {
                            doc.setExamExamplesJson("[]");
                        }
                        docs.add(doc);
                    }
                    if (!docs.isEmpty()) {
                        mongoRepository.saveAll(docs);
                        logger.info("Successfully seeded {} high frequency grammar patterns into MongoDB!", docs.size());
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Failed to seed high frequency grammar: {}", e.getMessage(), e);
        }
    }
}
