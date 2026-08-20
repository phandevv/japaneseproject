package com.flashcard.common.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Enterprise Redis Caching Configuration with strict 30MB Free-Tier RAM Budgeting.
 *
 * Configures:
 * 1. Compact JSON serialization (GenericJackson2JsonRedisSerializer)
 * 2. Dedicated short-to-medium TTLs to prevent memory overflow
 * 3. Graceful CacheErrorHandler so Redis network blips don't crash HTTP requests
 */
@Configuration
@EnableCaching
public class RedisConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(RedisConfig.class);

    private final ObjectMapper objectMapper;

    @Value("${spring.data.redis.url:redis://default:AfpdiSTemq8TH4rnYgvJnCdaENWoablq@dear-leg-ear-33541.db.redis.io:17374}")
    private String redisUrl;

    public RedisConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        try {
            URI uri = URI.create(redisUrl);
            RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration();
            redisConfig.setHostName(uri.getHost());
            redisConfig.setPort(uri.getPort() > 0 ? uri.getPort() : 6379);

            String userInfo = uri.getUserInfo();
            if (userInfo != null && !userInfo.isEmpty()) {
                String[] parts = userInfo.split(":", 2);
                if (parts.length > 0 && !parts[0].isEmpty()) {
                    redisConfig.setUsername(parts[0]);
                }
                if (parts.length > 1 && !parts[1].isEmpty()) {
                    redisConfig.setPassword(RedisPassword.of(parts[1]));
                }
            }

            io.lettuce.core.ClientOptions clientOptions = io.lettuce.core.ClientOptions.builder()
                    .protocolVersion(io.lettuce.core.protocol.ProtocolVersion.RESP2)
                    .pingBeforeActivateConnection(true)
                    .autoReconnect(true)
                    .build();

            LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
                    .clientOptions(clientOptions)
                    .commandTimeout(Duration.ofSeconds(5))
                    .build();

            LettuceConnectionFactory factory = new LettuceConnectionFactory(redisConfig, clientConfig);
            factory.afterPropertiesSet();
            log.info("RedisConnectionFactory successfully connected to {}:{} using RESP2", uri.getHost(), uri.getPort());
            return factory;
        } catch (Exception e) {
            log.error("Failed to parse REDIS_URL '{}': {}", redisUrl, e.getMessage());
            return new LettuceConnectionFactory();
        }
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        ObjectMapper redisMapper = objectMapper.copy();
        redisMapper.registerModule(new JavaTimeModule());
        redisMapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder().allowIfBaseType(Object.class).build(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(redisMapper);
        StringRedisSerializer stringSerializer = new StringRedisSerializer();

        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);
        template.afterPropertiesSet();

        return template;
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper redisMapper = objectMapper.copy();
        redisMapper.registerModule(new JavaTimeModule());
        redisMapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder().allowIfBaseType(Object.class).build(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(redisMapper);

        // Base Cache Configuration: 10 minutes default TTL, no null caching, custom prefix
        RedisCacheConfiguration defaultCacheConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .prefixCacheNameWith("nihongo:cache:")
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer));

        // Tailored TTL Map for 30MB Free-Tier RAM Budgeting
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // 1. Dashboard: High frequency, short TTL (5 minutes)
        cacheConfigs.put("dashboard", defaultCacheConfig.entryTtl(Duration.ofMinutes(5)));

        // 2. Leaderboards: Real-time sensitive, short TTL (2 minutes)
        cacheConfigs.put("leaderboard", defaultCacheConfig.entryTtl(Duration.ofMinutes(2)));

        // 3. Vocab Stats: Static level distribution (1 hour)
        cacheConfigs.put("vocab-stats", defaultCacheConfig.entryTtl(Duration.ofHours(1)));

        // 4. Grammar Navigation: Static Chapter/Day hierarchy (2 hours)
        cacheConfigs.put("grammar-navigation", defaultCacheConfig.entryTtl(Duration.ofHours(2)));

        // 5. JLPT N3 Course Overview: 10 minutes
        cacheConfigs.put("jlpt-overview", defaultCacheConfig.entryTtl(Duration.ofMinutes(10)));

        // 6. User Study Settings: 30 minutes
        cacheConfigs.put("user-settings", defaultCacheConfig.entryTtl(Duration.ofMinutes(30)));

        // 7. Vocabulary Level lists: 15 minutes
        cacheConfigs.put("vocabulary", defaultCacheConfig.entryTtl(Duration.ofMinutes(15)));
        cacheConfigs.put("vocabulary-level", defaultCacheConfig.entryTtl(Duration.ofMinutes(15)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultCacheConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }

    /**
     * Graceful fallback when Redis is temporarily unreachable.
     * Prevents Redis network timeouts from throwing 500 Internal Server Errors to clients.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Redis GET error on cache '{}' with key '{}': {}. Falling back to DB.", cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Redis PUT error on cache '{}' with key '{}': {}", cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Redis EVICT error on cache '{}' with key '{}': {}", cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Redis CLEAR error on cache '{}': {}", cache.getName(), exception.getMessage());
            }
        };
    }
}
