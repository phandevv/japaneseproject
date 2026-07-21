package com.flashcard.knowledge.controller;



import com.flashcard.knowledge.model.Conversation;
import com.flashcard.knowledge.model.ConversationCorrection;
import com.flashcard.knowledge.model.ConversationMessage;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.model.SpeakingStatistics;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import com.flashcard.knowledge.repository.SpeakingStatisticsRepository;
import com.flashcard.srs.model.GrammarReview;
import com.flashcard.srs.model.ReviewRecommendation;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.repository.GrammarReviewRepository;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import com.flashcard.knowledge.service.ConversationManager;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationManager conversationManager;
    private final VocabularyRepository vocabularyRepository;
    private final WordReviewRepository wordReviewRepository;
    private final GrammarCardRepository grammarCardRepository;
    private final GrammarReviewRepository grammarReviewRepository;
    private final SpeakingStatisticsRepository statisticsRepository;

    public ConversationController(ConversationManager conversationManager,
                                  VocabularyRepository vocabularyRepository,
                                  WordReviewRepository wordReviewRepository,
                                  GrammarCardRepository grammarCardRepository,
                                  GrammarReviewRepository grammarReviewRepository,
                                  SpeakingStatisticsRepository statisticsRepository) {
        this.conversationManager = conversationManager;
        this.vocabularyRepository = vocabularyRepository;
        this.wordReviewRepository = wordReviewRepository;
        this.grammarCardRepository = grammarCardRepository;
        this.grammarReviewRepository = grammarReviewRepository;
        this.statisticsRepository = statisticsRepository;
    }

    @GetMapping("/history")
    public ResponseEntity<List<Conversation>> getHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(conversationManager.getSessionHistory(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Conversation> getSession(@PathVariable Long id) {
        Conversation conversation = conversationManager.getSession(id);
        if (conversation == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(conversation);
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<ConversationMessage>> getMessages(@PathVariable Long id) {
        return ResponseEntity.ok(conversationManager.getSessionMessages(id));
    }

    @GetMapping("/{id}/corrections")
    public ResponseEntity<List<ConversationCorrection>> getCorrections(@PathVariable Long id) {
        return ResponseEntity.ok(conversationManager.getSessionCorrections(id));
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<ReviewRecommendation> getReport(@PathVariable Long id) {
        Optional<ReviewRecommendation> rec = conversationManager.getSessionRecommendations(id);
        return rec.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public ResponseEntity<SpeakingStatistics> getStats(@AuthenticationPrincipal User user) {
        SpeakingStatistics stats = statisticsRepository.findByUserId(user.getId())
                .orElseGet(() -> statisticsRepository.save(new SpeakingStatistics(user)));
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/knowledge/save-vocab")
    public ResponseEntity<?> saveVocabToKnowledgeBase(@AuthenticationPrincipal User user, @RequestBody SaveVocabRequest request) {
        // Check if vocabulary already exists by kanji/hiragana
        Optional<Vocabulary> existingOpt = vocabularyRepository.findByKanjiOrHiragana(request.getKanji(), request.getHiragana());
        Vocabulary vocab;
        if (existingOpt.isPresent()) {
            vocab = existingOpt.get();
        } else {
            vocab = new Vocabulary(
                    request.getKanji(),
                    request.getHiragana(),
                    null,
                    request.getMeaning(),
                    "Noun",
                    request.getLevel(),
                    "Hội thoại AI"
            );
            vocab = vocabularyRepository.save(vocab);
        }

        // Add to SRS (WordReview) if not already added
        Optional<WordReview> reviewOpt = wordReviewRepository.findByUserAndVocabulary(user, vocab);
        if (reviewOpt.isEmpty()) {
            WordReview review = new WordReview();
            review.setUser(user);
            review.setVocabulary(vocab);
            review.setNextReview(Instant.now());
            review.setIntervalDays(0);
            review.setRepetitions(0);
            review.setEaseFactor(2.5);
            wordReviewRepository.save(review);
        }

        return ResponseEntity.ok(Map.of("message", "Đã lưu từ vựng vào Thư viện cá nhân thành công!"));
    }

    @PostMapping("/knowledge/save-grammar")
    public ResponseEntity<?> saveGrammarToKnowledgeBase(@AuthenticationPrincipal User user, @RequestBody SaveGrammarRequest request) {
        // Check if grammar card already exists
        Optional<GrammarCard> existingOpt = grammarCardRepository.findByGrammar(request.getGrammar());
        GrammarCard card;
        if (existingOpt.isPresent()) {
            card = existingOpt.get();
        } else {
            card = new GrammarCard();
            card.setGrammar(request.getGrammar());
            card.setMeaning(request.getMeaning());
            card.setUsageDesc(request.getUsageDesc());
            card.setJlpt(request.getJlpt());
            card = grammarCardRepository.save(card);
        }

        // Add to SRS (GrammarReview)
        Optional<GrammarReview> reviewOpt = grammarReviewRepository.findByUserIdAndGrammarCardId(user.getId(), card.getId());
        if (reviewOpt.isEmpty()) {
            GrammarReview review = new GrammarReview();
            review.setUser(user);
            review.setGrammarCard(card);
            review.setNextReview(Instant.now());
            review.setLearned(false);
            grammarReviewRepository.save(review);
        }

        return ResponseEntity.ok(Map.of("message", "Đã lưu ngữ pháp vào Thư viện cá nhân thành công!"));
    }

    // Helper static map constructor
    private static class Map {
        static java.util.Map<String, String> of(String k, String v) {
            java.util.Map<String, String> m = new java.util.HashMap<>();
            m.put(k, v);
            return m;
        }
    }

    // Requests DTOs (without Lombok)
    public static class SaveVocabRequest {
        private String kanji;
        private String hiragana;
        private String meaning;
        private String level;

        public String getKanji() { return kanji; }
        public void setKanji(String kanji) { this.kanji = kanji; }

        public String getHiragana() { return hiragana; }
        public void setHiragana(String hiragana) { this.hiragana = hiragana; }

        public String getMeaning() { return meaning; }
        public void setMeaning(String meaning) { this.meaning = meaning; }

        public String getLevel() { return level; }
        public void setLevel(String level) { this.level = level; }
    }

    public static class SaveGrammarRequest {
        private String grammar;
        private String meaning;
        private String usageDesc;
        private String jlpt;

        public String getGrammar() { return grammar; }
        public void setGrammar(String grammar) { this.grammar = grammar; }

        public String getMeaning() { return meaning; }
        public void setMeaning(String meaning) { this.meaning = meaning; }

        public String getUsageDesc() { return usageDesc; }
        public void setUsageDesc(String usageDesc) { this.usageDesc = usageDesc; }

        public String getJlpt() { return jlpt; }
        public void setJlpt(String jlpt) { this.jlpt = jlpt; }
    }
}

