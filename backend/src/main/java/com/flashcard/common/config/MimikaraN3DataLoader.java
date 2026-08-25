package com.flashcard.common.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class MimikaraN3DataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(MimikaraN3DataLoader.class);

    private final VocabularyDataProvider vocabularyDataProvider;
    private final ObjectMapper objectMapper;
    private final org.springframework.cache.CacheManager cacheManager;

    @Autowired
    public MimikaraN3DataLoader(VocabularyDataProvider vocabularyDataProvider, ObjectMapper objectMapper, org.springframework.cache.CacheManager cacheManager) {
        this.vocabularyDataProvider = vocabularyDataProvider;
        this.objectMapper = objectMapper;
        this.cacheManager = cacheManager;
    }

    @Override
    public void run(String... args) throws Exception {
        // Check if MIMIKARA_N3 vocabulary already loaded with full dataset
        List<Vocabulary> existing = vocabularyDataProvider.getByLevel("MIMIKARA_N3");
        if (existing != null && existing.size() >= 880) {
            logger.info("Mimikara N3 vocabulary already fully loaded. Total records: {}", existing.size());
            return;
        } else if (existing != null && !existing.isEmpty()) {
            logger.info("Found partial Mimikara N3 vocabulary ({} items). Replacing with complete dataset...", existing.size());
            vocabularyDataProvider.deleteAll(existing);
        }

        logger.info("Loading Mimikara N3 vocabulary into database...");
        InputStream is = null;

        // Try ClassPathResource first
        try {
            ClassPathResource resource = new ClassPathResource("data/mimikara_n3_vocab.json");
            if (resource.exists()) {
                is = resource.getInputStream();
            }
        } catch (Exception e) {
            logger.debug("ClassPathResource data/mimikara_n3_vocab.json not found: {}", e.getMessage());
        }

        // Fallback to local paths
        if (is == null) {
            String[] candidatePaths = {
                "backend/src/main/resources/data/mimikara_n3_vocab.json",
                "src/main/resources/data/mimikara_n3_vocab.json",
                "data/mimikara_n3/mimikara_n3_vocab.json",
                "../data/mimikara_n3/mimikara_n3_vocab.json",
                "../../data/mimikara_n3/mimikara_n3_vocab.json"
            };

            for (String p : candidatePaths) {
                File f = new File(p);
                if (f.exists() && f.isFile()) {
                    logger.info("Found Mimikara N3 JSON at: {}", f.getAbsolutePath());
                    is = new FileInputStream(f);
                    break;
                }
            }
        }

        if (is == null) {
            logger.warn("Mimikara N3 vocabulary JSON file not found! Skipping import.");
            return;
        }

        try (InputStream stream = is) {
            List<Map<String, Object>> rawList = objectMapper.readValue(stream, new TypeReference<List<Map<String, Object>>>() {});
            List<Vocabulary> toSave = new ArrayList<>();

            for (Map<String, Object> map : rawList) {
                String kanji = (String) map.get("kanji");
                String hiragana = (String) map.get("hiragana");
                String hanViet = (String) map.get("hanViet");
                String meaning = (String) map.get("meaning");
                String wordType = (String) map.get("wordType");
                String level = (String) map.getOrDefault("level", "MIMIKARA_N3");
                String category = (String) map.get("category");
                String sampleSentence = (String) map.get("sampleSentence");
                String sampleTranslation = (String) map.get("sampleTranslation");

                Vocabulary vocab = new Vocabulary();
                vocab.setKanji(kanji);
                vocab.setHiragana(hiragana);
                vocab.setHanViet(hanViet);
                vocab.setMeaning(meaning);
                vocab.setWordType(wordType);
                vocab.setLevel(level);
                vocab.setCategory(category);
                vocab.setSampleSentence(sampleSentence);
                vocab.setSampleTranslation(sampleTranslation);

                toSave.add(vocab);
            }

            if (!toSave.isEmpty()) {
                vocabularyDataProvider.saveAll(toSave);
                logger.info("Successfully loaded {} Mimikara N3 vocabulary items into database!", toSave.size());

                if (cacheManager != null) {
                    try {
                        org.springframework.cache.Cache statsCache = cacheManager.getCache("vocab-stats");
                        if (statsCache != null) statsCache.clear();
                        org.springframework.cache.Cache levelCache = cacheManager.getCache("vocabulary-level");
                        if (levelCache != null) levelCache.clear();
                        logger.info("Cleared vocabulary-level and vocab-stats caches.");
                    } catch (Exception ce) {
                        logger.warn("Cache eviction warning: {}", ce.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load Mimikara N3 vocabulary: {}", e.getMessage(), e);
        }
    }
}
