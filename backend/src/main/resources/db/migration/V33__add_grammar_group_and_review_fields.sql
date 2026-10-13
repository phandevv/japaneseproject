ALTER TABLE jlpt_n3_grammar_quizzes 
    ADD COLUMN group_id BIGINT NULL COMMENT 'FK to jlpt_n3_grammar_groups; nullable for lesson-specific quizzes',
    ADD COLUMN group_code VARCHAR(100) NULL COMMENT 'Denormalized group code for fast lookup',
    ADD COLUMN question_type VARCHAR(50) DEFAULT 'MCQ' COMMENT 'MCQ, FILL_BLANK, CHOOSE_PATTERN';

ALTER TABLE jlpt_n3_progress 
    ADD COLUMN grammar_review_passed BOOLEAN DEFAULT FALSE,
    ADD COLUMN grammar_review_score INT DEFAULT 0,
    ADD COLUMN grammar_review_best_score INT DEFAULT 0;
