-- V26: Add JLPT N3 Course Progress Table
CREATE TABLE IF NOT EXISTS jlpt_n3_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chapter_id INT NOT NULL,
    lesson_id INT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    best_score INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_chapter_lesson UNIQUE (user_id, chapter_id, lesson_id),
    CONSTRAINT fk_jlpt_n3_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
