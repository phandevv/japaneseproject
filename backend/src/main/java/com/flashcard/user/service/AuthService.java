package com.flashcard.user.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.Map;
import java.util.Optional;

/**
 * Handles user registration and JWT token generation on login.
 * Password hashing uses Spring Security's BCryptPasswordEncoder (injected via PasswordEncoder).
 * Token verification is handled by JwtAuthFilter — not duplicated here.
 */
@Service
public class AuthService {

    private final UserDataProvider userDataProvider;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.secret:JapaneseProjectSuperSecretKeyToken123!456}")
    private String jwtSecret;

    private static final String ISSUER = "JapaneseProject";
    private static final long ACCESS_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
    private static final long REFRESH_EXPIRATION_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

    public AuthService(UserDataProvider userDataProvider, PasswordEncoder passwordEncoder) {
        this.userDataProvider = userDataProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User register(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password cannot be empty");
        }
        if (userDataProvider.findByUsername(username.trim()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        User user = new User(username.trim(), passwordEncoder.encode(password));
        return userDataProvider.save(user);
    }

    public Map<String, String> login(String username, String password) {
        if (username == null || password == null) {
            throw new IllegalArgumentException("Username and password cannot be empty");
        }
        Optional<User> userOpt = userDataProvider.findByUsername(username.trim());
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            throw new IllegalArgumentException("Invalid username or password");
        }
        User user = userOpt.get();
        String accessToken = generateToken(user, ACCESS_EXPIRATION_MS, "access");
        String refreshToken = generateToken(user, REFRESH_EXPIRATION_MS, "refresh");
        return Map.of("token", accessToken, "refreshToken", refreshToken);
    }

    public String refreshAccessToken(String refreshToken) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            JWTVerifier verifier = JWT.require(algorithm).withIssuer(ISSUER).build();
            DecodedJWT jwt = verifier.verify(refreshToken);

            String type = jwt.getClaim("type").asString();
            if (!"refresh".equals(type)) {
                throw new IllegalArgumentException("Invalid token type");
            }

            Long userId = jwt.getClaim("userId").asLong();

            // Check if user still exists
            User user = userDataProvider.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            return generateToken(user, ACCESS_EXPIRATION_MS, "access");
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid or expired refresh token: " + e.getMessage());
        }
    }

    private String generateToken(User user, long expirationMs, String type) {
        return JWT.create()
                .withIssuer(ISSUER)
                .withClaim("userId", user.getId())
                .withClaim("username", user.getUsername())
                .withClaim("type", type)
                .withExpiresAt(new Date(System.currentTimeMillis() + expirationMs))
                .sign(Algorithm.HMAC256(jwtSecret));
    }

    public User getUserByUsername(String username) {
        return userDataProvider.findByUsername(username).orElse(null);
    }

    @Transactional
    public User updateProfile(User user, String displayName, String address, String phone, String occupation, String avatar, String coverPhoto) {
        User existingUser = userDataProvider.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        existingUser.setDisplayName(displayName);
        existingUser.setAddress(address);
        existingUser.setPhone(phone);
        existingUser.setOccupation(occupation);
        existingUser.setAvatar(avatar);
        existingUser.setCoverPhoto(coverPhoto);
        return userDataProvider.save(existingUser);
    }
}
