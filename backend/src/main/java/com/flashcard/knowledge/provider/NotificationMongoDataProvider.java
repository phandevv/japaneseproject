package com.flashcard.knowledge.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.knowledge.document.NotificationDoc;
import com.flashcard.knowledge.model.Notification;
import com.flashcard.knowledge.repository.mongo.NotificationMongoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class NotificationMongoDataProvider implements NotificationDataProvider {

    private final NotificationMongoRepository notificationMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    public NotificationMongoDataProvider(NotificationMongoRepository notificationMongoRepository,
                                         SequenceGeneratorService sequenceGeneratorService) {
        this.notificationMongoRepository = notificationMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @Override
    public Notification save(Notification n) {
        NotificationDoc doc;
        if (n.getId() == null) {
            n.setId(sequenceGeneratorService.generateSequence("notifications_seq"));
            doc = toDoc(n);
        } else {
            doc = notificationMongoRepository.findById(n.getId()).orElseGet(() -> toDoc(n));
            updateDoc(doc, n);
        }
        NotificationDoc saved = notificationMongoRepository.save(doc);
        return toEntity(saved);
    }

    @Override
    public List<Notification> saveAll(List<Notification> notifications) {
        List<NotificationDoc> docs = new ArrayList<>();
        for (Notification n : notifications) {
            if (n.getId() == null) {
                n.setId(sequenceGeneratorService.generateSequence("notifications_seq"));
            }
            docs.add(toDoc(n));
        }
        List<NotificationDoc> saved = notificationMongoRepository.saveAll(docs);
        return saved.stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public Optional<Notification> findById(Long id) {
        return notificationMongoRepository.findById(id).map(this::toEntity);
    }

    @Override
    public Page<Notification> findByUserId(Long userId, Pageable pageable) {
        Page<NotificationDoc> page = notificationMongoRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        List<Notification> list = page.getContent().stream().map(this::toEntity).collect(Collectors.toList());
        return new PageImpl<>(list, pageable, page.getTotalElements());
    }

    @Override
    public List<Notification> findUnreadByUserId(Long userId) {
        return notificationMongoRepository.findByUserIdAndIsReadFalse(userId).stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
    }

    @Override
    public long countUnreadByUserId(Long userId) {
        return notificationMongoRepository.countByUserIdAndIsReadFalse(userId);
    }

    private Notification toEntity(NotificationDoc doc) {
        if (doc == null) return null;
        Notification n = new Notification();
        n.setId(doc.getId());
        if (doc.getUserId() != null) {
            com.flashcard.user.model.User u = new com.flashcard.user.model.User();
            u.setId(doc.getUserId());
            n.setUser(u);
        }
        n.setTitle(doc.getTitle());
        n.setMessage(doc.getMessage());
        n.setType(doc.getType());
        n.setRead(doc.isRead());
        n.setRelatedEntityId(doc.getRelatedEntityId());
        n.setCreatedAt(doc.getCreatedAt());
        return n;
    }

    private NotificationDoc toDoc(Notification n) {
        return NotificationDoc.builder()
                .id(n.getId())
                .userId(n.getUser() != null ? n.getUser().getId() : null)
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .isRead(n.isRead())
                .relatedEntityId(n.getRelatedEntityId())
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt() : java.time.LocalDateTime.now())
                .build();
    }

    private void updateDoc(NotificationDoc doc, Notification n) {
        if (n.getUser() != null) {
            doc.setUserId(n.getUser().getId());
        }
        doc.setTitle(n.getTitle());
        doc.setMessage(n.getMessage());
        doc.setType(n.getType());
        doc.setRead(n.isRead());
        doc.setRelatedEntityId(n.getRelatedEntityId());
    }
}
