package com.flashcard.common.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.*;

@Component
public class JlptN3DataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(JlptN3DataLoader.class);

    private final VocabularyRepository vocabularyRepository;
    private final GrammarCardRepository grammarCardRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public JlptN3DataLoader(VocabularyRepository vocabularyRepository,
                            GrammarCardRepository grammarCardRepository,
                            ObjectMapper objectMapper) {
        this.vocabularyRepository = vocabularyRepository;
        this.grammarCardRepository = grammarCardRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        importAllN3Data();
    }

    public Map<String, Object> importAllN3Data() {
        logger.info("Starting JLPT N3 Data Import from data/tổng ôn N3/data/...");
        int importedVocab = 0;
        int importedKanji = 0;
        int importedGrammar = 0;

        String[] candidateBaseDirs = {
            "data/tổng ôn N3/data",
            "../data/tổng ôn N3/data",
            "../../data/tổng ôn N3/data",
            "c:/Users/bbqdd/Documents/_my/japaneseproject/data/tổng ôn N3/data"
        };

        File baseDataDir = null;
        for (String candidate : candidateBaseDirs) {
            File dir = new File(candidate);
            if (dir.exists() && dir.isDirectory()) {
                baseDataDir = dir;
                break;
            }
        }

        if (baseDataDir == null) {
            logger.warn("Directory data/tổng ôn N3/data/ not found. Skipping N3 Course DB Seeding.");
            Map<String, Object> res = new HashMap<>();
            res.put("success", false);
            res.put("message", "Directory data/tổng ôn N3/data not found");
            return res;
        }

        File[] chapterDirs = baseDataDir.listFiles(File::isDirectory);
        if (chapterDirs == null || chapterDirs.length == 0) {
            logger.warn("No chapter directories found in {}", baseDataDir.getAbsolutePath());
            Map<String, Object> res = new HashMap<>();
            res.put("success", false);
            res.put("message", "No chapter directories found");
            return res;
        }

        Arrays.sort(chapterDirs, Comparator.comparing(File::getName));

        for (File chDir : chapterDirs) {
            File[] jsonFiles = chDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".json"));
            if (jsonFiles == null) continue;
            Arrays.sort(jsonFiles, Comparator.comparing(File::getName));

            for (File jsonFile : jsonFiles) {
                try {
                    JsonNode root = objectMapper.readTree(jsonFile);
                    int chuong = root.path("chuong").asInt(1);
                    int bai = root.path("bai").asInt(1);

                    // 1. Process Kanji (chu_han)
                    if (root.has("chu_han") && root.get("chu_han").isArray()) {
                        for (JsonNode kNode : root.get("chu_han")) {
                            String kanji = kNode.path("kanji").asText("").trim();
                            if (kanji.isEmpty()) continue;

                            String hanViet = kNode.path("han_viet").asText("").trim();
                            String nghia = kNode.path("nghia").asText("").trim();

                            List<String> tuVungList = new ArrayList<>();
                            if (kNode.has("tu_vung") && kNode.get("tu_vung").isArray()) {
                                for (JsonNode tv : kNode.get("tu_vung")) {
                                    tuVungList.add(tv.asText());
                                }
                            }

                            Optional<Vocabulary> existingOpt = vocabularyRepository.findFirstByKanji(kanji);
                            Vocabulary v = existingOpt.orElseGet(Vocabulary::new);
                            if (v.getId() == null) {
                                v.setKanji(kanji);
                                v.setHiragana(kanji);
                            }
                            if (hanViet != null && !hanViet.isEmpty()) v.setHanViet(hanViet);
                            if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                            v.setLevel("N3");
                            v.setCategory("Tổng ôn N3 - Bài " + bai);

                            if (!tuVungList.isEmpty()) {
                                try {
                                    v.setKanjiWords(objectMapper.writeValueAsString(tuVungList));
                                } catch (Exception ignored) {}
                            }

                            vocabularyRepository.save(v);
                            importedKanji++;
                        }
                    }

                    // 2. Process Vocab (tu_vung)
                    if (root.has("tu_vung") && root.get("tu_vung").isArray()) {
                        for (JsonNode vNode : root.get("tu_vung")) {
                            String tu = vNode.path("tu").asText("").trim();
                            if (tu.isEmpty()) continue;

                            String loaiTu = vNode.path("loai_tu").asText("").trim();
                            String nghia = vNode.path("nghia").asText("").trim();
                            String viDu = vNode.path("vi_du").asText("").trim();

                            Optional<Vocabulary> existingOpt = vocabularyRepository.findFirstByKanji(tu);
                            if (existingOpt.isEmpty()) {
                                existingOpt = vocabularyRepository.findFirstByHiragana(tu);
                            }
                            Vocabulary v = existingOpt.orElseGet(Vocabulary::new);

                            if (v.getId() == null) {
                                // Check if kanji or kana
                                boolean isKanji = tu.codePoints().anyMatch(Character::isIdeographic);
                                if (isKanji) {
                                    v.setKanji(tu);
                                } else {
                                    v.setHiragana(tu);
                                }
                            }

                            if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                            if (loaiTu != null && !loaiTu.isEmpty()) v.setWordType(loaiTu);
                            if (viDu != null && !viDu.isEmpty()) v.setSampleSentence(viDu);
                            v.setLevel("N3");
                            v.setCategory("Tổng ôn N3 - Bài " + bai);

                            vocabularyRepository.save(v);
                            importedVocab++;
                        }
                    }

                    // 3. Process Grammar (ngu_phap)
                    if (root.has("ngu_phap") && root.get("ngu_phap").isArray()) {
                        for (JsonNode gNode : root.get("ngu_phap")) {
                            String cauTruc = gNode.path("cau_truc").asText("").trim();
                            if (cauTruc.isEmpty()) continue;

                            String yNghia = gNode.path("y_nghia").asText("").trim();
                            String cachChia = gNode.path("cach_chia").asText("").trim();

                            List<String> viDuList = new ArrayList<>();
                            if (gNode.has("vi_du") && gNode.get("vi_du").isArray()) {
                                for (JsonNode vd : gNode.get("vi_du")) {
                                    viDuList.add(vd.asText());
                                }
                            }

                            Optional<GrammarCard> existingOpt = grammarCardRepository.findByGrammar(cauTruc);
                            GrammarCard g = existingOpt.orElseGet(GrammarCard::new);

                            g.setGrammar(cauTruc);
                            g.setMeaning(yNghia);
                            g.setFormation(cachChia);
                            g.setJlpt("N3");
                            g.setWeekName("Chương " + chuong);
                            g.setDayName("Bài " + bai);
                            g.setLessonTitle("Bài " + bai + " (Tổng ôn N3)");

                            if (!viDuList.isEmpty()) {
                                try {
                                    g.setExamples(objectMapper.writeValueAsString(viDuList));
                                } catch (Exception ignored) {}
                            }

                            grammarCardRepository.save(g);
                            importedGrammar++;
                        }
                    }

                    logger.info("Imported Chapter {} Lesson {} ({}) successfully.", chuong, bai, jsonFile.getName());
                } catch (Exception e) {
                    logger.error("Failed to import N3 data file {}: {}", jsonFile.getName(), e.getMessage());
                }
            }
        }

        logger.info("✅ JLPT N3 Data Import Finished! Imported {} Vocab, {} Kanji, {} Grammar.", importedVocab, importedKanji, importedGrammar);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("importedVocab", importedVocab);
        result.put("importedKanji", importedKanji);
        result.put("importedGrammar", importedGrammar);
        return result;
    }
}
