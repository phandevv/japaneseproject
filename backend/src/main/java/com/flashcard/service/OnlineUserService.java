package com.flashcard.service;

import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OnlineUserService {
    // Maps client identifier (username or IP/session ID) -> last active timestamp
    private final Map<String, Instant> activeClients = new ConcurrentHashMap<>();

    public void clientSeen(String identifier) {
        if (identifier != null && !identifier.trim().isEmpty()) {
            activeClients.put(identifier, Instant.now());
        }
    }

    public int getOnlineCount() {
        // Active clients in the last 5 minutes (300 seconds)
        Instant threshold = Instant.now().minusSeconds(300);
        activeClients.entrySet().removeIf(entry -> entry.getValue().isBefore(threshold));
        
        // Return online count, default to at least 1 if activeClients is empty
        return Math.max(1, activeClients.size());
    }

    public List<String> getOnlineUsers() {
        Instant threshold = Instant.now().minusSeconds(300);
        activeClients.entrySet().removeIf(entry -> entry.getValue().isBefore(threshold));
        return new ArrayList<>(activeClients.keySet());
    }
}
