package com.flashcard.config;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.flashcard.repository.UserRepository;
import com.flashcard.service.OnlineUserService;
import com.flashcard.model.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Runs once per request. If a valid JWT Bearer token is present,
 * the corresponding User entity is loaded and set into the SecurityContext.
 * Controllers then access the authenticated user via @AuthenticationPrincipal.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${jwt.secret:JapaneseProjectSuperSecretKeyToken123!456}")
    private String jwtSecret;

    private static final String ISSUER = "JapaneseProject";

    private final UserRepository userRepository;
    private final OnlineUserService onlineUserService;

    public JwtAuthFilter(UserRepository userRepository, OnlineUserService onlineUserService) {
        this.userRepository = userRepository;
        this.onlineUserService = onlineUserService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            JWTVerifier verifier = JWT.require(algorithm).withIssuer(ISSUER).build();
            DecodedJWT jwt = verifier.verify(token);
            String type = jwt.getClaim("type").asString();
            if (type == null || "access".equals(type)) {
                Long userId = jwt.getClaim("userId").asLong();
                if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    userRepository.findById(userId).ifPresent(user -> {
                        var authToken = new UsernamePasswordAuthenticationToken(
                                user, null, Collections.emptyList());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    });
                }
            }
        } catch (JWTVerificationException ignored) {
            // Invalid / expired token — SecurityContext stays empty,
            // Spring Security returns 401 automatically for protected routes
        }

        // Determine client identifier for online status tracking
        String identifier = null;
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            identifier = ((User) auth.getPrincipal()).getUsername();
        } else {
            identifier = request.getRemoteAddr();
        }
        onlineUserService.clientSeen(identifier);

        filterChain.doFilter(request, response);
    }
}
