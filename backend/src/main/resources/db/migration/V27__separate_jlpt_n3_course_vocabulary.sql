-- Separate JLPT N3 9-Chapter Course Vocabulary from Daily Study Mimikara N3 Vocabulary
UPDATE vocabulary 
SET level = 'N3_COURSE' 
WHERE category LIKE 'Tổng ôn N3%' OR category LIKE 'JLPT N3%';
