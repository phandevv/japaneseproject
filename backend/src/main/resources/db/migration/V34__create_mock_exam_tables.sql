-- V34__create_mock_exam_tables.sql
-- JLPT Exam Master tables + attempt tracking + per-question answers
-- Compatible with H2 (local dev) and MySQL 8.0 (production AWS RDS)

CREATE TABLE jlpt_exams (
    id              VARCHAR(50)  PRIMARY KEY,
    level           VARCHAR(10)  NOT NULL,
    exam_year       INT          NOT NULL,
    exam_month      INT          NOT NULL,
    title           VARCHAR(255) NOT NULL,
    total_questions INT          NOT NULL,
    audio_file      VARCHAR(255),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jlpt_exam_sections (
    id              VARCHAR(100) PRIMARY KEY,
    exam_id         VARCHAR(50)  NOT NULL,
    section_id      VARCHAR(50)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    title_vi        VARCHAR(255),
    section_order   INT          NOT NULL,
    time_limit_sec  INT          NOT NULL,
    total_questions INT          NOT NULL,
    CONSTRAINT fk_exam_section_exam FOREIGN KEY (exam_id) REFERENCES jlpt_exams(id) ON DELETE CASCADE
);

CREATE TABLE jlpt_exam_questions (
    id                 VARCHAR(100) PRIMARY KEY,
    exam_id            VARCHAR(50)  NOT NULL,
    section_id         VARCHAR(50)  NOT NULL,
    section_record_id  VARCHAR(100) NOT NULL,
    mondai             INT          NOT NULL,
    question_number    INT          NOT NULL,
    question_type      VARCHAR(50),
    question_text      TEXT,
    passage            TEXT,
    choices_json       TEXT         NOT NULL,
    correct_answer     INT          NOT NULL,
    image_ref          VARCHAR(255),
    audio_start_sec    DOUBLE,
    audio_end_sec      DOUBLE,
    question_order     INT          NOT NULL,
    CONSTRAINT fk_exam_question_exam FOREIGN KEY (exam_id) REFERENCES jlpt_exams(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_question_section FOREIGN KEY (section_record_id) REFERENCES jlpt_exam_sections(id) ON DELETE CASCADE
);

CREATE TABLE mock_exam_attempts (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id               BIGINT        NOT NULL,
    exam_id               VARCHAR(50)   NOT NULL,
    level                 VARCHAR(10)   NOT NULL,
    exam_year             INT           NOT NULL,
    exam_month            INT           NOT NULL,
    status                VARCHAR(20)   NOT NULL DEFAULT 'IN_PROGRESS',
    current_section_index INT           NOT NULL DEFAULT 0,
    section_time_left_sec INT           NOT NULL DEFAULT 0,
    total_correct         INT           NOT NULL DEFAULT 0,
    total_questions       INT           NOT NULL DEFAULT 0,
    percentage            DOUBLE        NOT NULL DEFAULT 0.0,
    section_results_json  TEXT,
    started_at            TIMESTAMP     NOT NULL,
    completed_at          TIMESTAMP,
    CONSTRAINT fk_mock_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mock_attempt_exam FOREIGN KEY (exam_id) REFERENCES jlpt_exams(id) ON DELETE CASCADE
);

CREATE TABLE mock_exam_answers (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id      BIGINT        NOT NULL,
    section_id      VARCHAR(50)   NOT NULL,
    question_id     VARCHAR(100)  NOT NULL,
    selected_choice INT,
    is_correct      BOOLEAN,
    created_at      TIMESTAMP     NOT NULL,
    CONSTRAINT fk_mock_answer_attempt FOREIGN KEY (attempt_id) REFERENCES mock_exam_attempts(id) ON DELETE CASCADE
);

CREATE INDEX idx_jlpt_exam_year_month     ON jlpt_exams(exam_year, exam_month);
CREATE INDEX idx_jlpt_section_exam        ON jlpt_exam_sections(exam_id, section_order);
CREATE INDEX idx_jlpt_question_exam       ON jlpt_exam_questions(exam_id, question_order);
CREATE INDEX idx_jlpt_question_sec        ON jlpt_exam_questions(section_record_id, question_order);
CREATE INDEX idx_mock_attempt_user_status ON mock_exam_attempts(user_id, status);
CREATE INDEX idx_mock_attempt_exam_id     ON mock_exam_attempts(exam_id);
CREATE INDEX idx_mock_answer_attempt      ON mock_exam_answers(attempt_id, section_id);
CREATE INDEX idx_mock_answer_question     ON mock_exam_answers(attempt_id, question_id);
