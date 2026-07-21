package com.flashcard.user.controller;

import com.flashcard.analytics.service.AnalyticsService;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.user.model.User;
import com.flashcard.user.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final AnalyticsService analyticsService;
    private final WordReviewRepository wordReviewRepository;

    public UserController(OnlineUserService onlineUserService,
                          UserRepository userRepository,
                          AnalyticsService analyticsService,
                          WordReviewRepository wordReviewRepository) {
        this.onlineUserService = onlineUserService;
        this.userRepository = userRepository;
        this.analyticsService = analyticsService;
        this.wordReviewRepository = wordReviewRepository;
    }

    @GetMapping("/online")
    public ResponseEntity<?> getOnlineUsers() {
        List<String> onlineIdentifiers = onlineUserService.getOnlineUsers();
        
        // Filter out IPs (basic check: no dots or colons in username)
        List<String> usernames = onlineIdentifiers.stream()
                .filter(id -> !id.contains(".") && !id.contains(":"))
                .collect(Collectors.toList());

        List<User> activeUsers = userRepository.findByUsernameIn(usernames);

        List<Map<String, Object>> userProfiles = activeUsers.stream().map(user -> {
            Map<String, Object> profile = new HashMap<>();
            profile.put("username", user.getUsername());
            profile.put("displayName", user.getDisplayName());
            profile.put("avatar", user.getAvatar());
            profile.put("coverPhoto", user.getCoverPhoto());
            profile.put("occupation", user.getOccupation());
            profile.put("streak", analyticsService.calculateStreak(user));
            profile.put("learnedCount", wordReviewRepository.countLearnedWords(user));
            return profile;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(userProfiles);
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getUserProfile(@PathVariable String username) {
        Optional<User> optionalUser = userRepository.findByUsername(username);
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
            profile.put("learnedCount", wordReviewRepository.countLearnedWords(user));
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
            reviewsPage = wordReviewRepository.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, List.of(5), pageRequest);
        } else if ("good".equalsIgnoreCase(tab)) {
            reviewsPage = wordReviewRepository.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, List.of(4), pageRequest);
        } else if ("hard".equalsIgnoreCase(tab)) {
            reviewsPage = wordReviewRepository.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, List.of(1, 2, 3), pageRequest);
        } else if ("fail".equalsIgnoreCase(tab)) {
            reviewsPage = wordReviewRepository.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, List.of(0), pageRequest);
        } else {
            reviewsPage = wordReviewRepository.findByUserAndLastReviewedAtBetween(user, start, end, pageRequest);
        }
        
        List<Map<String, Object>> responseList = reviewsPage.getContent().stream().map(wr -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", wr.getVocabulary().getId());
            map.put("kanji", wr.getVocabulary().getKanji());
            map.put("hiragana", wr.getVocabulary().getHiragana());
            map.put("meaning", wr.getVocabulary().getMeaning());
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
