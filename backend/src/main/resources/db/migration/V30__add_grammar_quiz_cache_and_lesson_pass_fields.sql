ALTER TABLE jlpt_n3_progress ADD COLUMN vocab_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE jlpt_n3_progress ADD COLUMN kanji_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE jlpt_n3_progress ADD COLUMN grammar_passed BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS jlpt_n3_grammar_quizzes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chapter_id INT NOT NULL,
    lesson_id INT NOT NULL,
    questions_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_n3_grammar_quiz UNIQUE (chapter_id, lesson_id)
);
