/* =============================================================
   OPERATION TIMELINE.JS — Surgical Operations Schedule Dashboard
   ============================================================= */

function renderOperationTimeline(container) {
    if (!Auth.requireAuth()) return;
    const role = Auth.getRole();

    /* ── Helpers ── */
    const OP_ICONS = {
        'Brain': '🧠', 'Cardiac': '🫀', 'Heart': '🫀',
        'Orthopedic': '🦴', 'Leg': '🦵', 'Arm': '💪', 'Spine': '🦴',
        'Abdominal': '🫃', 'Appendix': '🩺', 'Kidney': '🫘',
        'Eye': '👁', 'ENT': '👂', 'Dental': '🦷',
        'Gynecology': '🏥', 'Cesarean': '🏥', 'Laparoscopic': '🔬',
        'General': '🩺', 'Emergency': '🚨', 'Transplant': '💉'
    };
    const STATUS_CONFIG = {
        upcoming: { label: 'Upcoming', color: 'var(--primary)', icon: '⏳', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.3)' },
        'in-progress': { label: 'In Progress', color: 'var(--warning)', icon: '🔴', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.4)' },
        completed: { label: 'Completed', color: 'var(--success)', icon: '✅', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)' },
        cancelled: { label: 'Cancelled', color: 'var(--text-muted)', icon: '❌', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.2)' },
        delayed: { label: 'Delayed', color: '#f97316', icon: '⚠️', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)' }
    };
    function getOpIcon(type) {
        for (const [key, icon] of Object.entries(OP_ICONS)) {
            if (type.toLowerCase().includes(key.toLowerCase())) return icon;
        }
        return '🏥';
    }
    function getOpsForDate(dateStr) {
        return DB.getAll('operations')
            .filter(op => op.scheduledDate === dateStr)
            .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    }
    function formatOpTime(t) {
        const [h, m] = t.split(':').map(Number);
        const am = h < 12 ? 'AM' : 'PM';
        return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${am}`;
    }
    function isNow(op) {
        const now = new Date();
        const opDate = op.scheduledDate;
        const todayStr = now.toISOString().slice(0, 10);
        if (opDate !== todayStr) return false;
        const [h, m] = op.scheduledTime.split(':').map(Number);
        const opStart = new Date(); opStart.setHours(h, m, 0, 0);
        const opEnd = new Date(opStart.getTime() + (op.durationMinutes || 90) * 60000);
        return now >= opStart && now <= opEnd;
    }
    function isPast(op) {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        if (op.scheduledDate < todayStr) return true;
        if (op.scheduledDate > todayStr) return false;
        const [h, m] = op.scheduledTime.split(':').map(Number);
        const opEnd = new Date(); opEnd.setHours(h, m + (op.durationMinutes || 90), 0, 0);
        return now > opEnd;
    }
    function getAutoStatus(op) {
        if (op.status === 'cancelled') return 'cancelled';
        if (op.status === 'completed') return 'completed';
        if (isNow(op)) return 'in-progress';
        if (isPast(op)) return 'completed';
        return 'upcoming';
    }

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

    const todayOps = getOpsForDate(today);
    const tomorrowOps = getOpsForDate(tomorrow);
    const dayAfterOps = getOpsForDate(dayAfter);
    const allOps = DB.getAll('operations').sort((a, b) => (a.scheduledDate + a.scheduledTime).localeCompare(b.scheduledDate + b.scheduledTime));

    const todayUpcoming = todayOps.filter(op => getAutoStatus(op) === 'upcoming').length;
    const todayInProgress = todayOps.filter(op => getAutoStatus(op) === 'in-progress').length;
    const todayCompleted = todayOps.filter(op => getAutoStatus(op) === 'completed').length;

    /* ── Card renderer ── */
    function renderOpCard(op) {
        const status = getAutoStatus(op);
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
        const patient = DB.getById('patients', op.patientId);
        const surgeon = DB.getById('users', op.surgeonId);
        const anesthgt = DB.getById('users', op.anesthesiologistId);
        const opIcon = getOpIcon(op.type);
        const isInProg = status === 'in-progress';
        const [opH, opM] = op.scheduledTime.split(':').map(Number);
        const endH = Math.floor((opH * 60 + opM + (op.durationMinutes || 90)) / 60);
        const endMin = (opM + (op.durationMinutes || 90)) % 60;
        return `
      <div class="op-card ${isInProg ? 'op-card-active' : ''}" style="border-color:${cfg.border};background:${cfg.bg}">
        <div class="op-card-time">
          <div class="op-time-main">${formatOpTime(op.scheduledTime)}</div>
          <div class="op-time-end">→ ${formatOpTime(`${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`)}</div>
          <div class="op-duration">${op.durationMinutes || 90} min</div>
          ${isInProg ? '<div class="op-live-dot"></div>' : ''}
        </div>
        <div class="op-card-body">
          <div class="op-header">
            <span class="op-icon">${opIcon}</span>
            <div class="op-type-wrap">
              <h3 class="op-type">${Utils.escapeHtml(op.type)}</h3>
              <div class="op-theatre">🏥 ${Utils.escapeHtml(op.theatre || 'OT-1')}</div>
            </div>
            <div class="op-status-pill" style="background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}55">
              ${cfg.icon} ${cfg.label}
            </div>
          </div>
          <div class="op-patient-row">
            <div class="avatar" style="width:28px;height:28px;border-radius:8px;background:${Utils.roleGradient('doctor')};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;vertical-align:middle">${patient ? Utils.initials(patient.name) : '?'}</div>
            <span style="font-size:13px;font-weight:600;margin-left:7px">${patient ? Utils.escapeHtml(patient.name) : Utils.escapeHtml(op.patientName || 'Unknown')}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${patient ? patient.id : ''} · Age ${patient?.age || '—'}</span>
          </div>
          <div class="op-team">
            ${surgeon ? `<span class="op-team-member">🩺 ${Utils.escapeHtml(surgeon.name)}</span>` : ''}
            ${anesthgt ? `<span class="op-team-member">💉 ${Utils.escapeHtml(anesthgt.name)}</span>` : ''}
            ${op.assistingSurgeon ? `<span class="op-team-member">👨‍⚕️ ${Utils.escapeHtml(op.assistingSurgeon)}</span>` : ''}
          </div>
          ${op.notes ? `<div class="op-notes">📋 ${Utils.escapeHtml(op.notes)}</div>` : ''}
          ${op.priority === 'emergency' ? `<div class="op-emergency-flag">🚨 EMERGENCY — Priority Override</div>` : ''}
        </div>
        ${(role === 'admin' || role === 'doctor') ? `
        <div class="op-card-actions">
          <button class="btn btn-sm btn-secondary" onclick="openEditOp(${JSON.stringify(op).replace(/"/g, '&quot;')})">✏️</button>
          ${status !== 'completed' && status !== 'cancelled' ? `
            <button class="btn btn-sm btn-success" onclick="markOpStatus('${op.id}','completed')">✅</button>
            <button class="btn btn-sm btn-danger" onclick="markOpStatus('${op.id}','cancelled')">❌</button>
          ` : ''}
        </div>` : ''}
      </div>
    `;
    }

    /* ── Timeline day block ── */
    function renderDayBlock(dateStr, ops, label) {
        const dayName = label || new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
        return `
      <div class="timeline-day-block">
        <div class="timeline-day-header">
          <div class="timeline-day-label">${dateStr === today ? '📅 Today — ' : dateStr === tomorrow ? '📅 Tomorrow — ' : '📅 '}${dayName}</div>
          <div class="timeline-day-count">${ops.length} operation${ops.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="timeline-ops-list">
          ${ops.length ? ops.map(op => renderOpCard(op)).join('') : `<div class="op-empty">No operations scheduled</div>`}
        </div>
      </div>
    `;
    }

    /* ── Main Render ── */
    container.innerHTML = `
    <div class="fade-in">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <h1>🗓️ Operation Theatre Timeline</h1>
          <p>Live surgical schedule — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="page-header-actions">
          ${(role === 'admin' || role === 'doctor') ? `<button class="btn btn-primary" onclick="openAddOp()">➕ Schedule Operation</button>` : ''}
          <button class="btn btn-secondary" onclick="renderOperationTimeline(document.getElementById('page-content'))">🔄 Refresh</button>
        </div>
      </div>

      <!-- Today's Stats Row -->
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card" style="--stat-color:#00d4ff">
          <div class="stat-icon">🗓️</div>
          <div class="stat-value">${todayOps.length}</div>
          <div class="stat-label">Today's Operations</div>
        </div>
        <div class="stat-card" style="--stat-color:#f59e0b">
          <div class="stat-icon">🔴</div>
          <div class="stat-value">${todayInProgress}</div>
          <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card" style="--stat-color:#00d4ff">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">${todayUpcoming}</div>
          <div class="stat-label">Upcoming Today</div>
        </div>
        <div class="stat-card" style="--stat-color:#10b981">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${todayCompleted}</div>
          <div class="stat-label">Completed Today</div>
        </div>
        <div class="stat-card" style="--stat-color:#a855f7">
          <div class="stat-icon">📅</div>
          <div class="stat-value">${tomorrowOps.length}</div>
          <div class="stat-label">Tomorrow</div>
        </div>
        <div class="stat-card" style="--stat-color:#ef4444">
          <div class="stat-icon">🚨</div>
          <div class="stat-value">${allOps.filter(op => op.priority === 'emergency').length}</div>
          <div class="stat-label">Emergency Ops</div>
        </div>
      </div>

      <!-- Tabs: Timeline / All / OT View -->
      <div class="tabs" style="margin-bottom:20px">
        <button class="tab-btn active" onclick="switchOpTab(event,'tab-timeline')">📅 Timeline View</button>
        <button class="tab-btn" onclick="switchOpTab(event,'tab-all')">📋 All Operations</button>
        <button class="tab-btn" onclick="switchOpTab(event,'tab-ot')">🏥 OT Room View</button>
      </div>

      <!-- Timeline Tab -->
      <div id="tab-timeline" class="tab-panel active">
        ${renderDayBlock(today, todayOps)}
        ${renderDayBlock(tomorrow, tomorrowOps)}
        ${dayAfterOps.length ? renderDayBlock(dayAfter, dayAfterOps) : ''}
      </div>

      <!-- All Operations Tab -->
      <div id="tab-all" class="tab-panel">
        <div class="card">
          <div class="card-header">
            <div class="card-title">All Scheduled Operations</div>
            <div style="display:flex;gap:8px">
              <select id="op-status-filter" class="form-control filter-select" onchange="filterAllOps()" style="width:140px">
                <option value="">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="delayed">Delayed</option>
              </select>
              <select id="op-type-filter" class="form-control filter-select" onchange="filterAllOps()" style="width:160px">
                <option value="">All Types</option>
                ${[...new Set(allOps.map(op => op.type))].map(t => `<option value="${Utils.escapeHtml(t)}">${Utils.escapeHtml(t)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="table-wrapper" id="all-ops-table">
            ${renderAllOpsTable(allOps)}
          </div>
        </div>
      </div>

      <!-- OT Room View Tab -->
      <div id="tab-ot" class="tab-panel">
        ${renderOTView(todayOps)}
      </div>
    </div>
  `;

    /* ── All ops table ── */
    function renderAllOpsTable(list) {
        if (!list.length) return '<div class="empty-state"><div class="empty-icon">📅</div><h3>No operations found</h3></div>';
        return `
      <table class="data-table">
        <thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Patient</th><th>Surgeon</th><th>OT Room</th><th>Duration</th><th>Priority</th><th>Status</th>${role !== 'nurse' ? '<th>Actions</th>' : ''}</tr></thead>
        <tbody>
        ${list.map(op => {
            const status = getAutoStatus(op);
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
            const patient = DB.getById('patients', op.patientId);
            const surgeon = DB.getById('users', op.surgeonId);
            return `
            <tr>
              <td style="font-size:12px;font-family:var(--font-mono)">${op.scheduledDate}</td>
              <td style="font-weight:700;color:var(--primary);font-family:var(--font-mono)">${formatOpTime(op.scheduledTime)}</td>
              <td><span style="display:flex;align-items:center;gap:5px">${getOpIcon(op.type)} ${Utils.escapeHtml(op.type)}</span></td>
              <td style="font-size:13px">${patient ? Utils.escapeHtml(patient.name) : Utils.escapeHtml(op.patientName || '—')}</td>
              <td style="font-size:12px;color:var(--text-secondary)">${surgeon ? Utils.escapeHtml(surgeon.name) : '—'}</td>
              <td><span class="dept-badge">${Utils.escapeHtml(op.theatre || 'OT-1')}</span></td>
              <td style="font-size:12px">${op.durationMinutes || 90} min</td>
              <td><span class="badge ${op.priority === 'emergency' ? 'badge-high' : op.priority === 'urgent' ? 'badge-medium' : 'badge-stable'}">${Utils.capitalize(op.priority || 'routine')}</span></td>
              <td><span style="color:${cfg.color};font-size:12px;font-weight:600">${cfg.icon} ${cfg.label}</span></td>
              ${role !== 'nurse' ? `
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-sm btn-secondary" onclick="openEditOp(${JSON.stringify(op).replace(/"/g, '&quot;')})">✏️</button>
                  ${status !== 'completed' && status !== 'cancelled' ? `<button class="btn btn-sm btn-success" style="padding:3px 6px;font-size:11px" onclick="markOpStatus('${op.id}','completed')">✅</button>` : ''}
                </div>
              </td>` : ''}
            </tr>
          `;
        }).join('')}
        </tbody>
      </table>
    `;
    }

    /* ── OT Room View ── */
    function renderOTView(ops) {
        const theatres = [...new Set([...ops.map(op => op.theatre || 'OT-1'), 'OT-1', 'OT-2', 'OT-3', 'OT-4'])];
        return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${theatres.map(ot => {
            const roomOps = ops.filter(op => (op.theatre || 'OT-1') === ot).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
            const activeOp = roomOps.find(op => getAutoStatus(op) === 'in-progress');
            const nextOp = roomOps.find(op => getAutoStatus(op) === 'upcoming');
            const roomStatus = activeOp ? 'occupied' : nextOp ? 'ready' : 'available';
            const roomColor = roomStatus === 'occupied' ? 'var(--danger)' : roomStatus === 'ready' ? 'var(--warning)' : 'var(--success)';
            return `
            <div class="card" style="border-color:${roomColor}44">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
                <div>
                  <div style="font-size:18px;font-weight:800">🏥 ${ot}</div>
                  <div style="font-size:11px;color:var(--text-muted)">Operation Theatre</div>
                </div>
                <span class="badge" style="background:${roomColor}22;color:${roomColor};border:1px solid ${roomColor}55;font-size:11px">
                  ${roomStatus === 'occupied' ? '🔴 In Use' : roomStatus === 'ready' ? '⏳ Ready' : '✅ Available'}
                </span>
              </div>
              ${activeOp ? `
                <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px;margin-bottom:10px">
                  <div style="font-size:10px;font-weight:700;color:var(--danger);text-transform:uppercase;margin-bottom:4px">🔴 LIVE — In Progress</div>
                  <div style="font-weight:700;font-size:14px">${getOpIcon(activeOp.type)} ${Utils.escapeHtml(activeOp.type)}</div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Started ${formatOpTime(activeOp.scheduledTime)}</div>
                </div>
              ` : ''}
              ${nextOp ? `
                <div style="background:var(--bg-input);border-radius:8px;padding:10px;margin-bottom:10px">
                  <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">⏰ Next Up</div>
                  <div style="font-weight:600;font-size:13px">${getOpIcon(nextOp.type)} ${Utils.escapeHtml(nextOp.type)}</div>
                  <div style="font-size:11px;color:var(--primary);margin-top:3px">@ ${formatOpTime(nextOp.scheduledTime)}</div>
                </div>
              ` : ''}
              <div style="font-size:11px;color:var(--text-muted)">${roomOps.length} operations today</div>
              <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
                ${roomOps.slice(0, 4).map(op => {
                const st = getAutoStatus(op);
                const c = STATUS_CONFIG[st];
                return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:3px 0">
                    <span style="color:${c.color}">${c.icon}</span>
                    <span style="color:var(--text-secondary)">${formatOpTime(op.scheduledTime)}</span>
                    <span style="font-weight:600;flex:1">${getOpIcon(op.type)} ${Utils.escapeHtml(op.type)}</span>
                  </div>`;
            }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    }

    /* ── Tab switching ── */
    window.switchOpTab = function (e, tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(tabId)?.classList.add('active');
    };

    /* ── Filter all ops ── */
    window.filterAllOps = function () {
        const statusF = document.getElementById('op-status-filter')?.value || '';
        const typeF = document.getElementById('op-type-filter')?.value || '';
        let filtered = allOps;
        if (statusF) filtered = filtered.filter(op => getAutoStatus(op) === statusF);
        if (typeF) filtered = filtered.filter(op => op.type === typeF);
        const tableEl = document.getElementById('all-ops-table');
        if (tableEl) tableEl.innerHTML = renderAllOpsTable(filtered);
    };

    /* ── Mark status ── */
    window.markOpStatus = function (id, newStatus) {
        DB.update('operations', id, { status: newStatus });
        DB.log('OP_STATUS_UPDATE', `Operation ${id} marked as ${newStatus}`);
        Utils.toast(`Operation marked as ${newStatus}.`, 'success');
        renderOperationTimeline(document.getElementById('page-content'));
    };

    /* ── Add/Edit modal ── */
    window.openAddOp = () => openOpModal(null);
    window.openEditOp = (op) => openOpModal(op);

    function openOpModal(op) {
        const isEdit = Boolean(op);
        const doctors = DB.getAll('users').filter(u => (u.role === 'doctor') && u.isActive);
        const patients = DB.getAll('patients').filter(p => !p.isDeleted && p.status !== 'discharged');
        const todayLocal = new Date().toISOString().slice(0, 10);

        Utils.showModal(`
      <div class="modal-header">
        <div><h3 class="modal-title">${isEdit ? '✏️ Edit Operation' : '➕ Schedule Operation'}</h3></div>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <form id="op-form" onsubmit="submitOp(event,${isEdit ? `'${op.id}'` : 'null'})">
        <div class="form-grid form-grid-2" style="margin-bottom:14px">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Operation Type *</label>
            <input type="text" id="op-type" class="form-control" placeholder="e.g. Brain Tumor Resection, Cardiac Bypass, Knee Replacement..." value="${op ? Utils.escapeHtml(op.type) : ''}" required list="op-types-list">
            <datalist id="op-types-list">
              ${['Brain Tumor Resection', 'Cardiac Bypass', 'Heart Valve Replacement', 'Knee Replacement', 'Hip Replacement', 'Appendectomy', 'Laparoscopic Cholecystectomy', 'Spinal Fusion', 'Kidney Transplant', 'Coronary Angioplasty', 'Craniotomy', 'Lumbar Discectomy', 'Eye Cataract Surgery', 'Cesarean Section', 'Thyroidectomy'].map(t => `<option value="${t}">`).join('')}
            </datalist>
          </div>
          <div class="form-group">
            <label class="form-label">Patient *</label>
            <select id="op-patient" class="form-control" required>
              <option value="">Select Patient</option>
              ${patients.map(p => `<option value="${p.id}" ${op?.patientId === p.id ? 'selected' : ''}>${Utils.escapeHtml(p.name)} (${p.id})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Lead Surgeon *</label>
            <select id="op-surgeon" class="form-control" required>
              <option value="">Select Surgeon</option>
              ${doctors.map(d => `<option value="${d.id}" ${op?.surgeonId === d.id ? 'selected' : ''}>${Utils.escapeHtml(d.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Anesthesiologist</label>
            <select id="op-anesth" class="form-control">
              <option value="">Select</option>
              ${doctors.map(d => `<option value="${d.id}" ${op?.anesthesiologistId === d.id ? 'selected' : ''}>${Utils.escapeHtml(d.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Assisting Surgeon</label>
            <input type="text" id="op-assist" class="form-control" placeholder="Name..." value="${op ? Utils.escapeHtml(op.assistingSurgeon || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input type="date" id="op-date" class="form-control" value="${op ? op.scheduledDate : todayLocal}" min="${todayLocal}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Time *</label>
            <input type="time" id="op-time" class="form-control" value="${op ? op.scheduledTime : '09:00'}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Duration (minutes)</label>
            <input type="number" id="op-dur" class="form-control" value="${op ? op.durationMinutes : 90}" min="15" max="600" placeholder="90">
          </div>
          <div class="form-group">
            <label class="form-label">OT Room *</label>
            <select id="op-theatre" class="form-control">
              ${['OT-1', 'OT-2', 'OT-3', 'OT-4', 'OT-5', 'ICU-OT', 'Emergency OT'].map(r => `<option value="${r}" ${op?.theatre === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="op-priority" class="form-control">
              <option value="routine" ${(!op || op.priority === 'routine') ? 'selected' : ''}>Routine</option>
              <option value="urgent" ${op?.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              <option value="emergency" ${op?.priority === 'emergency' ? 'selected' : ''}>🚨 Emergency</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Pre-op Notes</label>
            <textarea id="op-notes" class="form-control" placeholder="Pre-operative instructions, special requirements...">${op ? Utils.escapeHtml(op.notes || '') : ''}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? '💾 Save' : '📅 Schedule'}</button>
        </div>
      </form>
    `, 'modal-lg');
    }

    window.submitOp = function (e, opId) {
        e.preventDefault();
        const data = {
            type: document.getElementById('op-type').value.trim(),
            patientId: document.getElementById('op-patient').value,
            surgeonId: document.getElementById('op-surgeon').value,
            anesthesiologistId: document.getElementById('op-anesth').value,
            assistingSurgeon: document.getElementById('op-assist').value,
            scheduledDate: document.getElementById('op-date').value,
            scheduledTime: document.getElementById('op-time').value,
            durationMinutes: parseInt(document.getElementById('op-dur').value) || 90,
            theatre: document.getElementById('op-theatre').value,
            priority: document.getElementById('op-priority').value,
            notes: document.getElementById('op-notes').value,
            status: 'upcoming'
        };
        const patient = DB.getById('patients', data.patientId);
        data.patientName = patient?.name || '';

        if (opId) {
            DB.update('operations', opId, data);
            DB.log('EDIT_OPERATION', `Operation ${opId} updated — ${data.type}`);
            Utils.toast('Operation updated successfully.', 'success');
        } else {
            data.id = Utils.generateId('OP');
            data.createdAt = Utils.nowISO();
            DB.insert('operations', data);
            DB.log('SCHEDULE_OPERATION', `New operation scheduled: ${data.type} on ${data.scheduledDate} @ ${data.scheduledTime}`);
            Utils.toast(`✅ Operation scheduled: ${data.type} @ ${formatOpTime(data.scheduledTime)}`, 'success');
        }
        Utils.closeModal();
        renderOperationTimeline(document.getElementById('page-content'));
    };

    /* ── Auto-refresh every 60s for live in-progress status ── */
    const refreshTimer = setInterval(() => {
        if (document.getElementById('page-content')) {
            renderOperationTimeline(document.getElementById('page-content'));
        } else {
            clearInterval(refreshTimer);
        }
    }, 60000);
}
