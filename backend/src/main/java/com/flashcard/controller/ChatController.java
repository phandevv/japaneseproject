package com.flashcard.controller;

import com.flashcard.service.ChatService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

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
     * Body: { "message": "...", "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }, ...] }
     * Returns: { "reply": "..." }
     */
    @PostMapping
    public CompletableFuture<ResponseEntity<Map<String, String>>> chat(@RequestBody ChatRequest body) {
        // Validate message
        String message = body.message() != null ? body.message().trim() : "";
        if (message.isEmpty()) {
            return CompletableFuture.completedFuture(
                ResponseEntity.badRequest().body(Map.of("error", "Tin nhắn không được để trống."))
            );
        }
        if (message.length() > ChatService.MAX_USER_MESSAGE_CHARS) {
            return CompletableFuture.completedFuture(
                ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(Map.of("error", "Tin nhắn quá dài. Tối đa " + ChatService.MAX_USER_MESSAGE_CHARS + " ký tự."))
            );
        }

        List<Map<String, String>> history = body.history() != null ? body.history() : List.of();
        return chatService.chat(history, message)
                .thenApply(reply -> ResponseEntity.ok(Map.of("reply", reply)));
    }

    // Simple record for request body deserialization (no Lombok)
    public record ChatRequest(String message, List<Map<String, String>> history) {}
}
