/* =============================================================
   PATIENT PROFILE.JS — Full Patient Record View
   ============================================================= */

function renderPatientProfile(container, params) {
    if (!Auth.requireAuth()) return;
    const patient = DB.getById('patients', params.id);
    if (!patient) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h3>Patient not found</h3></div>'; return; }

    const doctor = DB.getById('users', patient.assignedDoctorId);
    const nurse = DB.getById('users', patient.assignedNurseId);
    const vitalsList = DB.getPatientVitals(patient.id);
    const notesList = DB.getPatientNotes(patient.id);
    const alertsList = DB.getPatientAlerts(patient.id).filter(a => !a.acknowledged);
    const latestVitals = vitalsList[0] || null;
    const role = Auth.getRole();

    container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:14px">
            <div class="avatar" style="width:52px;height:52px;border-radius:14px;background:${Utils.roleGradient('doctor')};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${Utils.initials(patient.name)}</div>
            <div>
              <h1>${Utils.escapeHtml(patient.name)}</h1>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
                <span class="patient-id">${patient.id}</span>
                <span class="badge badge-${patient.status}">${Utils.statusBadge(patient.status)}</span>
                <span class="dept-badge">${patient.department}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="page-header-actions">
          ${role !== 'nurse' ? `<button class="btn btn-warning" onclick="Router.navigate('patient-form',{id:'${patient.id}'})">✏️ Edit</button>` : ''}
          <button class="btn btn-secondary" onclick="Router.navigate('patients')">← Back</button>
        </div>
      </div>

      <!-- AI Alerts for this patient -->
      ${alertsList.length ? `
        <div style="margin-bottom:18px">
          ${alertsList.slice(0, 2).map(a => `
            <div class="alert-banner alert-${a.riskLevel}">
              <span class="alert-icon">🤖</span>
              <div class="alert-body">
                <div class="alert-title">AI Risk Alert — Score: ${a.riskScore}/100 (${Utils.capitalize(a.riskLevel)} Risk)</div>
                <div class="alert-desc">${a.patterns.slice(0, 3).map(p => Utils.escapeHtml(p)).join(' · ')}</div>
                <div class="alert-time">Generated ${Utils.timeAgo(a.generatedAt)}</div>
              </div>
              <button class="btn btn-sm btn-secondary" onclick="Router.navigate('ai-insights')">Analyze →</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab(event,'tab-overview')">📋 Overview</button>
        <button class="tab-btn" onclick="switchTab(event,'tab-vitals')">💓 Vitals (${vitalsList.length})</button>
        <button class="tab-btn" onclick="switchTab(event,'tab-notes')">🩺 Doctor Notes (${notesList.length})</button>
      </div>

      <!-- Overview Tab -->
      <div id="tab-overview" class="tab-panel active">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <!-- Personal Info -->
          <div class="card">
            <div class="card-header"><div class="card-title">👤 Personal Information</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${[
            ['Age', patient.age + ' years'], ['Gender', Utils.capitalize(patient.gender)],
            ['Blood Group', patient.bloodGroup || '—'], ['Phone', patient.phone || '—'],
            ['Email', patient.email || '—'], ['Address', patient.address || '—']
        ].map(([l, v]) => `<div><div class="form-label">${l}</div><div style="font-size:13.5px;font-weight:500;margin-top:3px">${Utils.escapeHtml(String(v))}</div></div>`).join('')}
            </div>
          </div>
          <!-- Admission Info -->
          <div class="card">
            <div class="card-header"><div class="card-title">🏥 Admission Details</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${[
            ['Admission Date', Utils.formatDate(patient.admissionDate)],
            ['Discharge Date', Utils.formatDate(patient.dischargeDate)],
            ['Assigned Doctor', doctor?.name || '—'],
            ['Assigned Nurse', nurse?.name || '—'],
            ['Department', patient.department],
            ['Status', Utils.statusBadge(patient.status)]
        ].map(([l, v]) => `<div><div class="form-label">${l}</div><div style="font-size:13.5px;font-weight:500;margin-top:3px">${Utils.escapeHtml(String(v))}</div></div>`).join('')}
            </div>
          </div>
          <!-- Medical Details -->
          <div class="card" style="grid-column:1/-1">
            <div class="card-header"><div class="card-title">🩺 Medical Record</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              ${[
            ['Medical History', patient.medicalHistory || '—'],
            ['Known Allergies', patient.allergies || '—'],
            ['Current Diagnosis', patient.currentDiagnosis || '—'],
            ['Treatment Plan', patient.treatmentPlan || '—']
        ].map(([l, v]) => `<div><div class="form-label">${l}</div><div style="font-size:13.5px;color:var(--text-secondary);margin-top:4px;line-height:1.6">${Utils.escapeHtml(String(v))}</div></div>`).join('')}
            </div>
          </div>
        </div>
        <!-- Latest Vitals Snapshot -->
        ${latestVitals ? `
          <div class="card" style="margin-top:20px">
            <div class="card-header">
              <div><div class="card-title">💓 Latest Vitals</div><div class="card-subtitle">${Utils.formatDateTime(latestVitals.timestamp)}</div></div>
            </div>
            <div class="vitals-grid">
              ${Object.entries(Utils.VITAL_RANGES).map(([key, range]) => {
            const val = latestVitals[key];
            const isAbn = val !== undefined && Utils.isVitalAbnormal(key, val);
            return `<div class="vital-card ${isAbn ? 'abnormal' : ''}">
                  <div class="vital-icon">${range.icon}</div>
                  <div class="vital-value">${val ?? '—'}</div>
                  <div class="vital-unit">${range.unit}</div>
                  <div class="vital-name">${range.name}</div>
                </div>`;
        }).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Vitals Tab -->
      <div id="tab-vitals" class="tab-panel">
        <div class="timeline">
          ${vitalsList.length ? vitalsList.map(v => {
            const abnList = AI.detectAbnormalVitals(v);
            return `
              <div class="timeline-item">
                <div class="timeline-time">${Utils.formatDateTime(v.timestamp)} — by ${DB.getById('users', v.recordedByNurseId)?.name || 'Nurse'}</div>
                <div class="timeline-content">
                  <div class="vitals-grid" style="margin-bottom:10px">
                    ${Object.entries(Utils.VITAL_RANGES).map(([key, range]) => {
                const val = v[key];
                const isAbn = val !== undefined && Utils.isVitalAbnormal(key, val);
                return `<div class="vital-card ${isAbn ? 'abnormal' : ''}" style="padding:10px">
                        <div class="vital-icon" style="font-size:16px">${range.icon}</div>
                        <div class="vital-value" style="font-size:16px">${val ?? '—'}</div>
                        <div class="vital-unit">${range.unit}</div>
                      </div>`;
            }).join('')}
                  </div>
                  ${v.observations ? `<div style="font-size:12.5px;color:var(--text-secondary)">📝 ${Utils.escapeHtml(v.observations)}</div>` : ''}
                  ${abnList.length ? `<div style="color:var(--danger);font-size:12px;margin-top:6px">⚠️ ${abnList.length} abnormal reading(s) detected</div>` : ''}
                </div>
              </div>
            `;
        }).join('') : '<div class="empty-state"><div class="empty-icon">💓</div><h3>No vitals recorded yet</h3></div>'}
        </div>
      </div>

      <!-- Doctor Notes Tab -->
      <div id="tab-notes" class="tab-panel">
        <div class="timeline">
          ${notesList.length ? notesList.map(n => {
            const doc = DB.getById('users', n.doctorId);
            return `
              <div class="timeline-item">
                <div class="timeline-time">${Utils.formatDateTime(n.timestamp)} — Dr. ${doc?.name || 'Doctor'}</div>
                <div class="timeline-content">
                  <div class="timeline-title">🩺 ${Utils.escapeHtml(n.diagnosis || 'Clinical Note')}</div>
                  ${n.notes ? `<p style="font-size:12.5px;color:var(--text-secondary);margin:8px 0">${Utils.escapeHtml(n.notes)}</p>` : ''}
                  ${n.prescription?.length ? `
                    <div style="margin-top:10px">
                      <div class="form-label">Prescriptions</div>
                      ${n.prescription.map(rx => `
                        <div class="prescription-item">
                          <span class="rx-icon">💊</span>
                          <div><div class="rx-drug">${Utils.escapeHtml(rx.drug)}</div><div class="rx-dose">${Utils.escapeHtml(rx.dose)} · ${Utils.escapeHtml(rx.frequency)}</div></div>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  ${n.treatmentPlan ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">📋 ${Utils.escapeHtml(n.treatmentPlan)}</div>` : ''}
                </div>
              </div>
            `;
        }).join('') : '<div class="empty-state"><div class="empty-icon">🩺</div><h3>No doctor notes yet</h3></div>'}
        </div>
      </div>
    </div>
  `;

    window.switchTab = function (e, tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(tabId)?.classList.add('active');
    };
}
