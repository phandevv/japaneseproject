package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.JlptN3GrammarGroup;
import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.provider.JlptN3DataProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JlptN3GrammarReviewServiceTest {

    @Mock
    private JlptN3DataProvider dataProvider;

    private JlptN3GrammarReviewService service;

    private JlptN3GrammarGroup group1;
    private JlptN3GrammarGroup group2;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new JlptN3GrammarReviewService(dataProvider, new ObjectMapper());

        group1 = new JlptN3GrammarGroup();
        group1.setId(1L);
        group1.setGroupCode("GRP_01");
        group1.setTitle("Thể điều kiện và phủ định");
        group1.setDescription("Nhóm ngữ pháp về điều kiện...");
        group1.setUsageGuide("Cách dùng thể điều kiện...");
        group1.setUsageCases("Trường hợp dùng...");
        group1.setGrammarPatternIds("[\"ば\", \"てもいいです\", \"てはいけません\"]");
        group1.setTotalPatterns(3);
        group1.setSortOrder(1);

        group2 = new JlptN3GrammarGroup();
        group2.setId(2L);
        group2.setGroupCode("GRP_02");
        group2.setTitle("Thể phủ định và câu hỏi");
        group2.setDescription("Nhóm ngữ pháp về phủ định...");
        group2.setUsageGuide("Cách dùng phủ định...");
        group2.setUsageCases("Trường hợp dùng...");
        group2.setGrammarPatternIds("[\"ない\", \"か\", \"のか\", \"のかな\"]");
        group2.setTotalPatterns(4);
        group2.setSortOrder(2);
    }

    @Test
    void getGrammarGroupOverview_shouldReturnAllGroupsWithProgress() {
        when(dataProvider.findAllGrammarGroups()).thenReturn(Arrays.asList(group1, group2));

        var result = service.getGrammarGroupOverview(1L);

        assertThat(result).isNotNull();
        assertThat(result.groups()).hasSize(2);
        assertThat(result.groups().get(0).groupCode()).isEqualTo("GRP_01");
        assertThat(result.groups().get(0).totalPatterns()).isEqualTo(3);
        verify(dataProvider, times(1)).findAllGrammarGroups();
    }

    @Test
    void getGrammarGroupOverview_shouldHandleNoGroups() {
        when(dataProvider.findAllGrammarGroups()).thenReturn(List.of());

        var result = service.getGrammarGroupOverview(1L);

        assertThat(result).isNotNull();
        assertThat(result.groups()).isEmpty();
    }

    @Test
    void getGrammarGroupDetail_shouldReturnGroupWithQuestions() {
        String questionsJson = "[{\"question\":\"test\",\"options\":[],\"answer\":\"A\"}]";
        JlptN3GrammarQuiz quiz1 = new JlptN3GrammarQuiz();
        quiz1.setId(10L);
        quiz1.setGroupId(1L);
        quiz1.setGroupCode("GRP_01");
        quiz1.setQuestionsJson(questionsJson);

        when(dataProvider.findGrammarGroupByCode("GRP_01")).thenReturn(Optional.of(group1));
        when(dataProvider.findQuizzesByGroupCode("GRP_01"))
                .thenReturn(List.of(Map.of("id", 10L, "questionsJson", questionsJson, "questionType", "MCQ")));

        var result = service.getGrammarGroupDetail("GRP_01", 1L);

        assertThat(result).isNotNull();
        assertThat(result.groupCode()).isEqualTo("GRP_01");
        assertThat(result.title()).isEqualTo("Thể điều kiện và phủ định");
        assertThat(result.questions()).hasSize(1);
        assertThat(result.questions().get(0).question()).contains("test");
    }

    @Test
    void getGrammarGroupDetail_shouldHandleGroupNotFound() {
        when(dataProvider.findGrammarGroupByCode("GRP_99")).thenReturn(Optional.empty());

        var result = service.getGrammarGroupDetail("GRP_99", 1L);

        assertThat(result).isNull();
        verify(dataProvider, never()).findQuizzesByGroupCode(anyString());
    }

    @Test
    void submitGroupQuiz_shouldUpdateProgress() {
        when(dataProvider.findProgress(1L, 0, 0)).thenReturn(Optional.empty());

        var result = service.submitGroupQuiz(1L, "GRP_01", 24, 30);

        assertThat(result).isNotNull();
        assertThat(result.passed()).isTrue();
        assertThat(result.score()).isEqualTo(24);
        assertThat(result.total()).isEqualTo(30);
        verify(dataProvider, times(1)).saveProgress(any());
    }

    @Test
    void submitGroupQuiz_shouldNotPassWhenBelowThreshold() {
        when(dataProvider.findProgress(1L, 0, 0)).thenReturn(Optional.empty());

        var result = service.submitGroupQuiz(1L, "GRP_01", 23, 30);

        assertThat(result.passed()).isFalse();
    }

    @Test
    void submitGroupQuiz_shouldUpdateBestScore() {
        var existingProgress = new com.flashcard.knowledge.model.JlptN3Progress();
        existingProgress.setId(5L);
        existingProgress.setUserId(1L);
        existingProgress.setChapterId(0);
        existingProgress.setLessonId(0);
        existingProgress.setGrammarReviewBestScore(28);

        when(dataProvider.findProgress(1L, 0, 0)).thenReturn(Optional.of(existingProgress));
        when(dataProvider.saveProgress(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = service.submitGroupQuiz(1L, "GRP_01", 26, 30);

        assertThat(result.score()).isEqualTo(26);
        assertThat(result.bestScore()).isEqualTo(28);
        verify(dataProvider).saveProgress(argThat(p -> p.getGrammarReviewBestScore() == 28));
    }

    @Test
    void submitGroupQuiz_shouldUpdateBestScoreWhenHigher() {
        var existingProgress = new com.flashcard.knowledge.model.JlptN3Progress();
        existingProgress.setId(5L);
        existingProgress.setUserId(1L);
        existingProgress.setChapterId(0);
        existingProgress.setLessonId(0);
        existingProgress.setGrammarReviewBestScore(26);
        existingProgress.setGrammarReviewPassed(true);

        when(dataProvider.findProgress(1L, 0, 0)).thenReturn(Optional.of(existingProgress));
        when(dataProvider.saveProgress(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = service.submitGroupQuiz(1L, "GRP_01", 29, 30);

        assertThat(result.score()).isEqualTo(29);
        assertThat(result.bestScore()).isEqualTo(29);
    }

    @Test
    void importGrammarGroupData_shouldSaveGroupsAndQuizzes() {
        String jsonData = """
            {
                "groups": [
                    {
                        "group_code": "GRP_01",
                        "title": "Conditional Forms",
                        "description": "Test description",
                        "usage_guide": "Guide text",
                        "usage_cases": "Cases text",
                        "patterns": [
                            {"cau_truc": "ば", "y_nghia": "condition", "examples": ["a","b","c"]}
                        ],
                        "questions": [
                            {"type": "MCQ", "question": "Q1", "options": ["A","B"], "answer": "A", "explanation": "Exp"}
                        ]
                    }
                ]
            }
            """;

        when(dataProvider.saveGrammarGroup(any(JlptN3GrammarGroup.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dataProvider.saveQuiz(any(JlptN3GrammarQuiz.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.importGrammarGroupData(jsonData);

        assertThat(result).isNotNull();
        assertThat(result.groupsSaved()).isEqualTo(1);
        assertThat(result.quizzesSaved()).isEqualTo(1);
        verify(dataProvider, times(1)).saveGrammarGroup(any());
        verify(dataProvider, times(1)).saveQuiz(any());
    }

    @Test
    void generateGrammarGroupsFromAi_shouldClusterImportAndGenerateContentPerGroup() {
        DeepSeekEnrichmentService enrichment = mock(DeepSeekEnrichmentService.class);
        JlptN3GrammarReviewService genService =
                new JlptN3GrammarReviewService(dataProvider, new ObjectMapper(), enrichment);

        List<Map<String, Object>> patterns = List.of(
                patternMap("～について", "về vấn đề"),
                patternMap("～によって", "do, bằng cách"),
                patternMap("～わけだ", "thì phải")
        );
        String clusterJson = """
            {"groups":[
                {"group_code":"GRP_01","title":"Nhóm 1","pattern_indices":[0,1]},
                {"group_code":"GRP_02","title":"Nhóm 2","pattern_indices":[2]}
            ]}
            """;

        when(enrichment.collectAllN3GrammarPatterns()).thenReturn(patterns);
        when(enrichment.clusterGrammarPatternsToGroups(any())).thenReturn(clusterJson);
        when(enrichment.generateGrammarGroupContent(anyString(), anyString(), anyList()))
                .thenReturn(contentJson());

        Map<String, JlptN3GrammarGroup> savedGroups = new HashMap<>();
        stubGroupSaving(savedGroups);

        var result = genService.generateGrammarGroupsFromAi();

        assertThat(result.groupsSaved()).isEqualTo(2);
        assertThat(result.quizzesSaved()).isEqualTo(2);
        verify(dataProvider).deleteAllGrammarGroups();
        verify(dataProvider).deleteAllGroupQuizzes();
        verify(dataProvider, times(2)).saveQuiz(any(JlptN3GrammarQuiz.class));
        assertThat(savedGroups.get("GRP_01").getDescription()).isEqualTo("desc");
        assertThat(savedGroups.get("GRP_01").getUsageGuide()).isEqualTo("guide");
        assertThat(savedGroups.get("GRP_01").getUsageCases()).isEqualTo("cases");
        assertThat(savedGroups.get("GRP_01").getTotalPatterns()).isEqualTo(2);
        assertThat(savedGroups.get("GRP_02").getTotalPatterns()).isEqualTo(1);
    }

    @Test
    void generateGrammarGroupsFromAi_shouldRedistributeUnassignedPatterns() {
        DeepSeekEnrichmentService enrichment = mock(DeepSeekEnrichmentService.class);
        JlptN3GrammarReviewService genService =
                new JlptN3GrammarReviewService(dataProvider, new ObjectMapper(), enrichment);

        List<Map<String, Object>> patterns = List.of(
                patternMap("～について", "về vấn đề"),
                patternMap("～によって", "do, bằng cách"),
                patternMap("～わけだ", "thì phải")
        );
        String clusterJson = """
            {"groups":[{"group_code":"GRP_01","title":"Nhóm 1","pattern_indices":[0]}]}
            """;

        when(enrichment.collectAllN3GrammarPatterns()).thenReturn(patterns);
        when(enrichment.clusterGrammarPatternsToGroups(any())).thenReturn(clusterJson);
        when(enrichment.generateGrammarGroupContent(anyString(), anyString(), anyList()))
                .thenReturn(contentJson());

        Map<String, JlptN3GrammarGroup> savedGroups = new HashMap<>();
        stubGroupSaving(savedGroups);

        var result = genService.generateGrammarGroupsFromAi();

        assertThat(result.groupsSaved()).isEqualTo(1);
        assertThat(result.quizzesSaved()).isEqualTo(1);
        assertThat(savedGroups.get("GRP_01").getTotalPatterns()).isEqualTo(3);
    }

    @Test
    void generateGrammarGroupsFromAi_shouldCountOnlySuccessfulContentGeneration() {
        DeepSeekEnrichmentService enrichment = mock(DeepSeekEnrichmentService.class);
        JlptN3GrammarReviewService genService =
                new JlptN3GrammarReviewService(dataProvider, new ObjectMapper(), enrichment);

        List<Map<String, Object>> patterns = List.of(
                patternMap("～について", "về vấn đề"),
                patternMap("～わけだ", "thì phải")
        );
        String clusterJson = """
            {"groups":[
                {"group_code":"GRP_01","title":"Nhóm 1","pattern_indices":[0]},
                {"group_code":"GRP_02","title":"Nhóm 2","pattern_indices":[1]}
            ]}
            """;

        when(enrichment.collectAllN3GrammarPatterns()).thenReturn(patterns);
        when(enrichment.clusterGrammarPatternsToGroups(any())).thenReturn(clusterJson);
        when(enrichment.generateGrammarGroupContent(eq("GRP_01"), anyString(), anyList())).thenReturn(null);
        when(enrichment.generateGrammarGroupContent(eq("GRP_02"), anyString(), anyList()))
                .thenReturn(contentJson());

        Map<String, JlptN3GrammarGroup> savedGroups = new HashMap<>();
        stubGroupSaving(savedGroups);

        var result = genService.generateGrammarGroupsFromAi();

        assertThat(result.groupsSaved()).isEqualTo(2);
        assertThat(result.quizzesSaved()).isEqualTo(1);
        verify(dataProvider, times(1)).saveQuiz(any(JlptN3GrammarQuiz.class));
    }

    private void stubGroupSaving(Map<String, JlptN3GrammarGroup> savedGroups) {
        AtomicLong idSeq = new AtomicLong(1);
        when(dataProvider.saveGrammarGroup(any(JlptN3GrammarGroup.class))).thenAnswer(inv -> {
            JlptN3GrammarGroup g = inv.getArgument(0);
            if (g.getId() == null) {
                g.setId(idSeq.incrementAndGet());
            }
            savedGroups.put(g.getGroupCode(), g);
            return g;
        });
        when(dataProvider.findGrammarGroupByCode(anyString())).thenAnswer(inv ->
                Optional.ofNullable(savedGroups.get(inv.<String>getArgument(0))));
        when(dataProvider.saveQuiz(any(JlptN3GrammarQuiz.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Map<String, Object> patternMap(String cauTruc, String yNghia) {
        Map<String, Object> p = new HashMap<>();
        p.put("cau_truc", cauTruc);
        p.put("y_nghia", yNghia);
        p.put("examples", List.of("例文です。"));
        return p;
    }

    private String contentJson() {
        return "{\"description\":\"desc\",\"usage_guide\":\"guide\",\"usage_cases\":\"cases\","
                + "\"questions\":[{\"type\":\"MCQ\",\"question\":\"Q1\","
                + "\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":\"A\",\"explanation\":\"e\"}]}";
    }
}
