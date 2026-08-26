package com.flashcard.analytics.repository.mongo;

import com.flashcard.analytics.document.StreakRepairLogDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StreakRepairLogMongoRepository extends MongoRepository<StreakRepairLogDoc, Long> {

    long countByUserIdAndRepairedOnDate(Long userId, LocalDate repairedOnDate);

    List<StreakRepairLogDoc> findByUserIdAndRepairedOnDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
}
