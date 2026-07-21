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
    private final NotificationService notificationService;
    private final com.flashcard.repository.UserRepository userRepository;

    public FeedbackService(FeedbackRepository repository, NotificationService notificationService, com.flashcard.repository.UserRepository userRepository) {
        this.repository = repository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @Transactional
    public Feedback save(Feedback feedback) {
        Feedback saved = repository.save(feedback);
        
        // Notify all admins
        java.util.List<com.flashcard.model.User> admins = userRepository.findByRole("ADMIN");
        for (com.flashcard.model.User admin : admins) {
            notificationService.createNotification(
                admin,
                "Phản ánh mới",
                "Có phản ánh mới từ " + (feedback.getUser().getDisplayName() != null ? feedback.getUser().getDisplayName() : feedback.getUser().getUsername()) + ": " + feedback.getTitle(),
                "FEEDBACK",
                saved.getId()
            );
        }
        
        return saved;
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
            Feedback saved = repository.save(feedback);
            
            String upperStatus = status.toUpperCase();
            
            // Notify the user based on the new status
            if ("INVESTIGATING".equals(upperStatus)) {
                notificationService.createNotification(
                    feedback.getUser(),
                    "Phản ánh đang được xử lý",
                    "Yêu cầu của bạn đang được chúng tôi xem xét và xử lý.",
                    "FEEDBACK_PROCESSED",
                    feedback.getId()
                );
            } else if ("PROCESSED".equals(upperStatus) || "RESOLVED".equals(upperStatus)) {
                notificationService.createNotification(
                    feedback.getUser(),
                    "Phản ánh đã được giải quyết",
                    "Yêu cầu của bạn đã được tiếp nhận và xử lý hoàn tất, cảm ơn bạn đã góp ý.",
                    "FEEDBACK_PROCESSED",
                    feedback.getId()
                );
            } else if ("REJECTED".equals(upperStatus)) {
                notificationService.createNotification(
                    feedback.getUser(),
                    "Phản ánh bị từ chối",
                    "Yêu cầu của bạn không thể thực hiện vào lúc này, cảm ơn bạn đã góp ý.",
                    "FEEDBACK_PROCESSED",
                    feedback.getId()
                );
            }
            
            return saved;
        });
    }
}
