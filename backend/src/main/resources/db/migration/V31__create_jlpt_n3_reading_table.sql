CREATE TABLE IF NOT EXISTS jlpt_n3_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chapter_id INT NOT NULL,
    lesson_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    passage LONGTEXT NOT NULL,
    translation LONGTEXT,
    questions_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_n3_reading UNIQUE (chapter_id, lesson_id)
);

ALTER TABLE jlpt_n3_progress ADD COLUMN reading_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE jlpt_n3_progress ADD COLUMN reading_score INT DEFAULT 0;
