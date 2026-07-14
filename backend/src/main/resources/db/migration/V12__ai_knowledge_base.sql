-- Add columns for Vocabulary Enrichment
ALTER TABLE vocabulary ADD COLUMN pitch_accent VARCHAR(100);
ALTER TABLE vocabulary ADD COLUMN synonyms TEXT;
ALTER TABLE vocabulary ADD COLUMN antonyms TEXT;
ALTER TABLE vocabulary ADD COLUMN common_mistakes TEXT;
ALTER TABLE vocabulary ADD COLUMN collocations TEXT;
ALTER TABLE vocabulary ADD COLUMN mnemonic TEXT;
ALTER TABLE vocabulary ADD COLUMN conversation_examples TEXT;

-- Create Grammar Cards table
CREATE TABLE grammar_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    grammar VARCHAR(255) NOT NULL,
    meaning TEXT NOT NULL,
    usage_desc TEXT,
    formation TEXT,
    jlpt VARCHAR(10) NOT NULL,
    similar_grammar TEXT,
    difference TEXT,
    common_mistakes TEXT,
    examples TEXT,
    reading_passage TEXT,
    quizzes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_grammar UNIQUE (grammar)
);

-- Create Grammar Reviews table for SRS
CREATE TABLE grammar_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    grammar_id BIGINT NOT NULL,
    ease_factor DOUBLE NOT NULL DEFAULT 2.5,
    interval_days INT NOT NULL DEFAULT 0,
    repetitions INT NOT NULL DEFAULT 0,
    next_review TIMESTAMP NOT NULL,
    is_learned BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_user_grammar UNIQUE (user_id, grammar_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grammar_id) REFERENCES grammar_cards(id) ON DELETE CASCADE
);

-- Create Knowledge Versions table for Versioning
CREATE TABLE knowledge_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'VOCABULARY' or 'GRAMMAR'
    entity_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    content_json TEXT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
