package com.flashcard.knowledge.loader;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.HighFrequencyGrammar;
import com.flashcard.knowledge.repository.HighFrequencyGrammarRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public HighFrequencyGrammarDataLoader(HighFrequencyGrammarRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) {
        try {
            long existingCount = repository.count();
            if (existingCount >= 79) {
                logger.info("High frequency grammar already loaded ({} records). Skipping seed.", existingCount);
                return;
            }

            ClassPathResource resource = new ClassPathResource("data/jlpt_n3_high_frequency_grammar.json");
            if (!resource.exists()) {
                logger.warn("Seed file data/jlpt_n3_high_frequency_grammar.json not found on classpath!");
                return;
            }

            logger.info("Loading high frequency grammar patterns from classpath json...");
            try (InputStream is = resource.getInputStream()) {
                List<JsonNode> nodes = objectMapper.readValue(is, new TypeReference<List<JsonNode>>() {});
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
                    repository.saveAll(entities);
                    logger.info("Successfully seeded {} high frequency grammar patterns!", entities.size());
                }
            }
        } catch (Exception e) {
            logger.error("Failed to seed high frequency grammar: {}", e.getMessage(), e);
        }
    }
}
