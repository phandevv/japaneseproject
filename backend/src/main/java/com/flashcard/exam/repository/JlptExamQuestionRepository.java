package com.flashcard.exam.repository;

import com.flashcard.exam.model.JlptExamQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JlptExamQuestionRepository extends JpaRepository<JlptExamQuestion, String> {

    List<JlptExamQuestion> findByExamIdOrderByQuestionOrderAsc(String examId);

    List<JlptExamQuestion> findBySectionRecordIdOrderByQuestionOrderAsc(String sectionRecordId);

    List<JlptExamQuestion> findByExamIdAndSectionIdOrderByQuestionOrderAsc(String examId, String sectionId);
}
