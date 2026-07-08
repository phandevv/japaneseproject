CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    CONSTRAINT uq_username UNIQUE (username)
);

CREATE TABLE user_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    level VARCHAR(255) NOT NULL,
    words_per_day INT NOT NULL,
    CONSTRAINT uq_user_setting_level UNIQUE (user_id, level),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE vocabulary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    kanji VARCHAR(1000),
    hiragana VARCHAR(1000),
    han_viet VARCHAR(1000),
    meaning TEXT,
    word_type VARCHAR(255),
    level VARCHAR(255),
    category VARCHAR(255)
);

CREATE TABLE word_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    vocabulary_id BIGINT NOT NULL,
    ease_factor DOUBLE NOT NULL DEFAULT 2.5,
    interval_days INT NOT NULL DEFAULT 0,
    repetitions INT NOT NULL DEFAULT 0,
    next_review TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_vocab UNIQUE (user_id, vocabulary_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE
);

CREATE TABLE study_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    study_date DATE NOT NULL,
    words_studied INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    streak_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_user_study_date UNIQUE (user_id, study_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
