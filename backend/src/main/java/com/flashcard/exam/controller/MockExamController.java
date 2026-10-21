package com.flashcard.exam.controller;

import com.flashcard.exam.dto.*;
import com.flashcard.exam.service.MockExamService;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/mock-exams")
public class MockExamController {

    private final MockExamService mockExamService;
    private final UserDataProvider userDataProvider;

    public MockExamController(MockExamService mockExamService, UserDataProvider userDataProvider) {
        this.mockExamService = mockExamService;
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
    public ResponseEntity<List<ExamListItemDto>> getExamList() {
        Long userId = getCurrentUserId();
        List<ExamListItemDto> list = mockExamService.getExamList(userId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{examId}")
    public ResponseEntity<ExamDetailDto> getExamDetail(@PathVariable String examId) {
        return mockExamService.getExamDetail(examId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{examId}/start")
    public ResponseEntity<AttemptDto> startExam(@PathVariable String examId) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        AttemptDto attempt = mockExamService.startOrResumeAttempt(userId, examId);
        return ResponseEntity.ok(attempt);
    }

    @PostMapping("/attempts/{attemptId}/save-progress")
    public ResponseEntity<Map<String, String>> saveProgress(@PathVariable Long attemptId,
                                                            @RequestBody SaveProgressRequest request) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        mockExamService.saveProgress(userId, attemptId, request);
        return ResponseEntity.ok(Map.of("message", "Progress saved successfully"));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<AttemptResultDto> submitExam(@PathVariable Long attemptId,
                                                      @RequestBody(required = false) SubmitExamRequest request) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        AttemptResultDto result = mockExamService.submitExam(userId, attemptId, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/attempts/{attemptId}/result")
    public ResponseEntity<AttemptResultDto> getResult(@PathVariable Long attemptId) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        AttemptResultDto result = mockExamService.getAttemptResult(userId, attemptId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/history")
    public ResponseEntity<List<AttemptHistoryDto>> getHistory() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        List<AttemptHistoryDto> history = mockExamService.getUserHistory(userId);
        return ResponseEntity.ok(history);
    }
}
