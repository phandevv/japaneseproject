package com.flashcard.service;

import com.flashcard.model.Vocabulary;
import com.flashcard.repository.VocabularyRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class VocabularyService {

    private final VocabularyRepository repository;

    public VocabularyService(VocabularyRepository repository) {
        this.repository = repository;
    }

    public Page<Vocabulary> getAll(Pageable pageable) {
        return repository.findAll(pageable);
    }

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

    public Page<Vocabulary> search(String keyword, Pageable pageable) {
        return repository.searchByKeyword(keyword, pageable);
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
        stats.put("wordTypes", repository.findDistinctWordTypes());
        return stats;
    }

    public long count() {
        return repository.count();
    }
}
