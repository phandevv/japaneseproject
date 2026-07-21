package com.flashcard.common.ai;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public interface AIProvider {
    /**
     * Streams a chat completion response from the AI provider.
     *
     * @param messages List of message maps containing "role" and "content" keys.
     * @param chunkConsumer Callback for receiving text chunks as they arrive.
     * @param errorConsumer Callback for receiving error notifications.
     */
    void streamChat(List<Map<String, String>> messages, Consumer<String> chunkConsumer, Consumer<Throwable> errorConsumer, Runnable onComplete);
}

