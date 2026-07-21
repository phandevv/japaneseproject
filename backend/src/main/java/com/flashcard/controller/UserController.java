package com.flashcard.controller;

import com.flashcard.model.User;
import com.flashcard.repository.UserRepository;
import com.flashcard.repository.WordReviewRepository;
import com.flashcard.service.OnlineUserService;
import com.flashcard.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private OnlineUserService onlineUserService;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AnalyticsService analyticsService;
    
    @Autowired
    private WordReviewRepository wordReviewRepository;

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
            @org.springframework.security.core.annotation.AuthenticationPrincipal User user,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "day") String range,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "all") String tab,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "30") int size) {
        
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        java.time.Instant start;
        java.time.Instant end = java.time.Instant.now();
        java.time.ZoneId zone = java.time.ZoneId.systemDefault();
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(zone);

        if ("week".equalsIgnoreCase(range)) {
            start = now.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                       .truncatedTo(java.time.temporal.ChronoUnit.DAYS).toInstant();
        } else if ("month".equalsIgnoreCase(range)) {
            start = now.withDayOfMonth(1).truncatedTo(java.time.temporal.ChronoUnit.DAYS).toInstant();
        } else if ("all".equalsIgnoreCase(range)) {
            start = java.time.Instant.EPOCH;
        } else { // default "day"
            start = now.truncatedTo(java.time.temporal.ChronoUnit.DAYS).toInstant();
        }

        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "lastReviewedAt"));
        
        org.springframework.data.domain.Page<com.flashcard.model.WordReview> reviewsPage;
        
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

        return ResponseEntity.ok(Map.of(
            "content", responseList,
            "totalPages", reviewsPage.getTotalPages(),
            "totalElements", reviewsPage.getTotalElements(),
            "currentPage", reviewsPage.getNumber()
        ));
    }
}
