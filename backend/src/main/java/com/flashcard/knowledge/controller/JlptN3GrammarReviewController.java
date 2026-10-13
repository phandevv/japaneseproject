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

    private boolean isCurrentUserAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            if (auth.getPrincipal() instanceof User user) {
                return "ADMIN".equalsIgnoreCase(user.getRole());
            }
            String username = auth.getName();
            Optional<User> u = userDataProvider.findByUsername(username);
            return u.isPresent() && "ADMIN".equalsIgnoreCase(u.get().getRole());
        }
        return false;
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
        if (!isCurrentUserAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Chỉ tài khoản ADMIN mới có quyền sinh nhóm ngữ pháp AI."));
        }
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            log.info("🚀 [GRAMMAR REVIEW] Bắt đầu sinh toàn bộ nhóm ngữ pháp JLPT N3 qua AI...");
            try {
                GenerateResult result = reviewService.generateGrammarGroupsFromAi();
                log.info("🏁 [GRAMMAR REVIEW] Hoàn thành: {} nhóm, {} bộ câu hỏi", result.groupsSaved(), result.quizzesSaved());
            } catch (Exception e) {
                log.error("❌ [GRAMMAR REVIEW] Lỗi khi sinh nhóm ngữ pháp: {}", e.getMessage(), e);
            }
        });
        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "STARTED",
                "message", "Đã khởi chạy sinh nhóm ngữ pháp nền. Quá trình mất 10-20 phút, hãy theo dõi log console và tải lại trang sau."
        ));
    }

    @PostMapping("/import")
    public ResponseEntity<ImportGrammarGroupResponse> importGrammarGroupData(@RequestBody String jsonData) {
        if (!isCurrentUserAdmin()) {
            return ResponseEntity.status(403).body(new ImportGrammarGroupResponse(0, 0,
                    List.of("Chỉ tài khoản ADMIN mới có quyền nhập dữ liệu nhóm ngữ pháp.")));
        }
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
        if (!isCurrentUserAdmin()) {
            return ResponseEntity.status(403).build();
        }
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
