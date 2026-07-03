package com.flashcard.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.flashcard.model.User;
import com.flashcard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.Optional;

/**
 * Handles user registration and JWT token generation on login.
 * Password hashing uses Spring Security's BCryptPasswordEncoder (injected via PasswordEncoder).
 * Token verification is handled by JwtAuthFilter — not duplicated here.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.secret:JapaneseProjectSuperSecretKeyToken123!456}")
    private String jwtSecret;

    private static final String ISSUER = "JapaneseProject";
    private static final long EXPIRATION_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User register(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password cannot be empty");
        }
        if (userRepository.findByUsername(username.trim()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        User user = new User(username.trim(), passwordEncoder.encode(password));
        return userRepository.save(user);
    }

    public String login(String username, String password) {
        if (username == null || password == null) {
            throw new IllegalArgumentException("Username and password cannot be empty");
        }
        Optional<User> userOpt = userRepository.findByUsername(username.trim());
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            throw new IllegalArgumentException("Invalid username or password");
        }
        return generateToken(userOpt.get());
    }

    private String generateToken(User user) {
        return JWT.create()
                .withIssuer(ISSUER)
                .withClaim("userId", user.getId())
                .withClaim("username", user.getUsername())
                .withExpiresAt(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .sign(Algorithm.HMAC256(jwtSecret));
    }
}
