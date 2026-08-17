package com.flashcard.srs.repository.mongo;

import com.flashcard.srs.document.DailyStudyStatsDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyStudyStatsMongoRepository extends MongoRepository<DailyStudyStatsDoc, Long> {

    Optional<DailyStudyStatsDoc> findByUserIdAndDate(Long userId, LocalDate date);

    List<DailyStudyStatsDoc> findByUserIdAndDateBetweenOrderByDateAsc(Long userId, LocalDate start, LocalDate end);
}
