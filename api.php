<?php
// ===== Daily Routine Tracker API =====
// Backend PHP API for handling database operations

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== Database Configuration =====
$db_host = 'localhost';
$db_user = 'root';
$db_password = '';
$db_name = 'routine_tracker';

// ===== Database Connection =====
try {
    $conn = new mysqli($db_host, $db_user, $db_password, $db_name);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit();
}

// ===== Helper Functions =====

function sanitize_input($input) {
    global $conn;
    return $conn->real_escape_string(trim($input));
}

function respond_success($data = null, $message = "Success") {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

function respond_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => $message
    ]);
    exit();
}

// ===== Get Request Data =====
$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? sanitize_input($_GET['action']) : null;
$input_data = json_decode(file_get_contents("php://input"), true);

// ===== API Routes =====

// Users API
if (isset($_GET['endpoint']) && $_GET['endpoint'] === 'users') {
    handle_users();
}

// Routines API
elseif (isset($_GET['endpoint']) && $_GET['endpoint'] === 'routines') {
    handle_routines();
}

// Completions API
elseif (isset($_GET['endpoint']) && $_GET['endpoint'] === 'completions') {
    handle_completions();
}

// Statistics API
elseif (isset($_GET['endpoint']) && $_GET['endpoint'] === 'statistics') {
    handle_statistics();
}

// Categories API
elseif (isset($_GET['endpoint']) && $_GET['endpoint'] === 'categories') {
    handle_categories();
}

else {
    respond_error("Invalid endpoint", 404);
}

// ===== Users Handler =====
function handle_users() {
    global $conn, $method, $request, $input_data;
    
    if ($method === 'POST' && $request === 'register') {
        $username = sanitize_input($input_data['username'] ?? '');
        $email = sanitize_input($input_data['email'] ?? '');
        $password = $input_data['password'] ?? '';
        $full_name = sanitize_input($input_data['full_name'] ?? '');
        
        if (!$username || !$email || !$password) {
            respond_error("Missing required fields");
        }
        
        $password_hash = hash('sha256', $password);
        
        $query = "INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("ssss", $username, $email, $password_hash, $full_name);
            if ($stmt->execute()) {
                respond_success(['user_id' => $conn->insert_id], "User registered successfully");
            } else {
                respond_error("Registration failed: " . $stmt->error);
            }
        }
    }
    
    elseif ($method === 'POST' && $request === 'login') {
        $email = sanitize_input($input_data['email'] ?? '');
        $password = $input_data['password'] ?? '';
        
        $password_hash = hash('sha256', $password);
        
        $query = "SELECT id, username, email, full_name FROM users WHERE email = ? AND password_hash = ?";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("ss", $email, $password_hash);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $user = $result->fetch_assoc();
                respond_success($user, "Login successful");
            } else {
                respond_error("Invalid credentials", 401);
            }
        }
    }
    
    elseif ($method === 'GET' && isset($_GET['id'])) {
        $user_id = intval($_GET['id']);
        
        $query = "SELECT id, username, email, full_name, created_at FROM users WHERE id = ?";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                respond_success($result->fetch_assoc());
            } else {
                respond_error("User not found", 404);
            }
        }
    }
    
    else {
        respond_error("Invalid action", 400);
    }
}

// ===== Routines Handler =====
function handle_routines() {
    global $conn, $method, $request, $input_data;
    
    if ($method === 'GET' && $request === 'list') {
        $user_id = intval($_GET['user_id'] ?? 0);
        
        if (!$user_id) {
            respond_error("User ID required");
        }
        
        $query = "
            SELECT r.id, r.title, r.description, c.category_name, r.scheduled_date, 
                   r.scheduled_time, r.frequency, r.priority, r.color_code, r.created_at
            FROM routines r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.user_id = ? AND r.is_active = TRUE
            ORDER BY r.scheduled_date ASC, r.scheduled_time ASC
        ";
        
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $routines = $result->fetch_all(MYSQLI_ASSOC);
            respond_success($routines);
        }
    }
    
    elseif ($method === 'POST' && $request === 'create') {
        $user_id = intval($input_data['user_id'] ?? 0);
        $title = sanitize_input($input_data['title'] ?? '');
        $description = sanitize_input($input_data['description'] ?? '');
        $category_id = intval($input_data['category_id'] ?? 0) ?: null;
        $scheduled_date = sanitize_input($input_data['scheduled_date'] ?? '');
        $scheduled_time = sanitize_input($input_data['scheduled_time'] ?? '');
        $frequency = sanitize_input($input_data['frequency'] ?? 'once');
        $priority = intval($input_data['priority'] ?? 0);
        
        if (!$user_id || !$title || !$scheduled_date) {
            respond_error("Missing required fields");
        }
        
        $query = "
            INSERT INTO routines 
            (user_id, title, description, category_id, scheduled_date, scheduled_time, frequency, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param("issiissi", $user_id, $title, $description, $category_id, 
                            $scheduled_date, $scheduled_time, $frequency, $priority);
            
            if ($stmt->execute()) {
                respond_success(['routine_id' => $conn->insert_id], "Routine created successfully");
            } else {
                respond_error("Failed to create routine");
            }
        }
    }
    
    elseif ($method === 'PUT' && $request === 'update') {
        $routine_id = intval($input_data['routine_id'] ?? 0);
        $title = sanitize_input($input_data['title'] ?? '');
        $description = sanitize_input($input_data['description'] ?? '');
        $scheduled_date = sanitize_input($input_data['scheduled_date'] ?? '');
        
        if (!$routine_id || !$title) {
            respond_error("Missing required fields");
        }
        
        $query = "UPDATE routines SET title = ?, description = ?, scheduled_date = ? WHERE id = ?";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("sssi", $title, $description, $scheduled_date, $routine_id);
            
            if ($stmt->execute()) {
                respond_success(null, "Routine updated successfully");
            } else {
                respond_error("Failed to update routine");
            }
        }
    }
    
    elseif ($method === 'DELETE' && isset($_GET['id'])) {
        $routine_id = intval($_GET['id']);
        
        $query = "UPDATE routines SET is_active = FALSE WHERE id = ?";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("i", $routine_id);
            
            if ($stmt->execute()) {
                respond_success(null, "Routine deleted successfully");
            } else {
                respond_error("Failed to delete routine");
            }
        }
    }
    
    else {
        respond_error("Invalid action", 400);
    }
}

// ===== Completions Handler =====
function handle_completions() {
    global $conn, $method, $request, $input_data;
    
    if ($method === 'POST' && $request === 'mark_complete') {
        $user_id = intval($input_data['user_id'] ?? 0);
        $routine_id = intval($input_data['routine_id'] ?? 0);
        $notes = sanitize_input($input_data['notes'] ?? '');
        $mood = sanitize_input($input_data['mood'] ?? '');
        
        if (!$user_id || !$routine_id) {
            respond_error("Missing required fields");
        }
        
        $query = "
            INSERT INTO routine_completions 
            (routine_id, user_id, completion_date, notes, mood)
            VALUES (?, ?, NOW(), ?, ?)
        ";
        
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param("iiss", $routine_id, $user_id, $notes, $mood);
            
            if ($stmt->execute()) {
                respond_success(['completion_id' => $conn->insert_id], "Routine marked as complete");
            } else {
                respond_error("Failed to mark routine complete");
            }
        }
    }
    
    elseif ($method === 'GET' && $request === 'get_history') {
        $user_id = intval($_GET['user_id'] ?? 0);
        $routine_id = intval($_GET['routine_id'] ?? 0);
        $days = intval($_GET['days'] ?? 30);
        
        if (!$user_id) {
            respond_error("User ID required");
        }
        
        $query = "
            SELECT rc.id, rc.routine_id, r.title, rc.completion_date, rc.notes, rc.mood
            FROM routine_completions rc
            JOIN routines r ON rc.routine_id = r.id
            WHERE rc.user_id = ?
        ";
        
        $params = [$user_id];
        $types = "i";
        
        if ($routine_id) {
            $query .= " AND rc.routine_id = ?";
            $params[] = $routine_id;
            $types .= "i";
        }
        
        $query .= " AND rc.completion_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                   ORDER BY rc.completion_date DESC";
        $params[] = $days;
        $types .= "i";
        
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
            $completions = $result->fetch_all(MYSQLI_ASSOC);
            respond_success($completions);
        }
    }
    
    else {
        respond_error("Invalid action", 400);
    }
}

// ===== Statistics Handler =====
function handle_statistics() {
    global $conn, $method, $request, $input_data;
    
    if ($method === 'GET' && $request === 'daily_stats') {
        $user_id = intval($_GET['user_id'] ?? 0);
        
        if (!$user_id) {
            respond_error("User ID required");
        }
        
        $query = "
            SELECT 
                COUNT(DISTINCT r.id) as total_routines,
                COUNT(DISTINCT rc.id) as completed_routines,
                ROUND((COUNT(DISTINCT rc.id) / COUNT(DISTINCT r.id)) * 100, 2) as completion_rate
            FROM routines r
            LEFT JOIN routine_completions rc ON r.id = rc.routine_id 
                AND DATE(rc.completion_date) = CURDATE()
            WHERE r.user_id = ? AND r.is_active = TRUE 
                AND DATE(r.scheduled_date) = CURDATE()
        ";
        
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            respond_success($result->fetch_assoc());
        }
    }
    
    elseif ($method === 'GET' && $request === 'weekly_stats') {
        $user_id = intval($_GET['user_id'] ?? 0);
        
        if (!$user_id) {
            respond_error("User ID required");
        }
        
        $query = "
            SELECT 
                DATE(rc.completion_date) as date,
                COUNT(DISTINCT r.id) as total,
                COUNT(DISTINCT rc.id) as completed
            FROM routines r
            LEFT JOIN routine_completions rc ON r.id = rc.routine_id 
                AND rc.completion_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            WHERE r.user_id = ? AND r.is_active = TRUE
            GROUP BY DATE(rc.completion_date)
            ORDER BY DATE(rc.completion_date) DESC
        ";
        
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            respond_success($result->fetch_all(MYSQLI_ASSOC));
        }
    }
    
    else {
        respond_error("Invalid action", 400);
    }
}

// ===== Categories Handler =====
function handle_categories() {
    global $conn, $method, $request, $input_data;
    
    if ($method === 'GET' && $request === 'list') {
        $user_id = intval($_GET['user_id'] ?? 0);
        
        if (!$user_id) {
            respond_error("User ID required");
        }
        
        $query = "SELECT id, category_name, icon, color_code FROM categories WHERE user_id = ? ORDER BY category_name";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            respond_success($result->fetch_all(MYSQLI_ASSOC));
        }
    }
    
    elseif ($method === 'POST' && $request === 'create') {
        $user_id = intval($input_data['user_id'] ?? 0);
        $category_name = sanitize_input($input_data['category_name'] ?? '');
        $icon = sanitize_input($input_data['icon'] ?? '');
        $color_code = sanitize_input($input_data['color_code'] ?? '#2ecc71');
        
        if (!$user_id || !$category_name) {
            respond_error("Missing required fields");
        }
        
        $query = "INSERT INTO categories (user_id, category_name, icon, color_code) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("isss", $user_id, $category_name, $icon, $color_code);
            
            if ($stmt->execute()) {
                respond_success(['category_id' => $conn->insert_id], "Category created successfully");
            } else {
                respond_error("Failed to create category");
            }
        }
    }
    
    else {
        respond_error("Invalid action", 400);
    }
}

// Close database connection
$conn->close();
?>
