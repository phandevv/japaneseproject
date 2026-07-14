package com.flashcard.service;

import com.flashcard.model.Feedback;
import com.flashcard.repository.FeedbackRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class FeedbackService {

    private final FeedbackRepository repository;

    public FeedbackService(FeedbackRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Feedback save(Feedback feedback) {
        return repository.save(feedback);
    }

    public Page<Feedback> getAll(Pageable pageable) {
        return repository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Optional<Feedback> getById(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public Optional<Feedback> updateStatus(Long id, String status) {
        return repository.findById(id).map(feedback -> {
            feedback.setStatus(status.toUpperCase());
            return repository.save(feedback);
        });
    }
}
