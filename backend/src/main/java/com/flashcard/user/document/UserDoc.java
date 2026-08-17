package com.flashcard.user.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashMap;
import java.util.Map;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDoc {
    @Id
    private Long id;

    @Indexed(unique = true)
    private String username;

    private String password;
    private String avatar;
    private String coverPhoto;
    private String displayName;
    private String address;
    private String phone;
    private String occupation;
    private String role;

    @Builder.Default
    private Map<String, UserSettingDoc> settings = new HashMap<>();
}
