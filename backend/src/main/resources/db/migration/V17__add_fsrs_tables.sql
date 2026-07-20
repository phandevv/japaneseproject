ALTER TABLE word_reviews ADD COLUMN state VARCHAR(255) NOT NULL DEFAULT 'NEW';
ALTER TABLE word_reviews ADD COLUMN difficulty FLOAT NOT NULL DEFAULT 0.0;
ALTER TABLE word_reviews ADD COLUMN stability FLOAT NOT NULL DEFAULT 0.0;
ALTER TABLE word_reviews ADD COLUMN review_count INT NOT NULL DEFAULT 0;
ALTER TABLE word_reviews ADD COLUMN correct_count INT NOT NULL DEFAULT 0;
ALTER TABLE word_reviews ADD COLUMN wrong_count INT NOT NULL DEFAULT 0;
ALTER TABLE word_reviews ADD COLUMN consecutive_correct INT NOT NULL DEFAULT 0;

CREATE TABLE review_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    word_review_id BIGINT NOT NULL,
    rating VARCHAR(255) NOT NULL,
    state_before VARCHAR(255),
    state_after VARCHAR(255),
    difficulty_before FLOAT,
    difficulty_after FLOAT,
    stability_before FLOAT,
    stability_after FLOAT,
    duration_ms INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (word_review_id) REFERENCES word_reviews(id) ON DELETE CASCADE
);

CREATE TABLE daily_study_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    new_words_studied INT DEFAULT 0,
    words_reviewed INT DEFAULT 0,
    retention_rate FLOAT DEFAULT 0.0,
    learning_time_ms BIGINT DEFAULT 0,
    CONSTRAINT uq_daily_study_stats UNIQUE (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
