package com.flashcard.common.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@ConditionalOnProperty(name = "app.data.load.grammar", havingValue = "true", matchIfMissing = true)
public class GrammarDataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(GrammarDataLoader.class);

    private final GrammarCardRepository grammarCardRepository;
    private final ObjectMapper objectMapper;

    public GrammarDataLoader(GrammarCardRepository grammarCardRepository, ObjectMapper objectMapper) {
        this.grammarCardRepository = grammarCardRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            ClassPathResource resource = new ClassPathResource("Ngu_Phap_N3_Somatome.json");
            if (!resource.exists()) {
                logger.warn("Ngu_Phap_N3_Somatome.json not found in classpath. Skipping Grammar data seeding.");
                return;
            }

            logger.info("Starting N3 Grammar Data Loading from Ngu_Phap_N3_Somatome.json...");
            try (InputStream inputStream = resource.getInputStream()) {
                List<Map<String, Object>> items = objectMapper.readValue(inputStream, new TypeReference<>() {});
                
                int loadedCount = 0;
                for (Map<String, Object> item : items) {
                    String grammar = optionalString(item, "grammar", optionalString(item, "Mẫu ngữ pháp", ""));
                    if (grammar == null || grammar.trim().isEmpty()) {
                        continue;
                    }
                    grammar = grammar.trim();

                    Optional<GrammarCard> existingOpt = grammarCardRepository.findByGrammar(grammar);
                    GrammarCard card = existingOpt.orElseGet(GrammarCard::new);

                    card.setGrammar(grammar);
                    card.setMeaning(optionalString(item, "meaning", optionalString(item, "Ý nghĩa", "Chưa có nghĩa")));
                    card.setUsageDesc(optionalString(item, "usageDesc", optionalString(item, "Giải thích & Hướng dẫn", "")));
                    card.setFormation(optionalString(item, "formation", optionalString(item, "Cấu trúc", "")));
                    card.setJlpt(optionalString(item, "jlpt", "N3"));
                    card.setWeekName(optionalString(item, "weekName", optionalString(item, "Tuần", "")));
                    card.setDayName(optionalString(item, "dayName", optionalString(item, "Ngày", "")));
                    card.setLessonTitle(optionalString(item, "lessonTitle", optionalString(item, "Tên bài học", "")));

                    Object exObj = item.containsKey("examples") ? item.get("examples") : item.get("Ví dụ minh họa");
                    card.setExamples(ensureJsonString(exObj));

                    Object simObj = item.get("similarGrammar");
                    card.setSimilarGrammar(ensureJsonString(simObj));

                    card.setDifference(optionalString(item, "difference", ""));

                    Object errObj = item.get("commonMistakes");
                    card.setCommonMistakes(ensureJsonString(errObj));

                    card.setReadingPassage(optionalString(item, "readingPassage", ""));

                    Object quizObj = item.get("quizzes");
                    card.setQuizzes(ensureJsonString(quizObj));

                    grammarCardRepository.save(card);
                    loadedCount++;
                }

                logger.info("✅ N3 Grammar Data Loading Complete! Loaded/Updated {} grammar cards.", loadedCount);
            }
        } catch (Exception e) {
            logger.error("❌ Error loading N3 Grammar data: {}", e.getMessage(), e);
        }
    }

    private String ensureJsonString(Object val) {
        if (val == null) return null;
        if (val instanceof String) {
            String str = ((String) val).trim();
            if (str.isEmpty()) return null;
            return str;
        }
        try {
            return objectMapper.writeValueAsString(val);
        } catch (Exception e) {
            return val.toString();
        }
    }

    private String optionalString(Map<String, Object> map, String key, String defaultValue) {
        Object val = map.get(key);
        if (val != null) {
            String s = val.toString().trim();
            if (!s.isEmpty()) {
                return s;
            }
        }
        return defaultValue;
    }
}
