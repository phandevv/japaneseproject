package com.flashcard.vocabulary.service;

import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class VocabularyService {

    private final VocabularyDataProvider dataProvider;

    public VocabularyService(VocabularyDataProvider dataProvider) {
        this.dataProvider = dataProvider;
    }

    public Page<Vocabulary> getAll(Pageable pageable) {
        return dataProvider.getAll(pageable);
    }

    @Cacheable(value = "vocabulary-level", key = "#level.toUpperCase()")
    public List<Vocabulary> getByLevel(String level) {
        return dataProvider.getByLevel(level.toUpperCase());
    }

    public Page<Vocabulary> getByLevel(String level, Pageable pageable) {
        return dataProvider.getByLevel(level.toUpperCase(), pageable);
    }

    public List<Vocabulary> getByLevelAndWordType(String level, String wordType) {
        return dataProvider.getByLevelAndWordType(level.toUpperCase(), wordType);
    }

    public List<Vocabulary> getRandomByLevel(String level, int count) {
        return dataProvider.getRandomByLevel(level.toUpperCase(), count);
    }

    public List<Vocabulary> getRandom(int count) {
        return dataProvider.getRandom(count);
    }

    @Cacheable(value = "vocabulary", key = "#id", unless = "#result == null")
    public Optional<Vocabulary> getById(Long id) {
        Optional<Vocabulary> opt = dataProvider.getById(id);
        if (opt.isPresent()) {
            return Optional.of(enrichWithMatchingData(opt.get()));
        }
        return opt;
    }

    public Vocabulary enrichWithMatchingData(Vocabulary v) {
        if (v == null) return null;
        boolean updated = false;

        if ((v.getMeaning() == null || v.getMeaning().trim().isEmpty()) || (v.getSampleSentence() == null || v.getSampleSentence().trim().isEmpty())) {
            Optional<Vocabulary> match = Optional.empty();
            if (v.getKanji() != null && !v.getKanji().trim().isEmpty()) {
                match = dataProvider.findFirstByKanji(v.getKanji().trim());
            }
            if (match.isEmpty() && v.getHiragana() != null && !v.getHiragana().trim().isEmpty()) {
                match = dataProvider.findFirstByHiragana(v.getHiragana().trim());
            }

            if (match.isPresent() && !match.get().getId().equals(v.getId())) {
                Vocabulary src = match.get();
                if ((v.getMeaning() == null || v.getMeaning().trim().isEmpty()) && src.getMeaning() != null && !src.getMeaning().trim().isEmpty()) {
                    v.setMeaning(src.getMeaning());
                    updated = true;
                }
                if ((v.getSampleSentence() == null || v.getSampleSentence().trim().isEmpty()) && src.getSampleSentence() != null && !src.getSampleSentence().trim().isEmpty()) {
                    v.setSampleSentence(src.getSampleSentence());
                    v.setSampleTranslation(src.getSampleTranslation());
                    v.setSampleReading(src.getSampleReading());
                    updated = true;
                }
            }
        }

        if (updated) {
            return dataProvider.save(v);
        }
        return v;
    }

    private final com.github.benmanes.caffeine.cache.Cache<String, Page<Vocabulary>> searchCache =
            com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                    .expireAfterWrite(java.time.Duration.ofMinutes(5))
                    .maximumSize(1000)
                    .build();

    @CacheEvict(value = {"vocabulary", "vocabulary-level"}, allEntries = true)
    public Vocabulary save(Vocabulary vocabulary) {
        searchCache.invalidateAll();
        return dataProvider.save(vocabulary);
    }

    @CacheEvict(value = {"vocabulary", "vocabulary-level"}, allEntries = true)
    public void deleteById(Long id) {
        searchCache.invalidateAll();
        dataProvider.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Page<Vocabulary> search(String keyword, Pageable pageable) {
        String key = (keyword == null ? "" : keyword.trim().toLowerCase()) + "_" + pageable.getPageNumber() + "_" + pageable.getPageSize();
        return searchCache.get(key, k -> dataProvider.search(keyword, pageable));
    }

    public Map<String, Object> getStats() {
        return dataProvider.getStats();
    }
}
