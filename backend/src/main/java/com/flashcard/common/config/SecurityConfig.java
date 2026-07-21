package com.flashcard.common.config;

import com.flashcard.knowledge.model.Conversation;
import com.flashcard.knowledge.model.Feedback;
import com.flashcard.vocabulary.model.Vocabulary;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.http.HttpMethod;

import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOriginsStr;

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    // ─── BCryptPasswordEncoder bean (replaces manual jbcrypt calls) ───────────

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // ─── Main Security Filter Chain ───────────────────────────────────────────

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // REST API — no CSRF needed (stateless JWT)
            .csrf(AbstractHttpConfigurer::disable)
            // CORS configured below
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Stateless — no server-side session
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Allow H2 console frames in local dev
            .headers(h -> h.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
            .authorizeHttpRequests(auth -> auth
                // ── Public endpoints ────────────────────────────────────────
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/ws/conversation", "/ws/conversation/**").permitAll()
                
                // ── AI Vocabulary Enrichment (Admin & VIP only) ─────────────
                .requestMatchers(HttpMethod.POST, "/api/vocab/*/enrich").authenticated()
                
                // ── Vocabulary Management (Admin only) ───────────────────────
                .requestMatchers(HttpMethod.POST, "/api/vocab").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/vocab/enrich/level/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/vocab/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/vocab/**").hasRole("ADMIN")
                .requestMatchers("/api/import/**").hasRole("ADMIN")
                
                // ── Vocabulary Reading (Public / Authenticated) ──────────────
                .requestMatchers(HttpMethod.GET, "/api/vocab/**").permitAll()
                
                // ── Feedback/Error Reports (Submit: Authenticated, View/Update: Admin) ─────
                .requestMatchers(HttpMethod.POST, "/api/feedbacks").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/feedbacks").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/feedbacks/*/status").hasRole("ADMIN")
                
                // ── AI Chat & Knowledge Base (Authenticated users only) ──────────────────────
                .requestMatchers(HttpMethod.POST, "/api/chat").authenticated()
                .requestMatchers("/api/knowledge/**").authenticated()

                // ── AI Exercise (Translation Practice + Grading) ─────────────────────────────
                .requestMatchers("/api/ai/exercise/**").authenticated()

                // ── Study Queue & Today Review ───────────────────────────────────────────────
                .requestMatchers("/api/study/**").authenticated()

                // ── Everything else requires valid JWT ──────────────────────
                .anyRequest().authenticated()
            )
            // Rate limiter first, then JWT token resolver
            .addFilterBefore(rateLimitFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ─── CORS Configuration ───────────────────────────────────────────────────

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        return request -> {
            CorsConfiguration config = new CorsConfiguration();
            
            if (allowedOriginsStr != null && !allowedOriginsStr.isBlank()) {
                List<String> allowed = Arrays.stream(allowedOriginsStr.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();
                config.setAllowedOrigins(allowed);
            } else {
                config.setAllowedOrigins(List.of("https://phandeptrai.id.vn"));
            }
            
            config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
            config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
            config.setAllowCredentials(true);
            config.setMaxAge(3600L);
            return config;
        };
    }

    // ─── Rate Limit Filter (Bucket4j token-bucket algorithm) ─────────────────
    //
    //  Multi-bucket per IP strategy:
    //  - General API: max 120 requests per minute.
    //  - Auth API (Login/Register): max 10 requests per minute.
    //  - AI Enrich API: max 5 requests per minute.

    private static class UserBuckets {
        final Bucket generalBucket;
        final Bucket authBucket;
        final Bucket enrichBucket;

        UserBuckets(Bucket general, Bucket auth, Bucket enrich) {
            this.generalBucket = general;
            this.authBucket = auth;
            this.enrichBucket = enrich;
        }
    }

    @Bean
    public OncePerRequestFilter rateLimitFilter() {
        return new OncePerRequestFilter() {

            private final ConcurrentHashMap<String, UserBuckets> ipBuckets = new ConcurrentHashMap<>();

            private UserBuckets createUserBuckets() {
                Bucket general = Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(120).refillGreedy(120, Duration.ofMinutes(1)).build())
                        .build();
                Bucket auth = Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(10).refillGreedy(10, Duration.ofMinutes(1)).build())
                        .build();
                Bucket enrich = Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(60).refillGreedy(60, Duration.ofMinutes(1)).build())
                        .build();
                return new UserBuckets(general, auth, enrich);
            }

            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain chain)
                    throws ServletException, IOException {

                String uri = request.getRequestURI();
                
                // Only rate limit API requests
                if (uri.startsWith("/api/")) {
                    String ip = resolveClientIp(request);
                    UserBuckets userBuckets = ipBuckets.computeIfAbsent(ip, k -> createUserBuckets());

                    // 1. Check General Rate Limit (All APIs)
                    if (!userBuckets.generalBucket.tryConsume(1)) {
                        sendErrorResponse(response, "Too many requests. General limit is 120 requests per minute.");
                        return;
                    }

                    // 2. Check Brute-Force Auth Protection
                    if (uri.startsWith("/api/auth/login") || uri.startsWith("/api/auth/register")) {
                        if (!userBuckets.authBucket.tryConsume(1)) {
                            sendErrorResponse(response, "Too many authentication requests. Limit is 10 requests per minute.");
                            return;
                        }
                    }

                    // 3. Check AI Enrichment Protection (Paid/Slow API)
                    if (uri.endsWith("/enrich")) {
                        if (!userBuckets.enrichBucket.tryConsume(1)) {
                            sendErrorResponse(response, "Too many AI enrichment requests. Limit is 60 requests per minute.");
                            return;
                        }
                    }
                }

                chain.doFilter(request, response);
            }

            private void sendErrorResponse(HttpServletResponse response, String message) throws IOException {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(String.format("{\"error\":\"%s\"}", message));
            }

            private String resolveClientIp(HttpServletRequest req) {
                String xff = req.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
                String xri = req.getHeader("X-Real-IP");
                if (xri != null && !xri.isBlank()) return xri.trim();
                return req.getRemoteAddr();
            }
        };
    }
}

