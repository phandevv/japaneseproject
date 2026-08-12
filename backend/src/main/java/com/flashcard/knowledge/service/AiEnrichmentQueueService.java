package com.flashcard.knowledge.service;

import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.*;

@Service
public class AiEnrichmentQueueService {

    private static final Logger log = LoggerFactory.getLogger(AiEnrichmentQueueService.class);

    private final DeepSeekEnrichmentService enrichmentService;
    private final VocabularyRepository vocabularyRepository;
    private final GrammarCardRepository grammarCardRepository;

    // Deduplicated Task Queue & Map tracking active/queued tasks
    private final BlockingQueue<EnrichTask> taskQueue = new LinkedBlockingQueue<>();
    private final Map<String, EnrichTask> activeTasks = new ConcurrentHashMap<>();

    // Java Virtual Thread Per Task Executor
    private ExecutorService virtualThreadExecutor;
    private ExecutorService consumerLoopExecutor;

    // Throttle max 10 concurrent Virtual Threads processing AI requests to prevent rate limit spikes
    private final Semaphore concurrencySemaphore = new Semaphore(10);

    private volatile boolean running = true;

    public enum TaskType {
        VOCABULARY,
        GRAMMAR
    }

    public static class EnrichTask {
        private final TaskType type;
        private final Long id;
        private final boolean force;
        private final CompletableFuture<Object> completionFuture;

        public EnrichTask(TaskType type, Long id, boolean force) {
            this.type = type;
            this.id = id;
            this.force = force;
            this.completionFuture = new CompletableFuture<>();
        }

        public TaskType getType() {
            return type;
        }

        public Long getId() {
            return id;
        }

        public boolean isForce() {
            return force;
        }

        public CompletableFuture<Object> getCompletionFuture() {
            return completionFuture;
        }

        public String getKey() {
            return type.name() + "_" + id;
        }
    }

    @Autowired
    public AiEnrichmentQueueService(DeepSeekEnrichmentService enrichmentService,
                                   VocabularyRepository vocabularyRepository,
                                   GrammarCardRepository grammarCardRepository) {
        this.enrichmentService = enrichmentService;
        this.vocabularyRepository = vocabularyRepository;
        this.grammarCardRepository = grammarCardRepository;
    }

    @PostConstruct
    public void init() {
        this.virtualThreadExecutor = Executors.newVirtualThreadPerTaskExecutor();
        this.consumerLoopExecutor = Executors.newSingleThreadExecutor(Thread.ofVirtual().factory());
        this.consumerLoopExecutor.submit(this::consumeQueueLoop);
        log.info("AiEnrichmentQueueService initialized with Virtual Thread Pool (max concurrency = 10).");
    }

    @PreDestroy
    public void shutdown() {
        this.running = false;
        if (consumerLoopExecutor != null) {
            consumerLoopExecutor.shutdownNow();
        }
        if (virtualThreadExecutor != null) {
            virtualThreadExecutor.shutdownNow();
        }
    }

    /**
     * Check if a Vocabulary/Grammar ID is currently queued or actively being enriched
     */
    public boolean isEnriching(TaskType type, Long id) {
        if (id == null || type == null) return false;
        return activeTasks.containsKey(type.name() + "_" + id);
    }

    /**
     * Enqueue a Vocabulary item for background Virtual Thread AI enrichment.
     * Guarantees that if an AI task is ALREADY active for this vocabId, it reuses the existing task!
     */
    public EnrichTask enqueueVocabulary(Long vocabId, boolean force) {
        if (vocabId == null) return null;
        String key = TaskType.VOCABULARY.name() + "_" + vocabId;

        EnrichTask existing = activeTasks.get(key);
        if (existing != null) {
            log.info("Vocab ID {} is ALREADY queued or enriching by AI. Reusing existing task to prevent duplicate AI calls.", vocabId);
            return existing;
        }

        EnrichTask task = new EnrichTask(TaskType.VOCABULARY, vocabId, force);
        activeTasks.put(key, task);
        taskQueue.offer(task);
        log.info("Queued VOCABULARY ID {} for AI enrichment (Queue size: {})", vocabId, taskQueue.size());
        return task;
    }

    /**
     * Enqueue a GrammarCard item for background Virtual Thread AI enrichment.
     * Guarantees that if an AI task is ALREADY active for this grammarId, it reuses the existing task!
     */
    public EnrichTask enqueueGrammar(Long grammarId, boolean force) {
        if (grammarId == null) return null;
        String key = TaskType.GRAMMAR.name() + "_" + grammarId;

        EnrichTask existing = activeTasks.get(key);
        if (existing != null) {
            log.info("Grammar ID {} is ALREADY queued or enriching by AI. Reusing existing task to prevent duplicate AI calls.", grammarId);
            return existing;
        }

        EnrichTask task = new EnrichTask(TaskType.GRAMMAR, grammarId, force);
        activeTasks.put(key, task);
        taskQueue.offer(task);
        log.info("Queued GRAMMAR ID {} for AI enrichment (Queue size: {})", grammarId, taskQueue.size());
        return task;
    }

    /**
     * Background consumer loop dispatching tasks into Virtual Threads
     */
    private void consumeQueueLoop() {
        while (running) {
            try {
                EnrichTask task = taskQueue.take();
                virtualThreadExecutor.submit(() -> processTaskWithThrottle(task));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Error in AI queue consumer loop: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * Executes AI task in Virtual Thread with Semaphore concurrency throttle
     */
    private void processTaskWithThrottle(EnrichTask task) {
        try {
            concurrencySemaphore.acquire();
            log.info("Virtual Thread processing AI task: {} (Active VT workers: {})", 
                task.getKey(), 10 - concurrencySemaphore.availablePermits());

            if (task.getType() == TaskType.VOCABULARY) {
                Vocabulary vocab = vocabularyRepository.findById(task.getId()).orElse(null);
                if (vocab != null) {
                    boolean isMissingFields = (vocab.getUsageGuide() == null || vocab.getUsageGuide().isBlank())
                        || (vocab.getMnemonic() == null || vocab.getMnemonic().isBlank())
                        || (vocab.getExampleSentences() == null || vocab.getExampleSentences().isBlank());

                    if (task.isForce() || isMissingFields) {
                        Vocabulary enriched = enrichmentService.enrichVocabulary(vocab).get(30, TimeUnit.SECONDS);
                        task.getCompletionFuture().complete(enriched);
                    } else {
                        task.getCompletionFuture().complete(vocab);
                    }
                } else {
                    task.getCompletionFuture().complete(null);
                }
            } else if (task.getType() == TaskType.GRAMMAR) {
                GrammarCard gCard = grammarCardRepository.findById(task.getId()).orElse(null);
                if (gCard != null) {
                    boolean isMissingFields = (gCard.getUsageGuide() == null || gCard.getUsageGuide().isBlank())
                        || (gCard.getSimilarGrammar() == null || gCard.getSimilarGrammar().isBlank());

                    if (task.isForce() || isMissingFields) {
                        GrammarCard enriched = enrichmentService.enrichGrammarCard(gCard).get(30, TimeUnit.SECONDS);
                        task.getCompletionFuture().complete(enriched);
                    } else {
                        task.getCompletionFuture().complete(gCard);
                    }
                } else {
                    task.getCompletionFuture().complete(null);
                }
            }
        } catch (Exception e) {
            log.error("Failed to process Virtual Thread task {}: {}", task.getKey(), e.getMessage());
            task.getCompletionFuture().completeExceptionally(e);
        } finally {
            activeTasks.remove(task.getKey());
            concurrencySemaphore.release();
        }
    }

    public int getQueueSize() {
        return taskQueue.size();
    }

    public int getActiveWorkerCount() {
        return 10 - concurrencySemaphore.availablePermits();
    }
}
