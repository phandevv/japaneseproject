package com.flashcard.service;

import com.flashcard.model.User;
import com.flashcard.model.StudySession;
import com.flashcard.repository.StudySessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class StudySessionHelper {

    private final StudySessionRepository sessionRepository;

    public StudySessionHelper(StudySessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public StudySession saveOrUpdateSessionWithNewTransaction(User user, LocalDate date, int wordsStudied, Integer addCorrect, Integer addTotal, Boolean freeze) {
        StudySession session = sessionRepository.findByUserAndStudyDate(user, date)
                .orElseGet(() -> new StudySession(user, date));
        
        session.setWordsStudied(wordsStudied);
        if (addCorrect != null) {
            session.setCorrectAnswers(session.getCorrectAnswers() + addCorrect);
        }
        if (addTotal != null) {
            session.setTotalQuestions(session.getTotalQuestions() + addTotal);
        }
        if (freeze != null) {
            session.setStreakFrozen(freeze);
        }
        
        return sessionRepository.saveAndFlush(session);
    }
}
