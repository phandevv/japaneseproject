package com.flashcard.common.config;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserDataProvider userDataProvider;
    private final PasswordEncoder passwordEncoder;

    public AdminInitializer(UserDataProvider userDataProvider, PasswordEncoder passwordEncoder) {
        this.userDataProvider = userDataProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userDataProvider.findByUsername("admin").isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin.setDisplayName("System Admin");
            userDataProvider.save(admin);
            System.out.println("Admin account created successfully (username: admin, password: admin123)");
        }
    }
}
