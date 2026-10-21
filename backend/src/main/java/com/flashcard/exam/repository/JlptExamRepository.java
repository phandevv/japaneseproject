package com.flashcard.exam.repository;

import com.flashcard.exam.model.JlptExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JlptExamRepository extends JpaRepository<JlptExam, String> {

    List<JlptExam> findAllByOrderByYearDescMonthDesc();
}
