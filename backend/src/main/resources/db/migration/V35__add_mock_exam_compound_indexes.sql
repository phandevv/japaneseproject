-- V35__add_mock_exam_compound_indexes.sql
-- Additional composite indexes for mock exam attempts and exam list filtering
-- Compatible with both H2 (local development) and MySQL 8.0 (production AWS RDS)

CREATE INDEX idx_mock_attempt_user_started ON mock_exam_attempts(user_id, started_at);
CREATE INDEX idx_mock_attempt_user_exam_started ON mock_exam_attempts(user_id, exam_id, started_at);
CREATE INDEX idx_jlpt_exam_level_year_month ON jlpt_exams(level, exam_year, exam_month);
