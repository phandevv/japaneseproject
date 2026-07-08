package com.flashcard.config;

import org.hibernate.search.mapper.orm.Search;
import org.hibernate.search.mapper.orm.massindexing.MassIndexer;
import org.hibernate.search.mapper.orm.session.SearchSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * Builds the Lucene full-text search index on application startup.
 * Uses Hibernate Search MassIndexer — processes all Vocabulary rows once
 * and stores the index on disk (lucene-index/ directory).
 * Subsequent restarts reuse the existing index (fast startup).
 */
@Component
public class SearchIndexer {

    private static final Logger log = LoggerFactory.getLogger(SearchIndexer.class);

    private final EntityManager entityManager;

    public SearchIndexer(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void buildIndex() {
        try {
            log.info("Hibernate Search: Starting mass indexing of vocabulary...");
            SearchSession searchSession = Search.session(entityManager);
            MassIndexer indexer = searchSession.massIndexer()
                .threadsToLoadObjects(2)
                .batchSizeToLoadObjects(100);
            indexer.startAndWait();
            log.info("Hibernate Search: Mass indexing completed successfully.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Hibernate Search: Mass indexing was interrupted.");
        } catch (Exception e) {
            log.error("Hibernate Search: Mass indexing failed — search will fall back to SQL LIKE.", e);
        }
    }
}
