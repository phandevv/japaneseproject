CREATE TABLE achievements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(255),
    points INT NOT NULL DEFAULT 0,
    target_value INT NOT NULL DEFAULT 1,
    parent_code VARCHAR(50),
    tree_level INT NOT NULL DEFAULT 1,
    order_in_level INT NOT NULL DEFAULT 1
);

CREATE TABLE user_achievements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    achievement_id BIGINT NOT NULL,
    current_progress INT NOT NULL DEFAULT 0,
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMP NULL,
    CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);
