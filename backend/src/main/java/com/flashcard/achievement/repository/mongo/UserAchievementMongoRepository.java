package com.flashcard.achievement.repository.mongo;

import com.flashcard.achievement.document.UserAchievementDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAchievementMongoRepository extends MongoRepository<UserAchievementDoc, Long> {
    Optional<UserAchievementDoc> findByUserIdAndAchievementId(Long userId, Long achievementId);
    List<UserAchievementDoc> findByUserId(Long userId);
    List<UserAchievementDoc> findByUserIdAndIsUnlockedTrue(Long userId);
}
