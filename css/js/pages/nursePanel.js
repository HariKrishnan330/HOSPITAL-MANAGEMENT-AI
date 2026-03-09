/* =============================================================
   NURSE PANEL.JS — Vitals Recording & Patient Monitoring
   ============================================================= */

function renderNursePanel(container) {
    if (!Auth.requireRole('nurse', 'admin')) return;
    const nurseId = Auth.getUserId();
    let patients = DB.getNursePatients(nurseId);
    if (Auth.getRole() === 'admin') patients = DB.getAll('patients').filter(p => !p.isDeleted);

    container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>👩‍⚕️ Nurse Panel</h1>
          <p>Monitor and record vitals for your assigned patients</p>
        </div>
      </div>

      ${patients.length === 0 ? '<div class="empty-state"><div class="empty-icon">👩‍⚕️</div><h3>No patients assigned to you</h3><p>Contact your administrator for patient assignment</p></div>' : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px">
          ${patients.map(p => {
        const latestVitals = DB.getPatientVitals(p.id)[0];
        const alerts = DB.getPatientAlerts(p.id).filter(a => !a.acknowledged);
        const doctor = DB.getById('users', p.assignedDoctorId);
        return `
              <div class="card" style="border-color:${p.status === 'critical' ? 'rgba(239,68,68,0.4)' : 'var(--border-card)'}">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="avatar" style="width:42px;height:42px;border-radius:12px;background:${Utils.roleGradient('doctor')};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px">${Utils.initials(p.name)}</div>
                    <div>
                      <div style="font-weight:700;font-size:14px">${Utils.escapeHtml(p.name)}</div>
                      <div style="font-size:11px;color:var(--text-muted)">${p.id} · Age ${p.age}</div>
                    </div>
                  </div>
                  <span class="badge badge-${p.status}">${Utils.statusBadge(p.status)}</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">
                  🏥 ${p.department} &nbsp;|&nbsp; 👨‍⚕️ ${doctor?.name || 'Unassigned'}
                </div>
                ${alerts.length ? `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:8px 10px;font-size:12px;color:#f87171;margin-bottom:10px">🚨 ${alerts.length} AI alert active</div>` : ''}
                ${latestVitals ? `
                  <div style="background:var(--bg-input);border-radius:8px;padding:10px;margin-bottom:12px">
                    <div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Last Vitals · ${Utils.timeAgo(latestVitals.timestamp)}</div>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
                      ${[
                    ['🌡️', latestVitals.temperature + '°C'],
                    ['🫀', latestVitals.systolicBP + '/' + latestVitals.diastolicBP],
                    ['💓', latestVitals.heartRate + 'bpm'],
                    ['🫁', latestVitals.oxygenSaturation + '%'],
                    ['💨', latestVitals.respiratoryRate + '/m'],
                ].map(([icon, val]) => `<div style="text-align:center;font-size:11px">${icon}<br><strong style="font-family:var(--font-mono)">${val}</strong></div>`).join('')}
                    </div>
                  </div>
                ` : `<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;text-align:center">No vitals recorded yet</div>`}
                <div style="display:flex;gap:8px">
                  <button class="btn btn-primary" style="flex:1" onclick="openVitalsModal('${p.id}','${Utils.escapeHtml(p.name)}')">📊 Record Vitals</button>
                  <button class="btn btn-secondary btn-sm" onclick="Router.navigate('patient-profile',{id:'${p.id}'})">👁</button>
                </div>
              </div>
            `;
    }).join('')}
        </div>
      `}
    </div>
  `;

    window.openVitalsModal = function (patientId, patientName) {
        Utils.showModal(`
      <div class="modal-header">
        <div>
          <h3 class="modal-title">📊 Record Vitals</h3>
          <div style="font-size:12px;color:var(--text-muted)">Patient: ${Utils.escapeHtml(patientName)}</div>
        </div>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>

      <div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--text-secondary)">
        Normal ranges: Temp 36.1–37.5°C · BP 90/60–140/90 · HR 60–100 · SpO₂ ≥95% · RR 12–20
      </div>

      <form id="vitals-form" onsubmit="submitVitals(event,'${patientId}')">
        <div class="form-grid form-grid-2" style="margin-bottom:16px">
          <div class="form-group">
            <label class="form-label">🌡️ Temperature (°C) *</label>
            <input type="number" id="v-temp" class="form-control" step="0.1" placeholder="36.5" min="30" max="45" required oninput="checkVitalRange('temp',this.value,'temperature')">
            <div id="warn-temp" class="vitals-warning"></div>
          </div>
          <div class="form-group">
            <label class="form-label">🫀 Systolic BP (mmHg) *</label>
            <input type="number" id="v-sbp" class="form-control" placeholder="120" min="50" max="250" required oninput="checkVitalRange('sbp',this.value,'systolicBP')">
            <div id="warn-sbp" class="vitals-warning"></div>
          </div>
          <div class="form-group">
            <label class="form-label">🫀 Diastolic BP (mmHg) *</label>
            <input type="number" id="v-dbp" class="form-control" placeholder="80" min="30" max="150" required oninput="checkVitalRange('dbp',this.value,'diastolicBP')">
            <div id="warn-dbp" class="vitals-warning"></div>
          </div>
          <div class="form-group">
            <label class="form-label">💓 Heart Rate (bpm) *</label>
            <input type="number" id="v-hr" class="form-control" placeholder="72" min="20" max="250" required oninput="checkVitalRange('hr',this.value,'heartRate')">
            <div id="warn-hr" class="vitals-warning"></div>
          </div>
          <div class="form-group">
            <label class="form-label">🫁 O₂ Saturation (%) *</label>
            <input type="number" id="v-spo2" class="form-control" placeholder="98" min="50" max="100" required oninput="checkVitalRange('spo2',this.value,'oxygenSaturation')">
            <div id="warn-spo2" class="vitals-warning"></div>
          </div>
          <div class="form-group">
            <label class="form-label">💨 Respiratory Rate (/min)</label>
            <input type="number" id="v-rr" class="form-control" placeholder="16" min="5" max="60" oninput="checkVitalRange('rr',this.value,'respiratoryRate')">
            <div id="warn-rr" class="vitals-warning"></div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">📝 Nursing Observations</label>
          <textarea id="v-obs" class="form-control" placeholder="Patient's current condition, any complaints, appearance..."></textarea>
        </div>

        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">🚦 Condition Flag</label>
          <select id="v-flag" class="form-control">
            <option value="stable">Stable</option>
            <option value="worsening">Worsening — Notify Doctor</option>
            <option value="improving">Improving</option>
            <option value="urgent">Urgent Review Required</option>
          </select>
        </div>

        <div id="vital-alert-banner" style="display:none;background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:8px;padding:12px;margin-bottom:12px;color:#f87171;font-size:13px;font-weight:600"></div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">💾 Save Vitals</button>
        </div>
      </form>
    `);

        window.checkVitalRange = function (id, value, key) {
            const warnEl = document.getElementById('warn-' + id);
            if (!warnEl) return;
            const isAbn = Utils.isVitalAbnormal(key, value);
            const range = Utils.VITAL_RANGES[key];
            warnEl.textContent = isAbn ? `⚠️ Outside normal range (${range.min}–${range.max} ${range.unit})` : '';
            warnEl.classList.toggle('show', isAbn);
            updateAlertBanner();
        };

        window.updateAlertBanner = function () {
            const keys = { temp: 'temperature', sbp: 'systolicBP', dbp: 'diastolicBP', hr: 'heartRate', spo2: 'oxygenSaturation', rr: 'respiratoryRate' };
            const inputs = { temp: 'v-temp', sbp: 'v-sbp', dbp: 'v-dbp', hr: 'v-hr', spo2: 'v-spo2', rr: 'v-rr' };
            const vitalsObj = {};
            for (const [k, vitalKey] of Object.entries(keys)) {
                const val = document.getElementById(inputs[k])?.value;
                if (val) vitalsObj[vitalKey] = parseFloat(val);
            }
            const abnormals = AI.detectAbnormalVitals(vitalsObj);
            const bannerEl = document.getElementById('vital-alert-banner');
            if (bannerEl) {
                const msg = AI.getVitalsAlertMessage(abnormals);
                bannerEl.style.display = msg ? 'block' : 'none';
                bannerEl.textContent = msg || '';
            }
        };

        window.submitVitals = function (e, patientId) {
            e.preventDefault();
            const vitalsData = {
                id: Utils.generateId('VIT'),
                patientId,
                recordedByNurseId: Auth.getUserId(),
                temperature: parseFloat(document.getElementById('v-temp').value),
                systolicBP: parseInt(document.getElementById('v-sbp').value),
                diastolicBP: parseInt(document.getElementById('v-dbp').value),
                heartRate: parseInt(document.getElementById('v-hr').value),
                oxygenSaturation: parseInt(document.getElementById('v-spo2').value),
                respiratoryRate: parseInt(document.getElementById('v-rr').value) || null,
                observations: document.getElementById('v-obs').value,
                conditionFlag: document.getElementById('v-flag').value,
                timestamp: Utils.nowISO(),
                isAbnormal: false
            };
            const abnormals = AI.detectAbnormalVitals(vitalsData);
            vitalsData.isAbnormal = abnormals.length > 0;

            DB.insert('vitals', vitalsData);
            DB.log('RECORD_VITALS', `Vitals recorded for patient ${patientId}. Abnormal: ${vitalsData.isAbnormal}`);

            /* Run AI analysis */
            const analysis = AI.analyzePatient(patientId);

            Utils.closeModal();

            if (abnormals.length) {
                const severeCritical = abnormals.filter(a => a.severity === 'severe');
                if (severeCritical.length) {
                    Utils.toast(`🚨 CRITICAL VITALS DETECTED! Notify doctor immediately for ${patientName}.`, 'error', 8000);
                } else {
                    Utils.toast(`⚠️ ${abnormals.length} abnormal vital(s) recorded. Doctor notified.`, 'warning', 5000);
                }
            } else {
                Utils.toast('✅ Vitals recorded successfully.', 'success');
            }

            if (analysis && analysis.riskScore >= 65) {
                Utils.toast(`🤖 AI Alert: Risk score ${analysis.riskScore}/100 — ${Utils.capitalize(analysis.riskLevel)} risk detected.`, 'ai', 6000);
            }

            setTimeout(() => renderNursePanel(container), 300);
        };
    };
}
