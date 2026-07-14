package com.flashcard.controller;

import com.flashcard.service.ChatService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    @Autowired
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * POST /api/chat
     * Body: { "message": "...", "history": [{ "role": "user", "content": "..." }, ...] }
     * Returns: { "reply": "..." }
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> chat(@RequestBody ChatRequest body) {
        // Validate message
        String message = body.message() != null ? body.message().trim() : "";
        if (message.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tin nhắn không được để trống."));
        }
        if (message.length() > ChatService.MAX_USER_MESSAGE_CHARS) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(Map.of("error", "Tin nhắn quá dài. Tối đa " + ChatService.MAX_USER_MESSAGE_CHARS + " ký tự."));
        }

        List<Map<String, String>> history = body.history() != null ? body.history() : List.of();
        try {
            String reply = chatService.chat(history, message).get();
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Lỗi xử lý yêu cầu AI: " + e.getMessage()));
        }
    }

    // Simple record for request body deserialization (no Lombok)
    public record ChatRequest(String message, List<Map<String, String>> history) {}
}
