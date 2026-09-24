package com.flashcard.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.data.load.grammar", havingValue = "true", matchIfMissing = true)
public class GrammarDataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(GrammarDataLoader.class);

    @Override
    public void run(String... args) throws Exception {
        logger.info("Grammar automatic startup seeding is disabled.");
    }
}
