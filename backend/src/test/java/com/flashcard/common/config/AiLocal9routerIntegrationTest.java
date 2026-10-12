package com.flashcard.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledIfEnvironmentVariable;
import org.mockito.Mockito;

import java.net.InetSocketAddress;
import java.net.Socket;

import static org.junit.jupiter.api.Assertions.*;

@Tag("integration")
@DisabledIfEnvironmentVariable(named = "CI", matches = ".*")
class AiLocal9routerIntegrationTest {

    private static boolean is9routerRunning() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("localhost", 20128), 500);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    void testCall9routerDirectly() throws Exception {
        Assumptions.assumeTrue(is9routerRunning(), "9router daemon is not running on localhost:20128 - skipping local integration test");

        AiConfig config = new AiConfig(
            "http://localhost:20128/v1/chat/completions",
            "or/deepseek/deepseek-v4.1-flash",
            "sk-dec5b2f978fc54fa-o9s8r4-b2903f16"
        );

        VocabularyDataProvider vocabProvider = Mockito.mock(VocabularyDataProvider.class);
        ObjectMapper objectMapper = new ObjectMapper();
        DeepSeekEnrichmentService service = new DeepSeekEnrichmentService(vocabProvider, null, objectMapper, config);

        String result = service.callDeepSeekRawWithParams(config.getApiKey(), "Dịch từ 日本 sang tiếng Việt ngắn gọn", 300, 30);
        assertNotNull(result);
        assertFalse(result.isBlank());
        System.out.println(">>> 9router Response Content: " + result);
    }

    @Test
    void testGenerateN3ReadingWithRealAi() {
        Assumptions.assumeTrue(is9routerRunning(), "9router daemon is not running on localhost:20128 - skipping local integration test");

        AiConfig config = new AiConfig(null, null, null);

        VocabularyDataProvider vocabProvider = Mockito.mock(VocabularyDataProvider.class);
        ObjectMapper objectMapper = new ObjectMapper();
        DeepSeekEnrichmentService service = new DeepSeekEnrichmentService(vocabProvider, null, objectMapper, config);

        java.util.List<java.util.Map<String, Object>> vocabList = java.util.List.of(
            java.util.Map.of("tu", "引っ越し", "furigana", "ひっこし", "nghia", "Chuyển nhà"),
            java.util.Map.of("tu", "部屋", "furigana", "へや", "nghia", "Căn phòng"),
            java.util.Map.of("tu", "家賃", "furigana", "やちん", "nghia", "Tiền thuê nhà"),
            java.util.Map.of("tu", "契約", "furigana", "けいやく", "nghia", "Hợp đồng")
        );

        java.util.List<java.util.Map<String, Object>> grammarList = java.util.List.of(
            java.util.Map.of("cau_truc", "〜を中心", "y_nghia", "Lấy làm trung tâm"),
            java.util.Map.of("cau_truc", "〜をはじめ", "y_nghia", "Trước hết là/Đầu tiên là")
        );

        System.out.println(">>> Step 1: Calling AI to generate passage...");
        java.util.Map<String, String> passageResult = service.generateN3ReadingPassage(1, 3, vocabList, grammarList);
        assertNotNull(passageResult);
        String passage = passageResult.get("passage");
        assertNotNull(passage);
        assertFalse(passage.isBlank());
        System.out.println(">>> Generated Passage Title: " + passageResult.get("title"));
        System.out.println(">>> Generated Passage Length: " + passage.length());

        System.out.println(">>> Step 2: Calling AI to generate 10 questions...");
        String questionsJson = service.generateN3ReadingQuestions(1, 3, passage, grammarList);
        assertNotNull(questionsJson);
        assertFalse(questionsJson.isBlank());
        System.out.println(">>> Generated Questions JSON: " + questionsJson.substring(0, Math.min(200, questionsJson.length())) + "...");
    }

    @Test
    void testGenerateAndVerifyChapter1Lesson1GrammarCoverage100Percent() {
        Assumptions.assumeTrue(is9routerRunning(), "9router daemon is not running on localhost:20128 - skipping local integration test");

        AiConfig config = new AiConfig(null, null, null);
        VocabularyDataProvider vocabProvider = Mockito.mock(VocabularyDataProvider.class);
        ObjectMapper objectMapper = new ObjectMapper();
        DeepSeekEnrichmentService service = new DeepSeekEnrichmentService(vocabProvider, null, objectMapper, config);
        com.flashcard.knowledge.service.JlptN3CourseService courseService =
            new com.flashcard.knowledge.service.JlptN3CourseService(null, null, null, null, null, null, null);

        // Real 7 grammar patterns of Chapter 1 Lesson 1
        java.util.List<java.util.Map<String, Object>> grammarList = java.util.List.of(
            java.util.Map.of("cau_truc", "~ば~ほど", "y_nghia", "Càng... càng..."),
            java.util.Map.of("cau_truc", "~ように", "y_nghia", "Để V/ Để không V"),
            java.util.Map.of("cau_truc", "~ようなら", "y_nghia", "Nếu như..."),
            java.util.Map.of("cau_truc", "~ようにする", "y_nghia", "(Sẽ) Cố gắng V/ không V"),
            java.util.Map.of("cau_truc", "~ようにしている", "y_nghia", "Cố gắng duy trì thói quen làm/không làm V"),
            java.util.Map.of("cau_truc", "〜ところだ", "y_nghia", "Sắp sửa / Đúng vào lúc đang làm / Vừa mới làm"),
            java.util.Map.of("cau_truc", "~たばかり", "y_nghia", "Vừa mới làm V")
        );

        java.util.List<java.util.Map<String, Object>> vocabList = java.util.List.of(
            java.util.Map.of("tu", "電球", "furigana", "でんきゅう", "nghia", "Bóng đèn"),
            java.util.Map.of("tu", "習慣", "furigana", "しゅうかん", "nghia", "Thói quen"),
            java.util.Map.of("tu", "最後", "furigana", "さいご", "nghia", "Cuối cùng"),
            java.util.Map.of("tu", "最初", "furigana", "さいしょ", "nghia", "Đầu tiên"),
            java.util.Map.of("tu", "最新", "furigana", "さいしん", "nghia", "Mới nhất"),
            java.util.Map.of("tu", "最中", "furigana", "さなか", "nghia", "Đang trong lúc"),
            java.util.Map.of("tu", "節約", "furigana", "せつやく", "nghia", "Tiết kiệm"),
            java.util.Map.of("tu", "作業", "furigana", "さぎょう", "nghia", "Công việc, thao tác")
        );

        System.out.println(">>> [TEST C1 L1] Step 1: Generating passage with 7 grammars...");
        java.util.Map<String, String> passageResult = service.generateN3ReadingPassage(1, 1, vocabList, grammarList);
        assertNotNull(passageResult);
        String passage = passageResult.get("passage");
        String title = passageResult.get("title");
        String translation = passageResult.get("translation");
        assertNotNull(passage);

        // Step 2: Coverage check & automatic repair if missing
        java.util.Map<String, Object> initialCoverage = courseService.calculateReadingCoverage(passage, vocabList, grammarList);
        @SuppressWarnings("unchecked")
        java.util.List<String> missing = (java.util.List<String>) initialCoverage.getOrDefault("missingGrammars", java.util.Collections.emptyList());
        System.out.println(">>> [TEST C1 L1] Initial Grammar Coverage: " + initialCoverage.get("grammarCoveragePercent") + "% | Missing: " + missing);

        if (!missing.isEmpty()) {
            System.out.println(">>> [TEST C1 L1] Self-healing repair triggered for " + missing.size() + " missing grammars...");
            java.util.Map<String, String> repaired = service.repairMissingGrammars(1, 1, title, passage, translation, missing, grammarList);
            assertNotNull(repaired);
            passage = repaired.getOrDefault("passage", passage);
        }

        java.util.Map<String, Object> finalCoverage = courseService.calculateReadingCoverage(passage, vocabList, grammarList);
        System.out.println(">>> [TEST C1 L1] Final Grammar Coverage: " + finalCoverage.get("grammarCoveragePercent") + "% | Matched: " + finalCoverage.get("matchedGrammars"));
        @SuppressWarnings("unchecked")
        java.util.List<String> finalMissing = (java.util.List<String>) finalCoverage.getOrDefault("missingGrammars", java.util.Collections.emptyList());
        assertEquals(0, finalMissing.size(), "All 7 grammar patterns must be covered 100%! Missing: " + finalMissing);
        assertEquals(100.0, (Double) finalCoverage.get("grammarCoveragePercent"), 0.01);
    }
}


