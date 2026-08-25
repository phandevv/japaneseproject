package com.flashcard.common.service;

import com.flashcard.common.document.DatabaseSequenceDoc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class SequenceGeneratorService {

    private final MongoOperations mongoOperations;

    @Autowired
    public SequenceGeneratorService(MongoOperations mongoOperations) {
        this.mongoOperations = mongoOperations;
    }

    public long generateSequence(String seqName) {
        return generateSequence(seqName, 1);
    }

    public long generateSequence(String seqName, int incrementBy) {
        if (incrementBy <= 0) incrementBy = 1;
        Query query = new Query(Criteria.where("_id").is(seqName));
        Update update = new Update().inc("seq", incrementBy);
        FindAndModifyOptions options = FindAndModifyOptions.options().returnNew(true).upsert(true);

        DatabaseSequenceDoc counter = mongoOperations.findAndModify(query, update, options, DatabaseSequenceDoc.class);
        long endSeq = !Objects.isNull(counter) ? counter.getSeq() : incrementBy;
        return endSeq - incrementBy + 1;
    }

    public void setSequenceIfHigher(String seqName, long currentMaxId) {
        DatabaseSequenceDoc counter = mongoOperations.findById(seqName, DatabaseSequenceDoc.class);
        if (counter == null || counter.getSeq() < currentMaxId) {
            DatabaseSequenceDoc newCounter = new DatabaseSequenceDoc(seqName, currentMaxId);
            mongoOperations.save(newCounter);
        }
    }
}
