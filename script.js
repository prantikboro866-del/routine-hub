// ===== Global Variables =====
let routines = [];
let currentUserId = 1;
const API_BASE = 'api.php';

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    updateGreeting();
    loadUserData();
    loadTodayRoutines();
    loadWeeklyRoutines();
    updateStats();
});

// ===== Initialize App =====
function initializeApp() {
    const currentDate = new Date();
    document.getElementById('current-date').textContent = formatDate(currentDate);
    
    loadRoutinesFromDB();
    
    // Setup modal close
    const modal = document.getElementById('quickAddModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

// ===== Update Greeting =====
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    
    if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
    } else if (hour >= 17) {
        greeting = 'Good Evening';
    }
    
    document.getElementById('greeting').textContent = greeting + '! 👋';
}

// ===== Format Date =====
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// ===== Load User Data =====
function loadUserData() {
    const userName = localStorage.getItem('userName') || 'Guest';
    const greeting = document.getElementById('username');
    if (greeting) {
        greeting.textContent = `Welcome back, ${userName}!`;
    }
}

// ===== Load Routines from Local Storage (Demo) =====
function loadRoutinesFromDB() {
    const stored = localStorage.getItem('routines');
    if (stored) {
        routines = JSON.parse(stored);
    }
}

// ===== Save Routines to Local Storage =====
function saveRoutinesToDB() {
    localStorage.setItem('routines', JSON.stringify(routines));
}

// ===== Load Today's Routines =====
function loadTodayRoutines() {
    const today = new Date().toDateString();
    const todayRoutines = routines.filter(r => new Date(r.date).toDateString() === today);
    
    const container = document.getElementById('today-routines');
    if (!container) return;
    
    if (todayRoutines.length === 0) {
        container.innerHTML = '<p class="empty-state">No routines for today. <a href="add-routine.html">Add one now</a></p>';
        return;
    }
    
    container.innerHTML = todayRoutines.map(routine => `
        <div class="routine-card ${routine.completed ? 'completed' : ''}">
            <div class="routine-info">
                <div class="routine-name">${sanitize(routine.title)}</div>
                <div class="routine-meta">
                    <span>⏰ ${routine.time || 'No time set'}</span>
                    <span>📍 ${sanitize(routine.category) || 'General'}</span>
                </div>
                <p style="margin-top: 8px; color: var(--text-secondary);">${sanitize(routine.description)}</p>
            </div>
            <div class="routine-actions">
                <button class="btn btn-primary btn-small" onclick="markRoutineComplete(${routine.id})">
                    ${routine.completed ? '✓ Completed' : 'Mark Complete'}
                </button>
                <button class="btn btn-secondary btn-small" onclick="editRoutine(${routine.id})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteRoutine(${routine.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// ===== Load Weekly Routines =====
function loadWeeklyRoutines() {
    const container = document.getElementById('weekly-routines');
    if (!container) return;
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    let html = '';
    
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        const dayRoutines = routines.filter(r => 
            new Date(r.date).toDateString() === currentDay.toDateString()
        );
        
        html += `
            <div class="day-column">
                <div class="day-header">${days[i]}</div>
                <div class="day-routines">
                    ${dayRoutines.length === 0 ? '<p style="font-size: 0.8em; color: var(--text-secondary);">-</p>' : 
                    dayRoutines.map(r => `<div class="mini-routine">${sanitize(r.title)}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ===== Update Stats =====
function updateStats() {
    const today = new Date().toDateString();
    const todayRoutines = routines.filter(r => new Date(r.date).toDateString() === today);
    const completedToday = todayRoutines.filter(r => r.completed).length;
    
    document.getElementById('total-routines').textContent = todayRoutines.length;
    document.getElementById('completed-routines').textContent = completedToday;
    
    const rate = todayRoutines.length > 0 ? Math.round((completedToday / todayRoutines.length) * 100) : 0;
    document.getElementById('completion-rate').textContent = rate + '%';
    
    // Weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay() + 8);
    
    const weeklyCompleted = routines.filter(r => {
        const rDate = new Date(r.date);
        return r.completed && rDate >= weekStart && rDate < weekEnd;
    }).length;
    
    document.getElementById('weekly-stats').textContent = weeklyCompleted + ' routines completed';
    
    // Monthly stats
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    
    const monthlyCompleted = routines.filter(r => {
        const rDate = new Date(r.date);
        return r.completed && rDate >= monthStart && rDate <= monthEnd;
    }).length;
    
    document.getElementById('monthly-stats').textContent = monthlyCompleted + ' routines completed';
    
    // Streak calculation
    let streak = 0;
    let checkDate = new Date();
    while (true) {
        const checkStr = checkDate.toDateString();
        const dayRoutines = routines.filter(r => new Date(r.date).toDateString() === checkStr);
        if (dayRoutines.length === 0 || !dayRoutines.every(r => r.completed)) break;
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    document.getElementById('streak-stats').textContent = streak + ' days';
}

// ===== Mark Routine Complete =====
function markRoutineComplete(id) {
    const routine = routines.find(r => r.id === id);
    if (routine) {
        routine.completed = !routine.completed;
        routine.completedDate = new Date().toISOString();
        saveRoutinesToDB();
        loadTodayRoutines();
        updateStats();
        showNotification(routine.completed ? 'Routine completed! 🎉' : 'Routine marked incomplete');
    }
}

// ===== Edit Routine =====
function editRoutine(id) {
    const routine = routines.find(r => r.id === id);
    if (routine) {
        localStorage.setItem('editRoutine', JSON.stringify(routine));
        window.location.href = 'add-routine.html';
    }
}

// ===== Delete Routine =====
function deleteRoutine(id) {
    if (confirm('Are you sure you want to delete this routine?')) {
        routines = routines.filter(r => r.id !== id);
        saveRoutinesToDB();
        loadTodayRoutines();
        loadWeeklyRoutines();
        updateStats();
        showNotification('Routine deleted');
    }
}

// ===== Show Notification =====
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: var(--dark-bg);
        padding: 15px 25px;
        border-radius: 6px;
        z-index: 9999;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== Open Modal =====
function openModal(routineId) {
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
        document.getElementById('modal-routine-name').textContent = routine.title;
        document.getElementById('quickAddModal').dataset.routineId = routineId;
        document.getElementById('quickAddModal').style.display = 'block';
    }
}

// ===== Close Modal =====
function closeModal() {
    document.getElementById('quickAddModal').style.display = 'none';
}

// ===== Confirm Routine Completion =====
function confirmRoutineCompletion() {
    const modal = document.getElementById('quickAddModal');
    const routineId = parseInt(modal.dataset.routineId);
    markRoutineComplete(routineId);
    closeModal();
}

// ===== Sanitize Input =====
function sanitize(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Add Routine Functions (for add-routine.html) =====
function initAddRoutinePage() {
    const editRoutine = localStorage.getItem('editRoutine');
    if (editRoutine) {
        const routine = JSON.parse(editRoutine);
        document.getElementById('routine-title').value = routine.title;
        document.getElementById('routine-description').value = routine.description;
        document.getElementById('routine-category').value = routine.category;
        document.getElementById('routine-time').value = routine.time;
        document.getElementById('routine-date').value = routine.date.split('T')[0];
        document.getElementById('routine-frequency').value = routine.frequency || 'once';
        document.getElementById('page-title').textContent = 'Edit Routine';
        document.querySelector('button[type="submit"]').textContent = 'Update Routine';
    }
}

function saveRoutine(event) {
    event.preventDefault();
    
    const title = document.getElementById('routine-title').value.trim();
    const description = document.getElementById('routine-description').value.trim();
    const category = document.getElementById('routine-category').value;
    const time = document.getElementById('routine-time').value;
    const date = document.getElementById('routine-date').value;
    const frequency = document.getElementById('routine-frequency').value;
    
    if (!title || !date) {
        showNotification('Please fill in all required fields');
        return;
    }
    
    const editRoutine = localStorage.getItem('editRoutine');
    
    if (editRoutine) {
        const routine = JSON.parse(editRoutine);
        routine.title = title;
        routine.description = description;
        routine.category = category;
        routine.time = time;
        routine.date = new Date(date).toISOString();
        routine.frequency = frequency;
        
        const index = routines.findIndex(r => r.id === routine.id);
        if (index !== -1) {
            routines[index] = routine;
        }
        
        localStorage.removeItem('editRoutine');
        showNotification('Routine updated successfully! ✓');
    } else {
        const newRoutine = {
            id: Date.now(),
            title,
            description,
            category,
            time,
            date: new Date(date).toISOString(),
            frequency,
            completed: false,
            createdDate: new Date().toISOString()
        };
        
        routines.push(newRoutine);
        showNotification('Routine added successfully! ✓');
    }
    
    saveRoutinesToDB();
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// ===== View Routines Page =====
function loadAllRoutines() {
    const container = document.getElementById('all-routines');
    if (!container) return;
    
    if (routines.length === 0) {
        container.innerHTML = '<p class="empty-state">No routines yet. <a href="add-routine.html">Create your first routine</a></p>';
        return;
    }
    
    const sorted = [...routines].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(routine => `
        <div class="routine-card ${routine.completed ? 'completed' : ''}">
            <div class="routine-info">
                <div class="routine-name">${sanitize(routine.title)}</div>
                <div class="routine-meta">
                    <span>📅 ${new Date(routine.date).toLocaleDateString()}</span>
                    <span>⏰ ${routine.time || 'No time'}</span>
                    <span>📍 ${sanitize(routine.category) || 'General'}</span>
                    <span>🔄 ${routine.frequency || 'Once'}</span>
                </div>
                <p style="margin-top: 8px; color: var(--text-secondary);">${sanitize(routine.description)}</p>
            </div>
            <div class="routine-actions">
                <button class="btn btn-primary btn-small" onclick="markRoutineComplete(${routine.id})">
                    ${routine.completed ? '✓ Completed' : 'Complete'}
                </button>
                <button class="btn btn-secondary btn-small" onclick="editRoutine(${routine.id})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteRoutine(${routine.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// ===== Track Progress Page =====
function loadProgressPage() {
    loadRoutinesFromDB();
    
    const last30days = [...routines].filter(r => {
        const rDate = new Date(r.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return rDate >= thirtyDaysAgo;
    });
    
    const completed = last30days.filter(r => r.completed).length;
    const total = last30days.length;
    
    document.getElementById('progress-stats').innerHTML = `
        <div class="stat-box">
            <h3>Last 30 Days</h3>
            <p>${completed} / ${total} routines completed</p>
        </div>
        <div class="stat-box">
            <h3>Success Rate</h3>
            <p>${total > 0 ? Math.round((completed / total) * 100) : 0}%</p>
        </div>
    `;
    
    loadProgressChart();
}

function loadProgressChart() {
    const last7days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7days.push(date.toDateString());
    }
    
    const chartContainer = document.getElementById('progress-chart');
    chartContainer.innerHTML = last7days.map((day, index) => {
        const dayRoutines = routines.filter(r => new Date(r.date).toDateString() === day);
        const completed = dayRoutines.filter(r => r.completed).length;
        const percentage = dayRoutines.length > 0 ? (completed / dayRoutines.length) * 100 : 0;
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(day).getDay()];
        
        return `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="
                    width: 40px;
                    height: ${Math.max(percentage * 2, 10)}px;
                    background: linear-gradient(to top, var(--primary-color), var(--secondary-color));
                    border-radius: 4px;
                    margin-bottom: 8px;
                "></div>
                <small style="color: var(--text-secondary);">${dayName}</small>
            </div>
        `;
    }).join('');
}

// ===== Settings Page =====
function loadSettingsPage() {
    const userName = localStorage.getItem('userName') || '';
    document.getElementById('user-name').value = userName;
}

function saveSettings(event) {
    event.preventDefault();
    const userName = document.getElementById('user-name').value.trim();
    
    if (!userName) {
        showNotification('Please enter your name');
        return;
    }
    
    localStorage.setItem('userName', userName);
    showNotification('Settings saved successfully! ✓');
}

function exportData() {
    const dataStr = JSON.stringify(routines, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `routines-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showNotification('Data exported successfully! ✓');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                routines = imported;
                saveRoutinesToDB();
                showNotification('Data imported successfully! ✓');
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('Invalid data format');
            }
        } catch (error) {
            showNotification('Error importing data');
        }
    };
    reader.readAsText(file);
}

// ===== CSS Animations =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
