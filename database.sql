-- ===== Daily Routine Tracker Database =====
-- SQL Schema for storing routines, users, and progress tracking

-- ===== Users Table =====
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===== Categories Table =====
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_category (user_id, category_name)
);

-- ===== Routines Table =====
CREATE TABLE IF NOT EXISTS routines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    frequency VARCHAR(20) DEFAULT 'once',
    frequency_end_date DATE,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, scheduled_date),
    INDEX idx_frequency (frequency)
);

-- ===== Routine Completions Table =====
CREATE TABLE IF NOT EXISTS routine_completions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    routine_id INT NOT NULL,
    user_id INT NOT NULL,
    completion_date DATETIME NOT NULL,
    notes TEXT,
    completion_time_minutes INT,
    mood VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, completion_date),
    INDEX idx_routine_date (routine_id, completion_date)
);

-- ===== Progress Statistics Table =====
CREATE TABLE IF NOT EXISTS progress_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    stat_date DATE NOT NULL,
    total_routines INT DEFAULT 0,
    completed_routines INT DEFAULT 0,
    completion_rate DECIMAL(5, 2) DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, stat_date),
    INDEX idx_user_date (user_id, stat_date)
);

-- ===== User Preferences Table =====
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    daily_reminder_time TIME DEFAULT '08:00:00',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    weekly_summary_enabled BOOLEAN DEFAULT TRUE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== Routine History Table (for audit trail) =====
CREATE TABLE IF NOT EXISTS routine_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    routine_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSON,
    new_data JSON,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_routine_action (routine_id, action_date)
);

-- ===== Goals Table =====
CREATE TABLE IF NOT EXISTS goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    goal_name VARCHAR(255) NOT NULL,
    goal_type VARCHAR(50),
    target_value INT,
    target_period VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status)
);

-- ===== Notifications Table =====
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    routine_id INT,
    notification_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL,
    INDEX idx_user_read (user_id, is_read)
);

-- ===== Backup Table (for data export tracking) =====
CREATE TABLE IF NOT EXISTS backups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    backup_date DATETIME NOT NULL,
    backup_data LONGTEXT NOT NULL,
    file_size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, backup_date)
);

-- ===== Sample Data (Optional) =====
-- Insert sample user
INSERT INTO users (username, email, password_hash, full_name) 
VALUES ('demo_user', 'demo@example.com', SHA2('password123', 256), 'Demo User');

-- Insert sample categories
INSERT INTO categories (user_id, category_name, icon, color_code)
VALUES 
    (1, 'Health & Fitness', '🏃', '#27ae60'),
    (1, 'Work & Productivity', '💼', '#3498db'),
    (1, 'Learning', '📚', '#e74c3c'),
    (1, 'Personal Development', '🎨', '#f39c12'),
    (1, 'Mindfulness', '🧘', '#9b59b6');

-- Insert sample routines
INSERT INTO routines (user_id, title, description, category_id, scheduled_date, scheduled_time, frequency)
VALUES 
    (1, 'Morning Meditation', 'Start the day with 15 minutes of meditation', 5, CURDATE(), '06:00:00', 'daily'),
    (1, 'Exercise', '30 minutes of workout or yoga', 1, CURDATE(), '07:00:00', 'daily'),
    (1, 'Review Goals', 'Review daily goals and priorities', 2, CURDATE(), '09:00:00', 'daily'),
    (1, 'Read', 'Read for 30 minutes before bed', 3, CURDATE(), '21:00:00', 'daily'),
    (1, 'Journaling', 'Write down thoughts and reflections', 4, CURDATE(), '22:00:00', 'daily');

-- ===== Views for Easy Querying =====

-- View: Today's Routines
CREATE VIEW IF NOT EXISTS today_routines AS
SELECT 
    r.id,
    r.user_id,
    r.title,
    r.description,
    c.category_name,
    r.scheduled_date,
    r.scheduled_time,
    r.frequency,
    COUNT(rc.id) as completion_count,
    MAX(rc.completion_date) as last_completed
FROM routines r
LEFT JOIN categories c ON r.category_id = c.id
LEFT JOIN routine_completions rc ON r.id = rc.routine_id
WHERE r.scheduled_date = CURDATE() AND r.is_active = TRUE
GROUP BY r.id
ORDER BY r.scheduled_time ASC;

-- View: User Statistics
CREATE VIEW IF NOT EXISTS user_statistics AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT r.id) as total_routines,
    COUNT(DISTINCT rc.id) as total_completions,
    COUNT(DISTINCT DATE(rc.completion_date)) as days_active,
    ps.current_streak,
    ps.longest_streak,
    ps.completion_rate
FROM users u
LEFT JOIN routines r ON u.id = r.user_id AND r.is_active = TRUE
LEFT JOIN routine_completions rc ON r.id = rc.routine_id
LEFT JOIN progress_stats ps ON u.id = ps.user_id AND ps.stat_date = CURDATE()
GROUP BY u.id;

-- View: Weekly Progress
CREATE VIEW IF NOT EXISTS weekly_progress AS
SELECT 
    user_id,
    DATE(completion_date) as completion_date,
    COUNT(*) as routines_completed,
    COUNT(DISTINCT DATE(completion_date)) as days_completed
FROM routine_completions
WHERE completion_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY user_id, DATE(completion_date)
ORDER BY user_id, completion_date DESC;

-- ===== Indexes for Performance =====
CREATE INDEX idx_routine_user ON routines(user_id);
CREATE INDEX idx_completion_user ON routine_completions(user_id);
CREATE INDEX idx_category_user ON categories(user_id);
CREATE INDEX idx_goal_user ON goals(user_id);
CREATE INDEX idx_notification_user ON notifications(user_id);

-- ===== End of Schema =====
