package com.flashcard.achievement.repository;

import com.flashcard.achievement.model.Achievement;
import com.flashcard.achievement.model.UserAchievement;
import com.flashcard.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    List<UserAchievement> findByUser(User user);

    Optional<UserAchievement> findByUserAndAchievement(User user, Achievement achievement);

    long countByUserAndIsUnlockedTrue(User user);
}
