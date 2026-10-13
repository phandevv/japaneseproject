package com.flashcard.knowledge.dto;

import java.util.List;

public record QuestionDto(
    String type,
    String question,
    List<String> options,
    String answer,
    String explanation
) {
}
