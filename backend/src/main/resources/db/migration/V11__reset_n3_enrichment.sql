-- Reset all vocabulary enrichment data to clear Chinese text translation bugs.
UPDATE vocabulary SET sample_sentence = NULL, sample_reading = NULL, sample_translation = NULL, kanji_words = NULL;
