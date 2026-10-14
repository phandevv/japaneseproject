package com.flashcard.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Regression guard for the "Illegal unquoted character (CTRL-CHAR, code 10)" parse
 * failure that occurred in {@link DeepSeekEnrichmentService#repairMissingGrammars}
 * and the reading/grammar generation pipelines whenever the AI returned JSON with
 * raw newlines (\n) embedded inside string values.
 */
class DeepSeekEnrichmentServiceLenientParseTest {

    @Test
    void lenientObjectMapper_shouldParseJsonWithRawNewlinesInsideStrings() throws Exception {
        ObjectMapper lenient = DeepSeekEnrichmentService.lenientObjectMapper(new ObjectMapper());

        String jsonWithRawNewline = "{\"description\":\"desc\",\"passage\":\"Dòng 1\nDòng 2\nDòng 3\",\"used_grammars\":[]}";

        assertThatCode(() -> {
            JsonNode root = lenient.readTree(jsonWithRawNewline);
            assertThat(root.get("passage").asText()).contains("Dòng 2");
        }).doesNotThrowAnyException();
    }

    @Test
    void strictObjectMapper_shouldRejectRawNewlinesInsideStrings() throws Exception {
        ObjectMapper strict = new ObjectMapper();

        String jsonWithRawNewline = "{\"passage\":\"Dòng 1\nDòng 2\"}";

        assertThatCode(() -> strict.readTree(jsonWithRawNewline)).isInstanceOf(Exception.class);
    }
}
