-- Create conversations table
CREATE TABLE conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    scenario VARCHAR(100) NOT NULL,
    jlpt_level VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create conversation_messages table
CREATE TABLE conversation_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender VARCHAR(50) NOT NULL, -- 'USER' or 'AI'
    message_text TEXT NOT NULL,
    raw_analysis_json TEXT, -- Invisible layer JSON analysis
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Create conversation_corrections table
CREATE TABLE conversation_corrections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    explanation TEXT,
    type VARCHAR(50) NOT NULL, -- 'GRAMMAR', 'VOCABULARY', 'POLITENESS', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Create speaking_statistics table
CREATE TABLE speaking_statistics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    grammar_accuracy DOUBLE NOT NULL DEFAULT 0.0,
    vocabulary_score DOUBLE NOT NULL DEFAULT 0.0,
    fluency_score DOUBLE NOT NULL DEFAULT 0.0,
    confidence_score DOUBLE NOT NULL DEFAULT 0.0,
    total_sessions INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create review_recommendations table
CREATE TABLE review_recommendations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    recommended_vocab TEXT, -- JSON Array of words
    recommended_grammar TEXT, -- JSON Array of grammars
    exercise_flashcards TEXT, -- JSON Array of flashcard exercises
    exercise_quiz TEXT, -- JSON of quizzes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
