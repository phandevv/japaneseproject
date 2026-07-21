package com.flashcard.srs.model;

public enum ReviewRating {
    AGAIN(1),
    HARD(2),
    GOOD(3),
    EASY(4);

    private final int value;

    ReviewRating(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static ReviewRating fromValue(int value) {
        for (ReviewRating rating : values()) {
            if (rating.getValue() == value) {
                return rating;
            }
        }
        throw new IllegalArgumentException("Invalid rating value: " + value);
    }
}

