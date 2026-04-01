// CircleUp Admin Orchestration
const API_BASE = window.location.origin; // Assuming we are served from the same backend

async function fetchAdminStats() {
    try {
        console.log("Fetching platform stats...");
        // In a real app, we'd get the token from a login flow. 
        // For development, we'll prompt the user if token is missing.
        let token = localStorage.getItem('admin_token');
        
        if (!token) {
            token = prompt("Please enter your Admin Access Token (from the app login):");
            if (token) localStorage.setItem('admin_token', token);
        }

        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('admin_token');
                alert("Access Denied. Please refresh and enter a valid token.");
            }
            throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error('Dashboard Error:', error);
    }
}

function updateUI(data) {
    // Update KPI Cards
    document.getElementById('total-users').innerText = data.total_users;
    document.getElementById('total-tools').innerText = data.total_tools;
    document.getElementById('active-rentals').innerText = data.active_rentals;

    // Update Activity Table
    const tbody = document.getElementById('activity-log');
    tbody.innerHTML = ''; // Clear current

    data.global_activity.forEach(act => {
        const dateObj = new Date(act.date);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${act.user}</td>
            <td><span class="action-type">${act.action}</span></td>
            <td><strong>${act.tool}</strong></td>
            <td><span class="status-badge ${act.status === 'In Use' ? 'in-use' : 'returned'}">${act.status.toUpperCase()}</span></td>
            <td>${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });

    // Update Last Updated time
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const liveStatus = document.querySelector('.live-status span');
    if (liveStatus) liveStatus.innerText = `LIVE OVERVIEW - Updated: ${timeStr}`;
}

function refreshData() {
    const btn = document.querySelector('.refresh-btn');
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Refreshing...';
    lucide.createIcons();
    
    fetchAdminStats().finally(() => {
        btn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh';
        lucide.createIcons();
    });
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    fetchAdminStats();
    
    // Auto-refresh every 30 seconds
    setInterval(fetchAdminStats, 30000);
});
