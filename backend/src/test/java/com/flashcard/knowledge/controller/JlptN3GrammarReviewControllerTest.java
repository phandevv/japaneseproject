package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.dto.GenerateResult;
import com.flashcard.knowledge.dto.GrammarGroupDetailResponse;
import com.flashcard.knowledge.dto.GrammarGroupOverviewResponse;
import com.flashcard.knowledge.dto.ImportGrammarGroupResponse;
import com.flashcard.knowledge.dto.SubmitQuizResponse;
import com.flashcard.knowledge.service.JlptN3GrammarReviewService;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JlptN3GrammarReviewControllerTest {

    @Mock
    private JlptN3GrammarReviewService reviewService;

    @Mock
    private UserDataProvider userDataProvider;

    private JlptN3GrammarReviewController controller;

    @BeforeEach
    void setUp() {
        controller = new JlptN3GrammarReviewController(reviewService, userDataProvider);
        SecurityContextHolder.clearContext();
    }

    private void loginAsAdmin() {
        User admin = new User();
        admin.setId(1L);
        admin.setRole("ADMIN");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null, List.of()));
    }

    @Test
    void getGrammarGroupOverview_returnsOkWithBody() {
        when(reviewService.getGrammarGroupOverview(null))
                .thenReturn(new GrammarGroupOverviewResponse(List.of(), 0));

        ResponseEntity<GrammarGroupOverviewResponse> response = controller.getGrammarGroupOverview();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalGroups()).isZero();
    }

    @Test
    void getGrammarGroupDetail_found_returnsOk() {
        GrammarGroupDetailResponse detail = new GrammarGroupDetailResponse(
                1L, "GRP_01", "Nhóm 1", "Mô tả", "Guide", "Cases",
                List.of(), List.of(), false, 0, 0);
        when(reviewService.getGrammarGroupDetail("GRP_01", null)).thenReturn(detail);

        ResponseEntity<GrammarGroupDetailResponse> response = controller.getGrammarGroupDetail("GRP_01");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().groupCode()).isEqualTo("GRP_01");
    }

    @Test
    void getGrammarGroupDetail_notFound_returns404() {
        when(reviewService.getGrammarGroupDetail("GRP_99", null)).thenReturn(null);

        ResponseEntity<GrammarGroupDetailResponse> response = controller.getGrammarGroupDetail("GRP_99");

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNull();
    }

    @Test
    void generateGrammarGroups_startsBackgroundProcess() {
        loginAsAdmin();
        when(reviewService.generateGrammarGroupsFromAi()).thenReturn(new GenerateResult(25, 25));

        ResponseEntity<Map<String, Object>> response = controller.generateGrammarGroups();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).containsEntry("success", true);
        assertThat(response.getBody()).containsEntry("status", "STARTED");

        verify(reviewService, timeout(2000)).generateGrammarGroupsFromAi();
    }

    @Test
    void generateGrammarGroups_withoutAdmin_returns403() {
        ResponseEntity<Map<String, Object>> response = controller.generateGrammarGroups();

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(reviewService, never()).generateGrammarGroupsFromAi();
    }

    @Test
    void importGrammarGroupData_returnsImportResult() {
        loginAsAdmin();
        ImportGrammarGroupResponse importResult = new ImportGrammarGroupResponse(10, 10, List.of());
        when(reviewService.importGrammarGroupData("[...]")).thenReturn(importResult);

        ResponseEntity<ImportGrammarGroupResponse> response = controller.importGrammarGroupData("[...]");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().groupsSaved()).isEqualTo(10);
    }

    @Test
    void importGrammarGroupData_withoutAdmin_returns403() {
        ResponseEntity<ImportGrammarGroupResponse> response = controller.importGrammarGroupData("[...]");

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(reviewService, never()).importGrammarGroupData(anyString());
    }

    @Test
    void updateGrammarGroup_notFound_returnsBadRequest() {
        loginAsAdmin();
        when(reviewService.updateGrammarGroup("GRP_99", Map.of("title", "X")))
                .thenThrow(new IllegalArgumentException("Grammar group not found: GRP_99"));

        ResponseEntity<GrammarGroupDetailResponse> response =
                controller.updateGrammarGroup("GRP_99", Map.of("title", "X"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void updateGrammarGroup_withoutAdmin_returns403() {
        ResponseEntity<GrammarGroupDetailResponse> response =
                controller.updateGrammarGroup("GRP_01", Map.of("title", "X"));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(reviewService, never()).updateGrammarGroup(anyString(), anyMap());
    }

    @Test
    void submitGroupQuiz_missingParams_returnsBadRequest() {
        ResponseEntity<SubmitQuizResponse> response =
                controller.submitGroupQuiz(Map.of("groupCode", "GRP_01", "score", 24));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(reviewService, never()).submitGroupQuiz(any(), anyString(), anyInt(), anyInt());
    }

    @Test
    void submitGroupQuiz_valid_returnsOkWithPassed() {
        when(reviewService.submitGroupQuiz(null, "GRP_01", 24, 30))
                .thenReturn(new SubmitQuizResponse(true, 24, 30, 24, 80.0));

        ResponseEntity<SubmitQuizResponse> response =
                controller.submitGroupQuiz(Map.of("groupCode", "GRP_01", "score", 24, "total", 30));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().passed()).isTrue();
        assertThat(response.getBody().score()).isEqualTo(24);
    }
}
