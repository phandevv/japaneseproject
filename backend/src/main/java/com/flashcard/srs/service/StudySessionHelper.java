package com.flashcard.srs.service;

import com.flashcard.srs.model.StudySession;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.user.model.User;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class StudySessionHelper {

    private final SrsDataProvider srsDataProvider;

    public StudySessionHelper(SrsDataProvider srsDataProvider) {
        this.srsDataProvider = srsDataProvider;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public StudySession saveOrUpdateSessionWithNewTransaction(User user, LocalDate date, int wordsStudied, Integer addCorrect, Integer addTotal, Boolean freeze) {
        return saveOrUpdateSessionWithNewTransaction(user, date, wordsStudied, addCorrect, addTotal, freeze, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public StudySession saveOrUpdateSessionWithNewTransaction(User user, LocalDate date, int wordsStudied, Integer addCorrect, Integer addTotal, Boolean freeze, Integer addDurationMinutes, Boolean isRepaired) {
        StudySession session = srsDataProvider.findStudySession(user, date)
                .orElseGet(() -> new StudySession(user, date));

        session.setWordsStudied(Math.max(session.getWordsStudied(), wordsStudied));
        if (addCorrect != null) {
            session.setCorrectAnswers(session.getCorrectAnswers() + addCorrect);
        }
        if (addTotal != null) {
            session.setTotalQuestions(session.getTotalQuestions() + addTotal);
        }
        if (freeze != null) {
            session.setStreakFrozen(freeze);
        }
        if (addDurationMinutes != null && addDurationMinutes > 0) {
            session.setDurationMinutes(session.getDurationMinutes() + addDurationMinutes);
        }
        if (isRepaired != null) {
            session.setRepaired(isRepaired);
        }

        return srsDataProvider.saveStudySession(session);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public StudySession ensureDailySession(User user, LocalDate date) {
        if (user == null || date == null) return null;
        return srsDataProvider.findStudySession(user, date)
                .orElseGet(() -> {
                    StudySession newSession = new StudySession(user, date);
                    return srsDataProvider.saveStudySession(newSession);
                });
    }
}
