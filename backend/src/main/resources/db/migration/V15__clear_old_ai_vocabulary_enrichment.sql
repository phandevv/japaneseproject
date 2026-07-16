-- Clear old AI vocabulary enrichment data to prepare for dynamic enrichment on click
UPDATE vocabulary 
SET pitch_accent = NULL, 
    synonyms = NULL, 
    antonyms = NULL, 
    common_mistakes = NULL, 
    collocations = NULL, 
    mnemonic = NULL, 
    conversation_examples = NULL, 
    example_sentences = NULL;
