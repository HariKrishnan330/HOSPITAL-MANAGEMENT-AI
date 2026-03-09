/* =============================================================
   DOCTOR PANEL.JS — Diagnosis, Prescriptions, Patient History
   ============================================================= */

function renderDoctorPanel(container) {
    if (!Auth.requireRole('doctor', 'admin')) return;
    const doctorId = Auth.getUserId();
    let patients = DB.getDoctorPatients(doctorId);
    if (Auth.getRole() === 'admin') patients = DB.getAll('patients').filter(p => !p.isDeleted && p.status !== 'discharged');

    container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>👨‍⚕️ Doctor Panel</h1>
          <p>${patients.length} patient${patients.length !== 1 ? 's' : ''} under your care</p>
        </div>
      </div>
      ${patients.length === 0 ? '<div class="empty-state"><div class="empty-icon">👨‍⚕️</div><h3>No patients assigned to you</h3></div>' : `
        <div style="display:grid;gap:16px">
          ${patients.map(p => {
        const vitals = DB.getPatientVitals(p.id);
        const latestV = vitals[0];
        const notes = DB.getPatientNotes(p.id);
        const alerts = DB.getPatientAlerts(p.id).filter(a => !a.acknowledged);
        const nurse = DB.getById('users', p.assignedNurseId);
        const lastNote = notes[0];
        return `
              <div class="card" style="border-color:${p.status === 'critical' ? 'rgba(239,68,68,0.4)' : 'var(--border-card)'}">
                <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
                  <div class="avatar" style="width:48px;height:48px;border-radius:14px;background:${Utils.roleGradient('doctor')};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0">${Utils.initials(p.name)}</div>
                  <div style="flex:1;min-width:200px">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap">
                      <span style="font-weight:700;font-size:16px">${Utils.escapeHtml(p.name)}</span>
                      <span class="patient-id">${p.id}</span>
                      <span class="badge badge-${p.status}">${Utils.statusBadge(p.status)}</span>
                      ${alerts.length ? `<span class="badge badge-high">🤖 ${alerts.length} Alert</span>` : ''}
                    </div>
                    <div style="font-size:12px;color:var(--text-muted)">
                      Age ${p.age} · ${Utils.capitalize(p.gender)} · ${p.department} · 🏥 Admitted ${Utils.formatDate(p.admissionDate)}
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
                      🩺 ${p.currentDiagnosis || 'No diagnosis set'} &nbsp;|&nbsp; 💊 ${lastNote?.prescription?.length || 0} medication(s)
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    ${latestV ? `
                      <div style="text-align:center;background:var(--bg-input);border-radius:8px;padding:8px 12px;font-size:11px">
                        <div style="color:var(--text-muted)">Last Vitals</div>
                        <div style="font-family:var(--font-mono);font-weight:700;font-size:13px;color:${latestV.isAbnormal ? 'var(--danger)' : 'var(--success)'}">${latestV.isAbnormal ? '⚠️ Abnormal' : '✅ Normal'}</div>
                        <div style="color:var(--text-muted);font-size:10px">${Utils.timeAgo(latestV.timestamp)}</div>
                      </div>
                    ` : ''}
                    <button class="btn btn-primary" onclick="openDoctorModal('${p.id}','${Utils.escapeHtml(p.name)}')">🩺 Clinical Record</button>
                    <button class="btn btn-ai btn-sm" onclick="runAIAnalysis('${p.id}','${Utils.escapeHtml(p.name)}')">🤖 AI Analysis</button>
                  </div>
                </div>
              </div>
            `;
    }).join('')}
        </div>
      `}
    </div>
  `;

    window.runAIAnalysis = function (patientId, patientName) {
        Utils.toast('🤖 Running AI clinical analysis...', 'ai', 2000);
        setTimeout(() => {
            const result = AI.analyzePatient(patientId);
            if (!result) { Utils.toast('Could not analyze patient.', 'error'); return; }
            openAIResultModal(result);
        }, 800);
    };

    window.openAIResultModal = function (result) {
        const { patient, riskScore, riskLevel, patterns, suggestions, drugInteractions, readmissionRisk } = result;
        Utils.showModal(`
      <div class="modal-header">
        <div><h3 class="modal-title">🤖 AI Clinical Analysis</h3><div style="font-size:12px;color:var(--text-muted)">${Utils.escapeHtml(patient.name)}</div></div>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="ai-disclaimer">⚠️ AI-generated. For clinical decision support only. Does not replace physician judgment.</div>
      <div style="display:flex;gap:16px;margin:16px 0;flex-wrap:wrap">
        <div class="risk-score-widget">
          <div class="risk-score-circle risk-${riskLevel}">
            <div class="risk-score-num">${riskScore}</div>
            <div class="risk-score-text">/100</div>
          </div>
          <div class="risk-label" style="color:${riskLevel === 'high' ? 'var(--danger)' : riskLevel === 'medium' ? 'var(--warning)' : 'var(--success)'}">${Utils.capitalize(riskLevel)} Risk</div>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Detected Patterns</div>
          ${patterns.length ? patterns.map(p => `<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--border)">${Utils.escapeHtml(p)}</div>`).join('') : '<div style="color:var(--text-muted);font-size:13px">No critical patterns detected</div>'}
        </div>
      </div>
      ${suggestions.length ? `
        <div class="ai-insight-card" style="margin-bottom:12px">
          <div class="ai-badge">🩺 Differential Diagnoses (AI Suggested)</div>
          ${suggestions.map(s => `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px"><strong>${Utils.escapeHtml(s.diagnosis)}</strong> <span style="color:var(--text-muted);font-size:11px">— ${Utils.escapeHtml(s.confidence)} confidence · ${Utils.escapeHtml(s.reason)}</span></div>`).join('')}
        </div>
      ` : ''}
      ${drugInteractions.length ? `
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:700;color:var(--danger);margin-bottom:6px">⚠️ Drug Interaction Warnings</div>
          ${drugInteractions.map(d => `<div style="font-size:12.5px;padding:4px 0">${Utils.capitalize(d.risk)}: ${Utils.escapeHtml(d.drug1)} + ${Utils.escapeHtml(d.drug2)} — ${Utils.escapeHtml(d.description)}</div>`).join('')}
        </div>
      ` : ''}
      <div style="font-size:12px;color:var(--text-muted)">📊 Readmission Risk: <strong style="color:${readmissionRisk === 'high' ? 'var(--danger)' : readmissionRisk === 'medium' ? 'var(--warning)' : 'var(--success)'}">${Utils.capitalize(readmissionRisk)}</strong></div>
    `, 'modal-lg');
    };

    window.openDoctorModal = function (patientId, patientName) {
        const patient = DB.getById('patients', patientId);
        const vitals = DB.getPatientVitals(patientId).slice(0, 3);
        const notes = DB.getPatientNotes(patientId);
        const latestVitals = vitals[0];

        Utils.showModal(`
      <div class="modal-header">
        <div><h3 class="modal-title">🩺 Clinical Record — ${Utils.escapeHtml(patientName)}</h3></div>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>

      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab(event,'dt-vitals')">💓 Vitals</button>
        <button class="tab-btn" onclick="switchTab(event,'dt-notes')">📝 Add Note</button>
        <button class="tab-btn" onclick="switchTab(event,'dt-history')">📋 History</button>
      </div>

      <!-- Vitals Review -->
      <div id="dt-vitals" class="tab-panel active">
        ${latestVitals ? `
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">📅 Last recorded ${Utils.formatDateTime(latestVitals.timestamp)}</p>
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
          ${latestVitals.observations ? `<div style="font-size:12.5px;color:var(--text-secondary);margin-top:12px;background:var(--bg-input);padding:10px;border-radius:6px">📝 Nurse: ${Utils.escapeHtml(latestVitals.observations)}</div>` : ''}
        ` : `<div class="empty-state"><div class="empty-icon">💓</div><h3>No vitals recorded yet</h3></div>`}
      </div>

      <!-- Add Note Tab -->
      <div id="dt-notes" class="tab-panel">
        <form id="note-form" onsubmit="submitDoctorNote(event,'${patientId}')">
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Diagnosis</label>
            <input type="text" id="dn-diag" class="form-control" placeholder="Clinical diagnosis..." value="${Utils.escapeHtml(patient.currentDiagnosis || '')}">
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Clinical Notes</label>
            <textarea id="dn-notes" class="form-control" placeholder="Clinical observations, findings, plan..."></textarea>
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Treatment Plan</label>
            <textarea id="dn-plan" class="form-control" placeholder="Treatment approach..." style="min-height:70px">${Utils.escapeHtml(patient.treatmentPlan || '')}</textarea>
          </div>
          <div style="margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <label class="form-label" style="margin:0">Prescriptions</label>
              <button type="button" class="btn btn-sm btn-secondary" onclick="addRxRow()">➕ Add Drug</button>
            </div>
            <div id="rx-list">
              <div class="rx-row" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
                <input type="text" class="form-control rx-drug" placeholder="Drug name" style="font-size:13px">
                <input type="text" class="form-control rx-dose" placeholder="Dose" style="font-size:13px">
                <input type="text" class="form-control rx-freq" placeholder="Frequency" style="font-size:13px">
                <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.rx-row').remove()">✕</button>
              </div>
            </div>
            <div id="drug-interaction-warning" style="display:none;color:var(--danger);font-size:12px;margin-top:4px"></div>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Update Patient Status</label>
            <select id="dn-status" class="form-control">
              <option value="admitted" ${patient.status === 'admitted' ? 'selected' : ''}>Admitted</option>
              <option value="stable" ${patient.status === 'stable' ? 'selected' : ''}>Stable</option>
              <option value="critical" ${patient.status === 'critical' ? 'selected' : ''}>Critical</option>
              <option value="improving" ${patient.status === 'improving' ? 'selected' : ''}>Improving</option>
              <option value="discharged" ${patient.status === 'discharged' ? 'selected' : ''}>Discharged</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Save Note</button>
          </div>
        </form>
      </div>

      <!-- History Tab -->
      <div id="dt-history" class="tab-panel">
        <div class="timeline">
          ${notes.length ? notes.map(n => {
            const doc = DB.getById('users', n.doctorId);
            return `
              <div class="timeline-item">
                <div class="timeline-time">${Utils.formatDateTime(n.timestamp)}</div>
                <div class="timeline-content">
                  <div class="timeline-title">🩺 ${Utils.escapeHtml(n.diagnosis || 'Note')}</div>
                  ${n.notes ? `<p style="font-size:12.5px;color:var(--text-secondary);margin:6px 0">${Utils.escapeHtml(n.notes)}</p>` : ''}
                  ${n.prescription?.map(rx => `<div class="prescription-item"><span class="rx-icon">💊</span><div><div class="rx-drug">${Utils.escapeHtml(rx.drug)}</div><div class="rx-dose">${Utils.escapeHtml(rx.dose)} · ${Utils.escapeHtml(rx.frequency)}</div></div></div>`).join('') || ''}
                </div>
              </div>
            `;
        }).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><h3>No notes yet</h3></div>'}
        </div>
      </div>
    `, 'modal-lg');

        window.switchTab = function (e, tabId) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');
        };

        window.addRxRow = function () {
            const row = document.createElement('div');
            row.className = 'rx-row';
            row.style = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;margin-bottom:8px';
            row.innerHTML = `
        <input type="text" class="form-control rx-drug" placeholder="Drug name" style="font-size:13px" oninput="liveCheckInteractions()">
        <input type="text" class="form-control rx-dose" placeholder="Dose" style="font-size:13px">
        <input type="text" class="form-control rx-freq" placeholder="Frequency" style="font-size:13px">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.rx-row').remove()">✕</button>
      `;
            document.getElementById('rx-list').appendChild(row);
        };

        window.liveCheckInteractions = function () {
            const drugs = [...document.querySelectorAll('.rx-drug')].map(el => ({ drug: el.value }));
            const interactions = AI.checkDrugInteractions(drugs);
            const warnEl = document.getElementById('drug-interaction-warning');
            if (warnEl) {
                warnEl.style.display = interactions.length ? 'block' : 'none';
                warnEl.textContent = interactions.length ? `⚠️ Drug Interaction: ${interactions.map(i => `${i.drug1} + ${i.drug2} (${i.risk})`).join(', ')}` : '';
            }
        };

        window.submitDoctorNote = function (e, patientId) {
            e.preventDefault();
            const prescriptions = [...document.querySelectorAll('.rx-row')].map(row => ({
                drug: row.querySelector('.rx-drug')?.value || '',
                dose: row.querySelector('.rx-dose')?.value || '',
                frequency: row.querySelector('.rx-freq')?.value || ''
            })).filter(rx => rx.drug.trim());

            const noteData = {
                id: Utils.generateId('NOTE'),
                patientId,
                doctorId: Auth.getUserId(),
                diagnosis: document.getElementById('dn-diag').value,
                prescription: prescriptions,
                treatmentPlan: document.getElementById('dn-plan').value,
                notes: document.getElementById('dn-notes').value,
                patientStatus: document.getElementById('dn-status').value,
                timestamp: Utils.nowISO()
            };

            DB.insert('doctorNotes', noteData);

            /* Update patient status and diagnosis */
            DB.update('patients', patientId, {
                currentDiagnosis: noteData.diagnosis,
                treatmentPlan: noteData.treatmentPlan,
                status: noteData.patientStatus
            });

            DB.log('DOCTOR_NOTE', `Note added for patient ${patientId}: ${noteData.diagnosis}`);

            /* Drug interaction check */
            const interactions = AI.checkDrugInteractions(prescriptions);
            Utils.closeModal();
            if (interactions.length) {
                Utils.toast(`⚠️ Drug interaction detected: ${interactions[0].drug1} + ${interactions[0].drug2}`, 'warning', 6000);
            }
            Utils.toast('✅ Clinical note saved successfully.', 'success');
            setTimeout(() => renderDoctorPanel(container), 300);
        };
    };
}
