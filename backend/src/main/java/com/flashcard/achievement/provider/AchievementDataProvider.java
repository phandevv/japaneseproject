package com.flashcard.achievement.provider;

import com.flashcard.achievement.model.Achievement;
import com.flashcard.achievement.model.UserAchievement;
import com.flashcard.user.model.User;

import java.util.List;
import java.util.Optional;

public interface AchievementDataProvider {
    long count();
    List<Achievement> findAll();
    List<Achievement> saveAll(List<Achievement> achievements);
    Optional<Achievement> findByCode(String code);
    List<UserAchievement> findUserAchievements(User user);
    Optional<UserAchievement> findUserAchievement(User user, Achievement achievement);
    UserAchievement saveUserAchievement(UserAchievement userAchievement);
    List<UserAchievement> saveAllUserAchievements(List<UserAchievement> userAchievements);
}
