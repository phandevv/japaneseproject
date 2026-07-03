package com.flashcard.controller;

import com.flashcard.model.User;
import com.flashcard.model.StudySession;
import com.flashcard.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Get user dashboard data (due count, learned words count, active streak, and 30-day log history)
     * GET /api/analytics/dashboard
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        Map<String, Object> stats = analyticsService.getDashboardStats(user);
        return ResponseEntity.ok(stats);
    }

    /**
     * Log session stats manually from frontend when finishing study rounds
     * POST /api/analytics/session
     */
    @PostMapping("/session")
    public ResponseEntity<?> logSession(@AuthenticationPrincipal User user,
                                         @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        Number wordsStudied = (Number) body.getOrDefault("wordsStudied", 0);
        Number correctAnswers = (Number) body.getOrDefault("correctAnswers", 0);
        Number totalQuestions = (Number) body.getOrDefault("totalQuestions", 0);

        StudySession session = analyticsService.recordSession(
                user,
                wordsStudied.intValue(),
                correctAnswers.intValue(),
                totalQuestions.intValue()
        );

        return ResponseEntity.ok(Map.of(
            "message", "Session recorded",
            "date", session.getStudyDate().toString(),
            "wordsStudied", session.getWordsStudied()
        ));
    }
}
