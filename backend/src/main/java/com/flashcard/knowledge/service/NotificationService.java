package com.flashcard.knowledge.service;

import com.flashcard.knowledge.model.Notification;
import com.flashcard.knowledge.provider.NotificationDataProvider;
import com.flashcard.user.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationDataProvider notificationDataProvider;

    private final com.github.benmanes.caffeine.cache.Cache<Long, Long> unreadCountCache =
            com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                    .expireAfterWrite(java.time.Duration.ofSeconds(30))
                    .maximumSize(10000)
                    .build();

    public NotificationService(NotificationDataProvider notificationDataProvider) {
        this.notificationDataProvider = notificationDataProvider;
    }

    @Transactional
    public Notification createNotification(User user, String title, String message, String type, Long relatedEntityId) {
        Notification notification = new Notification(user, title, message, type, relatedEntityId);
        Notification saved = notificationDataProvider.save(notification);
        if (user != null && user.getId() != null) {
            unreadCountCache.invalidate(user.getId());
        }
        return saved;
    }

    public Page<Notification> getUserNotifications(Long userId, Pageable pageable) {
        return notificationDataProvider.findByUserId(userId, pageable);
    }

    public long getUnreadCount(Long userId) {
        if (userId == null) return 0L;
        Long count = unreadCountCache.get(userId, id -> notificationDataProvider.countUnreadByUserId(id));
        return count != null ? count : 0L;
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationDataProvider.findById(notificationId).ifPresent(notification -> {
            if (notification.getUser() != null && notification.getUser().getId().equals(userId)) {
                notification.setRead(true);
                notificationDataProvider.save(notification);
                unreadCountCache.invalidate(userId);
            }
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        if (userId == null) return;
        List<Notification> unread = notificationDataProvider.findUnreadByUserId(userId);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationDataProvider.saveAll(unread);
        unreadCountCache.invalidate(userId);
    }
}
