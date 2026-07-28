-- V24: Deduplicate vocabulary table and merge enriched content across decks (N3, MIMIKARA_N3, etc.)

-- 1. Fill missing meanings and han_viet in MIMIKARA_N3 from existing N3/N2/N1 entries matching same kanji/hiragana
UPDATE vocabulary v1
SET
  meaning = (SELECT MIN(v2.meaning) FROM vocabulary v2 WHERE v2.id <> v1.id AND (v2.kanji = v1.kanji OR v2.hiragana = v1.hiragana) AND v2.meaning IS NOT NULL AND v2.meaning <> ''),
  han_viet = (SELECT MIN(v2.han_viet) FROM vocabulary v2 WHERE v2.id <> v1.id AND (v2.kanji = v1.kanji OR v2.hiragana = v1.hiragana) AND v2.han_viet IS NOT NULL AND v2.han_viet <> ''),
  sample_sentence = (SELECT MIN(v2.sample_sentence) FROM vocabulary v2 WHERE v2.id <> v1.id AND (v2.kanji = v1.kanji OR v2.hiragana = v1.hiragana) AND v2.sample_sentence IS NOT NULL AND v2.sample_sentence <> ''),
  sample_reading = (SELECT MIN(v2.sample_reading) FROM vocabulary v2 WHERE v2.id <> v1.id AND (v2.kanji = v1.kanji OR v2.hiragana = v1.hiragana) AND v2.sample_reading IS NOT NULL AND v2.sample_reading <> ''),
  sample_translation = (SELECT MIN(v2.sample_translation) FROM vocabulary v2 WHERE v2.id <> v1.id AND (v2.kanji = v1.kanji OR v2.hiragana = v1.hiragana) AND v2.sample_translation IS NOT NULL AND v2.sample_translation <> ''),
  pitch_accent = (SELECT MIN(v2.pitch_accent) FROM vocabulary v2 WHERE v2.id <> v1.id AND (v2.kanji = v1.kanji OR v2.hiragana = v1.hiragana) AND v2.pitch_accent IS NOT NULL AND v2.pitch_accent <> '')
WHERE (v1.meaning IS NULL OR v1.meaning = '')
  AND EXISTS (SELECT 1 FROM vocabulary v3 WHERE v3.id <> v1.id AND (v3.kanji = v1.kanji OR v3.hiragana = v1.hiragana) AND v3.meaning IS NOT NULL AND v3.meaning <> '');

-- 2. Consolidate level tags on the primary (lowest ID) vocabulary row for duplicate words
UPDATE vocabulary v_primary
SET level = CONCAT(v_primary.level, ',MIMIKARA_N3')
WHERE v_primary.level <> 'MIMIKARA_N3'
  AND v_primary.level NOT LIKE '%MIMIKARA_N3%'
  AND EXISTS (
      SELECT 1 FROM vocabulary v_dup
      WHERE v_dup.level LIKE '%MIMIKARA_N3%'
        AND v_dup.id <> v_primary.id
        AND (
            (v_primary.kanji IS NOT NULL AND v_primary.kanji <> '' AND v_dup.kanji = v_primary.kanji)
            OR
            ((v_primary.kanji IS NULL OR v_primary.kanji = '') AND v_dup.hiragana = v_primary.hiragana)
        )
  );

-- 3. Delete duplicate secondary vocabulary rows where a primary row with lower ID already exists
DELETE FROM vocabulary
WHERE id IN (
    SELECT v_dup.id
    FROM (SELECT id, kanji, hiragana FROM vocabulary) v_dup
    JOIN (SELECT id, kanji, hiragana FROM vocabulary) v_prim ON (
        (v_prim.kanji IS NOT NULL AND v_prim.kanji <> '' AND v_dup.kanji = v_prim.kanji)
        OR
        ((v_prim.kanji IS NULL OR v_prim.kanji = '') AND v_dup.hiragana = v_prim.hiragana AND v_dup.hiragana IS NOT NULL AND v_dup.hiragana <> '')
    )
    WHERE v_dup.id > v_prim.id
);
