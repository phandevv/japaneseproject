package com.flashcard.controller;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.model.Conversation;
import com.flashcard.model.ReviewRecommendation;
import com.flashcard.service.ConversationManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ConversationWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ConversationWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConversationManager conversationManager;

    @Value("${jwt.secret:JapaneseProjectSuperSecretKeyToken123!456}")
    private String jwtSecret;

    private static final String ISSUER = "JapaneseProject";

    // Track active WebSocket sessions mapped to active conversations
    private final Map<String, Long> sessionConversationMap = new ConcurrentHashMap<>();
    private final Map<String, Long> sessionUserMap = new ConcurrentHashMap<>();

    public ConversationWebSocketHandler(ConversationManager conversationManager) {
        this.conversationManager = conversationManager;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket connection established: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            String type = root.path("type").asText();

            switch (type) {
                case "CONNECT_SESSION":
                    handleConnect(session, root);
                    break;
                case "SEND_TEXT":
                    handleSendText(session, root);
                    break;
                case "END_SESSION":
                    handleEndSession(session);
                    break;
                case "PING":
                    handlePing(session);
                    break;
                default:
                    sendError(session, "Unknown message type: " + type);
            }
        } catch (Exception e) {
            log.error("Error processing WebSocket message in session {}", session.getId(), e);
            sendError(session, "Failed to process message: " + e.getMessage());
        }
    }

    private void handlePing(WebSocketSession session) throws IOException {
        Map<String, Object> response = new HashMap<>();
        response.put("type", "PONG");
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
    }

    private void handleConnect(WebSocketSession session, JsonNode root) throws IOException {
        String token = root.path("token").asText();
        String scenario = root.path("scenario").asText("Cafe");
        String jlpt = root.path("jlpt").asText("N3");

        Long userId = verifyToken(token);
        if (userId == null) {
            sendError(session, "Unauthorized: Invalid JWT token");
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        sessionUserMap.put(session.getId(), userId);

        // Start new conversation session
        Conversation conversation = conversationManager.startSession(userId, scenario, jlpt);
        sessionConversationMap.put(session.getId(), conversation.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("type", "SESSION_CONNECTED");
        response.put("conversationId", conversation.getId());
        response.put("scenario", scenario);
        response.put("jlpt", jlpt);
        
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        log.info("User {} connected to conversation {} in scenario {}", userId, conversation.getId(), scenario);
    }

    private void handleSendText(WebSocketSession session, JsonNode root) throws IOException {
        Long conversationId = sessionConversationMap.get(session.getId());
        if (conversationId == null) {
            sendError(session, "Error: No active conversation session. Connect first.");
            return;
        }

        String text = root.path("text").asText();
        if (text == null || text.trim().isEmpty()) {
            return;
        }

        // Notify client AI is thinking
        sendStatusMessage(session, "AI_THINKING");

        conversationManager.processUserMessage(conversationId, text,
                chunk -> {
                    // Send text chunk to client
                    sendChunkMessage(session, chunk, false);
                },
                () -> {
                    // Completed response
                    sendChunkMessage(session, "", true);
                    sendStatusMessage(session, "AI_SPEAKING");
                },
                error -> {
                    sendError(session, "AI processing failed: " + error.getMessage());
                }
        );
    }

    private void handleEndSession(WebSocketSession session) throws IOException {
        Long conversationId = sessionConversationMap.remove(session.getId());
        sessionUserMap.remove(session.getId());

        if (conversationId == null) {
            sendError(session, "Error: No active conversation to end.");
            return;
        }

        conversationManager.endSession(conversationId);
        
        // Wait a short time for analysis report asynchronous process to finish
        // Or fetch database recommendations in REST API afterwards.
        Map<String, Object> response = new HashMap<>();
        response.put("type", "SESSION_COMPLETED");
        response.put("conversationId", conversationId);
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        
        log.info("Conversation {} ended successfully", conversationId);
        session.close();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessionConversationMap.remove(session.getId());
        sessionUserMap.remove(session.getId());
        log.info("WebSocket connection closed: {} with status {}", session.getId(), status);
    }

    private Long verifyToken(String token) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            JWTVerifier verifier = JWT.require(algorithm).withIssuer(ISSUER).build();
            DecodedJWT jwt = verifier.verify(token);
            String type = jwt.getClaim("type").asString();
            if (type == null || "access".equals(type)) {
                return jwt.getClaim("userId").asLong();
            }
        } catch (Exception e) {
            log.warn("WebSocket token verification failed", e);
        }
        return null;
    }

    private void sendStatusMessage(WebSocketSession session, String type) {
        try {
            Map<String, String> response = Map.of("type", type);
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (IOException e) {
            log.error("Failed to send status message", e);
        }
    }

    private void sendChunkMessage(WebSocketSession session, String chunk, boolean isFinal) {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("type", "STREAM_TEXT_CHUNK");
            response.put("text", chunk);
            response.put("isFinal", isFinal);
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (IOException e) {
            log.error("Failed to send chunk message", e);
        }
    }

    private void sendError(WebSocketSession session, String errorMsg) {
        try {
            Map<String, String> response = Map.of("type", "ERROR", "message", errorMsg);
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (IOException e) {
            log.error("Failed to send error message", e);
        }
    }
}
