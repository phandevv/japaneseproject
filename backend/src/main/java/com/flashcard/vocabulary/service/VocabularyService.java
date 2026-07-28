package com.flashcard.vocabulary.service;

import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.search.mapper.orm.Search;
import org.hibernate.search.mapper.orm.session.SearchSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class VocabularyService {

    private final VocabularyRepository repository;
    private final EntityManager entityManager;

    public VocabularyService(VocabularyRepository repository, EntityManager entityManager) {
        this.repository = repository;
        this.entityManager = entityManager;
    }

    public Page<Vocabulary> getAll(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Cacheable(value = "vocabulary-level", key = "#level.toUpperCase()")
    public List<Vocabulary> getByLevel(String level) {
        return repository.findByLevel(level.toUpperCase());
    }

    public Page<Vocabulary> getByLevel(String level, Pageable pageable) {
        return repository.findByLevel(level.toUpperCase(), pageable);
    }

    public List<Vocabulary> getByLevelAndWordType(String level, String wordType) {
        return repository.findByLevelAndWordType(level.toUpperCase(), wordType);
    }

    public List<Vocabulary> getRandomByLevel(String level, int count) {
        return repository.findRandomByLevel(level.toUpperCase(), PageRequest.of(0, count));
    }

    public List<Vocabulary> getRandom(int count) {
        return repository.findRandom(PageRequest.of(0, count));
    }

    @Cacheable(value = "vocabulary", key = "#id", unless = "#result == null")
    public Optional<Vocabulary> getById(Long id) {
        return repository.findById(id);
    }

    @CacheEvict(value = {"vocabulary", "vocabulary-level"}, allEntries = true)
    public Vocabulary save(Vocabulary vocabulary) {
        if (vocabulary == null) return null;

        if (vocabulary.getId() == null) {
            // Deduplication check: check if Kanji or Hiragana already exists in DB
            Optional<Vocabulary> existing = Optional.empty();
            if (vocabulary.getKanji() != null && !vocabulary.getKanji().trim().isEmpty()) {
                existing = repository.findFirstByKanji(vocabulary.getKanji().trim());
            }
            if (existing.isEmpty() && vocabulary.getHiragana() != null && !vocabulary.getHiragana().trim().isEmpty()) {
                existing = repository.findFirstByHiragana(vocabulary.getHiragana().trim());
            }

            if (existing.isPresent()) {
                Vocabulary canonical = existing.get();
                // Merge level tags (e.g. 'N3' + 'MIMIKARA_N3' -> 'N3,MIMIKARA_N3')
                if (vocabulary.getLevel() != null && !vocabulary.getLevel().trim().isEmpty()) {
                    String newLevel = vocabulary.getLevel().trim();
                    String curLevel = canonical.getLevel() != null ? canonical.getLevel() : "";
                    if (!curLevel.contains(newLevel)) {
                        canonical.setLevel(curLevel.isEmpty() ? newLevel : curLevel + "," + newLevel);
                    }
                }
                // Merge missing non-empty fields
                if ((canonical.getMeaning() == null || canonical.getMeaning().trim().isEmpty()) && vocabulary.getMeaning() != null && !vocabulary.getMeaning().trim().isEmpty()) {
                    canonical.setMeaning(vocabulary.getMeaning());
                }
                if ((canonical.getHanViet() == null || canonical.getHanViet().trim().isEmpty()) && vocabulary.getHanViet() != null && !vocabulary.getHanViet().trim().isEmpty()) {
                    canonical.setHanViet(vocabulary.getHanViet());
                }
                if ((canonical.getSampleSentence() == null || canonical.getSampleSentence().trim().isEmpty()) && vocabulary.getSampleSentence() != null) {
                    canonical.setSampleSentence(vocabulary.getSampleSentence());
                    canonical.setSampleReading(vocabulary.getSampleReading());
                    canonical.setSampleTranslation(vocabulary.getSampleTranslation());
                }
                if ((canonical.getPitchAccent() == null || canonical.getPitchAccent().trim().isEmpty()) && vocabulary.getPitchAccent() != null) {
                    canonical.setPitchAccent(vocabulary.getPitchAccent());
                }
                return repository.save(canonical);
            }
        }
        return repository.save(vocabulary);
    }

    @CacheEvict(value = {"vocabulary", "vocabulary-level"}, allEntries = true)
    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    /**
     * Full-text search using Hibernate Search (Lucene embedded).
     * Supports: kanji, hiragana, romaji, han_viet (Hán Việt), meaning (tiếng Việt).
     * Features: wildcard prefix, fuzzy (1 char typo), multi-field simultaneous search.
     * Falls back to SQL LIKE if Hibernate Search index is not ready.
     */
    @Transactional(readOnly = true)
    public Page<Vocabulary> search(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isBlank()) {
            return repository.findAll(pageable);
        }

        try {
            SearchSession searchSession = Search.session(entityManager);
            String lowerKeyword = keyword.trim().toLowerCase();

            long totalHits = searchSession.search(Vocabulary.class)
                .where(f -> f.bool(b -> {
                    b.should(f.wildcard()
                        .fields("kanji", "hiragana", "romaji", "meaning", "hanViet")
                        .matching("*" + lowerKeyword + "*"));
                    b.should(f.match()
                        .fields("kanji", "hiragana", "romaji", "meaning", "hanViet")
                        .matching(lowerKeyword)
                        .fuzzy(1));
                    b.should(f.match()
                        .fields("kanji", "hiragana", "romaji")
                        .matching(lowerKeyword)
                        .boost(3.0f));
                }))
                .fetchTotalHitCount();

            List<Vocabulary> hits = searchSession.search(Vocabulary.class)
                .where(f -> f.bool(b -> {
                    b.should(f.wildcard()
                        .fields("kanji", "hiragana", "romaji", "meaning", "hanViet")
                        .matching("*" + lowerKeyword + "*"));
                    b.should(f.match()
                        .fields("kanji", "hiragana", "romaji", "meaning", "hanViet")
                        .matching(lowerKeyword)
                        .fuzzy(1));
                    b.should(f.match()
                        .fields("kanji", "hiragana", "romaji")
                        .matching(lowerKeyword)
                        .boost(3.0f));
                }))
                .sort(f -> f.score())
                .fetchHits(pageable.getPageSize());

            return new PageImpl<>(hits, pageable, totalHits);

        } catch (Exception e) {
            // Fallback to SQL LIKE if Lucene index is not ready yet
            return repository.searchByKeyword(keyword.trim(), pageable);
        }
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        List<Object[]> counts = repository.countByLevel();

        long total = 0;
        Map<String, Long> levelCounts = new LinkedHashMap<>();

        // Define order
        List<String> levelOrder = Arrays.asList("N5", "N4", "N3", "N2", "N1", "TU_LAY", "TRO_TU");
        Map<String, Long> tempMap = new HashMap<>();

        for (Object[] row : counts) {
            String level = (String) row[0];
            Long count = (Long) row[1];
            tempMap.put(level, count);
            total += count;
        }

        for (String level : levelOrder) {
            if (tempMap.containsKey(level)) {
                levelCounts.put(level, tempMap.get(level));
            }
        }
        // Add any remaining levels not in the order
        for (Map.Entry<String, Long> entry : tempMap.entrySet()) {
            if (!levelCounts.containsKey(entry.getKey())) {
                levelCounts.put(entry.getKey(), entry.getValue());
            }
        }

        stats.put("total", total);
        stats.put("levels", levelCounts);
        return stats;
    }
}

