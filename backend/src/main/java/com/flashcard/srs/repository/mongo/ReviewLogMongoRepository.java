package com.flashcard.srs.repository.mongo;

import com.flashcard.srs.document.ReviewLogDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewLogMongoRepository extends MongoRepository<ReviewLogDoc, Long> {
    List<ReviewLogDoc> findByWordReviewIdOrderByCreatedAtDesc(Long wordReviewId);
}
