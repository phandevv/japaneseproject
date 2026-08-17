package com.flashcard.user.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.user.document.UserDoc;
import com.flashcard.user.document.UserSettingDoc;
import com.flashcard.user.model.User;
import com.flashcard.user.model.UserSetting;
import com.flashcard.user.repository.mongo.UserMongoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class UserMongoDataProvider implements UserDataProvider {

    private final UserMongoRepository userMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    public UserMongoDataProvider(UserMongoRepository userMongoRepository,
                                 SequenceGeneratorService sequenceGeneratorService) {
        this.userMongoRepository = userMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @Override
    public Optional<User> findById(Long id) {
        return userMongoRepository.findById(id).map(this::toUser);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        if (username == null) return Optional.empty();
        return userMongoRepository.findByUsernameIgnoreCase(username.trim()).map(this::toUser);
    }

    @Override
    public boolean existsByUsername(String username) {
        if (username == null) return false;
        return userMongoRepository.existsByUsernameIgnoreCase(username.trim());
    }

    @Override
    public User save(User user) {
        UserDoc doc;
        if (user.getId() == null) {
            user.setId(sequenceGeneratorService.generateSequence("users_seq"));
            doc = toDoc(user);
        } else {
            doc = userMongoRepository.findById(user.getId()).orElseGet(() -> toDoc(user));
            updateDocFromUser(doc, user);
        }
        UserDoc saved = userMongoRepository.save(doc);
        return toUser(saved);
    }

    @Override
    public long count() {
        return userMongoRepository.count();
    }

    @Override
    public Optional<UserSetting> getSettingByUserAndLevel(User user, String level) {
        if (user == null || user.getId() == null) return Optional.empty();
        return userMongoRepository.findById(user.getId()).flatMap(doc -> {
            if (doc.getSettings() == null || !doc.getSettings().containsKey(level)) {
                return Optional.empty();
            }
            UserSettingDoc sDoc = doc.getSettings().get(level);
            UserSetting setting = new UserSetting(user, level, sDoc.getWordsPerDay());
            setting.setCompletedDays(sDoc.getCompletedDays());
            return Optional.of(setting);
        });
    }

    @Override
    public UserSetting saveSetting(UserSetting setting) {
        if (setting.getUser() == null || setting.getUser().getId() == null) {
            throw new IllegalArgumentException("User must not be null");
        }
        UserDoc doc = userMongoRepository.findById(setting.getUser().getId()).orElseThrow();
        if (doc.getSettings() == null) {
            doc.setSettings(new HashMap<>());
        }
        UserSettingDoc sDoc = UserSettingDoc.builder()
                .level(setting.getLevel())
                .wordsPerDay(setting.getWordsPerDay())
                .completedDays(setting.getCompletedDays())
                .build();
        doc.getSettings().put(setting.getLevel(), sDoc);
        userMongoRepository.save(doc);
        return setting;
    }

    private User toUser(UserDoc doc) {
        if (doc == null) return null;
        User u = new User();
        u.setId(doc.getId());
        u.setUsername(doc.getUsername());
        u.setPassword(doc.getPassword());
        u.setAvatar(doc.getAvatar());
        u.setCoverPhoto(doc.getCoverPhoto());
        u.setDisplayName(doc.getDisplayName());
        u.setAddress(doc.getAddress());
        u.setPhone(doc.getPhone());
        u.setOccupation(doc.getOccupation());
        u.setRole(doc.getRole() != null ? doc.getRole() : "USER");
        return u;
    }

    private UserDoc toDoc(User u) {
        return UserDoc.builder()
                .id(u.getId())
                .username(u.getUsername())
                .password(u.getPassword())
                .avatar(u.getAvatar())
                .coverPhoto(u.getCoverPhoto())
                .displayName(u.getDisplayName())
                .address(u.getAddress())
                .phone(u.getPhone())
                .occupation(u.getOccupation())
                .role(u.getRole())
                .settings(new HashMap<>())
                .build();
    }

    private void updateDocFromUser(UserDoc doc, User u) {
        doc.setUsername(u.getUsername());
        doc.setPassword(u.getPassword());
        doc.setAvatar(u.getAvatar());
        doc.setCoverPhoto(u.getCoverPhoto());
        doc.setDisplayName(u.getDisplayName());
        doc.setAddress(u.getAddress());
        doc.setPhone(u.getPhone());
        doc.setOccupation(u.getOccupation());
        doc.setRole(u.getRole());
    }
}
