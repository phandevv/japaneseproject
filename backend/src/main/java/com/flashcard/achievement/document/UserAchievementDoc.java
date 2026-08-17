package com.flashcard.achievement.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "user_achievements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "user_achieve_unique_idx", def = "{'userId': 1, 'achievementId': 1}", unique = true)
public class UserAchievementDoc {

    @Id
    private Long id;

    private Long userId;
    private Long achievementId;
    private int currentProgress;
    private boolean isUnlocked;
    private Instant unlockedAt;
}
