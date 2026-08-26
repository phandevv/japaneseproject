package com.flashcard.analytics.controller;

import com.flashcard.user.model.User;
import com.flashcard.srs.model.StudySession;
import com.flashcard.analytics.service.AnalyticsService;
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
                                         @RequestHeader(value = "X-Timezone", required = false, defaultValue = "Asia/Ho_Chi_Minh") String timezoneHeader,
                                         @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        java.time.ZoneId zone;
        try {
            zone = java.time.ZoneId.of(timezoneHeader);
        } catch (Exception e) {
            zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        }

        Number wordsStudied = (Number) body.getOrDefault("wordsStudied", 0);
        Number correctAnswers = (Number) body.getOrDefault("correctAnswers", 0);
        Number totalQuestions = (Number) body.getOrDefault("totalQuestions", 0);
        Number durationMinutes = (Number) body.getOrDefault("durationMinutes", 0);

        String dateStr = (String) body.get("date");
        java.time.LocalDate date = (dateStr != null) 
                ? java.time.LocalDate.parse(dateStr) 
                : java.time.LocalDate.now(zone);

        StudySession session = analyticsService.recordSession(
                user,
                wordsStudied.intValue(),
                correctAnswers.intValue(),
                totalQuestions.intValue(),
                durationMinutes.intValue(),
                date
        );

        return ResponseEntity.ok(Map.of(
            "message", "Session recorded",
            "date", session.getStudyDate().toString(),
            "wordsStudied", session.getWordsStudied(),
            "durationMinutes", session.getDurationMinutes()
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

    /**
     * Perform streak repair (Điểm danh bù) for a past missed date
     * POST /api/analytics/streak-repair
     */
    @PostMapping("/streak-repair")
    public ResponseEntity<?> repairStreak(@AuthenticationPrincipal User user,
                                           @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        String targetDateStr = (String) body.get("targetDate");
        if (targetDateStr == null || targetDateStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng chọn ngày cần điểm danh bù."));
        }

        try {
            java.time.LocalDate targetDate = java.time.LocalDate.parse(targetDateStr);
            Map<String, Object> response = analyticsService.repairStreak(user, targetDate);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Không thể thực hiện điểm danh bù: " + e.getMessage()));
        }
    }
}

