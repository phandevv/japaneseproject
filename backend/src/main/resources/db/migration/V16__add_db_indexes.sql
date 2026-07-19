CREATE INDEX idx_word_reviews_user_next ON word_reviews(user_id, next_review);
CREATE INDEX idx_grammar_reviews_user_next ON grammar_reviews(user_id, next_review);
