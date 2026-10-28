package com.flashcard.knowledge.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.document.HighFrequencyGrammarDoc;
import com.flashcard.knowledge.dto.HighFrequencyGrammarDto;
import com.flashcard.knowledge.model.HighFrequencyGrammar;
import com.flashcard.knowledge.model.HighFrequencyGrammarReview;
import com.flashcard.knowledge.repository.HighFrequencyGrammarRepository;
import com.flashcard.knowledge.repository.HighFrequencyGrammarReviewRepository;
import com.flashcard.knowledge.repository.mongo.HighFrequencyGrammarMongoRepository;
import com.flashcard.user.model.User;
import com.flashcard.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HighFrequencyGrammarService {

    private static final Logger logger = LoggerFactory.getLogger(HighFrequencyGrammarService.class);

    private final HighFrequencyGrammarRepository grammarRepository;
    private final HighFrequencyGrammarReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final HighFrequencyGrammarMongoRepository mongoRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public HighFrequencyGrammarService(
            HighFrequencyGrammarRepository grammarRepository,
            HighFrequencyGrammarReviewRepository reviewRepository,
            UserRepository userRepository,
            @Autowired(required = false) HighFrequencyGrammarMongoRepository mongoRepository,
            @Autowired(required = false) ObjectMapper objectMapper) {
        this.grammarRepository = grammarRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.mongoRepository = mongoRepository;
        this.objectMapper = (objectMapper != null) ? objectMapper : new ObjectMapper();
    }

    public HighFrequencyGrammarService(
            HighFrequencyGrammarRepository grammarRepository,
            HighFrequencyGrammarReviewRepository reviewRepository,
            UserRepository userRepository,
            HighFrequencyGrammarMongoRepository mongoRepository) {
        this(grammarRepository, reviewRepository, userRepository, mongoRepository, new ObjectMapper());
    }

    @Transactional(readOnly = true)
    public List<HighFrequencyGrammarDto> getGrammarList(Long userId, String filter) {
        List<HighFrequencyGrammarDto> all = loadAllGrammarDtos();
        Map<Long, HighFrequencyGrammarReview> reviewMap = Collections.emptyMap();

        if (userId != null) {
            List<HighFrequencyGrammarReview> reviews = reviewRepository.findByUserId(userId);
            reviewMap = reviews.stream().collect(Collectors.toMap(
                    r -> r.getGrammar().getId(),
                    r -> r,
                    (existing, replacement) -> existing
            ));
        }

        Instant now = Instant.now();
        List<HighFrequencyGrammarDto> dtos = new ArrayList<>();
        String normalizedFilter = (filter == null) ? "all" : filter.trim().toLowerCase();

        for (HighFrequencyGrammarDto g : all) {
            HighFrequencyGrammarReview r = reviewMap.get(g.getId());
            boolean matches = false;

            switch (normalizedFilter) {
                case "critical":
                    matches = (g.getRankNumber() != null && g.getRankNumber() <= 20) || "Critical".equalsIgnoreCase(g.getPriority());
                    break;
                case "n3":
                    matches = "N3".equalsIgnoreCase(g.getLevel());
                    break;
                case "n4":
                    matches = "N4".equalsIgnoreCase(g.getLevel());
                    break;
                case "due":
                    matches = (r != null && r.getNextReview() != null && !r.getNextReview().isAfter(now));
                    break;
                case "all":
                default:
                    matches = true;
                    break;
            }

            if (matches) {
                if (r != null) {
                    g.applyReview(r);
                }
                dtos.add(g);
            }
        }

        return dtos;
    }

    @Transactional(readOnly = true)
    public HighFrequencyGrammarDto getGrammarDetail(Long id, Long userId) {
        HighFrequencyGrammarDto dto = null;
        Optional<HighFrequencyGrammar> gOpt = grammarRepository.findById(id);
        if (gOpt.isPresent()) {
            dto = new HighFrequencyGrammarDto(gOpt.get());
        } else if (mongoRepository != null) {
            Optional<HighFrequencyGrammarDoc> docOpt = mongoRepository.findById(id);
            if (docOpt.isEmpty() && id <= Integer.MAX_VALUE) {
                docOpt = mongoRepository.findByRankNumber(id.intValue());
            }
            if (docOpt.isPresent()) {
                dto = new HighFrequencyGrammarDto(docOpt.get());
            }
        }

        if (dto == null) {
            List<HighFrequencyGrammarDto> dtos = loadGrammarFromClasspathJson();
            dto = dtos.stream()
                    .filter(d -> Objects.equals(d.getId(), id) || (d.getRankNumber() != null && d.getRankNumber().longValue() == id))
                    .findFirst()
                    .orElseThrow(() -> new NoSuchElementException("Không tìm thấy mẫu ngữ pháp ID: " + id));
        }

        if (userId != null) {
            reviewRepository.findByUserIdAndGrammarId(userId, id).ifPresent(dto::applyReview);
        }
        return dto;
    }

    @Transactional
    public HighFrequencyGrammarDto reviewGrammar(Long userId, Long grammarId, int quality) {
        if (quality < 1 || quality > 4) {
            throw new IllegalArgumentException("Điểm đánh giá quality phải từ 1 đến 4 (1: Quên, 2: Khó, 3: Nhớ, 4: Dễ)");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng ID: " + userId));

        HighFrequencyGrammar grammar = grammarRepository.findById(grammarId)
                .orElseGet(() -> ensureGrammarEntity(grammarId));

        HighFrequencyGrammarReview review = reviewRepository.findByUserIdAndGrammarId(userId, grammarId)
                .orElseGet(() -> new HighFrequencyGrammarReview(user, grammar));

        // SM-2 Algorithm calculation
        double ef = review.getEaseFactor();
        int rep = review.getRepetitions();
        int interval = review.getIntervalDays();
        boolean previouslyLearned = review.isLearned();

        // 1. Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        double qScore = quality;
        double newEf = ef + (0.1 - (5.0 - qScore) * (0.08 + (5.0 - qScore) * 0.02));
        if (newEf < 1.3) {
            newEf = 1.3;
        }
        review.setEaseFactor(Math.round(newEf * 100.0) / 100.0);

        // 2. Repetition & Interval Calculation
        if (quality < 3) {
            // Forgotten / Hard -> reset interval to 1 day
            rep = 0;
            interval = 1;
            // CRITICAL IRON INVARIANT: Never clear is_learned if previously learned
            if (previouslyLearned) {
                review.setLearned(true);
            }
        } else {
            // Good (3) or Easy (4)
            rep += 1;
            if (rep == 1) {
                interval = 1;
            } else if (rep == 2) {
                interval = 6;
            } else {
                interval = (int) Math.round(interval * newEf);
            }
            review.setLearned(true);
        }

        review.setRepetitions(rep);
        review.setIntervalDays(interval);
        review.setNextReview(Instant.now().plus(interval, ChronoUnit.DAYS));
        review.setLastQuality(quality);
        review.setUpdatedAt(Instant.now());

        HighFrequencyGrammarReview saved = reviewRepository.save(review);
        HighFrequencyGrammarDto dto = new HighFrequencyGrammarDto(grammar);
        dto.applyReview(saved);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<HighFrequencyGrammarDto> getDueReviews(Long userId) {
        if (userId == null) return Collections.emptyList();
        List<HighFrequencyGrammarReview> dueReviews = reviewRepository.findDueReviews(userId, Instant.now());
        List<HighFrequencyGrammarDto> dtos = new ArrayList<>();
        for (HighFrequencyGrammarReview r : dueReviews) {
            HighFrequencyGrammarDto dto = new HighFrequencyGrammarDto(r.getGrammar());
            dto.applyReview(r);
            dtos.add(dto);
        }
        return dtos;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats(Long userId) {
        long total = grammarRepository.count();
        if (total == 0 && mongoRepository != null) {
            try {
                total = mongoRepository.count();
            } catch (Exception ignored) {}
        }
        if (total == 0) {
            total = 79L;
        }

        long learned = 0;
        int dueCount = 0;
        int reviewedCount = 0;

        if (userId != null) {
            learned = reviewRepository.countLearnedByUserId(userId);
            List<HighFrequencyGrammarReview> reviews = reviewRepository.findByUserId(userId);
            reviewedCount = reviews.size();
            Instant now = Instant.now();
            dueCount = (int) reviews.stream().filter(r -> r.getNextReview() != null && !r.getNextReview().isAfter(now)).count();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("learned", learned);
        stats.put("reviewed", reviewedCount);
        stats.put("due", dueCount);
        return stats;
    }

    @Transactional
    public Map<String, Object> syncToMongo() {
        if (mongoRepository == null) {
            return Map.of("status", "skipped", "message", "MongoDB repository is not active in current profile");
        }
        List<HighFrequencyGrammarDto> all = loadAllGrammarDtos();
        List<HighFrequencyGrammarDoc> docs = new ArrayList<>();
        for (HighFrequencyGrammarDto g : all) {
            HighFrequencyGrammarDoc doc = new HighFrequencyGrammarDoc();
            doc.setId(g.getId() != null ? g.getId() : (long) g.getRankNumber());
            doc.setRankNumber(g.getRankNumber());
            doc.setGrammar(g.getGrammar());
            doc.setLevel(g.getLevel());
            doc.setTotalOccurrences(g.getTotalOccurrences());
            doc.setExamCoverage(g.getExamCoverage());
            doc.setAvgPerExam(g.getAvgPerExam());
            doc.setBunpouCount(g.getBunpouCount());
            doc.setDokkaiCount(g.getDokkaiCount());
            doc.setChoukaiCount(g.getChoukaiCount());
            doc.setGoiCount(g.getGoiCount());
            doc.setPriority(g.getPriority());
            doc.setPriorityStars(g.getPriorityStars());
            doc.setFormation(g.getFormation());
            doc.setMeaning(g.getMeaning());
            doc.setExamExamplesJson(g.getExamExamplesJson());
            doc.setRecentTrend(g.getRecentTrend());
            doc.setStudyTip(g.getStudyTip());
            docs.add(doc);
        }
        mongoRepository.saveAll(docs);
        return Map.of("status", "success", "count", docs.size(), "message", "Successfully synced " + docs.size() + " grammar points to MongoDB!");
    }

    private List<HighFrequencyGrammarDto> loadAllGrammarDtos() {
        // 1. Try JPA database
        List<HighFrequencyGrammar> allJpa = grammarRepository.findAllByOrderByRankNumberAsc();
        if (allJpa != null && !allJpa.isEmpty()) {
            return allJpa.stream().map(HighFrequencyGrammarDto::new).collect(Collectors.toList());
        }

        // 2. Try MongoDB Atlas
        if (mongoRepository != null) {
            try {
                List<HighFrequencyGrammarDoc> allMongo = mongoRepository.findAllByOrderByRankNumberAsc();
                if (allMongo != null && !allMongo.isEmpty()) {
                    return allMongo.stream().map(HighFrequencyGrammarDto::new).collect(Collectors.toList());
                }
            } catch (Exception e) {
                logger.warn("Could not load high frequency grammar from Mongo: {}", e.getMessage());
            }
        }

        // 3. Fallback to classpath JSON
        return loadGrammarFromClasspathJson();
    }

    private List<HighFrequencyGrammarDto> loadGrammarFromClasspathJson() {
        try {
            ClassPathResource resource = new ClassPathResource("data/jlpt_n3_high_frequency_grammar.json");
            if (!resource.exists()) {
                return Collections.emptyList();
            }
            ObjectMapper mapper = (this.objectMapper != null) ? this.objectMapper : new ObjectMapper();
            try (InputStream is = resource.getInputStream()) {
                List<JsonNode> nodes = mapper.readValue(is, new TypeReference<List<JsonNode>>() {});
                List<HighFrequencyGrammarDto> dtos = new ArrayList<>();
                for (JsonNode n : nodes) {
                    HighFrequencyGrammarDto dto = new HighFrequencyGrammarDto();
                    int rank = n.has("rankNumber") ? n.get("rankNumber").asInt() : 0;
                    dto.setId((long) rank);
                    dto.setRankNumber(rank);
                    dto.setGrammar(n.has("grammar") ? n.get("grammar").asText() : "");
                    dto.setLevel(n.has("level") ? n.get("level").asText() : "N3");
                    dto.setTotalOccurrences(n.has("totalOccurrences") ? n.get("totalOccurrences").asInt() : 0);
                    dto.setExamCoverage(n.has("examCoverage") ? n.get("examCoverage").asText() : "");
                    dto.setAvgPerExam(n.has("avgPerExam") ? n.get("avgPerExam").asDouble() : 0.0);
                    dto.setBunpouCount(n.has("bunpouCount") ? n.get("bunpouCount").asInt() : 0);
                    dto.setDokkaiCount(n.has("dokkaiCount") ? n.get("dokkaiCount").asInt() : 0);
                    dto.setChoukaiCount(n.has("choukaiCount") ? n.get("choukaiCount").asInt() : 0);
                    dto.setGoiCount(n.has("goiCount") ? n.get("goiCount").asInt() : 0);
                    dto.setPriority(n.has("priority") ? n.get("priority").asText() : "Medium");
                    dto.setPriorityStars(n.has("priorityStars") ? n.get("priorityStars").asText() : "");
                    dto.setFormation(n.has("formation") ? n.get("formation").asText() : "");
                    dto.setMeaning(n.has("meaning") ? n.get("meaning").asText() : "");
                    dto.setRecentTrend(n.has("recentTrend") ? n.get("recentTrend").asText() : "");
                    dto.setStudyTip(n.has("studyTip") ? n.get("studyTip").asText() : "");
                    if (n.has("examExamples") && n.get("examExamples").isArray()) {
                        dto.setExamExamplesJson(n.get("examExamples").toString());
                    } else {
                        dto.setExamExamplesJson("[]");
                    }
                    dtos.add(dto);
                }
                return dtos;
            }
        } catch (Exception e) {
            logger.error("Error reading classpath grammar json: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    private HighFrequencyGrammar ensureGrammarEntity(Long grammarId) {
        if (mongoRepository != null) {
            Optional<HighFrequencyGrammarDoc> docOpt = mongoRepository.findById(grammarId);
            if (docOpt.isEmpty() && grammarId <= Integer.MAX_VALUE) {
                docOpt = mongoRepository.findByRankNumber(grammarId.intValue());
            }
            if (docOpt.isPresent()) {
                HighFrequencyGrammarDoc doc = docOpt.get();
                HighFrequencyGrammar g = new HighFrequencyGrammar();
                g.setId(doc.getId());
                g.setRankNumber(doc.getRankNumber());
                g.setGrammar(doc.getGrammar());
                g.setLevel(doc.getLevel());
                g.setTotalOccurrences(doc.getTotalOccurrences());
                g.setExamCoverage(doc.getExamCoverage());
                g.setAvgPerExam(doc.getAvgPerExam());
                g.setBunpouCount(doc.getBunpouCount());
                g.setDokkaiCount(doc.getDokkaiCount());
                g.setChoukaiCount(doc.getChoukaiCount());
                g.setGoiCount(doc.getGoiCount());
                g.setPriority(doc.getPriority());
                g.setPriorityStars(doc.getPriorityStars());
                g.setFormation(doc.getFormation());
                g.setMeaning(doc.getMeaning());
                g.setExamExamplesJson(doc.getExamExamplesJson());
                g.setRecentTrend(doc.getRecentTrend());
                g.setStudyTip(doc.getStudyTip());
                return grammarRepository.save(g);
            }
        }

        List<HighFrequencyGrammarDto> dtos = loadGrammarFromClasspathJson();
        for (HighFrequencyGrammarDto d : dtos) {
            if (Objects.equals(d.getId(), grammarId) || (d.getRankNumber() != null && d.getRankNumber().longValue() == grammarId)) {
                HighFrequencyGrammar g = new HighFrequencyGrammar();
                g.setId(d.getId());
                g.setRankNumber(d.getRankNumber());
                g.setGrammar(d.getGrammar());
                g.setLevel(d.getLevel());
                g.setTotalOccurrences(d.getTotalOccurrences());
                g.setExamCoverage(d.getExamCoverage());
                g.setAvgPerExam(d.getAvgPerExam());
                g.setBunpouCount(d.getBunpouCount());
                g.setDokkaiCount(d.getDokkaiCount());
                g.setChoukaiCount(d.getChoukaiCount());
                g.setGoiCount(d.getGoiCount());
                g.setPriority(d.getPriority());
                g.setPriorityStars(d.getPriorityStars());
                g.setFormation(d.getFormation());
                g.setMeaning(d.getMeaning());
                g.setExamExamplesJson(d.getExamExamplesJson());
                g.setRecentTrend(d.getRecentTrend());
                g.setStudyTip(d.getStudyTip());
                return grammarRepository.save(g);
            }
        }

        throw new NoSuchElementException("Không tìm thấy mẫu ngữ pháp ID: " + grammarId);
    }
}
