package com.flashcard.knowledge.dto;

import java.util.List;

public record ImportGrammarGroupResponse(
    Integer groupsSaved,
    Integer quizzesSaved,
    List<String> errors
) {
}
