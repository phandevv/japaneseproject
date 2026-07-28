-- V25: Add usage_guide column to vocabulary and grammar_cards tables
ALTER TABLE vocabulary ADD COLUMN usage_guide TEXT;
ALTER TABLE grammar_cards ADD COLUMN usage_guide TEXT;
