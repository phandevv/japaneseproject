package com.flashcard.vocabulary.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.vocabulary.document.VocabularyDoc;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.mongo.VocabularyMongoRepository;
import com.flashcard.vocabulary.service.MongoVocabularySearchService;
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
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class VocabularyMongoDataProvider implements VocabularyDataProvider {

    private final VocabularyMongoRepository repository;
    private final MongoVocabularySearchService searchService;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public VocabularyMongoDataProvider(VocabularyMongoRepository repository,
                                       MongoVocabularySearchService searchService,
                                       SequenceGeneratorService sequenceGeneratorService,
                                       MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.searchService = searchService;
        this.sequenceGeneratorService = sequenceGeneratorService;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<Vocabulary> getAll(Pageable pageable) {
        Page<VocabularyDoc> page = repository.findAll(pageable);
        List<Vocabulary> list = page.getContent().stream().map(this::toEntity).collect(Collectors.toList());
        return new PageImpl<>(list, pageable, page.getTotalElements());
    }

    @Override
    public List<Vocabulary> getByLevel(String level) {
        return repository.findByLevel(level.toUpperCase()).stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public Page<Vocabulary> getByLevel(String level, Pageable pageable) {
        Page<VocabularyDoc> page = repository.findByLevel(level.toUpperCase(), pageable);
        List<Vocabulary> list = page.getContent().stream().map(this::toEntity).collect(Collectors.toList());
        return new PageImpl<>(list, pageable, page.getTotalElements());
    }

    @Override
    public List<Vocabulary> getByLevelAndWordType(String level, String wordType) {
        return repository.findByLevelAndWordType(level.toUpperCase(), wordType).stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<Vocabulary> getRandomByLevel(String level, int count) {
        MatchOperation match = Aggregation.match(Criteria.where("level").is(level.toUpperCase()));
        Aggregation agg = Aggregation.newAggregation(match, Aggregation.sample(count));
        AggregationResults<VocabularyDoc> results = mongoTemplate.aggregate(agg, "vocabularies", VocabularyDoc.class);
        return results.getMappedResults().stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<Vocabulary> getRandom(int count) {
        Aggregation agg = Aggregation.newAggregation(Aggregation.sample(count));
        AggregationResults<VocabularyDoc> results = mongoTemplate.aggregate(agg, "vocabularies", VocabularyDoc.class);
        return results.getMappedResults().stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public Optional<Vocabulary> getById(Long id) {
        return repository.findById(id).map(this::toEntity);
    }

    @Override
    public Optional<Vocabulary> findFirstByKanji(String kanji) {
        return repository.findFirstByKanji(kanji).map(this::toEntity);
    }

    @Override
    public Optional<Vocabulary> findFirstByHiragana(String hiragana) {
        return repository.findFirstByHiragana(hiragana).map(this::toEntity);
    }

    @Override
    public Optional<Vocabulary> findFirstByKanjiAndCategory(String kanji, String category) {
        return repository.findFirstByKanjiAndCategory(kanji, category).map(this::toEntity);
    }

    @Override
    public Optional<Vocabulary> findFirstByHiraganaAndCategory(String hiragana, String category) {
        return repository.findFirstByHiraganaAndCategory(hiragana, category).map(this::toEntity);
    }

    @Override
    public List<Vocabulary> findByCategory(String category) {
        return repository.findByCategory(category).stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public Vocabulary save(Vocabulary v) {
        VocabularyDoc doc;
        if (v.getId() == null) {
            v.setId(sequenceGeneratorService.generateSequence("vocabularies_seq"));
            doc = toDoc(v);
        } else {
            doc = repository.findById(v.getId()).orElseGet(() -> toDoc(v));
            updateDocFromEntity(doc, v);
        }
        VocabularyDoc saved = repository.save(doc);
        return toEntity(saved);
    }

    @Override
    public List<Vocabulary> saveAll(List<Vocabulary> vocabularies) {
        List<VocabularyDoc> docs = new ArrayList<>();
        for (Vocabulary v : vocabularies) {
            if (v.getId() == null) {
                v.setId(sequenceGeneratorService.generateSequence("vocabularies_seq"));
            }
            docs.add(toDoc(v));
        }
        List<VocabularyDoc> saved = repository.saveAll(docs);
        return saved.stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    @Override
    public void deleteAll(List<Vocabulary> vocabularies) {
        List<Long> ids = vocabularies.stream().map(Vocabulary::getId).collect(Collectors.toList());
        repository.deleteAllById(ids);
    }

    @Override
    public Page<Vocabulary> search(String keyword, Pageable pageable) {
        Page<VocabularyDoc> docPage = searchService.search(keyword, pageable);
        List<Vocabulary> list = docPage.getContent().stream().map(this::toEntity).collect(Collectors.toList());
        return new PageImpl<>(list, pageable, docPage.getTotalElements());
    }

    @Override
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        GroupOperation group = Aggregation.group("level").count().as("count");
        Aggregation agg = Aggregation.newAggregation(group);
        AggregationResults<Map> results = mongoTemplate.aggregate(agg, "vocabularies", Map.class);

        long total = 0;
        Map<String, Long> levelCounts = new LinkedHashMap<>();
        List<String> levelOrder = Arrays.asList("N5", "N4", "N3", "N2", "N1", "TU_LAY", "TRO_TU");
        Map<String, Long> tempMap = new HashMap<>();

        for (Map row : results.getMappedResults()) {
            String level = (String) row.get("_id");
            if (level != null) {
                Number countNum = (Number) row.get("count");
                long count = countNum != null ? countNum.longValue() : 0L;
                tempMap.put(level, count);
                total += count;
            }
        }

        for (String level : levelOrder) {
            if (tempMap.containsKey(level)) {
                levelCounts.put(level, tempMap.get(level));
            }
        }
        for (Map.Entry<String, Long> entry : tempMap.entrySet()) {
            if (!levelCounts.containsKey(entry.getKey())) {
                levelCounts.put(entry.getKey(), entry.getValue());
            }
        }

        stats.put("total", total);
        stats.put("levels", levelCounts);
        return stats;
    }

    @Override
    public long count() {
        return repository.count();
    }

    public Vocabulary toEntity(VocabularyDoc doc) {
        if (doc == null) return null;
        Vocabulary v = new Vocabulary();
        v.setId(doc.getId());
        v.setKanji(doc.getKanji());
        v.setHiragana(doc.getHiragana());
        v.setRomaji(doc.getRomaji());
        v.setHanViet(doc.getHanViet());
        v.setMeaning(doc.getMeaning());
        v.setWordType(doc.getWordType());
        v.setLevel(doc.getLevel());
        v.setCategory(doc.getCategory());
        v.setKanjiWords(doc.getKanjiWords());
        v.setSampleSentence(doc.getSampleSentence());
        v.setSampleTranslation(doc.getSampleTranslation());
        v.setSampleReading(doc.getSampleReading());
        v.setPitchAccent(doc.getPitchAccent());
        v.setSynonyms(doc.getSynonyms());
        v.setAntonyms(doc.getAntonyms());
        v.setCommonMistakes(doc.getCommonMistakes());
        v.setCollocations(doc.getCollocations());
        v.setMnemonic(doc.getMnemonic());
        v.setConversationExamples(doc.getConversationExamples());
        v.setExampleSentences(doc.getExampleSentences());
        v.setUsageGuide(doc.getUsageGuide());
        v.setOnReading(doc.getOnReading());
        v.setKunReading(doc.getKunReading());
        v.setIsEnriching(doc.getIsEnriching());
        return v;
    }

    public VocabularyDoc toDoc(Vocabulary v) {
        return VocabularyDoc.builder()
                .id(v.getId())
                .kanji(v.getKanji())
                .hiragana(v.getHiragana())
                .romaji(v.getRomaji())
                .hanViet(v.getHanViet())
                .meaning(v.getMeaning())
                .wordType(v.getWordType())
                .level(v.getLevel())
                .category(v.getCategory())
                .kanjiWords(v.getKanjiWords())
                .sampleSentence(v.getSampleSentence())
                .sampleTranslation(v.getSampleTranslation())
                .sampleReading(v.getSampleReading())
                .pitchAccent(v.getPitchAccent())
                .synonyms(v.getSynonyms())
                .antonyms(v.getAntonyms())
                .commonMistakes(v.getCommonMistakes())
                .collocations(v.getCollocations())
                .mnemonic(v.getMnemonic())
                .conversationExamples(v.getConversationExamples())
                .exampleSentences(v.getExampleSentences())
                .usageGuide(v.getUsageGuide())
                .onReading(v.getOnReading())
                .kunReading(v.getKunReading())
                .isEnriching(v.getIsEnriching())
                .build();
    }

    private void updateDocFromEntity(VocabularyDoc doc, Vocabulary v) {
        doc.setKanji(v.getKanji());
        doc.setHiragana(v.getHiragana());
        doc.setRomaji(v.getRomaji());
        doc.setHanViet(v.getHanViet());
        doc.setMeaning(v.getMeaning());
        doc.setWordType(v.getWordType());
        doc.setLevel(v.getLevel());
        doc.setCategory(v.getCategory());
        doc.setKanjiWords(v.getKanjiWords());
        doc.setSampleSentence(v.getSampleSentence());
        doc.setSampleTranslation(v.getSampleTranslation());
        doc.setSampleReading(v.getSampleReading());
        doc.setPitchAccent(v.getPitchAccent());
        doc.setSynonyms(v.getSynonyms());
        doc.setAntonyms(v.getAntonyms());
        doc.setCommonMistakes(v.getCommonMistakes());
        doc.setCollocations(v.getCollocations());
        doc.setMnemonic(v.getMnemonic());
        doc.setConversationExamples(v.getConversationExamples());
        doc.setExampleSentences(v.getExampleSentences());
        doc.setUsageGuide(v.getUsageGuide());
        doc.setOnReading(v.getOnReading());
        doc.setKunReading(v.getKunReading());
        doc.setIsEnriching(v.getIsEnriching());
    }
}
