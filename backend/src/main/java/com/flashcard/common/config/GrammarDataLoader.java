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

@Component
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
                    String grammar = (String) item.get("Mẫu ngữ pháp");
                    if (grammar == null || grammar.trim().isEmpty()) {
                        continue;
                    }
                    grammar = grammar.trim();

                    Optional<GrammarCard> existingOpt = grammarCardRepository.findByGrammar(grammar);
                    GrammarCard card = existingOpt.orElseGet(GrammarCard::new);

                    card.setGrammar(grammar);
                    card.setMeaning(optionalString(item, "Ý nghĩa", "Chưa có nghĩa"));
                    card.setUsageDesc(optionalString(item, "Giải thích & Hướng dẫn", ""));
                    card.setFormation(optionalString(item, "Cấu trúc", ""));
                    card.setJlpt("N3");
                    card.setWeekName(optionalString(item, "Tuần", ""));
                    card.setDayName(optionalString(item, "Ngày", ""));
                    card.setLessonTitle(optionalString(item, "Tên bài học", ""));
                    card.setExamples(optionalString(item, "Ví dụ minh họa", ""));

                    grammarCardRepository.save(card);
                    loadedCount++;
                }

                logger.info("✅ N3 Grammar Data Loading Complete! Loaded/Updated {} grammar cards.", loadedCount);
            }
        } catch (Exception e) {
            logger.error("❌ Error loading N3 Grammar data: {}", e.getMessage(), e);
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
