package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.dto.GenerateResult;
import com.flashcard.knowledge.dto.GrammarGroupDetailResponse;
import com.flashcard.knowledge.dto.GrammarGroupOverviewResponse;
import com.flashcard.knowledge.dto.ImportGrammarGroupResponse;
import com.flashcard.knowledge.dto.PatternDto;
import com.flashcard.knowledge.dto.QuestionDto;
import com.flashcard.knowledge.dto.SubmitQuizResponse;
import com.flashcard.knowledge.model.JlptN3GrammarGroup;
import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.provider.JlptN3DataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class JlptN3GrammarReviewService {

    private static final Logger log = LoggerFactory.getLogger(JlptN3GrammarReviewService.class);

    private static final int PASS_THRESHOLD_PERCENT = 80;

    private final JlptN3DataProvider dataProvider;
    private final ObjectMapper objectMapper;
    private final DeepSeekEnrichmentService enrichmentService;

    public JlptN3GrammarReviewService(JlptN3DataProvider dataProvider,
                                      ObjectMapper objectMapper) {
        this(dataProvider, objectMapper, null);
    }

    @Autowired
    public JlptN3GrammarReviewService(JlptN3DataProvider dataProvider,
                                      ObjectMapper objectMapper,
                                      DeepSeekEnrichmentService enrichmentService) {
        this.dataProvider = dataProvider;
        this.objectMapper = objectMapper.copy()
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true)
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER, true);
        this.enrichmentService = enrichmentService;
    }

    public GrammarGroupOverviewResponse getGrammarGroupOverview(Long userId) {
        List<JlptN3GrammarGroup> groups = dataProvider.findAllGrammarGroups();

        List<com.flashcard.knowledge.dto.GrammarGroupOverviewDto> dtos = groups.stream()
                .map(g -> {
                    boolean passed = false;
                    int bestScore = 0;
                    if (userId != null) {
                        var progressOpt = dataProvider.findProgress(userId, 0, 0);
                        if (progressOpt.isPresent()) {
                            var p = progressOpt.get();
                            passed = p.getGrammarReviewPassed();
                            bestScore = p.getGrammarReviewScore() != null ? p.getGrammarReviewScore() : 0;
                        }
                    }
                    return new com.flashcard.knowledge.dto.GrammarGroupOverviewDto(
                            g.getId(),
                            g.getGroupCode(),
                            g.getTitle(),
                            g.getDescription(),
                            g.getTotalPatterns(),
                            g.getSortOrder(),
                            passed,
                            bestScore
                    );
                })
                .collect(Collectors.toList());

        return new GrammarGroupOverviewResponse(dtos, dtos.size());
    }

    @SuppressWarnings("unchecked")
    public GrammarGroupDetailResponse getGrammarGroupDetail(String groupCode, Long userId) {
        Optional<JlptN3GrammarGroup> groupOpt = dataProvider.findGrammarGroupByCode(groupCode);
        if (groupOpt.isEmpty()) {
            log.warn("Grammar group not found: {}", groupCode);
            return null;
        }

        JlptN3GrammarGroup group = groupOpt.get();

        List<PatternDto> patterns = Collections.emptyList();
        if (group.getGrammarPatternIds() != null && !group.getGrammarPatternIds().isBlank()) {
            try {
                List<Map<String, Object>> patternList = objectMapper.readValue(group.getGrammarPatternIds(), List.class);
                patterns = patternList.stream()
                        .map(m -> new PatternDto(
                                (String) m.get("cau_truc"),
                                (String) m.get("y_nghia"),
                                (List<String>) m.getOrDefault("examples", Collections.emptyList())
                        ))
                        .collect(Collectors.toList());
            } catch (Exception e) {
                log.error("Failed to parse pattern IDs for group {}: {}", groupCode, e.getMessage());
            }
        }

        List<Map<String, Object>> quizMaps = dataProvider.findQuizzesByGroupCode(groupCode);
        List<QuestionDto> questions = quizMaps.stream()
                .map(m -> {
                    try {
                        List<Map<String, Object>> questionList = objectMapper.readValue(
                                (String) m.get("questionsJson"), List.class);
                        return questionList.stream()
                                .map(q -> new QuestionDto(
                                        (String) q.getOrDefault("type", "MCQ"),
                                        (String) q.get("question"),
                                        (List<String>) q.getOrDefault("options", Collections.emptyList()),
                                        (String) q.get("answer"),
                                        (String) q.getOrDefault("explanation", "")
                                ))
                                .collect(Collectors.toList());
                    } catch (Exception e) {
                        log.error("Failed to parse questions for quiz: {}", e.getMessage());
                        return Collections.<QuestionDto>emptyList();
                    }
                })
                .flatMap(List::stream)
                .collect(Collectors.toList());

        boolean passed = false;
        int bestScore = 0;
        int currentScore = 0;
        if (userId != null) {
            var progressOpt = dataProvider.findProgress(userId, 0, 0);
            if (progressOpt.isPresent()) {
                var p = progressOpt.get();
                passed = p.getGrammarReviewPassed();
                bestScore = p.getGrammarReviewBestScore() != null ? p.getGrammarReviewBestScore() : 0;
            }
        }

        return new GrammarGroupDetailResponse(
                group.getId(),
                group.getGroupCode(),
                group.getTitle(),
                group.getDescription(),
                group.getUsageGuide(),
                group.getUsageCases(),
                patterns,
                questions,
                passed,
                bestScore,
                currentScore
        );
    }

    @Transactional
    public SubmitQuizResponse submitGroupQuiz(Long userId, String groupCode, int score, int total) {
        if (total <= 0) {
            throw new IllegalArgumentException("Tổng số câu hỏi phải lớn hơn 0");
        }

        double accuracy = (double) score / total * 100;
        boolean passed = accuracy >= PASS_THRESHOLD_PERCENT;

        JlptN3Progress progress = null;
        int bestScore = 0;
        if (userId != null) {
            progress = dataProvider.findProgress(userId, 0, 0)
                    .orElseGet(() -> {
                        JlptN3Progress p = new JlptN3Progress();
                        p.setUserId(userId);
                        p.setChapterId(0);
                        p.setLessonId(0);
                        return p;
                    });

            if (passed) {
                progress.setGrammarReviewPassed(true);
            }
            progress.setGrammarReviewScore(score);

            int existingBest = progress.getGrammarReviewBestScore() != null ? progress.getGrammarReviewBestScore() : 0;
            if (score > existingBest) {
                progress.setGrammarReviewBestScore(score);
                bestScore = score;
            } else {
                bestScore = existingBest;
            }

            dataProvider.saveProgress(progress);
        }

        return new SubmitQuizResponse(
                passed,
                score,
                total,
                bestScore,
                accuracy
        );
    }

    @Transactional
    public ImportGrammarGroupResponse importGrammarGroupData(String jsonData) {
        List<String> errors = new ArrayList<>();
        int groupsSaved = 0;
        int quizzesSaved = 0;

        try {
            JsonNode root = objectMapper.readTree(jsonData);
            JsonNode groupsNode = root.has("groups") ? root.get("groups") : root;

            for (JsonNode groupNode : groupsNode) {
                try {
                    String groupCode = groupNode.get("group_code").asText("GRP_" + UUID.randomUUID().toString().substring(0, 8));
                    String title = groupNode.get("title").asText();
                    String description = groupNode.has("description") ? groupNode.get("description").asText() : null;
                    String usageGuide = groupNode.has("usage_guide") ? groupNode.get("usage_guide").asText() : null;
                    String usageCases = groupNode.has("usage_cases") ? groupNode.get("usage_cases").asText() : null;

                    String patternIdsJson = serializePatterns(groupNode.get("patterns"));
                    String exampleSentencesJson = extractExampleSentences(groupNode.get("patterns"));

                    int totalPatterns = groupNode.has("patterns") ? groupNode.get("patterns").size() : 0;
                    int sortOrder = groupNode.has("sort_order") ? groupNode.get("sort_order").asInt(0) : 0;

                    JlptN3GrammarGroup group = new JlptN3GrammarGroup();
                    group.setGroupCode(groupCode);
                    group.setTitle(title);
                    group.setDescription(description);
                    group.setUsageGuide(usageGuide);
                    group.setUsageCases(usageCases);
                    group.setGrammarPatternIds(patternIdsJson);
                    group.setExampleSentencesJson(exampleSentencesJson);
                    group.setTotalPatterns(totalPatterns);
                    group.setSortOrder(sortOrder);
                    group.setUpdatedAt(LocalDateTime.now());

                    JlptN3GrammarGroup savedGroup = dataProvider.saveGrammarGroup(group);
                    groupsSaved++;

                    JsonNode questionsNode = groupNode.get("questions");
                    if (questionsNode != null && questionsNode.isArray()) {
                        String questionsJson = questionsNode.toString();

                        JlptN3GrammarQuiz quiz = new JlptN3GrammarQuiz();
                        quiz.setGroupId(savedGroup.getId());
                        quiz.setGroupCode(groupCode);
                        quiz.setQuestionsJson(questionsJson);
                        quiz.setQuestionType("MCQ");

                        dataProvider.saveQuiz(quiz);
                        quizzesSaved++;
                    }

                } catch (Exception e) {
                    errors.add("Failed to import group: " + e.getMessage());
                    log.error("Failed to import grammar group: {}", e.getMessage(), e);
                }
            }

        } catch (Exception e) {
            log.error("Failed to parse grammar group JSON: {}", e.getMessage(), e);
            errors.add("Failed to parse JSON: " + e.getMessage());
        }

        return new ImportGrammarGroupResponse(groupsSaved, quizzesSaved, errors);
    }

    /**
     * Sinh lại toàn bộ nhóm ngữ pháp qua AI (2 phase để không vượt giới hạn token):
     * Phase 1: AI clustering theo pattern_indices → tạo groups (chưa có câu hỏi).
     * Phase 2: Với mỗi nhóm, AI sinh description/usage_guide/usage_cases + 30 câu hỏi.
     * Không bọc @Transactional toàn cục vì mỗi lượt gọi AI mất 10-20 phút.
     */
    public GenerateResult generateGrammarGroupsFromAi() {
        if (enrichmentService == null) {
            throw new IllegalStateException("DeepSeekEnrichmentService is not configured");
        }

        List<Map<String, Object>> allPatterns = enrichmentService.collectAllN3GrammarPatterns();
        if (allPatterns == null || allPatterns.isEmpty()) {
            log.warn("No grammar patterns found for AI clustering");
            return new GenerateResult(0, 0);
        }

        String clusteredJson = enrichmentService.clusterGrammarPatternsToGroups(allPatterns);
        if (clusteredJson == null || clusteredJson.isBlank() || clusteredJson.equals("[]")) {
            log.warn("AI clustering returned empty or failed");
            return new GenerateResult(0, 0);
        }

        List<GroupPlan> plans;
        try {
            plans = buildGroupPlans(clusteredJson, allPatterns);
        } catch (Exception e) {
            log.error("Failed to parse AI clustering result: {}", e.getMessage(), e);
            return new GenerateResult(0, 0);
        }
        if (plans.isEmpty()) {
            log.warn("AI clustering produced no valid groups");
            return new GenerateResult(0, 0);
        }

        dataProvider.deleteAllGrammarGroups();
        dataProvider.deleteAllGroupQuizzes();

        String assembledJson;
        try {
            assembledJson = assembleGroupsJson(plans);
        } catch (Exception e) {
            log.error("Failed to assemble grammar groups JSON: {}", e.getMessage(), e);
            return new GenerateResult(0, 0);
        }
        ImportGrammarGroupResponse importResult = importGrammarGroupData(assembledJson);
        int groupsSaved = importResult.groupsSaved();
        if (!importResult.errors().isEmpty()) {
            log.warn("Grammar group import warnings: {}", importResult.errors());
        }

        int quizzesSaved = 0;
        int contentFailed = 0;
        for (GroupPlan plan : plans) {
            try {
                String contentJson = enrichmentService.generateGrammarGroupContent(
                        plan.groupCode(), plan.title(), plan.patterns());
                if (contentJson == null || contentJson.isBlank()) {
                    contentFailed++;
                    log.warn("No content generated for group {}", plan.groupCode());
                    continue;
                }

                JsonNode content = objectMapper.readTree(contentJson);
                Optional<JlptN3GrammarGroup> groupOpt = dataProvider.findGrammarGroupByCode(plan.groupCode());
                if (groupOpt.isEmpty()) {
                    contentFailed++;
                    log.warn("Group {} not found after import", plan.groupCode());
                    continue;
                }

                JlptN3GrammarGroup group = groupOpt.get();
                if (content.hasNonNull("description")) group.setDescription(content.get("description").asText());
                if (content.hasNonNull("usage_guide")) group.setUsageGuide(content.get("usage_guide").asText());
                if (content.hasNonNull("usage_cases")) group.setUsageCases(content.get("usage_cases").asText());
                group.setUpdatedAt(LocalDateTime.now());
                dataProvider.saveGrammarGroup(group);

                JsonNode questionsNode = content.get("questions");
                if (questionsNode != null && questionsNode.isArray() && questionsNode.size() > 0) {
                    JlptN3GrammarQuiz quiz = new JlptN3GrammarQuiz();
                    quiz.setGroupId(group.getId());
                    quiz.setGroupCode(plan.groupCode());
                    quiz.setQuestionsJson(questionsNode.toString());
                    quiz.setQuestionType("MCQ");
                    dataProvider.saveQuiz(quiz);
                    quizzesSaved++;
                } else {
                    contentFailed++;
                    log.warn("Content for group {} has no questions", plan.groupCode());
                }
            } catch (Exception e) {
                contentFailed++;
                log.error("Failed to generate content for group {}: {}", plan.groupCode(), e.getMessage(), e);
            }
        }

        log.info("Grammar review generation finished: {} groups, {} quizzes, {} content failures",
                groupsSaved, quizzesSaved, contentFailed);
        return new GenerateResult(groupsSaved, quizzesSaved);
    }

    private List<GroupPlan> buildGroupPlans(String clusteredJson, List<Map<String, Object>> allPatterns) throws Exception {
        JsonNode root = objectMapper.readTree(clusteredJson);
        JsonNode groupsNode = root.has("groups") ? root.get("groups") : root;

        List<GroupPlan> plans = new ArrayList<>();
        Set<Integer> assigned = new HashSet<>();
        int sortOrder = 1;
        for (JsonNode g : groupsNode) {
            if (g == null || !g.has("pattern_indices") || !g.get("pattern_indices").isArray()) {
                continue;
            }
            String groupCode = g.hasNonNull("group_code")
                    ? g.get("group_code").asText()
                    : String.format("GRP_%02d", sortOrder);
            String title = g.hasNonNull("title") ? g.get("title").asText() : "Nhóm " + sortOrder;

            List<Map<String, Object>> patterns = new ArrayList<>();
            for (JsonNode idxNode : g.get("pattern_indices")) {
                int idx = idxNode.asInt(-1);
                if (idx >= 0 && idx < allPatterns.size() && assigned.add(idx)) {
                    patterns.add(allPatterns.get(idx));
                }
            }
            if (patterns.isEmpty()) {
                continue;
            }
            plans.add(new GroupPlan(groupCode, title, sortOrder++, patterns));
        }

        if (plans.isEmpty()) {
            return plans;
        }

        int leftover = 0;
        for (int idx = 0; idx < allPatterns.size(); idx++) {
            if (!assigned.contains(idx)) {
                plans.get(leftover % plans.size()).patterns().add(allPatterns.get(idx));
                leftover++;
            }
        }
        if (leftover > 0) {
            log.warn("AI clustering left {} patterns unassigned, redistributed round-robin", leftover);
        }
        return plans;
    }

    private String assembleGroupsJson(List<GroupPlan> plans) throws Exception {
        List<Map<String, Object>> groups = new ArrayList<>();
        for (GroupPlan plan : plans) {
            Map<String, Object> g = new HashMap<>();
            g.put("group_code", plan.groupCode());
            g.put("title", plan.title());
            g.put("sort_order", plan.sortOrder());
            g.put("patterns", plan.patterns());
            groups.add(g);
        }
        return objectMapper.writeValueAsString(Map.of("groups", groups));
    }

    private record GroupPlan(String groupCode, String title, int sortOrder, List<Map<String, Object>> patterns) {
    }

    @Transactional
    public GrammarGroupDetailResponse updateGrammarGroup(String groupCode, Map<String, Object> updates) {
        Optional<JlptN3GrammarGroup> groupOpt = dataProvider.findGrammarGroupByCode(groupCode);
        if (groupOpt.isEmpty()) {
            throw new IllegalArgumentException("Grammar group not found: " + groupCode);
        }

        JlptN3GrammarGroup group = groupOpt.get();

        if (updates.containsKey("title")) group.setTitle((String) updates.get("title"));
        if (updates.containsKey("description")) group.setDescription((String) updates.get("description"));
        if (updates.containsKey("usage_guide")) group.setUsageGuide((String) updates.get("usage_guide"));
        if (updates.containsKey("usage_cases")) group.setUsageCases((String) updates.get("usage_cases"));
        if (updates.containsKey("sort_order")) group.setSortOrder((Integer) updates.get("sort_order"));

        group.setUpdatedAt(LocalDateTime.now());
        dataProvider.saveGrammarGroup(group);

        return getGrammarGroupDetail(groupCode, null);
    }

    private String serializePatterns(JsonNode patternsNode) {
        if (patternsNode == null || !patternsNode.isArray()) {
            return "[]";
        }
        List<Map<String, Object>> patterns = new ArrayList<>();
        for (JsonNode p : patternsNode) {
            Map<String, Object> pattern = new HashMap<>();
            pattern.put("cau_truc", p.has("cau_truc") ? p.get("cau_truc").asText() : p.has("structure") ? p.get("structure").asText() : null);
            pattern.put("y_nghia", p.has("y_nghia") ? p.get("y_nghia").asText() : p.has("meaning") ? p.get("meaning").asText() : null);
            if (p.has("examples")) {
                List<String> examples = new ArrayList<>();
                p.get("examples").forEach(ex -> examples.add(ex.asText()));
                pattern.put("examples", examples);
            } else {
                pattern.put("examples", Collections.emptyList());
            }
            patterns.add(pattern);
        }
        try {
            return objectMapper.writeValueAsString(patterns);
        } catch (Exception e) {
            log.error("Failed to serialize patterns: {}", e.getMessage());
            return "[]";
        }
    }

    private String extractExampleSentences(JsonNode patternsNode) {
        if (patternsNode == null || !patternsNode.isArray()) {
            return "[]";
        }
        try {
            List<String> allExamples = new ArrayList<>();
            for (JsonNode p : patternsNode) {
                if (p.has("examples")) {
                    p.get("examples").forEach(ex -> allExamples.add(ex.asText()));
                }
            }
            return objectMapper.writeValueAsString(allExamples);
        } catch (Exception e) {
            log.error("Failed to extract example sentences: {}", e.getMessage());
            return "[]";
        }
    }
}
