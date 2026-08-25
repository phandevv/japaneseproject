package com.flashcard.srs.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.repository.mongo.GrammarCardMongoRepository;
import com.flashcard.srs.document.*;
import com.flashcard.srs.model.*;
import com.flashcard.srs.repository.mongo.*;
import com.flashcard.user.document.UserDoc;
import com.flashcard.user.model.User;
import com.flashcard.user.repository.mongo.UserMongoRepository;
import com.flashcard.vocabulary.document.VocabularyDoc;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyMongoDataProvider;
import com.flashcard.vocabulary.repository.mongo.VocabularyMongoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.GroupOperation;
import org.springframework.data.mongodb.core.aggregation.MatchOperation;
import org.springframework.data.mongodb.core.aggregation.SortOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class SrsMongoDataProvider implements SrsDataProvider {

    private final WordReviewMongoRepository wordReviewMongoRepository;
    private final GrammarReviewMongoRepository grammarReviewMongoRepository;
    private final ReviewLogMongoRepository reviewLogMongoRepository;
    private final StudySessionMongoRepository studySessionMongoRepository;
    private final DailyStudyStatsMongoRepository dailyStudyStatsMongoRepository;
    private final VocabularyMongoRepository vocabularyMongoRepository;
    private final UserMongoRepository userMongoRepository;
    private final GrammarCardMongoRepository grammarCardMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final MongoTemplate mongoTemplate;
    private final VocabularyMongoDataProvider vocabularyMongoDataProvider;

    @Autowired
    public SrsMongoDataProvider(WordReviewMongoRepository wordReviewMongoRepository,
                                GrammarReviewMongoRepository grammarReviewMongoRepository,
                                ReviewLogMongoRepository reviewLogMongoRepository,
                                StudySessionMongoRepository studySessionMongoRepository,
                                DailyStudyStatsMongoRepository dailyStudyStatsMongoRepository,
                                VocabularyMongoRepository vocabularyMongoRepository,
                                UserMongoRepository userMongoRepository,
                                GrammarCardMongoRepository grammarCardMongoRepository,
                                SequenceGeneratorService sequenceGeneratorService,
                                MongoTemplate mongoTemplate,
                                VocabularyMongoDataProvider vocabularyMongoDataProvider) {
        this.wordReviewMongoRepository = wordReviewMongoRepository;
        this.grammarReviewMongoRepository = grammarReviewMongoRepository;
        this.reviewLogMongoRepository = reviewLogMongoRepository;
        this.studySessionMongoRepository = studySessionMongoRepository;
        this.dailyStudyStatsMongoRepository = dailyStudyStatsMongoRepository;
        this.vocabularyMongoRepository = vocabularyMongoRepository;
        this.userMongoRepository = userMongoRepository;
        this.grammarCardMongoRepository = grammarCardMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
        this.mongoTemplate = mongoTemplate;
        this.vocabularyMongoDataProvider = vocabularyMongoDataProvider;
    }

    @Override
    public Optional<WordReview> findByUserAndVocabulary(User user, Vocabulary vocabulary) {
        if (user == null || user.getId() == null || vocabulary == null || vocabulary.getId() == null) {
            return Optional.empty();
        }
        return wordReviewMongoRepository.findByUserIdAndVocabularyId(user.getId(), vocabulary.getId())
                .map(doc -> toWordReview(doc, user, vocabulary));
    }

    @Override
    public List<WordReview> findDueWordReviews(User user, Instant time) {
        List<WordReviewDoc> docs = wordReviewMongoRepository.findByUserIdAndNextReviewBefore(user.getId(), time);
        return hydrateWordReviews(docs, user);
    }

    @Override
    public long countDueWordReviews(User user, Instant time) {
        return wordReviewMongoRepository.countByUserIdAndNextReviewBefore(user.getId(), time);
    }

    @Override
    public long countLearnedWords(User user) {
        return wordReviewMongoRepository.countByUserIdAndIntervalDaysGreaterThan(user.getId(), 0);
    }

    private Map<Long, UserDoc> getUserMap(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return Collections.emptyMap();
        List<UserDoc> users = userMongoRepository.findAllById(userIds);
        Map<Long, UserDoc> map = new HashMap<>();
        for (UserDoc u : users) {
            if (u.getId() != null) map.put(u.getId(), u);
        }
        return map;
    }

    private String formatAvatar(UserDoc user) {
        if (user == null || user.getAvatar() == null) return null;
        String av = user.getAvatar().trim();
        if (av.isEmpty()) return null;
        if (av.startsWith("data:image") || av.length() > 50) {
            return "/api/users/" + user.getUsername() + "/avatar";
        }
        return av;
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "leaderboard", key = "'learned'")
    public List<Map<String, Object>> getLearnedLeaderboard(Pageable pageable) {
        MatchOperation match = Aggregation.match(Criteria.where("intervalDays").gt(0));
        GroupOperation group = Aggregation.group("userId").count().as("learnedCount");
        SortOperation sort = Aggregation.sort(org.springframework.data.domain.Sort.Direction.DESC, "learnedCount");
        Aggregation agg = Aggregation.newAggregation(match, group, sort, Aggregation.skip(pageable.getOffset()), Aggregation.limit(pageable.getPageSize()));

        AggregationResults<Map> results = mongoTemplate.aggregate(agg, "word_reviews", Map.class);
        List<Map<String, Object>> leaderboard = new ArrayList<>();
        List<Long> userIds = new ArrayList<>();

        for (Map row : results.getMappedResults()) {
            Number userIdNum = (Number) row.get("_id");
            if (userIdNum != null) {
                userIds.add(userIdNum.longValue());
            }
        }

        Map<Long, UserDoc> userMap = getUserMap(userIds);

        for (Map row : results.getMappedResults()) {
            Number userIdNum = (Number) row.get("_id");
            Number learnedCountNum = (Number) row.get("learnedCount");
            if (userIdNum != null) {
                Long uid = userIdNum.longValue();
                UserDoc user = userMap.get(uid);
                Map<String, Object> entry = new HashMap<>();
                entry.put("username", user != null ? user.getUsername() : "User_" + uid);
                entry.put("avatar", formatAvatar(user));
                entry.put("learnedCount", learnedCountNum != null ? learnedCountNum.longValue() : 0L);
                leaderboard.add(entry);
            }
        }
        return leaderboard;
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "leaderboard", key = "'today_' + #date.toString()")
    public List<Map<String, Object>> getTodayLeaderboard(LocalDate date, Pageable pageable) {
        List<Map<String, Object>> leaderboard = new ArrayList<>();

        List<StudySessionDoc> allSessions = studySessionMongoRepository.findAll();
        Map<Long, Integer> userTodayWords = new HashMap<>();

        for (StudySessionDoc s : allSessions) {
            if (s.getUserId() != null && s.getStudyDate() != null && s.getStudyDate().equals(date) && s.getWordsStudied() > 0) {
                userTodayWords.merge(s.getUserId(), s.getWordsStudied(), Math::max);
            }
        }

        if (!userTodayWords.isEmpty()) {
            Map<Long, UserDoc> userMap = getUserMap(userTodayWords.keySet());
            List<Map.Entry<Long, Integer>> sortedEntries = new ArrayList<>(userTodayWords.entrySet());
            sortedEntries.sort((a, b) -> Integer.compare(b.getValue(), a.getValue()));

            for (Map.Entry<Long, Integer> entry : sortedEntries) {
                Long uid = entry.getKey();
                UserDoc user = userMap.get(uid);
                Map<String, Object> map = new HashMap<>();
                map.put("username", user != null ? user.getUsername() : "User_" + uid);
                map.put("avatar", formatAvatar(user));
                map.put("wordsStudied", entry.getValue());
                leaderboard.add(map);
            }
        }
        return leaderboard.stream().limit(pageable.getPageSize()).collect(Collectors.toList());
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "leaderboard", key = "'streak'")
    public List<Map<String, Object>> getStreakLeaderboard(Pageable pageable) {
        List<UserDoc> users = userMongoRepository.findAll();
        List<StudySessionDoc> allSessions = studySessionMongoRepository.findAll();
        Map<Long, List<StudySessionDoc>> userSessionsMap = new HashMap<>();

        for (StudySessionDoc s : allSessions) {
            if (s.getUserId() != null) {
                userSessionsMap.computeIfAbsent(s.getUserId(), k -> new ArrayList<>()).add(s);
            }
        }

        List<Map<String, Object>> streakList = new ArrayList<>();
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate yesterday = today.minusDays(1);

        for (UserDoc u : users) {
            List<StudySessionDoc> sessions = userSessionsMap.getOrDefault(u.getId(), Collections.emptyList());
            Set<LocalDate> dateSet = new HashSet<>();
            for (StudySessionDoc s : sessions) {
                if (s.getStudyDate() != null) {
                    dateSet.add(s.getStudyDate());
                }
            }

            if (dateSet.isEmpty()) {
                continue;
            }

            int streak = 0;
            LocalDate checkDate = today;
            if (!dateSet.contains(checkDate)) {
                checkDate = yesterday;
            }
            while (dateSet.contains(checkDate)) {
                streak++;
                checkDate = checkDate.minusDays(1);
            }

            if (streak > 0) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("username", u.getUsername());
                entry.put("avatar", formatAvatar(u));
                entry.put("streak", streak);
                streakList.add(entry);
            }
        }

        streakList.sort((a, b) -> Integer.compare((Integer) b.get("streak"), (Integer) a.get("streak")));
        return streakList.stream().limit(pageable.getPageSize()).collect(Collectors.toList());
    }

    @Override
    public List<WordReview> findAllLearnedByUser(User user) {
        List<WordReviewDoc> docs = wordReviewMongoRepository.findByUserIdAndIntervalDaysGreaterThan(user.getId(), 0);
        return hydrateWordReviews(docs, user);
    }

    @Override
    public List<Vocabulary> findLearnedVocabulariesByUser(User user, Pageable pageable) {
        List<WordReviewDoc> docs = wordReviewMongoRepository.findByUserIdAndIntervalDaysGreaterThan(user.getId(), 0);
        List<Long> vocabIds = docs.stream().map(WordReviewDoc::getVocabularyId).collect(Collectors.toList());
        if (vocabIds.isEmpty()) return Collections.emptyList();

        List<VocabularyDoc> vocabDocs = vocabularyMongoRepository.findAllById(vocabIds);
        return vocabDocs.stream().map(vocabularyMongoDataProvider::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<WordReview> findAllByUser(User user) {
        List<WordReviewDoc> docs = wordReviewMongoRepository.findByUserId(user.getId());
        return hydrateWordReviews(docs, user);
    }

    @Override
    public long countUniqueReviewedToday(User user, Instant start, Instant end) {
        return wordReviewMongoRepository.countUniqueReviewedToday(user.getId(), start, end);
    }

    @Override
    public Page<WordReview> findByUserAndLastReviewedAtBetween(User user, Instant start, Instant end, Pageable pageable) {
        Page<WordReviewDoc> docPage = wordReviewMongoRepository.findByUserIdAndLastReviewedAtBetween(user.getId(), start, end, pageable);
        List<WordReview> list = hydrateWordReviews(docPage.getContent(), user);
        return new PageImpl<>(list, pageable, docPage.getTotalElements());
    }

    @Override
    public Page<WordReview> findByUserAndLastReviewedAtBetweenAndRatingIn(User user, Instant start, Instant end, List<Integer> ratings, Pageable pageable) {
        Page<WordReviewDoc> docPage = wordReviewMongoRepository.findByUserIdAndLastReviewedAtBetweenAndLastRatingIn(user.getId(), start, end, ratings, pageable);
        List<WordReview> list = hydrateWordReviews(docPage.getContent(), user);
        return new PageImpl<>(list, pageable, docPage.getTotalElements());
    }

    @Override
    public List<WordReview> findMorningReviewQueue(User user, Instant dueThreshold, Instant yesterdayStart, Instant yesterdayEnd) {
        List<WordReviewDoc> docs = wordReviewMongoRepository.findMorningReviewQueue(user.getId(), dueThreshold, yesterdayStart, yesterdayEnd);
        return hydrateWordReviews(docs, user);
    }

    @Override
    public WordReview saveWordReview(WordReview wr) {
        WordReviewDoc doc;
        if (wr.getId() == null) {
            wr.setId(sequenceGeneratorService.generateSequence("word_reviews_seq"));
            doc = toWordReviewDoc(wr);
        } else {
            doc = wordReviewMongoRepository.findById(wr.getId()).orElseGet(() -> toWordReviewDoc(wr));
            updateDocFromWordReview(doc, wr);
        }
        WordReviewDoc saved = wordReviewMongoRepository.save(doc);
        return toWordReview(saved, wr.getUser(), wr.getVocabulary());
    }

    @Override
    public List<WordReview> saveAllWordReviews(List<WordReview> reviews) {
        if (reviews == null || reviews.isEmpty()) return Collections.emptyList();
        List<WordReviewDoc> docs = new ArrayList<>();
        for (WordReview wr : reviews) {
            WordReviewDoc doc;
            if (wr.getId() == null) {
                wr.setId(sequenceGeneratorService.generateSequence("word_reviews_seq"));
                doc = toWordReviewDoc(wr);
            } else {
                doc = wordReviewMongoRepository.findById(wr.getId()).orElseGet(() -> toWordReviewDoc(wr));
                updateDocFromWordReview(doc, wr);
            }
            docs.add(doc);
        }
        List<WordReviewDoc> saved = wordReviewMongoRepository.saveAll(docs);
        List<WordReview> result = new ArrayList<>();
        for (int i = 0; i < saved.size(); i++) {
            WordReview wr = reviews.get(i);
            result.add(toWordReview(saved.get(i), wr.getUser(), wr.getVocabulary()));
        }
        return result;
    }

    @Override
    public void saveReviewLog(ReviewLog log) {
        if (log.getId() == null) {
            log.setId(sequenceGeneratorService.generateSequence("review_logs_seq"));
        }
        ReviewLogDoc doc = ReviewLogDoc.builder()
                .id(log.getId())
                .wordReviewId(log.getWordReview() != null ? log.getWordReview().getId() : null)
                .rating(log.getRating())
                .stateBefore(log.getStateBefore())
                .stateAfter(log.getStateAfter())
                .difficultyBefore(log.getDifficultyBefore())
                .difficultyAfter(log.getDifficultyAfter())
                .stabilityBefore(log.getStabilityBefore())
                .stabilityAfter(log.getStabilityAfter())
                .durationMs(log.getDurationMs())
                .createdAt(log.getCreatedAt() != null ? log.getCreatedAt() : Instant.now())
                .build();
        reviewLogMongoRepository.save(doc);
    }

    @Override
    public void deleteWordReview(WordReview review) {
        if (review != null && review.getId() != null) {
            wordReviewMongoRepository.deleteById(review.getId());
        }
    }

    @Override
    public void deleteWordReviewsByVocabularies(List<Vocabulary> vocabularies) {
        List<Long> ids = vocabularies.stream().map(Vocabulary::getId).collect(Collectors.toList());
        wordReviewMongoRepository.deleteByVocabularyIdIn(ids);
    }

    @Override
    public Optional<GrammarReview> findGrammarReview(Long userId, Long grammarId) {
        return grammarReviewMongoRepository.findByUserIdAndGrammarCardId(userId, grammarId)
                .map(doc -> toGrammarReview(doc, userId));
    }

    @Override
    public List<GrammarReview> findGrammarReviewsByUser(Long userId) {
        List<GrammarReviewDoc> docs = grammarReviewMongoRepository.findByUserId(userId);
        return docs.stream().map(doc -> toGrammarReview(doc, userId)).collect(Collectors.toList());
    }

    @Override
    public GrammarReview saveGrammarReview(GrammarReview gr) {
        GrammarReviewDoc doc;
        if (gr.getId() == null) {
            gr.setId(sequenceGeneratorService.generateSequence("grammar_reviews_seq"));
            doc = toGrammarReviewDoc(gr);
        } else {
            doc = grammarReviewMongoRepository.findById(gr.getId()).orElseGet(() -> toGrammarReviewDoc(gr));
            updateDocFromGrammarReview(doc, gr);
        }
        GrammarReviewDoc saved = grammarReviewMongoRepository.save(doc);
        return toGrammarReview(saved, gr.getUser() != null ? gr.getUser().getId() : null);
    }

    @Override
    public void deleteGrammarReview(GrammarReview review) {
        if (review != null && review.getId() != null) {
            grammarReviewMongoRepository.deleteById(review.getId());
        }
    }

    @Override
    public Optional<StudySession> findStudySession(User user, LocalDate date) {
        if (user == null || user.getId() == null || date == null) return Optional.empty();
        List<StudySessionDoc> docs = studySessionMongoRepository.findByUserIdOrderByStudyDateDesc(user.getId());
        return docs.stream()
                .filter(d -> d.getStudyDate() != null && d.getStudyDate().equals(date))
                .findFirst()
                .map(doc -> toStudySession(doc, user));
    }

    @Override
    public StudySession saveStudySession(StudySession session) {
        StudySessionDoc doc;
        if (session.getId() == null) {
            Optional<StudySessionDoc> existing = Optional.empty();
            if (session.getUser() != null && session.getUser().getId() != null && session.getStudyDate() != null) {
                List<StudySessionDoc> userDocs = studySessionMongoRepository.findByUserIdOrderByStudyDateDesc(session.getUser().getId());
                existing = userDocs.stream()
                        .filter(d -> d.getStudyDate() != null && d.getStudyDate().equals(session.getStudyDate()))
                        .findFirst();
            }
            if (existing.isPresent()) {
                doc = existing.get();
                session.setId(doc.getId());
                updateDocFromStudySession(doc, session);
            } else {
                session.setId(sequenceGeneratorService.generateSequence("study_sessions_seq"));
                doc = toStudySessionDoc(session);
            }
        } else {
            doc = studySessionMongoRepository.findById(session.getId()).orElseGet(() -> toStudySessionDoc(session));
            updateDocFromStudySession(doc, session);
        }
        StudySessionDoc saved = studySessionMongoRepository.save(doc);
        return toStudySession(saved, session.getUser());
    }

    @Override
    public List<StudySession> findStudySessionsBetween(User user, LocalDate start, LocalDate end) {
        if (user == null || user.getId() == null) return Collections.emptyList();
        List<StudySessionDoc> docs = studySessionMongoRepository.findByUserIdOrderByStudyDateDesc(user.getId());
        return docs.stream()
                .map(doc -> toStudySession(doc, user))
                .filter(s -> s != null && s.getStudyDate() != null
                        && !s.getStudyDate().isBefore(start)
                        && !s.getStudyDate().isAfter(end))
                .sorted(Comparator.comparing(StudySession::getStudyDate))
                .collect(Collectors.toList());
    }

    @Override
    public List<StudySession> findAllStudySessions(User user) {
        if (user == null || user.getId() == null) return Collections.emptyList();
        List<StudySessionDoc> docs = studySessionMongoRepository.findByUserIdOrderByStudyDateDesc(user.getId());
        return docs.stream().map(doc -> toStudySession(doc, user)).collect(Collectors.toList());
    }

    @Override
    public Optional<DailyStudyStats> findDailyStats(User user, LocalDate date) {
        return dailyStudyStatsMongoRepository.findByUserIdAndDate(user.getId(), date)
                .map(doc -> toDailyStudyStats(doc, user));
    }

    @Override
    public DailyStudyStats saveDailyStats(DailyStudyStats stats) {
        DailyStudyStatsDoc doc;
        if (stats.getId() == null) {
            stats.setId(sequenceGeneratorService.generateSequence("daily_study_stats_seq"));
            doc = toDailyStatsDoc(stats);
        } else {
            doc = dailyStudyStatsMongoRepository.findById(stats.getId()).orElseGet(() -> toDailyStatsDoc(stats));
            updateDocFromDailyStats(doc, stats);
        }
        DailyStudyStatsDoc saved = dailyStudyStatsMongoRepository.save(doc);
        return toDailyStudyStats(saved, stats.getUser());
    }

    @Override
    public List<DailyStudyStats> findDailyStatsBetween(User user, LocalDate start, LocalDate end) {
        List<DailyStudyStatsDoc> docs = dailyStudyStatsMongoRepository.findByUserIdAndDateBetweenOrderByDateAsc(user.getId(), start, end);
        return docs.stream().map(doc -> toDailyStudyStats(doc, user)).collect(Collectors.toList());
    }

    // Hydration Helpers
    private List<WordReview> hydrateWordReviews(List<WordReviewDoc> docs, User user) {
        if (docs.isEmpty()) return Collections.emptyList();
        List<Long> vocabIds = docs.stream().map(WordReviewDoc::getVocabularyId).collect(Collectors.toList());
        Map<Long, Vocabulary> vocabMap = vocabularyMongoRepository.findAllById(vocabIds).stream()
                .map(vocabularyMongoDataProvider::toEntity)
                .collect(Collectors.toMap(Vocabulary::getId, v -> v));

        List<WordReview> list = new ArrayList<>();
        for (WordReviewDoc doc : docs) {
            Vocabulary v = vocabMap.get(doc.getVocabularyId());
            list.add(toWordReview(doc, user, v));
        }
        return list;
    }

    private WordReview toWordReview(WordReviewDoc doc, User user, Vocabulary vocab) {
        if (doc == null) return null;
        WordReview wr = new WordReview(user, vocab);
        wr.setId(doc.getId());
        wr.setState(doc.getState());
        wr.setDifficulty(doc.getDifficulty());
        wr.setStability(doc.getStability());
        wr.setEaseFactor(doc.getEaseFactor());
        wr.setIntervalDays(doc.getIntervalDays());
        wr.setRepetitions(doc.getRepetitions());
        wr.setReviewCount(doc.getReviewCount());
        wr.setCorrectCount(doc.getCorrectCount());
        wr.setWrongCount(doc.getWrongCount());
        wr.setConsecutiveCorrect(doc.getConsecutiveCorrect());
        wr.setNextReview(doc.getNextReview());
        wr.setLastReviewedAt(doc.getLastReviewedAt());
        wr.setLastRating(doc.getLastRating());
        return wr;
    }

    private WordReviewDoc toWordReviewDoc(WordReview wr) {
        return WordReviewDoc.builder()
                .id(wr.getId())
                .userId(wr.getUser() != null ? wr.getUser().getId() : null)
                .vocabularyId(wr.getVocabulary() != null ? wr.getVocabulary().getId() : null)
                .state(wr.getState())
                .difficulty(wr.getDifficulty())
                .stability(wr.getStability())
                .easeFactor(wr.getEaseFactor())
                .intervalDays(wr.getIntervalDays())
                .repetitions(wr.getRepetitions())
                .reviewCount(wr.getReviewCount())
                .correctCount(wr.getCorrectCount())
                .wrongCount(wr.getWrongCount())
                .consecutiveCorrect(wr.getConsecutiveCorrect())
                .nextReview(wr.getNextReview())
                .lastReviewedAt(wr.getLastReviewedAt())
                .lastRating(wr.getLastRating())
                .build();
    }

    private void updateDocFromWordReview(WordReviewDoc doc, WordReview wr) {
        doc.setUserId(wr.getUser() != null ? wr.getUser().getId() : null);
        doc.setVocabularyId(wr.getVocabulary() != null ? wr.getVocabulary().getId() : null);
        doc.setState(wr.getState());
        doc.setDifficulty(wr.getDifficulty());
        doc.setStability(wr.getStability());
        doc.setEaseFactor(wr.getEaseFactor());
        doc.setIntervalDays(wr.getIntervalDays());
        doc.setRepetitions(wr.getRepetitions());
        doc.setReviewCount(wr.getReviewCount());
        doc.setCorrectCount(wr.getCorrectCount());
        doc.setWrongCount(wr.getWrongCount());
        doc.setConsecutiveCorrect(wr.getConsecutiveCorrect());
        doc.setNextReview(wr.getNextReview());
        doc.setLastReviewedAt(wr.getLastReviewedAt());
        doc.setLastRating(wr.getLastRating());
    }

    private GrammarReview toGrammarReview(GrammarReviewDoc doc, Long userId) {
        if (doc == null) return null;
        GrammarReview gr = new GrammarReview();
        gr.setId(doc.getId());
        gr.setEaseFactor(doc.getEaseFactor());
        gr.setIntervalDays(doc.getIntervalDays());
        gr.setRepetitions(doc.getRepetitions());
        gr.setNextReview(doc.getNextReview());
        gr.setLearned(doc.isLearned());
        if (doc.getGrammarCardId() != null) {
            grammarCardMongoRepository.findById(doc.getGrammarCardId()).ifPresent(gDoc -> {
                GrammarCard card = new GrammarCard();
                card.setId(gDoc.getId());
                card.setGrammar(gDoc.getGrammar());
                card.setMeaning(gDoc.getMeaning());
                card.setJlpt(gDoc.getJlpt());
                gr.setGrammarCard(card);
            });
        }
        return gr;
    }

    private GrammarReviewDoc toGrammarReviewDoc(GrammarReview gr) {
        return GrammarReviewDoc.builder()
                .id(gr.getId())
                .userId(gr.getUser() != null ? gr.getUser().getId() : null)
                .grammarCardId(gr.getGrammarCard() != null ? gr.getGrammarCard().getId() : null)
                .easeFactor(gr.getEaseFactor())
                .intervalDays(gr.getIntervalDays())
                .repetitions(gr.getRepetitions())
                .nextReview(gr.getNextReview())
                .isLearned(gr.isLearned())
                .build();
    }

    private void updateDocFromGrammarReview(GrammarReviewDoc doc, GrammarReview gr) {
        doc.setUserId(gr.getUser() != null ? gr.getUser().getId() : null);
        doc.setGrammarCardId(gr.getGrammarCard() != null ? gr.getGrammarCard().getId() : null);
        doc.setEaseFactor(gr.getEaseFactor());
        doc.setIntervalDays(gr.getIntervalDays());
        doc.setRepetitions(gr.getRepetitions());
        doc.setNextReview(gr.getNextReview());
        doc.setLearned(gr.isLearned());
    }

    private StudySession toStudySession(StudySessionDoc doc, User user) {
        if (doc == null) return null;
        StudySession s = new StudySession(user, doc.getStudyDate());
        s.setId(doc.getId());
        s.setWordsStudied(doc.getWordsStudied());
        s.setCorrectAnswers(doc.getCorrectAnswers());
        s.setTotalQuestions(doc.getTotalQuestions());
        s.setStreakFrozen(doc.isStreakFrozen());
        return s;
    }

    private StudySessionDoc toStudySessionDoc(StudySession s) {
        return StudySessionDoc.builder()
                .id(s.getId())
                .userId(s.getUser() != null ? s.getUser().getId() : null)
                .studyDate(s.getStudyDate())
                .wordsStudied(s.getWordsStudied())
                .correctAnswers(s.getCorrectAnswers())
                .totalQuestions(s.getTotalQuestions())
                .streakFrozen(s.isStreakFrozen())
                .build();
    }

    private void updateDocFromStudySession(StudySessionDoc doc, StudySession s) {
        doc.setUserId(s.getUser() != null ? s.getUser().getId() : null);
        doc.setStudyDate(s.getStudyDate());
        doc.setWordsStudied(s.getWordsStudied());
        doc.setCorrectAnswers(s.getCorrectAnswers());
        doc.setTotalQuestions(s.getTotalQuestions());
        doc.setStreakFrozen(s.isStreakFrozen());
    }

    private DailyStudyStats toDailyStudyStats(DailyStudyStatsDoc doc, User user) {
        if (doc == null) return null;
        DailyStudyStats d = new DailyStudyStats(user, doc.getDate());
        d.setId(doc.getId());
        d.setNewWordsStudied(doc.getNewWordsStudied());
        d.setWordsReviewed(doc.getWordsReviewed());
        d.setRetentionRate(doc.getRetentionRate());
        d.setLearningTimeMs(doc.getLearningTimeMs());
        return d;
    }

    private DailyStudyStatsDoc toDailyStatsDoc(DailyStudyStats d) {
        return DailyStudyStatsDoc.builder()
                .id(d.getId())
                .userId(d.getUser() != null ? d.getUser().getId() : null)
                .date(d.getDate())
                .newWordsStudied(d.getNewWordsStudied())
                .wordsReviewed(d.getWordsReviewed())
                .retentionRate(d.getRetentionRate())
                .learningTimeMs(d.getLearningTimeMs())
                .build();
    }

    private void updateDocFromDailyStats(DailyStudyStatsDoc doc, DailyStudyStats d) {
        doc.setUserId(d.getUser() != null ? d.getUser().getId() : null);
        doc.setDate(d.getDate());
        doc.setNewWordsStudied(d.getNewWordsStudied());
        doc.setWordsReviewed(d.getWordsReviewed());
        doc.setRetentionRate(d.getRetentionRate());
        doc.setLearningTimeMs(d.getLearningTimeMs());
    }
}
