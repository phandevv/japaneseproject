package com.flashcard.common.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;

@Service
public class DeepSeekProvider implements AIProvider {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekProvider.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public void streamChat(List<Map<String, String>> messages, Consumer<String> chunkConsumer, Consumer<Throwable> errorConsumer, Runnable onComplete) {
        CompletableFuture.runAsync(() -> {
            try {
                String apiKey = getApiKey();
                if (apiKey == null) {
                    throw new IllegalStateException("DEEPSEEK_API_KEY environment variable is not configured.");
                }

                Map<String, Object> requestBodyMap = new HashMap<>();
                requestBodyMap.put("model", "deepseek-chat");
                requestBodyMap.put("messages", messages);
                requestBodyMap.put("stream", true);

                String requestBody = objectMapper.writeValueAsString(requestBodyMap);

                HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.deepseek.com/chat/completions"))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .timeout(Duration.ofSeconds(45))
                        .build();

                HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

                if (response.statusCode() != 200) {
                    try (InputStream is = response.body()) {
                        String errorMsg = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                        throw new RuntimeException("DeepSeek API error status: " + response.statusCode() + ", response: " + errorMsg);
                    }
                }

                try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.trim().isEmpty()) {
                            continue;
                        }
                        if (line.startsWith("data: ")) {
                            String data = line.substring(6).trim();
                            if (data.equals("[DONE]")) {
                                break;
                            }
                            try {
                                JsonNode node = objectMapper.readTree(data);
                                JsonNode delta = node.path("choices").get(0).path("delta");
                                if (delta.has("content")) {
                                    String content = delta.get("content").asText();
                                    chunkConsumer.accept(content);
                                }
                            } catch (Exception e) {
                                log.warn("Failed to parse SSE line JSON: {}", line, e);
                            }
                        }
                    }
                }
                onComplete.run();
            } catch (Exception e) {
                log.error("DeepSeek streaming error", e);
                errorConsumer.accept(e);
            }
        });
    }

    private String getApiKey() {
        String apiKey = System.getenv("DEEPSEEK_API_KEY");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getProperty("DEEPSEEK_API_KEY");
        }
        if (apiKey == null || apiKey.trim().isEmpty()) {
            try {
                java.nio.file.Path envPath = java.nio.file.Paths.get(".env");
                if (!java.nio.file.Files.exists(envPath)) {
                    envPath = java.nio.file.Paths.get("../.env");
                }
                if (!java.nio.file.Files.exists(envPath)) {
                    envPath = java.nio.file.Paths.get("../../.env");
                }
                if (java.nio.file.Files.exists(envPath)) {
                    for (String line : java.nio.file.Files.readAllLines(envPath)) {
                        line = line.trim();
                        if (line.startsWith("DEEPSEEK_API_KEY=")) {
                            apiKey = line.substring("DEEPSEEK_API_KEY=".length()).trim();
                            if (apiKey.startsWith("\"") && apiKey.endsWith("\"")) {
                                apiKey = apiKey.substring(1, apiKey.length() - 1);
                            }
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return (apiKey == null || apiKey.trim().isEmpty()) ? null : apiKey;
    }
}


