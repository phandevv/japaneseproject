package com.flashcard.srs.repository.mongo;

import com.flashcard.srs.document.StudySessionDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudySessionMongoRepository extends MongoRepository<StudySessionDoc, Long> {

    Optional<StudySessionDoc> findByUserIdAndStudyDate(Long userId, LocalDate studyDate);

    List<StudySessionDoc> findByUserIdAndStudyDateBetweenOrderByStudyDateAsc(Long userId, LocalDate start, LocalDate end);

    List<StudySessionDoc> findByUserIdOrderByStudyDateDesc(Long userId);
}
