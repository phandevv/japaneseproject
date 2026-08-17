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
    void testJlptN3DataLoaderBeanLoaded() {
        assertNotNull(jlptN3DataLoader, "JlptN3DataLoader should be injected");
    }

    @Test
    void testFindDataDirectory() {
        java.io.File dir = JlptN3DataLoader.findN3DataDirectory();
        // Just verify directory resolver works when folder is present
        if (dir != null) {
            assertTrue(dir.exists() && dir.isDirectory(), "N3 data directory should exist");
        }
    }
}
