package com.flashcard.controller;

import com.flashcard.service.ExcelImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
public class ImportController {

    private static final Logger log = LoggerFactory.getLogger(ImportController.class);
    private final ExcelImportService excelImportService;

    public ImportController(ExcelImportService excelImportService) {
        this.excelImportService = excelImportService;
    }

    @PostMapping("/excel")
    public ResponseEntity<Map<String, Object>> importExcel(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        if (file == null || file.isEmpty()) {
            response.put("success", false);
            response.put("message", "Please select a file to upload.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx")) {
            response.put("success", false);
            response.put("message", "Only .xlsx files are allowed.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                && !contentType.equals("application/octet-stream"))) {
            response.put("success", false);
            response.put("message", "Invalid file format. Only Excel files (.xlsx) are allowed.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Limit file size to 5MB to prevent DoS/Zip Bomb
        if (file.getSize() > 5 * 1024 * 1024) {
            response.put("success", false);
            response.put("message", "File size exceeds limit of 5MB.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            int count = excelImportService.importExcelFile(file);
            response.put("success", true);
            response.put("message", "Imported " + count + " vocabulary items successfully!");
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error importing Excel file", e);
            response.put("success", false);
            response.put("message", "Error importing file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
