package com.flashcard.repository;

import com.flashcard.model.User;
import com.flashcard.model.UserSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserSettingRepository extends JpaRepository<UserSetting, Long> {
    List<UserSetting> findByUser(User user);
    Optional<UserSetting> findByUserAndLevel(User user, String level);
}
