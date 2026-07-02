package com.flashcard.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.flashcard.model.User;
import com.flashcard.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    
    @Value("${jwt.secret:JapaneseProjectSuperSecretKeyToken123!456}")
    private String jwtSecret;

    private static final String ISSUER = "JapaneseProject";
    private static final long EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User register(String username, String password) {
        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Username and password cannot be empty");
        }
        if (userRepository.findByUsername(username.trim()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt());
        User user = new User(username.trim(), hashedPassword);
        return userRepository.save(user);
    }

    public String login(String username, String password) {
        if (username == null || password == null) {
            throw new IllegalArgumentException("Username and password cannot be empty");
        }
        Optional<User> userOpt = userRepository.findByUsername(username.trim());
        if (userOpt.isEmpty() || !BCrypt.checkpw(password, userOpt.get().getPassword())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        User user = userOpt.get();
        
        // Generate stateless JWT token
        Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
        return JWT.create()
                .withIssuer(ISSUER)
                .withClaim("userId", user.getId())
                .withClaim("username", user.getUsername())
                .withExpiresAt(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .sign(algorithm);
    }

    public void logout(String token) {
        // Stateless JWT has no logout state stored on server.
        // The token is discarded by the client (frontend) to log out.
    }

    @Transactional(readOnly = true)
    public User getUserByToken(String token) {
        if (token == null || token.isEmpty()) return null;
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer(ISSUER)
                    .build();
            DecodedJWT jwt = verifier.verify(token);
            Long userId = jwt.getClaim("userId").asLong();
            if (userId == null) return null;
            
            return userRepository.findById(userId).orElse(null);
        } catch (JWTVerificationException e) {
            // Token is expired, invalid signature, or corrupted
            return null;
        }
    }
}
