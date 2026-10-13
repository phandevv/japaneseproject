package com.flashcard.knowledge.dto;

import java.util.List;

public record GrammarGroupDetailResponse(
    Long id,
    String groupCode,
    String title,
    String description,
    String usageGuide,
    String usageCases,
    List<PatternDto> patterns,
    List<QuestionDto> questions,
    Boolean passed,
    Integer bestScore,
    Integer currentScore
) {
}
