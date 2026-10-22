package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.dto.HighFrequencyGrammarDto;
import com.flashcard.knowledge.service.HighFrequencyGrammarService;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/grammar-frequency")
public class HighFrequencyGrammarController {

    private final HighFrequencyGrammarService service;
    private final UserDataProvider userDataProvider;

    public HighFrequencyGrammarController(HighFrequencyGrammarService service, UserDataProvider userDataProvider) {
        this.service = service;
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
    public ResponseEntity<List<HighFrequencyGrammarDto>> getGrammarList(
            @RequestParam(name = "filter", defaultValue = "all") String filter) {
        Long userId = getCurrentUserId();
        List<HighFrequencyGrammarDto> list = service.getGrammarList(userId, filter);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HighFrequencyGrammarDto> getGrammarDetail(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        HighFrequencyGrammarDto dto = service.getGrammarDetail(id, userId);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<?> reviewGrammar(
            @PathVariable Long id,
            @RequestParam(name = "quality") int quality) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập để lưu tiến độ ôn tập SRS!"));
        }
        try {
            HighFrequencyGrammarDto result = service.reviewGrammar(userId, id, quality);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/due")
    public ResponseEntity<?> getDueReviews() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(service.getDueReviews(userId));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(service.getStats(userId));
    }

    @PostMapping("/sync-mongo")
    public ResponseEntity<Map<String, Object>> syncToMongo() {
        return ResponseEntity.ok(service.syncToMongo());
    }
}
