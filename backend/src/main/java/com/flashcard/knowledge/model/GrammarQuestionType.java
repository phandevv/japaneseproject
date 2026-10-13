package com.flashcard.knowledge.model;

public enum GrammarQuestionType {
    MCQ("mcq"),
    FILL_BLANK("fill_blank"),
    CHOOSE_PATTERN("choose_pattern");

    private final String code;

    GrammarQuestionType(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static GrammarQuestionType fromCode(String code) {
        if (code == null) return MCQ;
        for (GrammarQuestionType type : values()) {
            if (type.code.equalsIgnoreCase(code)) return type;
        }
        return MCQ;
    }
}
