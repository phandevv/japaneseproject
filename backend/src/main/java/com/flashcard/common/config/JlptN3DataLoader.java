package com.flashcard.common.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.provider.KnowledgeDataProvider;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.InputStream;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;

@Component
public class JlptN3DataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(JlptN3DataLoader.class);

    @Value("${app.data.load.jlpt-n3:true}")
    private boolean enabled;

    private final VocabularyDataProvider vocabularyDataProvider;
    private final KnowledgeDataProvider knowledgeDataProvider;
    private final SrsDataProvider srsDataProvider;
    private final ObjectMapper objectMapper;

    @Autowired
    public JlptN3DataLoader(VocabularyDataProvider vocabularyDataProvider,
                            KnowledgeDataProvider knowledgeDataProvider,
                            SrsDataProvider srsDataProvider,
                            ObjectMapper objectMapper) {
        this.vocabularyDataProvider = vocabularyDataProvider;
        this.knowledgeDataProvider = knowledgeDataProvider;
        this.srsDataProvider = srsDataProvider;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!enabled) {
            logger.info("JLPT N3 startup loader is disabled via config.");
            return;
        }
        if (vocabularyDataProvider.findByCategory("N3_COURSE").size() > 0) {
            logger.info("JLPT N3 Course data already loaded. Skipping startup import.");
            return;
        }
        importAllN3Data();
    }

    public static File findN3DataDirectory() {
        String[] candidatePaths = {
            "data/tổng ôn N3/data",
            "data/tong on N3/data",
            "../data/tổng ôn N3/data",
            "../../data/tổng ôn N3/data",
            "c:/Users/bbqdd/Documents/_my/japaneseproject/data/tổng ôn N3/data"
        };

        for (String path : candidatePaths) {
            File dir = new File(path);
            if (dir.exists() && dir.isDirectory()) {
                return dir;
            }
        }

        // Dynamic search roots
        File[] searchRoots = { new File("."), new File(".."), new File("data") };
        for (File root : searchRoots) {
            if (!root.exists() || !root.isDirectory()) continue;
            File[] subDirs = root.listFiles();
            if (subDirs == null) continue;

            for (File sub : subDirs) {
                String name = sub.getName().toLowerCase();
                if (sub.isDirectory() && (name.contains("n3") || name.contains("tổng ôn") || name.contains("tong on"))) {
                    File nestedData = new File(sub, "data");
                    if (nestedData.exists() && nestedData.isDirectory()) {
                        return nestedData;
                    }
                    return sub;
                }
            }
        }
        return null;
    }

    public Map<String, Object> importAllN3Data() {
        logger.info("Starting JLPT N3 Data Import into Database...");
        int importedVocab = 0;
        int importedKanji = 0;
        int importedGrammar = 0;

        List<JsonNode> jsonNodesToProcess = new ArrayList<>();

        // Strategy 1: Try reading from filesystem
        File baseDataDir = findN3DataDirectory();
        if (baseDataDir != null) {
            logger.info("Found filesystem directory at: {}", baseDataDir.getAbsolutePath());
            File[] chapterDirs = baseDataDir.listFiles(File::isDirectory);
            if (chapterDirs != null) {
                Arrays.sort(chapterDirs, Comparator.comparing(File::getName));
                for (File chDir : chapterDirs) {
                    File[] jsonFiles = chDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".json"));
                    if (jsonFiles == null) continue;
                    Arrays.sort(jsonFiles, Comparator.comparing(File::getName));

                    for (File jsonFile : jsonFiles) {
                        try {
                            JsonNode root = objectMapper.readTree(jsonFile);
                            jsonNodesToProcess.add(root);
                        } catch (Exception e) {
                            logger.error("Failed to parse JSON file {}: {}", jsonFile.getName(), e.getMessage());
                        }
                    }
                }
            }
        }

        // Strategy 2: Fallback to Classpath Resources if filesystem search returned nothing
        if (jsonNodesToProcess.isEmpty()) {
            logger.info("Reading JLPT N3 data from Classpath resources (data/n3/)...");
            for (int c = 1; c <= 9; c++) {
                for (int l = 1; l <= 3; l++) {
                    String resourcePath = String.format("data/n3/Chuong %d/Chuong%d_Bai%d_Data.json", c, c, l);
                    try {
                        ClassPathResource res = new ClassPathResource(resourcePath);
                        if (res.exists()) {
                            try (InputStream is = res.getInputStream()) {
                                JsonNode root = objectMapper.readTree(is);
                                jsonNodesToProcess.add(root);
                            }
                        }
                    } catch (Exception e) {
                        logger.debug("Resource {} not found: {}", resourcePath, e.getMessage());
                    }
                }
            }
        }

        if (jsonNodesToProcess.isEmpty()) {
            logger.warn("No JLPT N3 data files found in filesystem or classpath.");
            Map<String, Object> res = new HashMap<>();
            res.put("success", false);
            res.put("message", "Không tìm thấy tệp dữ liệu N3 nào để import");
            return res;
        }

        // Process all collected JSON roots
        for (JsonNode root : jsonNodesToProcess) {
            int chuong = root.path("chuong").asInt(1);
            int bai = root.path("bai").asInt(1);

            String vocabCategory = "Tổng ôn N3 - Chương " + chuong + " Bài " + bai;
            String kanjiCategory = "Tổng ôn N3 - Chương " + chuong + " Bài " + bai + " - Kanji";

            // Clean up any old stale data for this specific category before importing afresh
            List<Vocabulary> oldVocab = vocabularyDataProvider.findByCategory(vocabCategory);
            if (oldVocab != null && !oldVocab.isEmpty()) {
                srsDataProvider.deleteWordReviewsByVocabularies(oldVocab);
                vocabularyDataProvider.deleteAll(oldVocab);
            }
            List<Vocabulary> oldKanji = vocabularyDataProvider.findByCategory(kanjiCategory);
            if (oldKanji != null && !oldKanji.isEmpty()) {
                srsDataProvider.deleteWordReviewsByVocabularies(oldKanji);
                vocabularyDataProvider.deleteAll(oldKanji);
            }

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

                    Optional<Vocabulary> existingOpt = vocabularyDataProvider.findFirstByKanjiAndCategory(kanji, kanjiCategory);
                    Vocabulary v = existingOpt.orElseGet(Vocabulary::new);
                    v.setKanji(kanji);
                    if (v.getHiragana() == null || v.getHiragana().isEmpty()) {
                        v.setHiragana(kanji);
                    }
                    if (hanViet != null && !hanViet.isEmpty()) v.setHanViet(hanViet);
                    if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                    v.setWordType("KANJI");
                    v.setLevel("N3_COURSE");
                    v.setCategory(kanjiCategory);

                    if (!tuVungList.isEmpty()) {
                        try {
                            v.setKanjiWords(objectMapper.writeValueAsString(tuVungList));
                        } catch (Exception ignored) {}
                    }

                    vocabularyDataProvider.save(v);
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

                    Optional<Vocabulary> existingOpt = vocabularyDataProvider.findFirstByKanjiAndCategory(tu, vocabCategory);
                    if (existingOpt.isEmpty()) {
                        existingOpt = vocabularyDataProvider.findFirstByHiraganaAndCategory(tu, vocabCategory);
                    }
                    Vocabulary v = existingOpt.orElseGet(Vocabulary::new);

                    boolean isKanji = tu.codePoints().anyMatch(Character::isIdeographic);
                    if (isKanji) {
                        v.setKanji(tu);
                        if (v.getHiragana() == null || v.getHiragana().isEmpty()) {
                            v.setHiragana(tu);
                        }
                    } else {
                        v.setHiragana(tu);
                        if (v.getKanji() == null || v.getKanji().isEmpty()) {
                            v.setKanji(tu);
                        }
                    }

                    if (nghia != null && !nghia.isEmpty()) v.setMeaning(nghia);
                    v.setWordType(loaiTu != null && !loaiTu.isEmpty() && !"KANJI".equalsIgnoreCase(loaiTu) ? loaiTu : "N");
                    if (viDu != null && !viDu.isEmpty()) v.setSampleSentence(viDu);
                    v.setLevel("N3_COURSE");
                    v.setCategory(vocabCategory);

                    vocabularyDataProvider.save(v);
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

                    Optional<GrammarCard> existingOpt = knowledgeDataProvider.findGrammarByGrammar(cauTruc);
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

                    knowledgeDataProvider.saveGrammar(g);
                    importedGrammar++;
                }
            }

            logger.info("Imported Chapter {} Lesson {} into DB successfully.", chuong, bai);
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
