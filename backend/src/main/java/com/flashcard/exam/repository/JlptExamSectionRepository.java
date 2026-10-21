package com.flashcard.exam.repository;

import com.flashcard.exam.model.JlptExamSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JlptExamSectionRepository extends JpaRepository<JlptExamSection, String> {

    List<JlptExamSection> findByExamIdOrderBySectionOrderAsc(String examId);
}
