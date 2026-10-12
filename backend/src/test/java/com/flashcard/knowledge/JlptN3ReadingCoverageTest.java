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

    @Test
    void testGrammarConjugationsAndVariations() {
        JlptN3CourseService service = new JlptN3CourseService(null, null, null, null, null, null, null);

        List<Map<String, Object>> grammarList = new ArrayList<>();
        grammarList.add(Map.of("cau_truc", "~ようにする", "y_nghia", "cố gắng"));
        grammarList.add(Map.of("cau_truc", "~ようにしている", "y_nghia", "duy trì thói quen"));
        grammarList.add(Map.of("cau_truc", "~上(に)", "y_nghia", "hơn nữa"));
        grammarList.add(Map.of("cau_truc", "~わりに(は)", "y_nghia", "dù/so với"));
        grammarList.add(Map.of("cau_truc", "~をもとに(して)", "y_nghia", "dựa trên"));
        grammarList.add(Map.of("cau_truc", "Vたらどう", "y_nghia", "nếu...thì sao"));
        grammarList.add(Map.of("cau_truc", "〜など〜なんか〜なんて(2)", "y_nghia", "như là / cái thứ như"));
        grammarList.add(Map.of("cau_truc", "~ざるを得ない", "y_nghia", "đành phải"));
        grammarList.add(Map.of("cau_truc", "~わけにはいかない", "y_nghia", "không thể"));
        grammarList.add(Map.of("cau_truc", "~に違いない", "y_nghia", "chắc chắn là"));
        grammarList.add(Map.of("cau_truc", "~ば~ほど", "y_nghia", "càng...càng"));

        // A passage using natural polite/past conjugated forms
        String passage = "健康のために、毎日[野菜|やさい]を食べるようにしています。" +
                "昨日は遅刻しないようにしました。" +
                "この店は安いです。その上においしいです。" +
                "値段のわりに質がとても良いです。" +
                "これは事実をもとにして作られた映画です。" +
                "疲れているなら、少し休んだらどうですか。" +
                "彼が嘘をつくなんて信じられません。" +
                "悪天候のため、試合を中止せざるを得ませんでした。" +
                "途中で諦めるわけにはいきません。" +
                "犯人は彼に違いありません。" +
                "本は読めば読むほど知識が増えます。";

        Map<String, Object> coverage = service.calculateReadingCoverage(passage, Collections.emptyList(), grammarList);

        assertNotNull(coverage);
        assertEquals(11, coverage.get("totalGrammar"));
        assertEquals(11, coverage.get("matchedGrammarCount"), "Should match all 11 grammar patterns across all inflected forms");
        assertEquals(100.0, (Double) coverage.get("grammarCoveragePercent"), 0.01);
    }

    @Test
    void testChapter1Lesson1AllGrammarsMatched() {
        JlptN3CourseService service = new JlptN3CourseService(null, null, null, null, null, null, null);

        List<Map<String, Object>> grammarList = new ArrayList<>();
        grammarList.add(Map.of("cau_truc", "~ば~ほど", "y_nghia", "càng...càng"));
        grammarList.add(Map.of("cau_truc", "~ようなら", "y_nghia", "nếu như"));
        grammarList.add(Map.of("cau_truc", "~ように", "y_nghia", "để"));
        grammarList.add(Map.of("cau_truc", "~ようにする", "y_nghia", "cố gắng"));
        grammarList.add(Map.of("cau_truc", "~ようにしている", "y_nghia", "duy trì thói quen"));
        grammarList.add(Map.of("cau_truc", "〜ところだ", "y_nghia", "đúng lúc/vừa mới"));
        grammarList.add(Map.of("cau_truc", "~たばかり", "y_nghia", "vừa mới"));

        String passage = "日本語を勉強すればするほど、その奥深さが分かるようになる。" +
                "もし分からないようなら、遠慮なく先生に質問してください。" +
                "試験に合格できるように、毎日しっかり復習しています。" +
                "健康のために、夜更かしをしないようにしました。" +
                "毎朝30分ジョギングするようにしています。" +
                "ちょうど今、図書館で本を借りてきたところです。" +
                "日本に引っ越してきたばかりの頃は、生活習慣に戸惑うこともありました。";

        Map<String, Object> coverage = service.calculateReadingCoverage(passage, Collections.emptyList(), grammarList);

        assertNotNull(coverage);
        assertEquals(7, coverage.get("totalGrammar"));
        assertEquals(7, coverage.get("matchedGrammarCount"), "Should match all 7/7 Chapter 1 Lesson 1 grammar patterns (100%)");
        assertEquals(100.0, (Double) coverage.get("grammarCoveragePercent"), 0.01);
        assertEquals(0, ((List<?>) coverage.get("missingGrammars")).size());
    }
}
