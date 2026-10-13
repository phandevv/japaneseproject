package com.flashcard.knowledge.dto;

import java.util.List;

public record GrammarGroupOverviewDto(
    Long id,
    String groupCode,
    String title,
    String description,
    Integer totalPatterns,
    Integer sortOrder,
    Boolean passed,
    Integer bestScore
) {
}
