/* =============================================================
   STAFF MANAGEMENT.JS — Admin: Add/Edit/Remove Staff
   ============================================================= */

function renderStaffManagement(container) {
    if (!Auth.requireRole('admin')) return;

    function getAllStaff() {
        return DB.getAll('users').sort((a, b) => a.role.localeCompare(b.role));
    }

    function renderTable(list) {
        const search = (document.getElementById('staff-search')?.value || '').toLowerCase();
        const roleFilter = document.getElementById('staff-role-filter')?.value || '';
        let filtered = list;
        if (search) filtered = filtered.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
        if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter);

        const countEl = document.getElementById('staff-count');
        if (countEl) countEl.textContent = `${filtered.length} staff member${filtered.length !== 1 ? 's' : ''}`;

        const tableEl = document.getElementById('staff-table');
        if (!tableEl) return;
        tableEl.innerHTML = filtered.length ? `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Specialization</th><th>Email</th><th>Shift</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${filtered.map(u => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="avatar" style="width:30px;height:30px;border-radius:50%;background:${Utils.roleGradient(u.role)};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${Utils.initials(u.name)}</div>
                    <span style="font-weight:600">${Utils.escapeHtml(u.name)}</span>
                  </div>
                </td>
                <td><span class="badge badge-${u.role}">${Utils.capitalize(u.role)}</span></td>
                <td><span class="dept-badge">${u.department}</span></td>
                <td style="font-size:12px;color:var(--text-secondary)">${u.specialization || '—'}</td>
                <td style="font-size:12px;color:var(--text-muted)">${u.email}</td>
                <td style="font-size:12px">${Utils.capitalize(u.shift || '—')}</td>
                <td><span class="badge ${u.isActive ? 'badge-stable' : 'badge-discharged'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-sm btn-warning" onclick="openStaffModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="toggleStaffStatus('${u.id}', ${u.isActive})">${u.isActive ? '🚫' : '✅'}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<div class="empty-state"><div class="empty-icon">👥</div><h3>No staff found</h3></div>';
    }

    container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>👥 Staff Management</h1>
          <p id="staff-count">${getAllStaff().length} staff members</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="openStaffModal(null)">➕ Add Staff</button>
        </div>
      </div>
      <div class="search-filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="staff-search" class="form-control" placeholder="Search by name or email..." oninput="refreshStaff()">
        </div>
        <select id="staff-role-filter" class="form-control filter-select" onchange="refreshStaff()">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
        </select>
      </div>
      <div class="card"><div id="staff-table"></div></div>
    </div>
  `;

    renderTable(getAllStaff());
    window.refreshStaff = () => renderTable(getAllStaff());

    window.toggleStaffStatus = function (id, isActive) {
        DB.update('users', id, { isActive: !isActive });
        DB.log('STAFF_STATUS', `Staff ${id} status changed to ${!isActive ? 'active' : 'inactive'}`);
        Utils.toast(`Staff ${!isActive ? 'activated' : 'deactivated'}.`, 'success');
        renderTable(getAllStaff());
    };

    window.openStaffModal = function (user) {
        const isEdit = Boolean(user);
        Utils.showModal(`
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '✏️ Edit Staff' : '➕ Add Staff Member'}</h3>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <form id="staff-form" onsubmit="submitStaff(event,${isEdit ? `'${user.id}'` : 'null'})">
        <div class="form-grid form-grid-2" style="margin-bottom:14px">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="s-name" class="form-control" value="${user ? Utils.escapeHtml(user.name) : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email *</label>
            <input type="email" id="s-email" class="form-control" value="${user ? user.email : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Role *</label>
            <select id="s-role" class="form-control" required>
              <option value="">Select Role</option>
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="doctor" ${user?.role === 'doctor' ? 'selected' : ''}>Doctor</option>
              <option value="nurse" ${user?.role === 'nurse' ? 'selected' : ''}>Nurse</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Department *</label>
            <select id="s-dept" class="form-control" required>
              <option value="">Select Department</option>
              ${Utils.DEPARTMENTS.map(d => `<option value="${d}" ${user?.department === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Specialization</label>
            <input type="text" id="s-spec" class="form-control" value="${user ? Utils.escapeHtml(user.specialization || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Shift</label>
            <select id="s-shift" class="form-control">
              <option value="morning" ${user?.shift === 'morning' ? 'selected' : ''}>Morning</option>
              <option value="evening" ${user?.shift === 'evening' ? 'selected' : ''}>Evening</option>
              <option value="night" ${user?.shift === 'night' ? 'selected' : ''}>Night</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" id="s-phone" class="form-control" value="${user ? (user.phone || '') : ''}">
          </div>
          ${!isEdit ? `
          <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="password" id="s-pass" class="form-control" placeholder="Minimum 8 characters" required>
          </div>` : '<div></div>'}
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? '💾 Save Changes' : '➕ Add Staff'}</button>
        </div>
      </form>
    `);
    };

    window.submitStaff = function (e, userId) {
        e.preventDefault();
        const data = {
            name: document.getElementById('s-name').value.trim(),
            email: document.getElementById('s-email').value.trim(),
            role: document.getElementById('s-role').value,
            department: document.getElementById('s-dept').value,
            specialization: document.getElementById('s-spec').value,
            shift: document.getElementById('s-shift').value,
            phone: document.getElementById('s-phone').value,
            isActive: true
        };
        if (!userId) {
            const pass = document.getElementById('s-pass')?.value;
            if (!pass || pass.length < 8) { Utils.toast('Password must be at least 8 characters.', 'error'); return; }
            const existing = DB.getAll('users').find(u => u.email === data.email);
            if (existing) { Utils.toast('Email already registered.', 'error'); return; }
            data.id = Utils.generateUserId();
            data.passwordHash = Utils.hashPassword(pass);
            data.createdAt = Utils.nowISO();
            DB.insert('users', data);
            DB.log('ADD_STAFF', `Staff added: ${data.name} (${data.role})`);
            Utils.toast(`Staff member ${data.name} added.`, 'success');
        } else {
            DB.update('users', userId, data);
            DB.log('EDIT_STAFF', `Staff updated: ${userId}`);
            Utils.toast('Staff record updated.', 'success');
        }
        Utils.closeModal();
        renderTable(getAllStaff());
    };
}
