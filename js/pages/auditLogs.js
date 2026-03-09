/* =============================================================
   AUDIT LOGS.JS — Admin: System Activity Trail
   ============================================================= */

function renderAuditLogs(container) {
    if (!Auth.requireRole('admin')) return;

    function getLogs() {
        return DB.getAll('auditLogs').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    const actionColors = {
        'LOGIN': '#10b981', 'LOGOUT': '#94a3b8', 'LOGIN_FAILED': '#ef4444',
        'CREATE_PATIENT': '#00d4ff', 'UPDATE_PATIENT': '#f59e0b', 'DELETE_PATIENT': '#ef4444',
        'RECORD_VITALS': '#06d6a0', 'DOCTOR_NOTE': '#a855f7',
        'ADD_STAFF': '#3b82f6', 'EDIT_STAFF': '#f59e0b', 'STAFF_STATUS': '#94a3b8',
        'AI_ANALYSIS': '#a855f7', 'ACK_ALERT': '#10b981', 'ACK_ALL_ALERTS': '#10b981'
    };
    const actionIcons = {
        'LOGIN': '🔐', 'LOGOUT': '🚪', 'LOGIN_FAILED': '❌',
        'CREATE_PATIENT': '➕', 'UPDATE_PATIENT': '✏️', 'DELETE_PATIENT': '🗑',
        'RECORD_VITALS': '💓', 'DOCTOR_NOTE': '🩺',
        'ADD_STAFF': '👤', 'EDIT_STAFF': '✏️', 'STAFF_STATUS': '🔄',
        'AI_ANALYSIS': '🤖', 'ACK_ALERT': '✅', 'ACK_ALL_ALERTS': '✅'
    };

    function renderLogs() {
        const logs = getLogs();
        const search = (document.getElementById('audit-search')?.value || '').toLowerCase();
        const actionFilter = document.getElementById('audit-action-filter')?.value || '';
        const roleFilter = document.getElementById('audit-role-filter')?.value || '';
        let filtered = logs;
        if (search) filtered = filtered.filter(l => l.userName.toLowerCase().includes(search) || l.details.toLowerCase().includes(search));
        if (actionFilter) filtered = filtered.filter(l => l.action === actionFilter);
        if (roleFilter) filtered = filtered.filter(l => l.userRole === roleFilter);

        const countEl = document.getElementById('audit-count');
        if (countEl) countEl.textContent = `${filtered.length} log entries`;

        const tableEl = document.getElementById('audit-table');
        if (!tableEl) return;
        tableEl.innerHTML = filtered.length ? `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            ${filtered.slice(0, 100).map(l => {
            const color = actionColors[l.action] || '#94a3b8';
            const icon = actionIcons[l.action] || '📋';
            return `
                <tr>
                  <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${Utils.formatDateTime(l.timestamp)}</td>
                  <td style="font-size:13px;font-weight:600">${Utils.escapeHtml(l.userName)}</td>
                  <td><span class="badge badge-${l.userRole}">${Utils.capitalize(l.userRole)}</span></td>
                  <td>
                    <span style="display:inline-flex;align-items:center;gap:5px;background:${color}18;color:${color};border:1px solid ${color}40;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600">
                      ${icon} ${l.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style="font-size:12px;color:var(--text-secondary);max-width:300px">${Utils.escapeHtml(l.details)}</td>
                </tr>
              `;
        }).join('')}
          </tbody>
        </table>
      </div>
      ${filtered.length > 100 ? `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">Showing 100 of ${filtered.length} entries</div>` : ''}
    ` : '<div class="empty-state"><div class="empty-icon">📋</div><h3>No logs found</h3></div>';
    }

    const uniqueActions = [...new Set(getLogs().map(l => l.action))];

    container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>📋 Audit Logs</h1>
          <p id="audit-count">${getLogs().length} log entries</p>
        </div>
      </div>
      <div class="search-filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="audit-search" class="form-control" placeholder="Search by user or details..." oninput="renderLogs()">
        </div>
        <select id="audit-action-filter" class="form-control filter-select" onchange="renderLogs()">
          <option value="">All Actions</option>
          ${uniqueActions.map(a => `<option value="${a}">${a.replace(/_/g, ' ')}</option>`).join('')}
        </select>
        <select id="audit-role-filter" class="form-control filter-select" onchange="renderLogs()">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="system">System</option>
        </select>
      </div>
      <div class="card"><div id="audit-table"></div></div>
    </div>
  `;

    window.renderLogs = renderLogs;
    renderLogs();
}
