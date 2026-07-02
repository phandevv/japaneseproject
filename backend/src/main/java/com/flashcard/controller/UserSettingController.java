package com.flashcard.controller;

import com.flashcard.model.User;
import com.flashcard.model.UserSetting;
import com.flashcard.service.AuthService;
import com.flashcard.service.UserSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user/settings")
@CrossOrigin(origins = "*")
public class UserSettingController {

    private final AuthService authService;
    private final UserSettingService settingService;

    public UserSettingController(AuthService authService, UserSettingService settingService) {
        this.authService = authService;
        this.settingService = settingService;
    }

    @GetMapping("/{level}")
    public ResponseEntity<?> getSetting(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                         @PathVariable("level") String level) {
        String token = extractToken(authHeader);
        User user = authService.getUserByToken(token);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        int wordsPerDay = settingService.getWordsPerDay(user, level);
        Map<String, Object> response = new HashMap<>();
        response.put("level", level);
        response.put("wordsPerDay", wordsPerDay);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> saveSetting(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> request) {
        String token = extractToken(authHeader);
        User user = authService.getUserByToken(token);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String level = (String) request.get("level");
        Integer wordsPerDay = (Integer) request.get("wordsPerDay");

        if (level == null || wordsPerDay == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing level or wordsPerDay"));
        }

        try {
            UserSetting setting = settingService.saveWordsPerDay(user, level, wordsPerDay);
            Map<String, Object> response = new HashMap<>();
            response.put("level", setting.getLevel());
            response.put("wordsPerDay", setting.getWordsPerDay());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String extractToken(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
