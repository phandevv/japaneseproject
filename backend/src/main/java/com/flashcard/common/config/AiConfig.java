package com.flashcard.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Central configuration for AI Services (DeepSeek, 9router, and OpenAI-compatible LLM providers).
 * Supports profile separation:
 * - Local: Defaults to 9router or local .env.local overrides
 * - Prod: Defaults to DeepSeek official or environment variable overrides
 */
@Component
public class AiConfig {

    private static final Logger log = LoggerFactory.getLogger(AiConfig.class);

    private final String apiUrl;
    private final String model;
    private final String configuredApiKey;
    private final String explicitApiUrl;
    private final String explicitModel;
    private volatile String resolvedApiKey;

    public AiConfig(
            @Value("${ai.deepseek.api-url:${DEEPSEEK_API_URL:}}") String apiUrl,
            @Value("${ai.deepseek.model:${DEEPSEEK_MODEL:}}") String model,
            @Value("${ai.deepseek.api-key:${DEEPSEEK_API_KEY:}}") String configuredApiKey) {

        String localFileUrl = loadPropertyFromLocalEnvFiles("DEEPSEEK_API_URL");
        String localFileModel = loadPropertyFromLocalEnvFiles("DEEPSEEK_MODEL");
        String localFileKey = loadPropertyFromLocalEnvFiles("DEEPSEEK_API_KEY");

        // 1. API URL resolution
        if (apiUrl != null && !apiUrl.isBlank() && !apiUrl.equals("https://api.deepseek.com/chat/completions")) {
            this.apiUrl = apiUrl.trim();
            this.explicitApiUrl = apiUrl.trim();
        } else if (localFileUrl != null && !localFileUrl.isBlank()) {
            this.apiUrl = localFileUrl.trim();
            this.explicitApiUrl = null;
        } else {
            String fileUrl = loadPropertyFromEnvFiles("DEEPSEEK_API_URL");
            this.apiUrl = (fileUrl != null && !fileUrl.isBlank()) ? fileUrl.trim() : "https://api.deepseek.com/chat/completions";
            this.explicitApiUrl = null;
        }

        // 2. Model resolution
        if (model != null && !model.isBlank() && !model.equals("deepseek-chat")) {
            this.model = model.trim();
            this.explicitModel = model.trim();
        } else if (localFileModel != null && !localFileModel.isBlank()) {
            this.model = localFileModel.trim();
            this.explicitModel = null;
        } else {
            String fileModel = loadPropertyFromEnvFiles("DEEPSEEK_MODEL");
            this.model = (fileModel != null && !fileModel.isBlank()) ? fileModel.trim() : "deepseek-chat";
            this.explicitModel = null;
        }

        // 3. API Key resolution
        String systemEnvKey = System.getenv("DEEPSEEK_API_KEY");
        if (configuredApiKey != null && !configuredApiKey.isBlank() && !configuredApiKey.equals(systemEnvKey)) {
            // Explicit programmatic custom key (e.g. from unit test)
            this.configuredApiKey = configuredApiKey.trim();
            this.resolvedApiKey = configuredApiKey.trim();
        } else if (localFileKey != null && !localFileKey.isBlank()) {
            // Local .env.local takes precedence over inherited OS environment
            this.configuredApiKey = localFileKey.trim();
            this.resolvedApiKey = localFileKey.trim();
        } else {
            this.configuredApiKey = configuredApiKey != null ? configuredApiKey.trim() : "";
        }
    }

    public String getApiUrl() {
        if (explicitApiUrl != null) {
            return explicitApiUrl;
        }
        String localFileUrl = loadPropertyFromLocalEnvFiles("DEEPSEEK_API_URL");
        if (localFileUrl != null && !localFileUrl.isBlank()) {
            return localFileUrl.trim();
        }
        return apiUrl;
    }

    public String getModel() {
        if (explicitModel != null) {
            return explicitModel;
        }
        String localFileModel = loadPropertyFromLocalEnvFiles("DEEPSEEK_MODEL");
        if (localFileModel != null && !localFileModel.isBlank()) {
            return localFileModel.trim();
        }
        return model;
    }

    /**
     * Resolves the AI API Key dynamically with priority:
     * 1. Explicitly resolved key (.env.local or custom test key)
     * 2. Local .env.local file search
     * 3. Spring property / configuredApiKey
     * 4. System.getenv("DEEPSEEK_API_KEY")
     * 5. Local .env file search
     */
    public String getApiKey() {
        if (resolvedApiKey != null && !resolvedApiKey.isBlank()) {
            return resolvedApiKey;
        }

        String localKey = loadPropertyFromLocalEnvFiles("DEEPSEEK_API_KEY");
        if (localKey != null && !localKey.isBlank()) {
            resolvedApiKey = localKey;
            return resolvedApiKey;
        }

        if (configuredApiKey != null && !configuredApiKey.isBlank()) {
            resolvedApiKey = configuredApiKey;
            return resolvedApiKey;
        }

        String envKey = System.getenv("DEEPSEEK_API_KEY");
        if (envKey != null && !envKey.isBlank()) {
            resolvedApiKey = envKey.trim();
            return resolvedApiKey;
        }

        String propKey = System.getProperty("DEEPSEEK_API_KEY");
        if (propKey != null && !propKey.isBlank()) {
            resolvedApiKey = propKey.trim();
            return resolvedApiKey;
        }

        // Fallback: search .env
        resolvedApiKey = loadPropertyFromEnvFiles("DEEPSEEK_API_KEY");
        return resolvedApiKey != null ? resolvedApiKey : "";
    }

    private static String loadPropertyFromLocalEnvFiles(String propertyKey) {
        Path[] localPaths = new Path[]{
            Paths.get(".env.local"),
            Paths.get("../.env.local"),
            Paths.get("../../.env.local")
        };
        return searchFileForProperty(localPaths, propertyKey);
    }

    private static String loadPropertyFromEnvFiles(String propertyKey) {
        Path[] paths = new Path[]{
            Paths.get(".env.local"),
            Paths.get("../.env.local"),
            Paths.get("../../.env.local"),
            Paths.get(".env"),
            Paths.get("../.env"),
            Paths.get("../../.env")
        };
        return searchFileForProperty(paths, propertyKey);
    }

    private static String searchFileForProperty(Path[] paths, String propertyKey) {
        String prefix = propertyKey + "=";
        for (Path path : paths) {
            if (Files.exists(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    for (String line : lines) {
                        line = line.trim();
                        if (line.startsWith(prefix)) {
                            String value = line.substring(prefix.length()).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                if (value.length() >= 2) {
                                    value = value.substring(1, value.length() - 1);
                                }
                            }
                            if (!value.isBlank()) {
                                log.info("Loaded {} from file: {}", propertyKey, path.toAbsolutePath());
                                return value;
                            }
                        }
                    }
                } catch (java.io.IOException | SecurityException e) {
                    log.warn("Failed reading {} from path: {}", propertyKey, path, e);
                }
            }
        }
        return null;
    }
}
