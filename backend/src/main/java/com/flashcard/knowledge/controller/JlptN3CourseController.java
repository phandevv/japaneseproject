package com.flashcard.knowledge.controller;

import com.flashcard.common.config.JlptN3DataLoader;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
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
    private final JlptN3DataLoader dataLoader;
    private final DeepSeekEnrichmentService enrichmentService;

    public JlptN3CourseController(JlptN3CourseService courseService,
                                  UserRepository userRepository,
                                  JlptN3DataLoader dataLoader,
                                  DeepSeekEnrichmentService enrichmentService) {
        this.courseService = courseService;
        this.userRepository = userRepository;
        this.dataLoader = dataLoader;
        this.enrichmentService = enrichmentService;
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
     * Submit Quiz score for a specific lesson component (vocab, kanji, grammar). Passes component if accuracy >= 90%.
     * POST /api/jlpt-n3/chapter/{chapter}/lesson/{lesson}/submit-quiz
     */
    @PostMapping("/chapter/{chapter}/lesson/{lesson}/submit-quiz")
    public ResponseEntity<?> submitQuiz(
            @PathVariable("chapter") int chapter,
            @PathVariable("lesson") int lesson,
            @RequestBody Map<String, Object> body) {

        int score = body.containsKey("score") ? ((Number) body.get("score")).intValue() : 0;
        int total = body.containsKey("total") ? ((Number) body.get("total")).intValue() : 0;
        String quizCategory = body.containsKey("quizCategory") ? String.valueOf(body.get("quizCategory"))
                            : body.containsKey("category") ? String.valueOf(body.get("category")) : "vocab";

        Long userId = getCurrentUserId();
        Map<String, Object> result = courseService.submitQuiz(userId, chapter, lesson, quizCategory, score, total);
        return ResponseEntity.ok(result);
    }

    /**
     * Get or generate (ONCE via DeepSeek AI) 30 Multiple Choice Questions for Grammar points of a specific lesson.
     * GET /api/jlpt-n3/chapter/{chapter}/lesson/{lesson}/grammar-quiz
     */
    @GetMapping("/chapter/{chapter}/lesson/{lesson}/grammar-quiz")
    public ResponseEntity<?> getGrammarQuiz(
            @PathVariable("chapter") int chapter,
            @PathVariable("lesson") int lesson) {
        java.util.List<Map<String, Object>> questions = courseService.getOrGenerateGrammarQuiz(chapter, lesson);
        return ResponseEntity.ok(questions);
    }

    /**
     * Trigger importing all JLPT N3 course JSON files into system database (Vocabulary & Grammar tables).
     * POST /api/jlpt-n3/import
     */
    @PostMapping("/import")
    public ResponseEntity<?> importN3Data() {
        Map<String, Object> result = dataLoader.importAllN3Data();
        return ResponseEntity.ok(result);
    }

    /**
     * Upload JSON file(s) via native OS File Picker and import them dynamically into system database & course storage.
     * POST /api/jlpt-n3/upload-json
     */
    @PostMapping("/upload-json")
    public ResponseEntity<?> uploadJsonFiles(@RequestParam("files") org.springframework.web.multipart.MultipartFile[] files) {
        Map<String, Object> result = courseService.processUploadedJsonFiles(files);
        return ResponseEntity.ok(result);
    }

    /**
     * Evaluate typed quiz answer using Hybrid AI Semantic Evaluation.
     * POST /api/jlpt-n3/evaluate-answer
     */
    @PostMapping("/evaluate-answer")
    public ResponseEntity<?> evaluateAnswer(@RequestBody Map<String, String> body) {
        String targetAnswer = body.getOrDefault("targetAnswer", "");
        String userAnswer = body.getOrDefault("userAnswer", "");
        String questionContext = body.getOrDefault("questionContext", "");

        Map<String, Object> result = enrichmentService.evaluateQuizAnswer(targetAnswer, userAnswer, questionContext);
        return ResponseEntity.ok(result);
    }
}
