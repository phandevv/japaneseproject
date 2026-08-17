package com.flashcard.user.provider;

import com.flashcard.user.model.User;
import com.flashcard.user.model.UserSetting;

import java.util.Optional;

public interface UserDataProvider {
    Optional<User> findById(Long id);
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    User save(User user);
    long count();
    Optional<UserSetting> getSettingByUserAndLevel(User user, String level);
    UserSetting saveSetting(UserSetting setting);
}
