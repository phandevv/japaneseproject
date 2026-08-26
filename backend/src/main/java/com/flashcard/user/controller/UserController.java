package com.flashcard.user.controller;

import com.flashcard.analytics.service.AnalyticsService;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import com.flashcard.user.service.OnlineUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final OnlineUserService onlineUserService;
    private final UserDataProvider userDataProvider;
    private final AnalyticsService analyticsService;
    private final SrsDataProvider srsDataProvider;

    public UserController(OnlineUserService onlineUserService,
            UserDataProvider userDataProvider,
            AnalyticsService analyticsService,
            SrsDataProvider srsDataProvider) {
        this.onlineUserService = onlineUserService;
        this.userDataProvider = userDataProvider;
        this.analyticsService = analyticsService;
        this.srsDataProvider = srsDataProvider;
    }

    private String formatAvatar(User user) {
        if (user == null || user.getAvatar() == null)
            return null;
        String av = user.getAvatar().trim();
        if (av.isEmpty())
            return null;
        if (av.startsWith("data:image") || av.length() > 50) {
            return "/api/users/" + user.getUsername() + "/avatar";
        }
        return av;
    }

    @GetMapping("/{username}/avatar")
    public ResponseEntity<?> getUserAvatar(@PathVariable String username) {
        Optional<User> opt = userDataProvider.findByUsername(username);
        if (opt.isEmpty() || opt.get().getAvatar() == null) {
            return ResponseEntity.notFound().build();
        }
        String avatar = opt.get().getAvatar();
        if (avatar.startsWith("data:image/")) {
            try {
                int commaIdx = avatar.indexOf(',');
                String meta = avatar.substring(5, commaIdx);
                String mimeType = meta.split(";")[0];
                String base64Data = avatar.substring(commaIdx + 1);
                byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                        .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, mimeType)
                        .body(imageBytes);
            } catch (Exception e) {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "text/plain;charset=UTF-8")
                .body(avatar);
    }

    @GetMapping("/online")
    public ResponseEntity<?> getOnlineUsers() {
        List<String> onlineIdentifiers = onlineUserService.getOnlineUsers();

        // Filter out IPs (basic check: no dots or colons in username)
        List<String> usernames = onlineIdentifiers.stream()
                .filter(id -> !id.contains(".") && !id.contains(":"))
                .collect(Collectors.toList());

        List<User> activeUsers = userDataProvider.findByUsernameIn(usernames);

        List<Map<String, Object>> userProfiles = activeUsers.stream().map(user -> {
            Map<String, Object> profile = new HashMap<>();
            profile.put("username", user.getUsername());
            profile.put("displayName", user.getDisplayName());
            profile.put("avatar", formatAvatar(user));
            profile.put("occupation", user.getOccupation());
            profile.put("streak", analyticsService.calculateStreak(user));
            profile.put("learnedCount", srsDataProvider.countLearnedWords(user));
            return profile;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(userProfiles);
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getUserProfile(@PathVariable String username) {
        Optional<User> optionalUser = userDataProvider.findByUsername(username);
        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            Map<String, Object> profile = new HashMap<>();
            profile.put("username", user.getUsername());
            profile.put("displayName", user.getDisplayName());
            profile.put("avatar", user.getAvatar());
            profile.put("coverPhoto", user.getCoverPhoto());
            profile.put("occupation", user.getOccupation());
            profile.put("address", user.getAddress());
            profile.put("streak", analyticsService.calculateStreak(user));
            profile.put("learnedCount", srsDataProvider.countLearnedWords(user));
            return ResponseEntity.ok(profile);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/me/study-history-details")
    public ResponseEntity<?> getStudyHistoryDetails(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "day") String range,
            @RequestParam(defaultValue = "all") String tab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        Instant start;
        Instant end = Instant.now();
        ZoneId zone = ZoneId.systemDefault();
        ZonedDateTime now = ZonedDateTime.now(zone);

        if ("week".equalsIgnoreCase(range)) {
            start = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    .truncatedTo(ChronoUnit.DAYS).toInstant();
        } else if ("month".equalsIgnoreCase(range)) {
            start = now.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS).toInstant();
        } else if ("all".equalsIgnoreCase(range)) {
            start = Instant.EPOCH;
        } else { // default "day"
            start = now.truncatedTo(ChronoUnit.DAYS).toInstant();
        }

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "lastReviewedAt"));

        Page<WordReview> reviewsPage;

        if ("perfect".equalsIgnoreCase(tab)) {
            reviewsPage = srsDataProvider.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, List.of(5),
                    pageRequest);
        } else if ("good".equalsIgnoreCase(tab)) {
            reviewsPage = srsDataProvider.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, List.of(4),
                    pageRequest);
        } else if ("hard".equalsIgnoreCase(tab)) {
            reviewsPage = srsDataProvider.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end,
                    List.of(1, 2, 3), pageRequest);
        } else if ("fail".equalsIgnoreCase(tab)) {
            reviewsPage = srsDataProvider.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, List.of(0),
                    pageRequest);
        } else {
            reviewsPage = srsDataProvider.findByUserAndLastReviewedAtBetween(user, start, end, pageRequest);
        }

        List<Map<String, Object>> responseList = reviewsPage.getContent().stream().map(wr -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", wr.getVocabulary() != null ? wr.getVocabulary().getId() : null);
            map.put("kanji", wr.getVocabulary() != null ? wr.getVocabulary().getKanji() : null);
            map.put("hiragana", wr.getVocabulary() != null ? wr.getVocabulary().getHiragana() : null);
            map.put("meaning", wr.getVocabulary() != null ? wr.getVocabulary().getMeaning() : null);
            map.put("lastRating", wr.getLastRating());
            map.put("lastReviewedAt", wr.getLastReviewedAt());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("content", responseList);
        responseMap.put("totalPages", reviewsPage.getTotalPages());
        responseMap.put("totalElements", reviewsPage.getTotalElements());
        responseMap.put("currentPage", reviewsPage.getNumber());

        return ResponseEntity.ok(responseMap);
    }
}
