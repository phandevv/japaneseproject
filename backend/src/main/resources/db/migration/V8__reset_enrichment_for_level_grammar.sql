-- Reset enrichment data so it will be regenerated with JLPT-level-appropriate grammar
-- The DeepSeek prompt has been updated to include grammar level constraints.
-- Clearing sampleSentence triggers re-enrichment on next vocabulary view.
UPDATE vocabulary SET sample_sentence = NULL, sample_reading = NULL, sample_translation = NULL, kanji_words = NULL;
