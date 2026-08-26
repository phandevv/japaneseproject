package com.flashcard.vocabulary.service;

import com.flashcard.vocabulary.document.VocabularyDoc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class MongoVocabularySearchService {

    private final MongoTemplate mongoTemplate;

    @Autowired
    public MongoVocabularySearchService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public Page<VocabularyDoc> search(String keyword, Pageable pageable) {
        if (keyword == null || keyword.trim().isEmpty()) {
            Query query = new Query().with(pageable);
            long total = mongoTemplate.getCollection("vocabularies").estimatedDocumentCount();
            List<VocabularyDoc> list = mongoTemplate.find(query, VocabularyDoc.class);
            return new PageImpl<>(list, pageable, total);
        }

        String trimmed = keyword.trim();
        int limit = Math.max(pageable.getPageSize(), 10);

        // 1. Tier 1: Fast Exact Match on Kanji, Hiragana, or Romaji (Indexed, < 2ms)
        Criteria exactCriteria = new Criteria().orOperator(
                Criteria.where("kanji").is(trimmed),
                Criteria.where("hiragana").is(trimmed),
                Criteria.where("romaji").regex("^" + Pattern.quote(trimmed) + "$", "i")
        );
        List<VocabularyDoc> exactMatches = mongoTemplate.find(new Query(exactCriteria).limit(limit), VocabularyDoc.class);

        // If exact matches satisfy the requested page size on first page, return immediately
        if (pageable.getPageNumber() == 0 && exactMatches.size() >= pageable.getPageSize()) {
            return new PageImpl<>(exactMatches.subList(0, pageable.getPageSize()), pageable, exactMatches.size());
        }

        // 2. Tier 2: Prefix Match (e.g., words starting with keyword)
        Criteria prefixCriteria = new Criteria().orOperator(
                Criteria.where("kanji").regex("^" + Pattern.quote(trimmed)),
                Criteria.where("hiragana").regex("^" + Pattern.quote(trimmed)),
                Criteria.where("meaning").regex("^" + Pattern.quote(trimmed), "i")
        );
        List<VocabularyDoc> prefixMatches = mongoTemplate.find(new Query(prefixCriteria).limit(limit), VocabularyDoc.class);

        // 3. Tier 3: Substring Search for broad matching
        Criteria containsCriteria = new Criteria().orOperator(
                Criteria.where("kanji").regex(Pattern.quote(trimmed)),
                Criteria.where("hiragana").regex(Pattern.quote(trimmed)),
                Criteria.where("hanViet").regex(Pattern.quote(trimmed), "i"),
                Criteria.where("meaning").regex(Pattern.quote(trimmed), "i")
        );
        List<VocabularyDoc> containsMatches = mongoTemplate.find(new Query(containsCriteria).limit(limit * 2), VocabularyDoc.class);

        // 4. Combine and deduplicate preserving strict relevance ranking (Exact -> Prefix -> Substring)
        Map<Long, VocabularyDoc> rankedMap = new LinkedHashMap<>();
        for (VocabularyDoc doc : exactMatches) {
            if (doc.getId() != null) rankedMap.put(doc.getId(), doc);
        }
        for (VocabularyDoc doc : prefixMatches) {
            if (doc.getId() != null) rankedMap.putIfAbsent(doc.getId(), doc);
        }
        for (VocabularyDoc doc : containsMatches) {
            if (doc.getId() != null) rankedMap.putIfAbsent(doc.getId(), doc);
        }

        List<VocabularyDoc> allResults = new ArrayList<>(rankedMap.values());
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), allResults.size());

        List<VocabularyDoc> pageContent = (start < allResults.size()) ? allResults.subList(start, end) : List.of();
        return new PageImpl<>(pageContent, pageable, allResults.size());
    }
}

