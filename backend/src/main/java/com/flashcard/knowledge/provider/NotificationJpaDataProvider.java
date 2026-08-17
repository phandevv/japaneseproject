package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.Notification;
import com.flashcard.knowledge.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class NotificationJpaDataProvider implements NotificationDataProvider {

    private final NotificationRepository notificationRepository;

    @Autowired
    public NotificationJpaDataProvider(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    public Notification save(Notification notification) {
        return notificationRepository.save(notification);
    }

    @Override
    public List<Notification> saveAll(List<Notification> notifications) {
        return notificationRepository.saveAll(notifications);
    }

    @Override
    public Optional<Notification> findById(Long id) {
        return notificationRepository.findById(id);
    }

    @Override
    public Page<Notification> findByUserId(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Override
    public List<Notification> findUnreadByUserId(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    @Override
    public long countUnreadByUserId(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
}
