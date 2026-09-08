package com.flashcard.srs.dto;

import com.flashcard.srs.model.ReviewRating;

public class ReviewRequest {
    private ReviewRating rating;

    public ReviewRequest() {}

    public ReviewRequest(ReviewRating rating) {
        this.rating = rating;
    }

    public ReviewRating getRating() {
        return rating;
    }

    public void setRating(ReviewRating rating) {
        this.rating = rating;
    }
}
