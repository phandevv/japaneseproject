package com.flashcard;

import com.flashcard.common.config.JlptN3DataLoader;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
public class JlptN3DataLoaderTest {

    @Autowired
    private JlptN3DataLoader jlptN3DataLoader;

    @Test
    void testImportAllN3Data() {
        Map<String, Object> result = jlptN3DataLoader.importAllN3Data();
        System.out.println("TEST IMPORT RESULT: " + result);
        assertNotNull(result);
        assertTrue((Boolean) result.get("success"), "Import should succeed");
    }
}
