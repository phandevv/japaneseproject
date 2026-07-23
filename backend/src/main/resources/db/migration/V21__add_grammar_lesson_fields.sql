-- Add lesson categorization fields to grammar_cards
ALTER TABLE grammar_cards ADD COLUMN week_name VARCHAR(50);
ALTER TABLE grammar_cards ADD COLUMN day_name VARCHAR(50);
ALTER TABLE grammar_cards ADD COLUMN lesson_title VARCHAR(255);
