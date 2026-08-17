package com.flashcard.common.config.mongo;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.core.convert.DbRefResolver;
import org.springframework.data.mongodb.core.convert.DefaultDbRefResolver;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import java.util.Collections;

@Configuration
@EnableMongoRepositories(basePackages = "com.flashcard.*.repository.mongo")
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    @ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
    public MongoTransactionManager transactionManager(MongoDatabaseFactory dbFactory) {
        return new MongoTransactionManager(dbFactory);
    }

    @Bean(name = "mongoCustomConversions")
    @ConditionalOnMissingBean(MongoCustomConversions.class)
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(Collections.emptyList());
    }

    @Bean(name = "mongoMappingContext")
    @ConditionalOnMissingBean(MongoMappingContext.class)
    public MongoMappingContext mongoMappingContext(MongoCustomConversions customConversions) {
        MongoMappingContext context = new MongoMappingContext();
        context.setSimpleTypeHolder(customConversions.getSimpleTypeHolder());
        return context;
    }

    @Bean(name = "mongoTemplate")
    @ConditionalOnMissingBean(MongoTemplate.class)
    @ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
    public MongoTemplate mongoTemplate(MongoMappingContext mappingContext, MongoCustomConversions customConversions) {
        SimpleMongoClientDatabaseFactory factory = new SimpleMongoClientDatabaseFactory("mongodb://localhost:27017/dummy");
        DbRefResolver dbRefResolver = new DefaultDbRefResolver(factory);
        MappingMongoConverter converter = new MappingMongoConverter(dbRefResolver, mappingContext);
        converter.setCustomConversions(customConversions);
        converter.afterPropertiesSet();
        return new MongoTemplate(factory, converter);
    }
}
