package com.flashcard.service;

import com.flashcard.model.User;
import com.flashcard.model.UserSetting;
import com.flashcard.repository.UserSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserSettingService {

    private final UserSettingRepository settingRepository;

    public UserSettingService(UserSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Transactional(readOnly = true)
    public int getWordsPerDay(User user, String level) {
        Optional<UserSetting> settingOpt = settingRepository.findByUserAndLevel(user, level);
        return settingOpt.map(UserSetting::getWordsPerDay).orElse(20);
    }

    @Transactional
    public UserSetting saveWordsPerDay(User user, String level, int wordsPerDay) {
        if (wordsPerDay <= 0) {
            throw new IllegalArgumentException("Words per day must be greater than 0");
        }
        Optional<UserSetting> settingOpt = settingRepository.findByUserAndLevel(user, level);
        UserSetting setting;
        if (settingOpt.isPresent()) {
            setting = settingOpt.get();
            setting.setWordsPerDay(wordsPerDay);
        } else {
            setting = new UserSetting(user, level, wordsPerDay);
        }
        return settingRepository.save(setting);
    }

    @Transactional(readOnly = true)
    public UserSetting getSettingEntity(User user, String level) {
        return settingRepository.findByUserAndLevel(user, level).orElse(null);
    }

    @Transactional
    public UserSetting markDayCompleted(User user, String level, int day) {
        UserSetting setting = settingRepository.findByUserAndLevel(user, level)
                .orElseGet(() -> new UserSetting(user, level, 20));
        String days = setting.getCompletedDays();
        if (days == null) {
            days = "";
        }
        java.util.Set<String> daySet = new java.util.HashSet<>();
        if (!days.isBlank()) {
            daySet.addAll(java.util.Arrays.asList(days.split(",")));
        }
        daySet.add(String.valueOf(day));
        setting.setCompletedDays(String.join(",", daySet));
        return settingRepository.save(setting);
    }
}
