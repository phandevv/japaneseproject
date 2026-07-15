package com.flashcard.controller;

import com.flashcard.model.User;
import com.flashcard.repository.UserRepository;
import com.flashcard.service.OnlineUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private OnlineUserService onlineUserService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/online")
    public ResponseEntity<?> getOnlineUsers() {
        List<String> onlineIdentifiers = onlineUserService.getOnlineUsers();
        
        // Filter out IPs (basic check: no dots or colons in username)
        List<String> usernames = onlineIdentifiers.stream()
                .filter(id -> !id.contains(".") && !id.contains(":"))
                .collect(Collectors.toList());

        List<User> activeUsers = userRepository.findByUsernameIn(usernames);

        List<Map<String, Object>> userProfiles = activeUsers.stream().map(user -> {
            Map<String, Object> profile = new HashMap<>();
            profile.put("username", user.getUsername());
            profile.put("displayName", user.getDisplayName());
            profile.put("avatar", user.getAvatar());
            profile.put("occupation", user.getOccupation());
            return profile;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(userProfiles);
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getUserProfile(@PathVariable String username) {
        Optional<User> optionalUser = userRepository.findByUsername(username);
        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            Map<String, Object> profile = new HashMap<>();
            profile.put("username", user.getUsername());
            profile.put("displayName", user.getDisplayName());
            profile.put("avatar", user.getAvatar());
            profile.put("occupation", user.getOccupation());
            profile.put("address", user.getAddress());
            return ResponseEntity.ok(profile);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
