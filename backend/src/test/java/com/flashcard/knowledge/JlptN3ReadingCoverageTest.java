package com.flashcard.knowledge;

import com.flashcard.knowledge.service.JlptN3CourseService;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class JlptN3ReadingCoverageTest {

    @Test
    void testCalculateReadingCoverage_PassCriteria() {
        JlptN3CourseService service = new JlptN3CourseService(null, null, null, null, null, null, null);

        // Mock 4 grammar points
        List<Map<String, Object>> grammarList = new ArrayList<>();
        grammarList.add(Map.of("cau_truc", "〜に関して", "y_nghia", "về vấn đề"));
        grammarList.add(Map.of("cau_truc", "〜に比べて", "y_nghia", "so với"));
        grammarList.add(Map.of("cau_truc", "〜わけではない", "y_nghia", "không hẳn là"));
        grammarList.add(Map.of("cau_truc", "〜を通じて", "y_nghia", "thông qua"));

        // Mock 10 vocabulary words (50% is 5 words, > 50% is at least 6 words)
        List<Map<String, Object>> vocabList = new ArrayList<>();
        vocabList.add(Map.of("tu", "環境", "furigana", "かんきょう", "nghia", "môi trường"));
        vocabList.add(Map.of("tu", "技術", "furigana", "ぎじゅつ", "nghia", "kỹ thuật"));
        vocabList.add(Map.of("tu", "進歩", "furigana", "しんぽ", "nghia", "tiến bộ"));
        vocabList.add(Map.of("tu", "生活", "furigana", "せいかつ", "nghia", "đời sống"));
        vocabList.add(Map.of("tu", "変化", "furigana", "へんか", "nghia", "thay đổi"));
        vocabList.add(Map.of("tu", "情報", "furigana", "じょうほう", "nghia", "thông tin"));
        vocabList.add(Map.of("tu", "世界", "furigana", "せかい", "nghia", "thế giới"));
        vocabList.add(Map.of("tu", "大切", "furigana", "たいせつ", "nghia", "quan trọng"));
        vocabList.add(Map.of("tu", "森林", "furigana", "しんりん", "nghia", "rừng rậm"));
        vocabList.add(Map.of("tu", "動物", "furigana", "どうぶつ", "nghia", "động vật"));

        // Passage containing:
        // - All 4 grammars: 〜に関して, 〜に比べて, 〜わけではない, 〜を通じて (100%)
        // - 6 vocabs: [環境|かんきょう], [技術|ぎじゅつ], [進歩|しんぽ], [生活|せいかつ], [変化|へんか], [情報|じょうほう] (6/10 = 60% > 50%)
        String passage = "現代の[生活|せいかつ]における[環境|かんきょう]問題に関して、[技術|ぎじゅつ]の[進歩|しんぽ]によって" +
                "日々の[変化|へんか]を[情報|じょうほう]を通じて知ることができる。昔に比べて便利になったが、すべてが解決したわけではない。";

        Map<String, Object> coverage = service.calculateReadingCoverage(passage, vocabList, grammarList);

        assertNotNull(coverage);
        assertEquals(4, coverage.get("totalGrammar"));
        assertEquals(4, coverage.get("matchedGrammarCount"));
        assertEquals(100.0, (Double) coverage.get("grammarCoveragePercent"), 0.01);

        assertEquals(10, coverage.get("totalVocab"));
        assertEquals(6, coverage.get("matchedVocabCount"));
        assertEquals(60.0, (Double) coverage.get("vocabCoveragePercent"), 0.01);
        assertEquals(true, coverage.get("passedCriteria"));
    }

    @Test
    void testCalculateReadingCoverage_FailCriteria_WhenGrammarMissing() {
        JlptN3CourseService service = new JlptN3CourseService(null, null, null, null, null, null, null);

        List<Map<String, Object>> grammarList = new ArrayList<>();
        grammarList.add(Map.of("cau_truc", "〜に関して", "y_nghia", "về"));
        grammarList.add(Map.of("cau_truc", "〜に比べて", "y_nghia", "so với"));

        List<Map<String, Object>> vocabList = new ArrayList<>();
        vocabList.add(Map.of("tu", "環境", "furigana", "かんきょう", "nghia", "môi trường"));
        vocabList.add(Map.of("tu", "生活", "furigana", "せいかつ", "nghia", "đời sống"));

        // Only has 〜に関して, missing 〜に比べて -> grammar coverage is 50% < 100%
        String passage = "現代の[生活|せいかつ]における[環境|かんきょう]問題に関して議論する。";

        Map<String, Object> coverage = service.calculateReadingCoverage(passage, vocabList, grammarList);

        assertNotNull(coverage);
        assertEquals(2, coverage.get("totalGrammar"));
        assertEquals(1, coverage.get("matchedGrammarCount"));
        assertEquals(50.0, (Double) coverage.get("grammarCoveragePercent"), 0.01);
        assertEquals(false, coverage.get("passedCriteria"));
    }

    @Test
    void testMinimumVocabCalculationForLargeLesson() {
        int totalVocab = 75;
        int minRequired = (int) Math.floor(totalVocab * 0.5) + 1;
        assertEquals(38, minRequired);
        assertTrue(minRequired > totalVocab * 0.5);

        int totalVocab80 = 80;
        int minRequired80 = (int) Math.floor(totalVocab80 * 0.5) + 1;
        assertEquals(41, minRequired80);
        assertTrue(minRequired80 > totalVocab80 * 0.5);
    }
}
