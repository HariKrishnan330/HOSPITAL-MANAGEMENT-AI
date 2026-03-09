/* =============================================================
   PATIENTS.JS — Patient List, Search, Filter, CRUD
   ============================================================= */

function renderPatients(container) {
    if (!Auth.requireAuth()) return;
    const role = Auth.getRole();

    function getPatients() {
        return DB.getAll('patients').filter(p => !p.isDeleted)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    function renderTable(list) {
        if (!list.length) return `<div class="empty-state"><div class="empty-icon">🧑‍⚕️</div><h3>No patients found</h3><p>Try adjusting your search or filters</p></div>`;
        return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age/Gender</th><th>Department</th>
              <th>Assigned Doctor</th><th>Status</th><th>Admission Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => {
            const doctor = DB.getById('users', p.assignedDoctorId);
            const nurse = DB.getById('users', p.assignedNurseId);
            const alerts = DB.getPatientAlerts(p.id).filter(a => !a.acknowledged);
            return `
                <tr>
                  <td><span class="patient-id">${p.id}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="avatar" style="width:30px;height:30px;border-radius:50%;background:${Utils.roleGradient('doctor')};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${Utils.initials(p.name)}</div>
                      <div>
                        <div style="font-weight:600">${Utils.escapeHtml(p.name)}</div>
                        ${alerts.length ? `<span style="font-size:10px;color:var(--danger)">🚨 ${alerts.length} AI alert</span>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>${p.age}y · ${Utils.capitalize(p.gender)}</td>
                  <td><span class="dept-badge">${p.department}</span></td>
                  <td><span style="font-size:12px">${doctor ? doctor.name : '—'}</span></td>
                  <td><span class="badge badge-${p.status}">${Utils.statusBadge(p.status)}</span></td>
                  <td style="font-size:12px;color:var(--text-secondary)">${Utils.formatDate(p.admissionDate)}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-sm btn-secondary" onclick="Router.navigate('patient-profile',{id:'${p.id}'})">👁 View</button>
                      ${(role === 'admin' || role === 'doctor') ? `<button class="btn btn-sm btn-warning" onclick="Router.navigate('patient-form',{id:'${p.id}'})">✏️</button>` : ''}
                      ${role === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deletePatient('${p.id}')">🗑</button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
        }).join('')}
          </tbody>
        </table>
      </div>
    `;
    }

    function render() {
        const patients = getPatients();
        const search = (document.getElementById('patient-search')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('status-filter')?.value || '';
        const deptFilter = document.getElementById('dept-filter')?.value || '';

        let filtered = patients;
        if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search) || (p.phone || '').includes(search));
        if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);
        if (deptFilter) filtered = filtered.filter(p => p.department === deptFilter);

        const tableContainer = document.getElementById('patient-table-container');
        if (tableContainer) tableContainer.innerHTML = renderTable(filtered);
        const countEl = document.getElementById('patient-count');
        if (countEl) countEl.textContent = `${filtered.length} patient${filtered.length !== 1 ? 's' : ''}`;
    }

    container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Patient Management</h1>
          <p id="patient-count">${getPatients().length} patients registered</p>
        </div>
        <div class="page-header-actions">
          ${(role === 'admin' || role === 'doctor') ? `<button class="btn btn-primary" onclick="Router.navigate('patient-form')">➕ Add Patient</button>` : ''}
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="search-filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="patient-search" class="form-control" placeholder="Search by name, ID, or phone..." oninput="refreshPatientTable()">
        </div>
        <select id="status-filter" class="form-control filter-select" onchange="refreshPatientTable()">
          <option value="">All Statuses</option>
          <option value="admitted">Admitted</option>
          <option value="critical">Critical</option>
          <option value="stable">Stable</option>
          <option value="improving">Improving</option>
          <option value="discharged">Discharged</option>
        </select>
        <select id="dept-filter" class="form-control filter-select" onchange="refreshPatientTable()">
          <option value="">All Departments</option>
          ${Utils.DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>

      <div class="card">
        <div id="patient-table-container">${renderTable(getPatients())}</div>
      </div>
    </div>
  `;

    window.refreshPatientTable = render;
    window.deletePatient = async function (id) {
        const confirmed = await Utils.confirm('Are you sure you want to delete this patient record? This action cannot be undone.');
        if (!confirmed) return;
        DB.update('patients', id, { isDeleted: true });
        DB.log('DELETE_PATIENT', `Patient ${id} soft-deleted`);
        Utils.toast('Patient record deleted.', 'success');
        render();
    };
}
