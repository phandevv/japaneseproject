package com.flashcard.vocabulary.service;

import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class ExcelImportService {

    private static final Logger logger = LoggerFactory.getLogger(ExcelImportService.class);
    private final VocabularyRepository repository;
    private final VocabularyService vocabularyService;

    public ExcelImportService(VocabularyRepository repository, VocabularyService vocabularyService) {
        this.repository = repository;
        this.vocabularyService = vocabularyService;
    }

    public int importExcelFile(MultipartFile file) throws Exception {
        try (InputStream fis = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(fis)) {

            List<Vocabulary> allVocab = new ArrayList<>();

            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                String sheetName = sheet.getSheetName();
                logger.info("Processing sheet: {} ({} rows)", sheetName, sheet.getLastRowNum());
                List<Vocabulary> sheetVocab = processSheet(sheet, sheetName);
                allVocab.addAll(sheetVocab);
            }

            for (Vocabulary v : allVocab) {
                vocabularyService.save(v);
            }

            logger.info("Total vocabulary loaded: {}", allVocab.size());
            return allVocab.size();
        }
    }

    private List<Vocabulary> processSheet(Sheet sheet, String sheetName) {
        List<Vocabulary> vocabList = new ArrayList<>();
        String level = mapSheetToLevel(sheetName);
        String category = mapSheetToCategory(sheetName);

        if (sheetName.contains("ref")) return vocabList;

        int startRow = findDataStartRow(sheet);
        ColumnMapping mapping = detectColumnMapping(sheet, sheetName);

        if (mapping == null) return vocabList;

        for (int r = startRow; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            try {
                Vocabulary vocab = extractVocabulary(row, mapping, level, category);
                if (vocab != null && isValidVocab(vocab)) {
                    vocabList.add(vocab);
                }
            } catch (Exception e) {}
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
        Row firstRow = sheet.getRow(0);
        if (firstRow != null) {
            String firstCell = getCellString(firstRow.getCell(0));
            if (firstCell != null) {
                String lower = firstCell.toLowerCase().trim();
                if (lower.equals("stt") || lower.equals("") || lower.equals("no") || lower.equals("số")) {
                    return 1;
                }
                try {
                    Integer.parseInt(firstCell.trim());
                    return 0;
                } catch (NumberFormatException e) {
                    return 1;
                }
            }
        }
        return 1;
    }

    private ColumnMapping detectColumnMapping(Sheet sheet, String sheetName) {
        ColumnMapping mapping = new ColumnMapping();
        String name = sheetName.trim();

        if (name.equals("N5") || name.equals("N4")) {
            mapping.kanjiCol = 1; mapping.hiraganaCol = 2; mapping.hanVietCol = 3; mapping.meaningCol = 4; mapping.wordTypeCol = 6;
        } else if (name.equals("N3")) {
            mapping.kanjiCol = 1; mapping.hiraganaCol = 3; mapping.hanVietCol = 2; mapping.meaningCol = 4; mapping.wordTypeCol = 6;
        } else if (name.equals("N2")) {
            mapping.kanjiCol = 1; mapping.hiraganaCol = 2; mapping.hanVietCol = 4; mapping.meaningCol = 3; mapping.wordTypeCol = -1;
        } else if (name.equals("N1")) {
            mapping.kanjiCol = 1; mapping.hiraganaCol = 2; mapping.hanVietCol = 3; mapping.meaningCol = -1; mapping.wordTypeCol = -1;
        } else if (name.contains("láy") || name.contains("Láy") || name.contains("lay") || name.contains("Lay")) {
            mapping.kanjiCol = -1; mapping.hiraganaCol = 0; mapping.hanVietCol = -1; mapping.meaningCol = 2; mapping.wordTypeCol = -1;
        } else if (name.contains("trợ") || name.contains("Trợ") || name.contains("tro") || name.contains("Tro")) {
            mapping.kanjiCol = 1; mapping.hiraganaCol = 2; mapping.hanVietCol = -1; mapping.meaningCol = 3; mapping.wordTypeCol = -1;
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

        if (level.equals("N1") && hanViet != null && meaning == null) {
            meaning = hanViet;
            hanViet = null;
        }

        return new Vocabulary(clean(kanji), clean(hiragana), clean(hanViet), clean(meaning), clean(wordType), level, category);
    }

    private boolean isValidVocab(Vocabulary vocab) {
        boolean hasJapanese = (vocab.getKanji() != null && !vocab.getKanji().isEmpty()) || (vocab.getHiragana() != null && !vocab.getHiragana().isEmpty());
        if (vocab.getKanji() != null && vocab.getKanji().matches("\\d+") && vocab.getHiragana() == null && vocab.getMeaning() == null) {
            return false;
        }
        return hasJapanese;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue();
            case NUMERIC:
                double num = cell.getNumericCellValue();
                if (num == Math.floor(num)) return String.valueOf((long) num);
                return String.valueOf(num);
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try { return cell.getStringCellValue(); } catch (Exception e) {
                    try { return String.valueOf(cell.getNumericCellValue()); } catch (Exception e2) { return null; }
                }
            default: return null;
        }
    }

    private String clean(String value) {
        if (value == null) return null;
        value = value.trim();
        return value.isEmpty() ? null : value;
    }

    private static class ColumnMapping {
        int kanjiCol = -1; int hiraganaCol = -1; int hanVietCol = -1; int meaningCol = -1; int wordTypeCol = -1;
    }
}

