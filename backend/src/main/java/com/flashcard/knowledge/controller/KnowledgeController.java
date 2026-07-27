package com.flashcard.knowledge.controller;

import com.flashcard.knowledge.model.Conversation;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.service.KnowledgeService;
import com.flashcard.srs.service.GrammarSrsService;
import com.flashcard.knowledge.service.PersonalCorpusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeController {

    private final KnowledgeService knowledgeService;
    private final GrammarSrsService grammarSrsService;
    private final PersonalCorpusService personalCorpusService;

    @Autowired
    public KnowledgeController(KnowledgeService knowledgeService,
                               GrammarSrsService grammarSrsService,
                               PersonalCorpusService personalCorpusService) {
        this.knowledgeService = knowledgeService;
        this.grammarSrsService = grammarSrsService;
        this.personalCorpusService = personalCorpusService;
    }

    /**
     * Normalize raw input and enrich it with DeepSeek AI
     * POST /api/knowledge/collect
     */
    @PostMapping("/collect")
    public ResponseEntity<?> collect(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> request) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }

        String input = (String) request.get("input");
        if (input == null || input.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nội dung nhập vào không được để trống."));
        }

        boolean isFast = Boolean.TRUE.equals(request.get("fast")) || "true".equalsIgnoreCase(String.valueOf(request.get("fast")));

        try {
            if (isFast) {
                // Single-Call Combined Fast Normalize & Enrich (< 0.9s - 1.1s latency)
                return ResponseEntity.ok(knowledgeService.collectFast(input.trim()));
            }

            // Step 1: Normalize raw input
            Map<String, Object> collectResult = knowledgeService.normalize(input.trim());
            String type = (String) collectResult.get("type");
            String normalizedInput = (String) collectResult.get("normalizedInput");

            // Step 2: Full enrich knowledge based on type
            Map<String, Object> enrichmentData;
            if ("grammar".equalsIgnoreCase(type)) {
                enrichmentData = knowledgeService.enrichGrammar(normalizedInput);
            } else {
                enrichmentData = knowledgeService.enrichVocabulary(normalizedInput);
            }

            // Construct unified response
            Map<String, Object> response = new HashMap<>(collectResult);
            response.put("enrichmentData", enrichmentData);
            response.put("isFast", false);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Lỗi xử lý AI: " + e.getMessage()));
        }
    }

    /**
     * Stream normalize and AI enrichment via SSE (Server-Sent Events)
     * POST /api/knowledge/collect/stream
     */
    @PostMapping(value = "/collect/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter collectStream(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request,
            jakarta.servlet.http.HttpServletResponse httpResponse) {

        httpResponse.setHeader("X-Accel-Buffering", "no");
        httpResponse.setHeader("Cache-Control", "no-cache, no-transform");
        httpResponse.setHeader("Connection", "keep-alive");

        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter =
                new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(120_000L);

        if (user == null) {
            try {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("error").data(Map.of("error", "Vui lòng đăng nhập!")));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        String input = request.get("input");
        if (input == null || input.trim().isEmpty()) {
            try {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("error").data(Map.of("error", "Nội dung nhập vào không được để trống.")));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                knowledgeService.streamCollectAndEnrich(input.trim(), emitter);
            } catch (Exception e) {
                try {
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name("error").data(Map.of("error", "Lỗi xử lý AI: " + e.getMessage())));
                    emitter.completeWithError(e);
                } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    /**
     * Save enriched knowledge card to DB (supports update, versioning, and background enrichment)
     * POST /api/knowledge/save
     */
    @PostMapping("/save")
    public ResponseEntity<?> save(
            @AuthenticationPrincipal User user,
            @RequestBody SaveRequest request) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }

        String type = request.type();
        Map<String, Object> data = request.data();
        if (type == null || data == null || data.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Thiếu tham số 'type' hoặc 'data'."));
        }

        try {
            boolean isFast = Boolean.TRUE.equals(data.get("isFast")) || "true".equalsIgnoreCase(String.valueOf(data.get("isFast")));

            if ("grammar".equalsIgnoreCase(type)) {
                GrammarCard saved = knowledgeService.saveGrammar(data, user);
                if (isFast || saved.getExamples() == null || saved.getExamples().isEmpty() || "null".equals(saved.getExamples())) {
                    String term = saved.getGrammar();
                    knowledgeService.triggerBackgroundFullEnrichment("grammar", saved.getId(), term);
                }
                return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "id", saved.getId(),
                    "type", "grammar",
                    "backgroundEnriching", true
                ));
            } else {
                Vocabulary saved = knowledgeService.saveVocabulary(data, user);
                if (isFast || saved.getExampleSentences() == null || saved.getExampleSentences().isEmpty() || "null".equals(saved.getExampleSentences())) {
                    String term = (saved.getKanji() != null && !saved.getKanji().trim().isEmpty()) ? saved.getKanji() : saved.getHiragana();
                    knowledgeService.triggerBackgroundFullEnrichment("vocabulary", saved.getId(), term);
                }
                return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "id", saved.getId(),
                    "type", "vocabulary",
                    "backgroundEnriching", true
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Lỗi khi lưu thẻ kiến thức: " + e.getMessage()));
        }
    }

    /* ─── Grammar SRS Endpoints ─── */

    @GetMapping("/grammar/due-count")
    public ResponseEntity<?> getGrammarDueCount(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        return ResponseEntity.ok(Map.of("dueCount", grammarSrsService.getDueCount(user)));
    }

    @GetMapping("/grammar/due-list")
    public ResponseEntity<?> getGrammarDueList(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        return ResponseEntity.ok(grammarSrsService.getDueGrammar(user));
    }

    @PostMapping("/grammar/review")
    public ResponseEntity<?> reviewGrammar(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        try {
            Long grammarId = Long.valueOf(body.get("grammarId").toString());
            int quality = Integer.parseInt(body.get("quality").toString());
            var review = grammarSrsService.reviewGrammar(user, grammarId, quality);
            return ResponseEntity.ok(review);
        } catch (NullPointerException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /* ─── Personal Corpus Endpoints ─── */

    @PostMapping("/corpus/generate-reading")
    public ResponseEntity<?> generatePersonalReading(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        try {
            return ResponseEntity.ok(personalCorpusService.generatePersonalReading(user));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/corpus/generate-conversation")
    public ResponseEntity<?> generatePersonalConversation(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        try {
            return ResponseEntity.ok(personalCorpusService.generatePersonalConversation(user));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /* ─── Saved Cards Retrieval & Deletion Endpoints ─── */

    @GetMapping("/saved/vocabulary")
    public ResponseEntity<?> getSavedVocabulary(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        return ResponseEntity.ok(knowledgeService.getSavedVocabulary(user));
    }

    @GetMapping("/saved/grammar")
    public ResponseEntity<?> getSavedGrammar(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        return ResponseEntity.ok(knowledgeService.getSavedGrammar(user));
    }

    @DeleteMapping("/saved/vocabulary/{id}")
    public ResponseEntity<?> deleteSavedVocabulary(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        try {
            knowledgeService.deleteSavedVocabulary(user, id);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Đã xóa từ vựng khỏi kho tri thức cá nhân."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/saved/grammar/{id}")
    public ResponseEntity<?> deleteSavedGrammar(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập!"));
        }
        try {
            knowledgeService.deleteSavedGrammar(user, id);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Đã xóa ngữ pháp khỏi kho tri thức cá nhân."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    public record SaveRequest(String type, Map<String, Object> data) {}
}

