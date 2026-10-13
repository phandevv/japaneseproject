package com.flashcard.knowledge.dto;

import java.util.List;

public record GrammarGroupOverviewResponse(
    List<GrammarGroupOverviewDto> groups,
    int totalGroups
) {
}
