-- V24: Fill missing meanings and enriched data in Mimikara N3 without deleting rows

-- 1. Fill missing meaning in MIMIKARA_N3 from matching kanji/hiragana entries in N3/N2/N1
UPDATE vocabulary
SET meaning = (
    SELECT MIN(v2.meaning)
    FROM (SELECT id, kanji, hiragana, meaning FROM vocabulary) v2
    WHERE v2.id <> vocabulary.id
      AND ((v2.kanji IS NOT NULL AND v2.kanji <> '' AND v2.kanji = vocabulary.kanji)
           OR (v2.hiragana IS NOT NULL AND v2.hiragana <> '' AND v2.hiragana = vocabulary.hiragana))
      AND v2.meaning IS NOT NULL AND v2.meaning <> ''
)
WHERE (meaning IS NULL OR meaning = '')
  AND EXISTS (
      SELECT 1 FROM (SELECT id, kanji, hiragana, meaning FROM vocabulary) v3
      WHERE v3.id <> vocabulary.id
        AND ((v3.kanji IS NOT NULL AND v3.kanji <> '' AND v3.kanji = vocabulary.kanji)
             OR (v3.hiragana IS NOT NULL AND v3.hiragana <> '' AND v3.hiragana = vocabulary.hiragana))
        AND v3.meaning IS NOT NULL AND v3.meaning <> ''
  );

-- 2. Fill missing han_viet in MIMIKARA_N3 from matching entries
UPDATE vocabulary
SET han_viet = (
    SELECT MIN(v2.han_viet)
    FROM (SELECT id, kanji, hiragana, han_viet FROM vocabulary) v2
    WHERE v2.id <> vocabulary.id
      AND ((v2.kanji IS NOT NULL AND v2.kanji <> '' AND v2.kanji = vocabulary.kanji)
           OR (v2.hiragana IS NOT NULL AND v2.hiragana <> '' AND v2.hiragana = vocabulary.hiragana))
      AND v2.han_viet IS NOT NULL AND v2.han_viet <> ''
)
WHERE (han_viet IS NULL OR han_viet = '')
  AND EXISTS (
      SELECT 1 FROM (SELECT id, kanji, hiragana, han_viet FROM vocabulary) v3
      WHERE v3.id <> vocabulary.id
        AND ((v3.kanji IS NOT NULL AND v3.kanji <> '' AND v3.kanji = vocabulary.kanji)
             OR (v3.hiragana IS NOT NULL AND v3.hiragana <> '' AND v3.hiragana = vocabulary.hiragana))
        AND v3.han_viet IS NOT NULL AND v3.han_viet <> ''
  );

-- 3. Fill missing sample_sentence in MIMIKARA_N3 from matching entries
UPDATE vocabulary
SET sample_sentence = (
    SELECT MIN(v2.sample_sentence)
    FROM (SELECT id, kanji, hiragana, sample_sentence FROM vocabulary) v2
    WHERE v2.id <> vocabulary.id
      AND ((v2.kanji IS NOT NULL AND v2.kanji <> '' AND v2.kanji = vocabulary.kanji)
           OR (v2.hiragana IS NOT NULL AND v2.hiragana <> '' AND v2.hiragana = vocabulary.hiragana))
      AND v2.sample_sentence IS NOT NULL AND v2.sample_sentence <> ''
)
WHERE (sample_sentence IS NULL OR sample_sentence = '')
  AND EXISTS (
      SELECT 1 FROM (SELECT id, kanji, hiragana, sample_sentence FROM vocabulary) v3
      WHERE v3.id <> vocabulary.id
        AND ((v3.kanji IS NOT NULL AND v3.kanji <> '' AND v3.kanji = vocabulary.kanji)
             OR (v3.hiragana IS NOT NULL AND v3.hiragana <> '' AND v3.hiragana = vocabulary.hiragana))
        AND v3.sample_sentence IS NOT NULL AND v3.sample_sentence <> ''
  );
