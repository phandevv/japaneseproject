package com.flashcard.user.repository.mongo;

import com.flashcard.user.document.UserDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserMongoRepository extends MongoRepository<UserDoc, Long> {
    Optional<UserDoc> findByUsername(String username);
    Optional<UserDoc> findByUsernameIgnoreCase(String username);
    List<UserDoc> findByUsernameIgnoreCaseIn(List<String> usernames);
    boolean existsByUsername(String username);
    boolean existsByUsernameIgnoreCase(String username);
}
