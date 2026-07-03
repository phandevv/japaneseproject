package com.flashcard.config;

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
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

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
                .requestMatchers("/api/vocab/**").permitAll()
                .requestMatchers("/api/import/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
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
            String origin = request.getHeader("Origin");
            String host = request.getHeader("Host");
            CorsConfiguration config = new CorsConfiguration();
            
            // Secure Dynamic Origin matching:
            // 1. Always allow localhost/127.0.0.1 for local dev
            // 2. Dynamically allow the request if the Origin host matches the server's Host header host.
            // This blocks malicious third-party sites (e.g. attacker.com) from accessing API data,
            // while allowing zero-configuration deploy on any domain/IP.
            if (origin != null && isAllowedOrigin(origin, host)) {
                config.setAllowedOrigins(List.of(origin));
            } else {
                config.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:5173"));
            }
            
            config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
            config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
            config.setAllowCredentials(true);
            config.setMaxAge(3600L);
            return config;
        };
    }

    private boolean isAllowedOrigin(String origin, String hostHeader) {
        if (origin == null || origin.isBlank()) return false;
        
        // Allow local dev ports
        if (origin.startsWith("http://localhost:") || 
            origin.startsWith("https://localhost:") ||
            origin.startsWith("http://127.0.0.1:") || 
            origin.startsWith("https://127.0.0.1:")) {
            return true;
        }

        // Extract host from Origin (e.g. "http://100.53.226.133" -> "100.53.226.133")
        String originHost = origin.replace("http://", "").replace("https://", "");
        int colonIdx = originHost.indexOf(":");
        if (colonIdx != -1) {
            originHost = originHost.substring(0, colonIdx);
        }

        // Extract host from Host header (e.g. "100.53.226.133:8080" -> "100.53.226.133")
        String host = hostHeader;
        if (host != null) {
            int hostColonIdx = host.indexOf(":");
            if (hostColonIdx != -1) {
                host = host.substring(0, hostColonIdx);
            }
        }

        return originHost.equalsIgnoreCase(host);
    }

    // ─── Rate Limit Filter (Bucket4j token-bucket algorithm) ─────────────────
    //
    //  10 tokens per IP per minute on auth endpoints.
    //  Bucket4j is more accurate than the previous manual ScheduledExecutor reset.

    @Bean
    public OncePerRequestFilter rateLimitFilter() {
        return new OncePerRequestFilter() {

            private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

            private Bucket newBucket() {
                Bandwidth limit = Bandwidth.builder()
                        .capacity(10)
                        .refillGreedy(10, Duration.ofMinutes(1))
                        .build();
                return Bucket.builder().addLimit(limit).build();
            }

            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain chain)
                    throws ServletException, IOException {

                String uri = request.getRequestURI();
                if (uri.startsWith("/api/auth/login") || uri.startsWith("/api/auth/register")) {
                    String ip = resolveClientIp(request);
                    Bucket bucket = buckets.computeIfAbsent(ip, k -> newBucket());

                    if (!bucket.tryConsume(1)) {
                        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"Too many requests. Please try again in a minute.\"}");
                        return;
                    }
                }
                chain.doFilter(request, response);
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
