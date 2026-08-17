package com.flashcard.achievement.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "achievements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AchievementDoc {

    @Id
    private Long id;

    @Indexed(unique = true)
    private String code;

    private String title;
    private String description;
    private String category;
    private String icon;
    private int points;
    private int targetValue;
    private String parentCode;
    private int treeLevel;
    private int orderInLevel;
}
