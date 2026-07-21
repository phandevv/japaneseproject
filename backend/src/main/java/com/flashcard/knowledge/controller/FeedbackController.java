package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.model.Feedback;
import com.flashcard.user.model.User;
import com.flashcard.knowledge.service.FeedbackService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/feedbacks")
public class FeedbackController {

    private final FeedbackService service;

    public FeedbackController(FeedbackService service) {
        this.service = service;
    }

    /**
     * Submit a new feedback/report
     * POST /api/feedbacks
     */
    @PostMapping
    public ResponseEntity<?> create(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        String title = request.get("title");
        String content = request.get("content");
        String type = request.get("type");

        if (title == null || title.isBlank() || content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title and content are required"));
        }

        Feedback feedback = new Feedback(user, title, content, type != null ? type : "FEEDBACK");
        return ResponseEntity.ok(service.save(feedback));
    }

    /**
     * Get all feedbacks (Admin only)
     * GET /api/feedbacks?page=0&size=20
     */
    @GetMapping
    public ResponseEntity<Page<Feedback>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getAll(PageRequest.of(page, size)));
    }

    /**
     * Update feedback status (Admin only)
     * PUT /api/feedbacks/{id}/status
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String status = request.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }

        return service.updateStatus(id, status)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

