// CircleUp Admin Command Center
const API_BASE = window.location.origin;

function getToken() {
    let token = localStorage.getItem('admin_token');
    if (!token) {
        token = prompt("Enter your Admin Access Token (from the CircleUp app):");
        if (token) localStorage.setItem('admin_token', token);
    }
    return token;
}

function logout() {
    localStorage.removeItem('admin_token');
    location.reload();
}

// ──────────────────────────────────────────────
// SECTION 1: KPI Stats + Activity Log
// ──────────────────────────────────────────────
async function fetchAdminStats() {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE}/tools/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('admin_token');
                alert("Access Denied. Please refresh and enter a valid admin token.");
            }
            throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        renderStats(data);
        updateTimestamp();
    } catch (error) {
        console.error('Dashboard Error:', error);
    }
}

function renderStats(data) {
    document.getElementById('total-users').innerText = data.total_users;
    document.getElementById('total-tools').innerText = data.total_tools;
    document.getElementById('active-rentals').innerText = data.active_rentals;

    const tbody = document.getElementById('activity-log');
    tbody.innerHTML = '';

    if (!data.global_activity || data.global_activity.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding:40px;">No activity yet. When neighbors start borrowing and lending, it will appear here!</td></tr>';
        return;
    }

    data.global_activity.forEach(act => {
        const dateObj = new Date(act.date);
        const dateStr = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${act.user}</strong></td>
            <td><span class="action-type">${act.action}</span></td>
            <td><strong>${act.tool}</strong></td>
            <td><span class="status-badge ${act.status === 'In Use' ? 'in-use' : 'returned'}">${act.status.toUpperCase()}</span></td>
            <td style="color: var(--text-muted); font-size:0.85rem;">${dateStr}</td>
            <td>
                <div class="manage-btns">
                    <button class="btn-verify" onclick="verifyUser(${act.user_id})"><i data-lucide="check-circle"></i> Verify</button>
                    ${act.tool_id ? `<button class="btn-suspend" onclick="suspendTool(${act.tool_id})"><i data-lucide="eye-off"></i> Hide</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// ──────────────────────────────────────────────
// SECTION 2: Neighborhood Directory
// ──────────────────────────────────────────────
async function fetchUsers() {
    try {
        const token = getToken();
        if (!token) return;

        const tbody = document.getElementById('users-log');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding:20px;">Loading...</td></tr>';

        const response = await fetch(`${API_BASE}/tools/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch users');

        const users = await response.json();
        renderUsers(users);
    } catch (error) {
        console.error('Users Error:', error);
        document.getElementById('users-log').innerHTML = '<tr><td colspan="7" style="text-align:center; color:#E74C3C; padding:20px;">Failed to load. Check console.</td></tr>';
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-log');
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding:40px;">No neighbors yet.</td></tr>';
        return;
    }

    users.forEach(u => {
        const verifiedBadge = u.is_verified
            ? `<span class="status-badge returned"><i data-lucide="shield-check" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> Verified</span>`
            : `<span class="status-badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted);">Unverified</span>`;

        const ownerBadge = u.is_owner
            ? `<span class="status-badge in-use" style="margin-left:4px; font-size:0.65rem;">ADMIN</span>`
            : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--text-muted); font-size:0.85rem;">#${u.id}</td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="admin-avatar" style="background: hsl(${(u.id * 67) % 360}, 65%, 55%); color:#fff; font-size:0.9rem; flex-shrink:0;">${(u.name || '?')[0].toUpperCase()}</div>
                    <div>
                        <strong>${u.name}</strong>${ownerBadge}
                    </div>
                </div>
            </td>
            <td style="font-size:0.9rem;">${u.email}</td>
            <td style="font-size:0.9rem; font-family:monospace;">${u.phone}</td>
            <td><span style="color: var(--accent); font-weight:800;">${u.karma} pts</span></td>
            <td>${verifiedBadge}</td>
            <td>
                <div class="manage-btns">
                    ${!u.is_verified ? `<button class="btn-verify" onclick="verifyUser(${u.id})"><i data-lucide="check-circle"></i> Verify</button>` : '<span style="color:var(--primary); font-size:0.8rem; font-weight:700;">✓ Done</span>'}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// ──────────────────────────────────────────────
// SECTION 3: Admin Actions
// ──────────────────────────────────────────────
async function verifyUser(userId) {
    if (!userId) { alert("Cannot verify: missing user ID."); return; }
    if (!confirm("Grant Blue Verification Tick to this neighbor?")) return;
    try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/tools/admin/users/${userId}/verify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert("Neighbor verified! They now have the Blue Tick.");
            fetchUsers();
            fetchAdminStats();
        } else {
            alert("Failed to verify user. Check console.");
        }
    } catch (e) { console.error(e); }
}

async function suspendTool(toolId) {
    if (!confirm("Hide this tool from the map and search?")) return;
    try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/tools/admin/tools/${toolId}/suspend`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert("Tool suspended and hidden from the community.");
            fetchAdminStats();
        }
    } catch (e) { console.error(e); }
}

function refreshData() {
    const btns = document.querySelectorAll('.refresh-btn');
    btns.forEach(btn => {
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Refreshing...';
    });
    lucide.createIcons();
    
    Promise.all([fetchAdminStats(), fetchUsers()]).finally(() => {
        btns.forEach(btn => {
            btn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh';
        });
        lucide.createIcons();
    });
}

function updateTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN');
    const liveLabel = document.getElementById('live-label');
    if (liveLabel) liveLabel.innerText = `LIVE — Updated: ${timeStr}`;
}

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    fetchAdminStats();
    fetchUsers();
    setInterval(() => { fetchAdminStats(); fetchUsers(); }, 30000);
});
