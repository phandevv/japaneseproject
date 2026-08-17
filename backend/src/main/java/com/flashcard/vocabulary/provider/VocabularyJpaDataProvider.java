package com.flashcard.vocabulary.provider;

import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.search.mapper.orm.Search;
import org.hibernate.search.mapper.orm.session.SearchSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class VocabularyJpaDataProvider implements VocabularyDataProvider {

    private final VocabularyRepository repository;
    private final EntityManager entityManager;

    @Autowired
    public VocabularyJpaDataProvider(VocabularyRepository repository, EntityManager entityManager) {
        this.repository = repository;
        this.entityManager = entityManager;
    }

    @Override
    public Page<Vocabulary> getAll(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Override
    public List<Vocabulary> getByLevel(String level) {
        return repository.findByLevel(level.toUpperCase());
    }

    @Override
    public Page<Vocabulary> getByLevel(String level, Pageable pageable) {
        return repository.findByLevel(level.toUpperCase(), pageable);
    }

    @Override
    public List<Vocabulary> getByLevelAndWordType(String level, String wordType) {
        return repository.findByLevelAndWordType(level.toUpperCase(), wordType);
    }

    @Override
    public List<Vocabulary> getRandomByLevel(String level, int count) {
        return repository.findRandomByLevel(level.toUpperCase(), PageRequest.of(0, count));
    }

    @Override
    public List<Vocabulary> getRandom(int count) {
        return repository.findRandom(PageRequest.of(0, count));
    }

    @Override
    public Optional<Vocabulary> getById(Long id) {
        return repository.findById(id);
    }

    @Override
    public Optional<Vocabulary> findFirstByKanji(String kanji) {
        return repository.findFirstByKanji(kanji);
    }

    @Override
    public Optional<Vocabulary> findFirstByHiragana(String hiragana) {
        return repository.findFirstByHiragana(hiragana);
    }

    @Override
    public Optional<Vocabulary> findFirstByKanjiAndCategory(String kanji, String category) {
        return repository.findFirstByKanjiAndCategory(kanji, category);
    }

    @Override
    public Optional<Vocabulary> findFirstByHiraganaAndCategory(String hiragana, String category) {
        return repository.findFirstByHiraganaAndCategory(hiragana, category);
    }

    @Override
    public List<Vocabulary> findByCategory(String category) {
        return repository.findByCategory(category);
    }

    @Override
    public Vocabulary save(Vocabulary vocabulary) {
        return repository.save(vocabulary);
    }

    @Override
    public List<Vocabulary> saveAll(List<Vocabulary> vocabularies) {
        return repository.saveAll(vocabularies);
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    @Override
    public void deleteAll(List<Vocabulary> vocabularies) {
        repository.deleteAll(vocabularies);
    }

    @Override
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
            return repository.searchByKeyword(keyword.trim(), pageable);
        }
    }

    @Override
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        List<Object[]> counts = repository.countByLevel();

        long total = 0;
        Map<String, Long> levelCounts = new LinkedHashMap<>();

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
        for (Map.Entry<String, Long> entry : tempMap.entrySet()) {
            if (!levelCounts.containsKey(entry.getKey())) {
                levelCounts.put(entry.getKey(), entry.getValue());
            }
        }

        stats.put("total", total);
        stats.put("levels", levelCounts);
        return stats;
    }

    @Override
    public long count() {
        return repository.count();
    }
}
