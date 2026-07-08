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

        String dateStr = (String) body.get("date");
        java.time.LocalDate date = (dateStr != null) 
                ? java.time.LocalDate.parse(dateStr) 
                : java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));

        StudySession session = analyticsService.recordSession(
                user,
                wordsStudied.intValue(),
                correctAnswers.intValue(),
                totalQuestions.intValue(),
                date
        );

        return ResponseEntity.ok(Map.of(
            "message", "Session recorded",
            "date", session.getStudyDate().toString(),
            "wordsStudied", session.getWordsStudied()
        ));
    }

    /**
     * Activate streak freeze shield for today
     * POST /api/analytics/streak-freeze
     */
    @PostMapping("/streak-freeze")
    public ResponseEntity<?> activateStreakFreeze(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        StudySession session = analyticsService.activateStreakFreeze(user);
        return ResponseEntity.ok(Map.of(
            "message", "Streak frozen for today",
            "date", session.getStudyDate().toString(),
            "streakFrozen", session.isStreakFrozen()
        ));
    }
}
