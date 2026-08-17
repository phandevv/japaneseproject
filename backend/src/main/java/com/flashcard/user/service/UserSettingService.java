package com.flashcard.user.service;

import com.flashcard.user.model.User;
import com.flashcard.user.model.UserSetting;
import com.flashcard.user.provider.UserDataProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserSettingService {

    private final UserDataProvider userDataProvider;

    public UserSettingService(UserDataProvider userDataProvider) {
        this.userDataProvider = userDataProvider;
    }

    @Transactional(readOnly = true)
    public int getWordsPerDay(User user, String level) {
        Optional<UserSetting> settingOpt = userDataProvider.getSettingByUserAndLevel(user, level);
        return settingOpt.map(UserSetting::getWordsPerDay).orElse(20);
    }

    @Transactional
    public UserSetting saveWordsPerDay(User user, String level, int wordsPerDay) {
        if (wordsPerDay <= 0) {
            throw new IllegalArgumentException("Words per day must be greater than 0");
        }
        Optional<UserSetting> settingOpt = userDataProvider.getSettingByUserAndLevel(user, level);
        UserSetting setting;
        if (settingOpt.isPresent()) {
            setting = settingOpt.get();
            setting.setWordsPerDay(wordsPerDay);
        } else {
            setting = new UserSetting(user, level, wordsPerDay);
        }
        return userDataProvider.saveSetting(setting);
    }

    @Transactional(readOnly = true)
    public UserSetting getSettingEntity(User user, String level) {
        return userDataProvider.getSettingByUserAndLevel(user, level).orElse(null);
    }

    @Transactional
    public UserSetting markDayCompleted(User user, String level, int day) {
        UserSetting setting = userDataProvider.getSettingByUserAndLevel(user, level)
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
        return userDataProvider.saveSetting(setting);
    }
}
