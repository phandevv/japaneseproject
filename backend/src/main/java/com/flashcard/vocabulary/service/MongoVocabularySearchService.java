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
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.data.mongodb.core.query.TextQuery;
import org.springframework.stereotype.Service;

import java.util.List;

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
        try {
            // First try Text Criteria for ranking by score
            TextCriteria textCriteria = TextCriteria.forDefaultLanguage().matching(trimmed);
            Query textQuery = TextQuery.queryText(textCriteria).sortByScore().with(pageable);
            long count = mongoTemplate.count(TextQuery.queryText(textCriteria), VocabularyDoc.class);
            if (count > 0) {
                List<VocabularyDoc> results = mongoTemplate.find(textQuery, VocabularyDoc.class);
                return new PageImpl<>(results, pageable, count);
            }
        } catch (Exception ignored) {
            // Fallback to regex if text index not yet built
        }

        // Regex fallback
        Criteria regexCriteria = new Criteria().orOperator(
                Criteria.where("kanji").regex(trimmed, "i"),
                Criteria.where("hiragana").regex(trimmed, "i"),
                Criteria.where("romaji").regex(trimmed, "i"),
                Criteria.where("hanViet").regex(trimmed, "i"),
                Criteria.where("meaning").regex(trimmed, "i")
        );
        Query regexQuery = new Query(regexCriteria).with(pageable);
        long total = mongoTemplate.count(new Query(regexCriteria), VocabularyDoc.class);
        List<VocabularyDoc> list = mongoTemplate.find(regexQuery, VocabularyDoc.class);
        return new PageImpl<>(list, pageable, total);
    }
}
