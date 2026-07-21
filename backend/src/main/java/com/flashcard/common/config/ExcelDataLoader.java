package com.flashcard.common.config;

import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@Component
public class ExcelDataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(ExcelDataLoader.class);
    private final VocabularyRepository repository;

    public ExcelDataLoader(VocabularyRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() > 0) {
            logger.info("Data already loaded. Skipping Excel import. Total records: {}", repository.count());
            return;
        }

        // Find the xlsx file in the project root (parent of backend/)
        Path projectRoot = Paths.get(System.getProperty("user.dir")).getParent();
        File excelFile = findExcelFile(projectRoot);

        if (excelFile == null) {
            // Also try current directory
            excelFile = findExcelFile(Paths.get(System.getProperty("user.dir")));
        }

        if (excelFile == null) {
            logger.warn("Excel file not found! Searched in: {} and {}", projectRoot, System.getProperty("user.dir"));
            return;
        }

        logger.info("Loading vocabulary from: {}", excelFile.getAbsolutePath());
        loadFromExcel(excelFile);
        logger.info("Data loading complete! Total records: {}", repository.count());
    }

    private File findExcelFile(Path directory) {
        try {
            return Files.list(directory)
                    .filter(p -> p.toString().endsWith(".xlsx"))
                    .filter(p -> !p.getFileName().toString().startsWith("~"))
                    .map(Path::toFile)
                    .findFirst()
                    .orElse(null);
        } catch (IOException e) {
            return null;
        }
    }

    private void loadFromExcel(File file) throws IOException {
        try (FileInputStream fis = new FileInputStream(file);
             Workbook workbook = new XSSFWorkbook(fis)) {

            List<Vocabulary> allVocab = new ArrayList<>();

            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                String sheetName = sheet.getSheetName();

                logger.info("Processing sheet: {} ({} rows)", sheetName, sheet.getLastRowNum());

                List<Vocabulary> sheetVocab = processSheet(sheet, sheetName);
                allVocab.addAll(sheetVocab);

                logger.info("  -> Loaded {} vocabulary items from {}", sheetVocab.size(), sheetName);
            }

            // Batch save
            int batchSize = 500;
            for (int i = 0; i < allVocab.size(); i += batchSize) {
                int end = Math.min(i + batchSize, allVocab.size());
                repository.saveAll(allVocab.subList(i, end));
            }

            logger.info("Total vocabulary loaded: {}", allVocab.size());
        }
    }

    private List<Vocabulary> processSheet(Sheet sheet, String sheetName) {
        List<Vocabulary> vocabList = new ArrayList<>();

        // Determine the level and column mapping based on sheet name
        String level = mapSheetToLevel(sheetName);
        String category = mapSheetToCategory(sheetName);

        // Skip reference sheet
        if (sheetName.contains("ref")) {
            logger.info("  Skipping reference sheet: {}", sheetName);
            return vocabList;
        }

        // Detect header row and column mapping
        int startRow = findDataStartRow(sheet);
        ColumnMapping mapping = detectColumnMapping(sheet, sheetName);

        if (mapping == null) {
            logger.warn("  Could not detect column mapping for sheet: {}", sheetName);
            return vocabList;
        }

        for (int r = startRow; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;

            try {
                Vocabulary vocab = extractVocabulary(row, mapping, level, category);
                if (vocab != null && isValidVocab(vocab)) {
                    vocabList.add(vocab);
                }
            } catch (Exception e) {
                // Skip problematic rows
            }
        }

        return vocabList;
    }

    private String mapSheetToLevel(String sheetName) {
        String name = sheetName.trim().toUpperCase();
        if (name.equals("N5")) return "N5";
        if (name.equals("N4")) return "N4";
        if (name.equals("N3")) return "N3";
        if (name.equals("N2")) return "N2";
        if (name.equals("N1")) return "N1";
        if (name.contains("LÁY") || name.contains("LAY") || name.contains("láy")) return "TU_LAY";
        if (name.contains("TRỢ") || name.contains("TRO") || name.contains("trợ")) return "TRO_TU";
        return name.replaceAll("[^A-Z0-9]", "_");
    }

    private String mapSheetToCategory(String sheetName) {
        String name = sheetName.trim();
        if (name.matches("N[1-5]")) return "JLPT " + name;
        if (name.contains("láy") || name.contains("Láy") || name.contains("LÁY")) return "Từ láy";
        if (name.contains("trợ") || name.contains("Trợ") || name.contains("TRỢ")) return "Trợ từ";
        return name;
    }

    private int findDataStartRow(Sheet sheet) {
        // Check if first row is a header
        Row firstRow = sheet.getRow(0);
        if (firstRow != null) {
            String firstCell = getCellString(firstRow.getCell(0));
            if (firstCell != null) {
                String lower = firstCell.toLowerCase().trim();
                if (lower.equals("stt") || lower.equals("") || lower.equals("no") || lower.equals("số")) {
                    return 1; // Skip header row
                }
                // If first cell is a number, data starts at row 0
                try {
                    Integer.parseInt(firstCell.trim());
                    return 0;
                } catch (NumberFormatException e) {
                    return 1; // Assume header
                }
            }
        }
        return 1;
    }

    /**
     * Column mapping detection based on analysis of the Excel data:
     * - N5: STT | 漢字 | ひらがな | Hán Việt | Nghĩa | Chưa thuộc | Từ loại
     * - N4: STT | 漢字 | ひらがな | Hán Việt | Nghĩa | Chưa thuộc | Từ loại
     * - N3: STT | 漢字 | Hán Việt | ひらがな | Nghĩa | Chưa thuộc | Từ loại
     * - N2: (empty header) | STT | 漢字 | ひらがな | Nghĩa | Hán Việt | ...
     * - N1: (empty header) | STT | 漢字 | ひらがな | Nghĩa | ...
     * - Từ láy: | ひらがな | カタカナ | Nghĩa | ...
     * - Trợ từ: STT | 漢字 | ひらがな | Nghĩa | ...
     */
    private ColumnMapping detectColumnMapping(Sheet sheet, String sheetName) {
        ColumnMapping mapping = new ColumnMapping();

        String name = sheetName.trim();

        if (name.equals("N5") || name.equals("N4")) {
            // STT(0) | 漢字(1) | ひらがな(2) | Hán Việt(3) | Nghĩa(4) | Chưa thuộc(5) | Từ loại(6)
            mapping.kanjiCol = 1;
            mapping.hiraganaCol = 2;
            mapping.hanVietCol = 3;
            mapping.meaningCol = 4;
            mapping.wordTypeCol = 6;
        } else if (name.equals("N3")) {
            // STT(0) | 漢字(1) | Hán Việt(2) | ひらがな(3) | Nghĩa(4) | Chưa thuộc(5) | Từ loại(6)
            mapping.kanjiCol = 1;
            mapping.hiraganaCol = 3;
            mapping.hanVietCol = 2;
            mapping.meaningCol = 4;
            mapping.wordTypeCol = 6;
        } else if (name.equals("N2")) {
            // (empty)(0) | STT? | 漢字(1) | ひらがな(2) | Nghĩa(3) | Hán Việt(4) | ...
            mapping.kanjiCol = 1;
            mapping.hiraganaCol = 2;
            mapping.hanVietCol = 4;
            mapping.meaningCol = 3;
            mapping.wordTypeCol = -1;
        } else if (name.equals("N1")) {
            // (empty)(0) | STT? | 漢字(1) | ひらがな(2) | Nghĩa(3) | ...
            mapping.kanjiCol = 1;
            mapping.hiraganaCol = 2;
            mapping.hanVietCol = 3;
            mapping.meaningCol = -1; // N1 has meaning mixed in hiragana rows
            mapping.wordTypeCol = -1;
        } else if (name.contains("láy") || name.contains("Láy") || name.contains("lay") || name.contains("Lay")) {
            // (empty)(0) | ひらがな(1) | カタカナ(2) | Nghĩa(3) | ...
            mapping.kanjiCol = -1;
            mapping.hiraganaCol = 0;
            mapping.hanVietCol = -1;
            mapping.meaningCol = 2;
            mapping.wordTypeCol = -1;
        } else if (name.contains("trợ") || name.contains("Trợ") || name.contains("tro") || name.contains("Tro")) {
            // STT(0) | 漢字(1) | ひらがな(2) | Nghĩa(3) | ...
            mapping.kanjiCol = 1;
            mapping.hiraganaCol = 2;
            mapping.hanVietCol = -1;
            mapping.meaningCol = 3;
            mapping.wordTypeCol = -1;
        } else {
            return null;
        }

        return mapping;
    }

    private Vocabulary extractVocabulary(Row row, ColumnMapping mapping, String level, String category) {
        String kanji = mapping.kanjiCol >= 0 ? getCellString(row.getCell(mapping.kanjiCol)) : null;
        String hiragana = mapping.hiraganaCol >= 0 ? getCellString(row.getCell(mapping.hiraganaCol)) : null;
        String hanViet = mapping.hanVietCol >= 0 ? getCellString(row.getCell(mapping.hanVietCol)) : null;
        String meaning = mapping.meaningCol >= 0 ? getCellString(row.getCell(mapping.meaningCol)) : null;
        String wordType = mapping.wordTypeCol >= 0 ? getCellString(row.getCell(mapping.wordTypeCol)) : null;

        // For N1 sheet, the meaning is in column 3 (hanViet position is actually meaning)
        if (level.equals("N1") && hanViet != null && meaning == null) {
            meaning = hanViet;
            hanViet = null;
        }

        return new Vocabulary(
                clean(kanji),
                clean(hiragana),
                clean(hanViet),
                clean(meaning),
                clean(wordType),
                level,
                category
        );
    }

    private boolean isValidVocab(Vocabulary vocab) {
        // Must have at least kanji or hiragana, and some content
        boolean hasJapanese = (vocab.getKanji() != null && !vocab.getKanji().isEmpty()) ||
                              (vocab.getHiragana() != null && !vocab.getHiragana().isEmpty());
        boolean hasContent = (vocab.getMeaning() != null && !vocab.getMeaning().isEmpty()) ||
                             (vocab.getHanViet() != null && !vocab.getHanViet().isEmpty());

        // Skip rows that are just numbers (STT only)
        if (vocab.getKanji() != null && vocab.getKanji().matches("\\d+") &&
            vocab.getHiragana() == null && vocab.getMeaning() == null) {
            return false;
        }

        return hasJapanese;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                double num = cell.getNumericCellValue();
                if (num == Math.floor(num)) {
                    return String.valueOf((long) num);
                }
                return String.valueOf(num);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception e2) {
                        return null;
                    }
                }
            default:
                return null;
        }
    }

    private String clean(String value) {
        if (value == null) return null;
        value = value.trim();
        return value.isEmpty() ? null : value;
    }

    private static class ColumnMapping {
        int kanjiCol = -1;
        int hiraganaCol = -1;
        int hanVietCol = -1;
        int meaningCol = -1;
        int wordTypeCol = -1;
    }
}

