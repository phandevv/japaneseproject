package com.flashcard.user.provider;

import com.flashcard.user.model.User;
import com.flashcard.user.model.UserSetting;
import com.flashcard.user.repository.UserRepository;
import com.flashcard.user.repository.UserSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class UserJpaDataProvider implements UserDataProvider {

    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;

    @Autowired
    public UserJpaDataProvider(UserRepository userRepository, UserSettingRepository userSettingRepository) {
        this.userRepository = userRepository;
        this.userSettingRepository = userSettingRepository;
    }

    @Override
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public User save(User user) {
        return userRepository.save(user);
    }

    @Override
    public long count() {
        return userRepository.count();
    }

    @Override
    public Optional<UserSetting> getSettingByUserAndLevel(User user, String level) {
        return userSettingRepository.findByUserAndLevel(user, level);
    }

    @Override
    public UserSetting saveSetting(UserSetting setting) {
        return userSettingRepository.save(setting);
    }
}
