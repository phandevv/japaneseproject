package com.flashcard.user.repository.mongo;

import com.flashcard.user.document.UserDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserMongoRepository extends MongoRepository<UserDoc, Long> {
    Optional<UserDoc> findByUsername(String username);
    boolean existsByUsername(String username);
}
