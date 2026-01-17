/* 
 * PROJECT MANAGEMENT SYSTEM LOGIC
 */

// --- CONFIG & CONSTANTS ---
const ADMIN_EMAIL = "ashwinanu7200@gmail.com";
const STORAGE_KEY_DATA = "pms_project_data";
const STORAGE_KEY_USERS = "pms_users";
const STORAGE_KEY_REMEMBER = "pms_remember_email";

// --- STATE MANAGEMENT ---
let currentUser = null; 
let projectData = [];
let usersData = [];

// --- DOM ELEMENTS ---
const container = document.getElementById('container');
const dashboardApp = document.getElementById('dashboard-app');
const registerBtn = document.getElementById('register-flip-btn');
const loginFlipBtn = document.getElementById('login-flip-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const guestBtn = document.getElementById('guest-login-btn');
const notificationArea = document.getElementById('notification-area');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    checkRememberMe();
});

function loadData() {
    // Load Projects
    const storedProjects = localStorage.getItem(STORAGE_KEY_DATA);
    projectData = storedProjects ? JSON.parse(storedProjects) : [
        { id: 1, date: "2023-10-25", name: "Product Launch", client: "Acme Corp", setup: "2023-10-24", show: "2023-10-25", loc: "NY Hall", crew: "Team A", remarks: "Confirmed" }
    ];

    // Load Users
    const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
    usersData = storedUsers ? JSON.parse(storedUsers) : [];
}

function checkRememberMe() {
    const savedEmail = localStorage.getItem(STORAGE_KEY_REMEMBER);
    if (savedEmail) {
        document.getElementById('login-email').value = savedEmail;
        document.getElementById('remember-me-check').checked = true;
    }
}

// --- AUTHENTICATION SYSTEM ---

// 1. UI FLIP ANIMATION
registerBtn.addEventListener('click', () => container.classList.add('active'));
loginFlipBtn.addEventListener('click', () => container.classList.remove('active'));

// 2. REGISTER LOGIC
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const termsCheck = document.getElementById('reg-terms-check');

    if (!termsCheck.checked) {
        showToast("You must accept the terms and conditions.", "error");
        return;
    }
    
    // Refresh User Data to be safe
    usersData = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "[]");

    if(email === ADMIN_EMAIL) {
        showToast("Cannot register as Admin.", "error");
        return;
    }
    if(usersData.find(u => u.email === email)) {
        showToast("Email already registered.", "error");
        return;
    }

    const newUser = { 
        name, 
        email, 
        password, 
        role: 'user', 
        approved: false, // Default is Pending
        regDate: new Date().toLocaleDateString() 
    }; 
    usersData.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usersData));
    
    showToast("Registration successful! Waiting for Admin approval.", "success");
    registerForm.reset();
    container.classList.remove('active'); // Flip back to login
});

// 3. LOGIN LOGIC
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // CRITICAL FIX: Refresh data from LocalStorage on every login attempt.
    // This ensures if Admin just approved you in another tab, you can login now.
    usersData = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "[]");
    projectData = JSON.parse(localStorage.getItem(STORAGE_KEY_DATA) || "[]");

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const rememberMe = document.getElementById('remember-me-check').checked;

    if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_REMEMBER, email);
    } else {
        localStorage.removeItem(STORAGE_KEY_REMEMBER);
    }

    // A. Check Admin
    if(email === ADMIN_EMAIL) {
        // Hardcoded admin for this demo
        currentUser = { email: email, role: 'admin', name: "Administrator" };
        enterDashboard();
        return;
    }

    // B. Check Standard Users
    const user = usersData.find(u => u.email === email && u.password === password);

    if(user) {
        if(!user.approved) {
            showToast("Account pending. Please wait for Admin approval.", "error");
            return;
        }
        currentUser = user;
        enterDashboard();
    } else {
        showToast("Invalid credentials or user not found.", "error");
    }
});

// 4. GUEST & LOGOUT
guestBtn.addEventListener('click', () => {
    currentUser = { role: 'guest', name: 'Guest' };
    enterDashboard();
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    dashboardApp.classList.add('hidden');
    container.classList.remove('hidden');
    document.body.style.background = "#e9ebee"; 
    loginForm.reset();
});

// --- DASHBOARD CONTROLLER ---

function enterDashboard() {
    container.classList.add('hidden');
    dashboardApp.classList.remove('hidden');
    document.body.style.background = "#fff";
    
    document.getElementById('user-display-name').textContent = currentUser.name + ` (${currentUser.role})`;

    // Hide everything first
    document.getElementById('guest-view').classList.add('hidden');
    document.getElementById('schedule-view').classList.add('hidden');
    document.getElementById('users-view').classList.add('hidden');
    document.getElementById('admin-tabs').classList.add('hidden');
    
    // UI Elements
    const adminToolbar = document.getElementById('admin-toolbar');
    const userTitle = document.getElementById('user-schedule-title');
    const actionsCol = document.querySelectorAll('.actions-col');

    // Route logic
    if (currentUser.role === 'guest') {
        document.getElementById('guest-view').classList.remove('hidden');
    } 
    else if (currentUser.role === 'user') {
        // USER VIEW: Schedule visible, but NO admin controls
        document.getElementById('schedule-view').classList.remove('hidden');
        adminToolbar.style.display = 'none';   // Hide Add/Save buttons
        userTitle.classList.remove('hidden'); // Show "Read Only" title
        
        // Hide Action Column (Delete button header)
        actionsCol.forEach(el => el.style.display = 'none');
        
        renderProjectTable();
    } 
    else if (currentUser.role === 'admin') {
        // ADMIN VIEW: Full access
        document.getElementById('schedule-view').classList.remove('hidden');
        document.getElementById('admin-tabs').classList.remove('hidden');
        adminToolbar.style.display = 'flex';
        userTitle.classList.add('hidden');
        
        actionsCol.forEach(el => el.style.display = 'table-cell');
        
        updatePendingCount();
        renderProjectTable();
    }
}

// --- ADMIN TABS ---
window.switchAdminTab = function(tabName) {
    const scheduleView = document.getElementById('schedule-view');
    const usersView = document.getElementById('users-view');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(t => t.classList.remove('active'));

    if (tabName === 'schedule') {
        scheduleView.classList.remove('hidden');
        usersView.classList.add('hidden');
        tabs[0].classList.add('active');
        renderProjectTable();
    } else {
        scheduleView.classList.add('hidden');
        usersView.classList.remove('hidden');
        tabs[1].classList.add('active');
        renderUserTable();
    }
};

// --- TABLE 1: PROJECT SCHEDULE ---

function renderProjectTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = "";
    
    const isAdmin = (currentUser && currentUser.role === 'admin');

    projectData.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Helper to create cells
        const createCell = (key, type='text') => {
            const td = document.createElement('td');
            
            if(isAdmin) {
                // ADMIN: See INPUT fields to edit
                const input = document.createElement('input');
                input.type = type;
                input.value = row[key] || '';
                input.onchange = (e) => { projectData[index][key] = e.target.value; };
                td.appendChild(input);
            } else {
                // USER: See plain TEXT (Read Only)
                td.textContent = row[key] || '';
                td.style.padding = "20px 15px"; // Slightly better spacing for text
            }
            return td;
        };

        tr.appendChild(createCell('date', 'date'));
        tr.appendChild(createCell('name'));
        tr.appendChild(createCell('client'));
        tr.appendChild(createCell('setup', 'date'));
        tr.appendChild(createCell('show', 'date'));
        tr.appendChild(createCell('loc'));
        tr.appendChild(createCell('crew'));
        tr.appendChild(createCell('remarks'));

        // Delete Button (Only for Admin)
        if(isAdmin) {
            const tdAction = document.createElement('td');
            const btn = document.createElement('button');
            btn.className = 'btn-delete';
            btn.innerHTML = '<i data-feather="trash-2" style="width:16px;"></i>';
            btn.onclick = () => deleteProject(index);
            tdAction.appendChild(btn);
            tr.appendChild(tdAction);
        }
        
        tbody.appendChild(tr);
    });
    feather.replace();
}

// Project Actions (Admin Only)
document.getElementById('add-row-btn').addEventListener('click', () => {
    projectData.push({ id: Date.now(), date: "", name: "", client: "", setup: "", show: "", loc: "", crew: "", remarks: "" });
    renderProjectTable();
});

document.getElementById('save-data-btn').addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(projectData));
    showToast("Schedule Saved Successfully!", "success");
});

function deleteProject(index) {
    if(confirm("Delete this project row?")) {
        projectData.splice(index, 1);
        renderProjectTable();
    }
}

// --- TABLE 2: USER APPROVALS ---

function renderUserTable() {
    // Re-fetch to ensure we have latest
    usersData = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "[]");
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = "";

    usersData.forEach((user, index) => {
        const tr = document.createElement('tr');
        
        const tdName = document.createElement('td'); tdName.textContent = user.name;
        const tdEmail = document.createElement('td'); tdEmail.textContent = user.email;
        const tdDate = document.createElement('td'); tdDate.textContent = user.regDate || "-";
        
        const tdStatus = document.createElement('td');
        const spanStatus = document.createElement('span');
        spanStatus.className = user.approved ? 'status-approved' : 'status-pending';
        spanStatus.textContent = user.approved ? 'Active' : 'Pending';
        tdStatus.appendChild(spanStatus);

        const tdAction = document.createElement('td');
        
        if(!user.approved) {
            const btnApprove = document.createElement('button');
            btnApprove.className = 'btn-approve';
            btnApprove.textContent = 'Approve';
            btnApprove.onclick = () => approveUser(index);
            
            const btnReject = document.createElement('button');
            btnReject.className = 'btn-reject';
            btnReject.textContent = 'Reject';
            btnReject.onclick = () => rejectUser(index);
            
            tdAction.appendChild(btnApprove);
            tdAction.appendChild(btnReject);
        } else {
            tdAction.innerHTML = '<span style="color:#aaa;">No action</span>';
        }

        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdDate);
        tr.appendChild(tdStatus);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    });
}

function updatePendingCount() {
    usersData = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "[]");
    const count = usersData.filter(u => !u.approved).length;
    document.getElementById('pending-count').textContent = count;
}

function approveUser(index) {
    usersData[index].approved = true;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usersData));
    
    showToast(`User ${usersData[index].name} approved.`, "success");
    
    // Open Mail Client
    const user = usersData[index];
    const subject = encodeURIComponent("Account Approved");
    const body = encodeURIComponent(`Hi ${user.name},\n\nYour account has been approved.\nLogin here: ${window.location.href}`);
    window.open(`mailto:${user.email}?subject=${subject}&body=${body}`);
    
    renderUserTable();
    updatePendingCount();
}

function rejectUser(index) {
    if(confirm(`Reject ${usersData[index].name}?`)) {
        usersData.splice(index, 1);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usersData));
        showToast("User rejected.", "info");
        renderUserTable();
        updatePendingCount();
    }
}

// --- TOAST NOTIFICATION ---
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeft = `5px solid ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'}`;
    toast.textContent = message;
    notificationArea.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
