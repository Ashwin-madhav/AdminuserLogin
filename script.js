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

// --- REMEMBER ME LOGIC ---
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

    // Validation
    if (!termsCheck.checked) {
        showToast("You must accept the terms and conditions.", "error");
        return;
    }
    if(email === ADMIN_EMAIL) {
        showToast("Cannot register as Admin.", "error");
        return;
    }
    if(usersData.find(u => u.email === email)) {
        showToast("Email already registered.", "error");
        return;
    }

    // Save New User (Pending Status)
    const newUser = { 
        name, 
        email, 
        password, 
        role: 'user', 
        approved: false, 
        regDate: new Date().toLocaleDateString() 
    }; 
    usersData.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usersData));
    
    showToast("Registration successful! Please wait for Admin approval.", "success");
    registerForm.reset();
    container.classList.remove('active'); // Flip back to login
});

// 3. LOGIN LOGIC
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const rememberMe = document.getElementById('remember-me-check').checked;

    // A. Handle Remember Me
    if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_REMEMBER, email);
    } else {
        localStorage.removeItem(STORAGE_KEY_REMEMBER);
    }

    // B. Check Admin
    if(email === ADMIN_EMAIL) {
        // Admin password check (Simulated)
        currentUser = { email: email, role: 'admin', name: "Administrator" };
        enterDashboard();
        return;
    }

    // C. Check Standard Users
    const user = usersData.find(u => u.email === email && u.password === password);

    if(user) {
        if(!user.approved) {
            showToast("Your account is still pending Admin approval.", "error");
            return;
        }
        currentUser = user;
        enterDashboard();
    } else {
        showToast("Invalid credentials", "error");
    }
});

// 4. GUEST LOGIN
guestBtn.addEventListener('click', () => {
    currentUser = { role: 'guest', name: 'Guest' };
    enterDashboard();
});

// 5. LOGOUT
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

    // Reset View State
    document.getElementById('guest-view').classList.add('hidden');
    document.getElementById('schedule-view').classList.add('hidden');
    document.getElementById('users-view').classList.add('hidden');
    document.getElementById('admin-tabs').classList.add('hidden');
    document.getElementById('admin-toolbar').style.display = 'none'; // Default hidden

    // Route Views based on Role
    if (currentUser.role === 'guest') {
        document.getElementById('guest-view').classList.remove('hidden');
    } 
    else if (currentUser.role === 'user') {
        document.getElementById('schedule-view').classList.remove('hidden');
        document.querySelectorAll('.action-btn').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.actions-col').forEach(col => col.style.display = 'none');
        renderProjectTable();
    } 
    else if (currentUser.role === 'admin') {
        document.getElementById('schedule-view').classList.remove('hidden');
        document.getElementById('admin-tabs').classList.remove('hidden');
        document.getElementById('admin-toolbar').style.display = 'flex';
        document.querySelectorAll('.action-btn').forEach(btn => btn.style.display = 'inline-block');
        
        updatePendingCount();
        renderProjectTable();
    }
}

// --- ADMIN TAB SWITCHING ---
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

// --- TABLE 1: PROJECT SCHEDULE LOGIC ---

function renderProjectTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = "";
    
    const isAdmin = currentUser.role === 'admin';
    const actionsHeader = document.querySelector('.actions-col');
    if(actionsHeader) actionsHeader.style.display = isAdmin ? 'table-cell' : 'none';

    projectData.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        const createCell = (key, type='text') => {
            const td = document.createElement('td');
            if(isAdmin) {
                const input = document.createElement('input');
                input.type = type;
                input.value = row[key] || '';
                input.onchange = (e) => { projectData[index][key] = e.target.value; };
                td.appendChild(input);
            } else {
                td.textContent = row[key] || '';
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

// Project Actions
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

// --- TABLE 2: USER MANAGEMENT LOGIC (ADMIN) ---

function renderUserTable() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = "";

    usersData.forEach((user, index) => {
        const tr = document.createElement('tr');
        
        // Name
        const tdName = document.createElement('td');
        tdName.textContent = user.name;
        tr.appendChild(tdName);

        // Email
        const tdEmail = document.createElement('td');
        tdEmail.textContent = user.email;
        tr.appendChild(tdEmail);

        // Date
        const tdDate = document.createElement('td');
        tdDate.textContent = user.regDate || "-";
        tr.appendChild(tdDate);

        // Status
        const tdStatus = document.createElement('td');
        const spanStatus = document.createElement('span');
        spanStatus.className = user.approved ? 'status-approved' : 'status-pending';
        spanStatus.textContent = user.approved ? 'Active' : 'Pending';
        tdStatus.appendChild(spanStatus);
        tr.appendChild(tdStatus);

        // Actions
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
            tdAction.textContent = "-";
        }
        tr.appendChild(tdAction);
        
        tbody.appendChild(tr);
    });
}

function updatePendingCount() {
    const count = usersData.filter(u => !u.approved).length;
    document.getElementById('pending-count').textContent = count;
}

function approveUser(index) {
    const user = usersData[index];
    user.approved = true;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usersData));
    
    // UI Feedback
    showToast(`User ${user.name} approved.`, "success");
    
    // EMAIL SIMULATION (Client-Side)
    // We open a mailto link to let the Admin send the email manually
    const subject = encodeURIComponent("Project System Account Approved");
    const body = encodeURIComponent(`Hello ${user.name},\n\nYour account for the Project Management System has been approved by the Admin.\n\nYou can now log in here: ${window.location.href}\n\nRegards,\nAdmin`);
    window.open(`mailto:${user.email}?subject=${subject}&body=${body}`);
    
    renderUserTable();
    updatePendingCount();
}

function rejectUser(index) {
    if(confirm(`Are you sure you want to reject and remove ${usersData[index].name}?`)) {
        usersData.splice(index, 1);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usersData));
        showToast("User request rejected/removed.", "info");
        renderUserTable();
        updatePendingCount();
    }
}

// --- UTILITY: TOAST ---
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeft = `5px solid ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'}`;
    toast.textContent = message;
    notificationArea.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}