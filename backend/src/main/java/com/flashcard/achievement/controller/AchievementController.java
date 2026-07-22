package com.flashcard.achievement.controller;

import com.flashcard.achievement.service.AchievementService;
import com.flashcard.user.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private final AchievementService achievementService;

    public AchievementController(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    /**
     * GET /api/achievements
     * Get user's achievement tree & progress
     */
    @GetMapping
    public ResponseEntity<?> getAchievements(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }

        // Trigger evaluation first to ensure latest progress is reflected
        List<AchievementService.AchievementProgressDto> newlyUnlocked = achievementService.checkAndGrantAchievements(user);
        List<AchievementService.AchievementProgressDto> allProgress = achievementService.getUserAchievements(user);

        int totalPoints = allProgress.stream()
                .filter(AchievementService.AchievementProgressDto::isUnlocked)
                .mapToInt(AchievementService.AchievementProgressDto::points)
                .sum();

        long unlockedCount = allProgress.stream()
                .filter(AchievementService.AchievementProgressDto::isUnlocked)
                .count();

        Map<String, Object> response = new HashMap<>();
        response.put("achievements", allProgress);
        response.put("newlyUnlocked", newlyUnlocked);
        response.put("totalPoints", totalPoints);
        response.put("unlockedCount", unlockedCount);
        response.put("totalCount", allProgress.size());

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/achievements/check
     * Manually trigger achievement check & return newly unlocked badges
     */
    @PostMapping("/check")
    public ResponseEntity<?> checkAchievements(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }

        List<AchievementService.AchievementProgressDto> newlyUnlocked = achievementService.checkAndGrantAchievements(user);
        return ResponseEntity.ok(Map.of("newlyUnlocked", newlyUnlocked));
    }
}
