package com.flashcard.knowledge.dto;

import java.util.List;

public record SubmitQuizResponse(
    Boolean passed,
    Integer score,
    Integer total,
    Integer bestScore,
    Double accuracy
) {
}
