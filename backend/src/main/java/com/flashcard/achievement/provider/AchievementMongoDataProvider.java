package com.flashcard.achievement.provider;

import com.flashcard.achievement.document.AchievementDoc;
import com.flashcard.achievement.document.UserAchievementDoc;
import com.flashcard.achievement.model.Achievement;
import com.flashcard.achievement.model.UserAchievement;
import com.flashcard.achievement.repository.mongo.AchievementMongoRepository;
import com.flashcard.achievement.repository.mongo.UserAchievementMongoRepository;
import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.user.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class AchievementMongoDataProvider implements AchievementDataProvider {

    private final AchievementMongoRepository achievementMongoRepository;
    private final UserAchievementMongoRepository userAchievementMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    public AchievementMongoDataProvider(AchievementMongoRepository achievementMongoRepository,
                                       UserAchievementMongoRepository userAchievementMongoRepository,
                                       SequenceGeneratorService sequenceGeneratorService) {
        this.achievementMongoRepository = achievementMongoRepository;
        this.userAchievementMongoRepository = userAchievementMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @Override
    public long count() {
        return achievementMongoRepository.count();
    }

    @Override
    public List<Achievement> findAll() {
        return achievementMongoRepository.findAllByOrderByTreeLevelAscOrderInLevelAsc().stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
    }

    @Override
    public List<Achievement> saveAll(List<Achievement> achievements) {
        List<AchievementDoc> docs = new ArrayList<>();
        for (Achievement a : achievements) {
            if (a.getId() == null) {
                a.setId(sequenceGeneratorService.generateSequence("achievements_seq"));
            }
            docs.add(toDoc(a));
        }
        List<AchievementDoc> saved = achievementMongoRepository.saveAll(docs);
        return saved.stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public Optional<Achievement> findByCode(String code) {
        return achievementMongoRepository.findByCode(code).map(this::toEntity);
    }

    @Override
    public List<UserAchievement> findUserAchievements(User user) {
        if (user == null || user.getId() == null) return Collections.emptyList();
        List<UserAchievementDoc> docs = userAchievementMongoRepository.findByUserId(user.getId());
        return docs.stream().map(doc -> toUserAchievement(doc, user)).collect(Collectors.toList());
    }

    @Override
    public Optional<UserAchievement> findUserAchievement(User user, Achievement achievement) {
        if (user == null || user.getId() == null || achievement == null || achievement.getId() == null) {
            return Optional.empty();
        }
        return userAchievementMongoRepository.findByUserIdAndAchievementId(user.getId(), achievement.getId())
                .map(doc -> toUserAchievement(doc, user, achievement));
    }

    @Override
    public UserAchievement saveUserAchievement(UserAchievement ua) {
        UserAchievementDoc doc;
        if (ua.getId() == null) {
            ua.setId(sequenceGeneratorService.generateSequence("user_achievements_seq"));
            doc = toUserAchievementDoc(ua);
        } else {
            doc = userAchievementMongoRepository.findById(ua.getId()).orElseGet(() -> toUserAchievementDoc(ua));
            updateUserAchievementDoc(doc, ua);
        }
        UserAchievementDoc saved = userAchievementMongoRepository.save(doc);
        return toUserAchievement(saved, ua.getUser(), ua.getAchievement());
    }

    @Override
    public List<UserAchievement> saveAllUserAchievements(List<UserAchievement> userAchievements) {
        List<UserAchievementDoc> docs = new ArrayList<>();
        for (UserAchievement ua : userAchievements) {
            if (ua.getId() == null) {
                ua.setId(sequenceGeneratorService.generateSequence("user_achievements_seq"));
            }
            docs.add(toUserAchievementDoc(ua));
        }
        List<UserAchievementDoc> saved = userAchievementMongoRepository.saveAll(docs);
        return saved.stream().map(doc -> toUserAchievement(doc, null)).collect(Collectors.toList());
    }

    // Mapping
    private Achievement toEntity(AchievementDoc doc) {
        if (doc == null) return null;
        Achievement a = new Achievement();
        a.setId(doc.getId());
        a.setCode(doc.getCode());
        a.setTitle(doc.getTitle());
        a.setDescription(doc.getDescription());
        a.setCategory(doc.getCategory());
        a.setIcon(doc.getIcon());
        a.setPoints(doc.getPoints());
        a.setTargetValue(doc.getTargetValue());
        a.setParentCode(doc.getParentCode());
        a.setTreeLevel(doc.getTreeLevel());
        a.setOrderInLevel(doc.getOrderInLevel());
        return a;
    }

    private AchievementDoc toDoc(Achievement a) {
        return AchievementDoc.builder()
                .id(a.getId())
                .code(a.getCode())
                .title(a.getTitle())
                .description(a.getDescription())
                .category(a.getCategory())
                .icon(a.getIcon())
                .points(a.getPoints())
                .targetValue(a.getTargetValue())
                .parentCode(a.getParentCode())
                .treeLevel(a.getTreeLevel())
                .orderInLevel(a.getOrderInLevel())
                .build();
    }

    private UserAchievement toUserAchievement(UserAchievementDoc doc, User user) {
        if (doc == null) return null;
        Achievement achievement = achievementMongoRepository.findById(doc.getAchievementId())
                .map(this::toEntity).orElse(null);
        return toUserAchievement(doc, user, achievement);
    }

    private UserAchievement toUserAchievement(UserAchievementDoc doc, User user, Achievement achievement) {
        if (doc == null) return null;
        UserAchievement ua = new UserAchievement();
        ua.setId(doc.getId());
        ua.setUser(user);
        ua.setAchievement(achievement);
        ua.setCurrentProgress(doc.getCurrentProgress());
        ua.setUnlocked(doc.isUnlocked());
        ua.setUnlockedAt(doc.getUnlockedAt());
        return ua;
    }

    private UserAchievementDoc toUserAchievementDoc(UserAchievement ua) {
        return UserAchievementDoc.builder()
                .id(ua.getId())
                .userId(ua.getUser() != null ? ua.getUser().getId() : null)
                .achievementId(ua.getAchievement() != null ? ua.getAchievement().getId() : null)
                .currentProgress(ua.getCurrentProgress())
                .isUnlocked(ua.isUnlocked())
                .unlockedAt(ua.getUnlockedAt())
                .build();
    }

    private void updateUserAchievementDoc(UserAchievementDoc doc, UserAchievement ua) {
        doc.setUserId(ua.getUser() != null ? ua.getUser().getId() : null);
        doc.setAchievementId(ua.getAchievement() != null ? ua.getAchievement().getId() : null);
        doc.setCurrentProgress(ua.getCurrentProgress());
        doc.setUnlocked(ua.isUnlocked());
        doc.setUnlockedAt(ua.getUnlockedAt());
    }
}
