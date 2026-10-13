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
}
