package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.service.JlptN3CourseService;
import com.flashcard.user.model.User;
import com.flashcard.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/jlpt-n3")
public class JlptN3CourseController {

    private final JlptN3CourseService courseService;
    private final UserRepository userRepository;

    public JlptN3CourseController(JlptN3CourseService courseService, UserRepository userRepository) {
        this.courseService = courseService;
        this.userRepository = userRepository;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String username = auth.getName();
            Optional<User> u = userRepository.findByUsername(username);
            if (u.isPresent()) {
                return u.get().getId();
            }
        }
        return null;
    }

    /**
     * Get Course Overview of 9 Chapters and 27 Lessons, including completion progress for the current user.
     * GET /api/jlpt-n3/overview
     */
    @GetMapping("/overview")
    public ResponseEntity<?> getCourseOverview() {
        Long userId = getCurrentUserId();
        Map<String, Object> overview = courseService.getCourseOverview(userId);
        return ResponseEntity.ok(overview);
    }

    /**
     * Get details for a specific Chapter and Lesson (Kanji, Vocab, Grammar).
     * GET /api/jlpt-n3/chapter/{chapter}/lesson/{lesson}
     */
    @GetMapping("/chapter/{chapter}/lesson/{lesson}")
    public ResponseEntity<?> getLessonData(
            @PathVariable("chapter") int chapter,
            @PathVariable("lesson") int lesson) {
        Map<String, Object> lessonData = courseService.getLessonData(chapter, lesson);
        return ResponseEntity.ok(lessonData);
    }

    /**
     * Submit Quiz score for a specific lesson. Passes and completes if accuracy >= 90%.
     * POST /api/jlpt-n3/chapter/{chapter}/lesson/{lesson}/submit-quiz
     */
    @PostMapping("/chapter/{chapter}/lesson/{lesson}/submit-quiz")
    public ResponseEntity<?> submitQuiz(
            @PathVariable("chapter") int chapter,
            @PathVariable("lesson") int lesson,
            @RequestBody Map<String, Object> body) {

        int score = body.containsKey("score") ? ((Number) body.get("score")).intValue() : 0;
        int total = body.containsKey("total") ? ((Number) body.get("total")).intValue() : 0;

        Long userId = getCurrentUserId();
        Map<String, Object> result = courseService.submitQuiz(userId, chapter, lesson, score, total);
        return ResponseEntity.ok(result);
    }
}
