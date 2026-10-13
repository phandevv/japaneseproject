package com.flashcard.knowledge.dto;

import java.util.List;

public record PatternDto(
    String cauTruc,
    String yNghia,
    List<String> examples
) {
}
