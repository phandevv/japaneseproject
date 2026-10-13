CREATE TABLE IF NOT EXISTS jlpt_n3_grammar_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT,
    usage_guide LONGTEXT,
    usage_cases LONGTEXT,
    grammar_pattern_ids LONGTEXT,
    example_sentences_json LONGTEXT,
    sort_order INT DEFAULT 0,
    total_patterns INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_n3_grammar_group_code UNIQUE (group_code)
);
