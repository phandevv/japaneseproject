CREATE TABLE IF NOT EXISTS jlpt_n3_high_frequency_grammar (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rank_number INT NOT NULL,
    grammar VARCHAR(255) NOT NULL,
    level VARCHAR(20) NOT NULL,
    total_occurrences INT NOT NULL DEFAULT 0,
    exam_coverage VARCHAR(50) NOT NULL,
    avg_per_exam DOUBLE NOT NULL DEFAULT 0.0,
    bunpou_count INT NOT NULL DEFAULT 0,
    dokkai_count INT NOT NULL DEFAULT 0,
    choukai_count INT NOT NULL DEFAULT 0,
    goi_count INT NOT NULL DEFAULT 0,
    priority VARCHAR(50) NOT NULL,
    priority_stars VARCHAR(50),
    formation TEXT,
    meaning TEXT NOT NULL,
    exam_examples_json TEXT,
    recent_trend VARCHAR(255),
    study_tip TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hf_grammar_rank ON jlpt_n3_high_frequency_grammar (rank_number);
CREATE INDEX idx_hf_grammar_level ON jlpt_n3_high_frequency_grammar (level);
CREATE INDEX idx_hf_grammar_priority ON jlpt_n3_high_frequency_grammar (priority);

CREATE TABLE IF NOT EXISTS high_frequency_grammar_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    grammar_id BIGINT NOT NULL,
    ease_factor DOUBLE NOT NULL DEFAULT 2.5,
    interval_days INT NOT NULL DEFAULT 0,
    repetitions INT NOT NULL DEFAULT 0,
    next_review TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_learned BOOLEAN NOT NULL DEFAULT FALSE,
    last_quality INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_hf_user_grammar UNIQUE (user_id, grammar_id),
    CONSTRAINT fk_hf_review_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_hf_review_grammar FOREIGN KEY (grammar_id) REFERENCES jlpt_n3_high_frequency_grammar (id) ON DELETE CASCADE
);

CREATE INDEX idx_hf_review_user_next ON high_frequency_grammar_reviews (user_id, next_review);
