package com.flashcard.achievement.repository.mongo;

import com.flashcard.achievement.document.AchievementDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AchievementMongoRepository extends MongoRepository<AchievementDoc, Long> {
    Optional<AchievementDoc> findByCode(String code);
    List<AchievementDoc> findByCategory(String category);
    List<AchievementDoc> findAllByOrderByTreeLevelAscOrderInLevelAsc();
}
