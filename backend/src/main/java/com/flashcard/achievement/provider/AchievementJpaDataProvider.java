package com.flashcard.achievement.provider;

import com.flashcard.achievement.model.Achievement;
import com.flashcard.achievement.model.UserAchievement;
import com.flashcard.achievement.repository.AchievementRepository;
import com.flashcard.achievement.repository.UserAchievementRepository;
import com.flashcard.user.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class AchievementJpaDataProvider implements AchievementDataProvider {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;

    @Autowired
    public AchievementJpaDataProvider(AchievementRepository achievementRepository,
                                      UserAchievementRepository userAchievementRepository) {
        this.achievementRepository = achievementRepository;
        this.userAchievementRepository = userAchievementRepository;
    }

    @Override
    public long count() {
        return achievementRepository.count();
    }

    @Override
    public List<Achievement> findAll() {
        return achievementRepository.findAllByOrderByCategoryAscTreeLevelAscOrderInLevelAsc();
    }

    @Override
    public List<Achievement> saveAll(List<Achievement> achievements) {
        return achievementRepository.saveAll(achievements);
    }

    @Override
    public Optional<Achievement> findByCode(String code) {
        return achievementRepository.findByCode(code);
    }

    @Override
    public List<UserAchievement> findUserAchievements(User user) {
        return userAchievementRepository.findByUser(user);
    }

    @Override
    public Optional<UserAchievement> findUserAchievement(User user, Achievement achievement) {
        return userAchievementRepository.findByUserAndAchievement(user, achievement);
    }

    @Override
    public UserAchievement saveUserAchievement(UserAchievement userAchievement) {
        return userAchievementRepository.save(userAchievement);
    }

    @Override
    public List<UserAchievement> saveAllUserAchievements(List<UserAchievement> userAchievements) {
        return userAchievementRepository.saveAll(userAchievements);
    }
}
