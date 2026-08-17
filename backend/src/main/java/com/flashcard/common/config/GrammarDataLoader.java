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
        logger.info("Grammar automatic startup seeding is disabled.");
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
