package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface NotificationDataProvider {
    Notification save(Notification notification);
    List<Notification> saveAll(List<Notification> notifications);
    Optional<Notification> findById(Long id);
    Page<Notification> findByUserId(Long userId, Pageable pageable);
    List<Notification> findUnreadByUserId(Long userId);
    long countUnreadByUserId(Long userId);
}
