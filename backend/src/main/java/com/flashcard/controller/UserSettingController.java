package com.flashcard.controller;

import com.flashcard.model.User;
import com.flashcard.model.UserSetting;
import com.flashcard.service.UserSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * User-specific study configuration (words per day per level).
 * Authentication is enforced by Spring Security — no manual token parsing needed.
 * The authenticated User entity is injected via @AuthenticationPrincipal.
 */
@RestController
@RequestMapping("/api/user/settings")
public class UserSettingController {

    private final UserSettingService settingService;

    public UserSettingController(UserSettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping("/{level}")
    public ResponseEntity<?> getSetting(@AuthenticationPrincipal User user,
                                        @PathVariable String level) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        UserSetting setting = settingService.getSettingEntity(user, level);
        int wordsPerDay = setting != null ? setting.getWordsPerDay() : 20;
        String completedDays = setting != null && setting.getCompletedDays() != null ? setting.getCompletedDays() : "";
        return ResponseEntity.ok(Map.of(
            "level", level,
            "wordsPerDay", wordsPerDay,
            "completedDays", completedDays
        ));
    }

    @PostMapping
    public ResponseEntity<?> saveSetting(@AuthenticationPrincipal User user,
                                         @RequestBody Map<String, Object> request) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String level = (String) request.get("level");
        Integer wordsPerDay = (Integer) request.get("wordsPerDay");

        if (level == null || wordsPerDay == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing level or wordsPerDay"));
        }

        try {
            UserSetting setting = settingService.saveWordsPerDay(user, level, wordsPerDay);
            return ResponseEntity.ok(Map.of(
                "level", setting.getLevel(),
                "wordsPerDay", setting.getWordsPerDay(),
                "completedDays", setting.getCompletedDays() != null ? setting.getCompletedDays() : ""
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/complete-day")
    public ResponseEntity<?> completeDay(@AuthenticationPrincipal User user,
                                         @RequestBody Map<String, Object> request) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String level = (String) request.get("level");
        Number dayNum = (Number) request.get("day");

        if (level == null || dayNum == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing level or day"));
        }

        try {
            UserSetting setting = settingService.markDayCompleted(user, level, dayNum.intValue());
            return ResponseEntity.ok(Map.of(
                "level", setting.getLevel(),
                "wordsPerDay", setting.getWordsPerDay(),
                "completedDays", setting.getCompletedDays() != null ? setting.getCompletedDays() : ""
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
