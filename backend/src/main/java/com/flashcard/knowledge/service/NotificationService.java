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

    public NotificationService(NotificationDataProvider notificationDataProvider) {
        this.notificationDataProvider = notificationDataProvider;
    }

    @Transactional
    public Notification createNotification(User user, String title, String message, String type, Long relatedEntityId) {
        Notification notification = new Notification(user, title, message, type, relatedEntityId);
        return notificationDataProvider.save(notification);
    }

    public Page<Notification> getUserNotifications(Long userId, Pageable pageable) {
        return notificationDataProvider.findByUserId(userId, pageable);
    }

    public long getUnreadCount(Long userId) {
        return notificationDataProvider.countUnreadByUserId(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationDataProvider.findById(notificationId).ifPresent(notification -> {
            if (notification.getUser() != null && notification.getUser().getId().equals(userId)) {
                notification.setRead(true);
                notificationDataProvider.save(notification);
            }
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationDataProvider.findUnreadByUserId(userId);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationDataProvider.saveAll(unread);
    }
}
