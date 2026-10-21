package com.flashcard.exam.repository.mongo;

import com.flashcard.exam.document.JlptExamDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JlptExamMongoRepository extends MongoRepository<JlptExamDoc, String> {

    List<JlptExamDoc> findAllByOrderByExamYearDescExamMonthDesc();

    List<JlptExamDoc> findByLevelOrderByExamYearDescExamMonthDesc(String level);
}
