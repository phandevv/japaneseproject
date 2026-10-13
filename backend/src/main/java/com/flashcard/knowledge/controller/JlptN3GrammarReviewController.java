package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.dto.GenerateResult;
import com.flashcard.knowledge.dto.GrammarGroupDetailResponse;
import com.flashcard.knowledge.dto.GrammarGroupOverviewResponse;
import com.flashcard.knowledge.dto.ImportGrammarGroupResponse;
import com.flashcard.knowledge.dto.SubmitQuizResponse;
import com.flashcard.knowledge.service.JlptN3GrammarReviewService;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/jlpt-n3/grammar-review")
public class JlptN3GrammarReviewController {

    private static final Logger log = LoggerFactory.getLogger(JlptN3GrammarReviewController.class);

    private final JlptN3GrammarReviewService reviewService;
    private final UserDataProvider userDataProvider;

    public JlptN3GrammarReviewController(JlptN3GrammarReviewService reviewService,
                                          UserDataProvider userDataProvider) {
        this.reviewService = reviewService;
        this.userDataProvider = userDataProvider;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            if (auth.getPrincipal() instanceof User user) {
                return user.getId();
            }
            String username = auth.getName();
            Optional<User> u = userDataProvider.findByUsername(username);
            if (u.isPresent()) {
                return u.get().getId();
            }
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<GrammarGroupOverviewResponse> getGrammarGroupOverview() {
        Long userId = getCurrentUserId();
        GrammarGroupOverviewResponse response = reviewService.getGrammarGroupOverview(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/group/{groupCode}")
    public ResponseEntity<GrammarGroupDetailResponse> getGrammarGroupDetail(@PathVariable String groupCode) {
        Long userId = getCurrentUserId();
        GrammarGroupDetailResponse response = reviewService.getGrammarGroupDetail(groupCode, userId);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateGrammarGroups() {
        try {
            com.flashcard.knowledge.dto.GenerateResult result = reviewService.generateGrammarGroupsFromAi();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "groupsSaved", result.groupsSaved(),
                    "quizzesSaved", result.quizzesSaved(),
                    "message", "Successfully generated grammar review groups"
            ));
        } catch (Exception e) {
            log.error("Failed to generate grammar groups: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Failed to generate: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/import")
    public ResponseEntity<ImportGrammarGroupResponse> importGrammarGroupData(@RequestBody String jsonData) {
        try {
            ImportGrammarGroupResponse response = reviewService.importGrammarGroupData(jsonData);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to import grammar group data: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ImportGrammarGroupResponse(0, 0, List.of(e.getMessage())));
        }
    }

    @PutMapping("/group/{groupCode}")
    public ResponseEntity<GrammarGroupDetailResponse> updateGrammarGroup(
            @PathVariable String groupCode,
            @RequestBody Map<String, Object> updates) {
        try {
            GrammarGroupDetailResponse response = reviewService.updateGrammarGroup(groupCode, updates);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update grammar group {}: {}", groupCode, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/submit")
    public ResponseEntity<SubmitQuizResponse> submitGroupQuiz(@RequestBody Map<String, Object> request) {
        Long userId = getCurrentUserId();
        String groupCode = (String) request.get("groupCode");
        Integer score = (Integer) request.get("score");
        Integer total = (Integer) request.get("total");

        if (groupCode == null || score == null || total == null) {
            return ResponseEntity.badRequest().build();
        }

        SubmitQuizResponse response = reviewService.submitGroupQuiz(userId, groupCode, score, total);
        return ResponseEntity.ok(response);
    }
}
