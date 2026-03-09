/* =============================================================
   PATIENT FORM.JS — Add / Edit Patient
   ============================================================= */

function renderPatientForm(container, params) {
    if (!Auth.requireRole('admin', 'doctor')) return;
    const isEdit = Boolean(params.id);
    const existing = isEdit ? DB.getById('patients', params.id) : null;
    const doctors = DB.getAll('users').filter(u => u.role === 'doctor' && u.isActive);
    const nurses = DB.getAll('users').filter(u => u.role === 'nurse' && u.isActive);

    const val = (field) => existing ? Utils.escapeHtml(existing[field] || '') : '';

    container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>${isEdit ? '✏️ Edit Patient' : '➕ Add New Patient'}</h1>
          <p>${isEdit ? `Editing record for ${existing.name}` : 'Register a new patient in the system'}</p>
        </div>
        <button class="btn btn-secondary" onclick="Router.navigate('patients')">← Back</button>
      </div>

      <div class="card">
        <form id="patient-form" onsubmit="submitPatientForm(event)">
          <!-- Personal Details -->
          <div style="margin-bottom:24px">
            <div style="font-size:14px;font-weight:700;color:var(--primary);margin-bottom:14px;display:flex;align-items:center;gap:8px">👤 Personal Details</div>
            <div class="form-grid form-grid-3">
              <div class="form-group" style="grid-column:1/3">
                <label class="form-label">Full Name *</label>
                <input type="text" id="p-name" class="form-control" placeholder="Patient full name" value="${val('name')}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Age *</label>
                <input type="number" id="p-age" class="form-control" placeholder="Age" min="0" max="150" value="${existing?.age || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Gender *</label>
                <select id="p-gender" class="form-control" required>
                  <option value="">Select Gender</option>
                  <option value="male" ${existing?.gender === 'male' ? 'selected' : ''}>Male</option>
                  <option value="female" ${existing?.gender === 'female' ? 'selected' : ''}>Female</option>
                  <option value="other" ${existing?.gender === 'other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Blood Group</label>
                <select id="p-blood" class="form-control">
                  <option value="">Select</option>
                  ${['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => `<option value="${g}" ${(existing?.bloodGroup === g) ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="tel" id="p-phone" class="form-control" placeholder="10-digit phone" value="${val('phone')}">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="p-email" class="form-control" placeholder="patient@email.com" value="${val('email')}">
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label">Address</label>
                <input type="text" id="p-address" class="form-control" placeholder="Full address" value="${val('address')}">
              </div>
            </div>
          </div>

          <hr class="section-divider">

          <!-- Admission Details -->
          <div style="margin-bottom:24px">
            <div style="font-size:14px;font-weight:700;color:var(--primary);margin-bottom:14px">🏥 Admission Details</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label">Department *</label>
                <select id="p-dept" class="form-control" required>
                  <option value="">Select Department</option>
                  ${Utils.DEPARTMENTS.map(d => `<option value="${d}" ${existing?.department === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Admission Date *</label>
                <input type="date" id="p-admDate" class="form-control" value="${existing?.admissionDate ? existing.admissionDate.slice(0, 10) : new Date().toISOString().slice(0, 10)}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select id="p-status" class="form-control">
                  <option value="admitted" ${existing?.status === 'admitted' ? 'selected' : ''}>Admitted</option>
                  <option value="stable" ${existing?.status === 'stable' ? 'selected' : ''}>Stable</option>
                  <option value="critical" ${existing?.status === 'critical' ? 'selected' : ''}>Critical</option>
                  <option value="improving" ${existing?.status === 'improving' ? 'selected' : ''}>Improving</option>
                  <option value="discharged" ${existing?.status === 'discharged' ? 'selected' : ''}>Discharged</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Assigned Doctor</label>
                <select id="p-doctor" class="form-control">
                  <option value="">Select Doctor</option>
                  ${doctors.map(d => `<option value="${d.id}" ${existing?.assignedDoctorId === d.id ? 'selected' : ''}>${d.name} — ${d.department}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Assigned Nurse</label>
                <select id="p-nurse" class="form-control">
                  <option value="">Select Nurse</option>
                  ${nurses.map(n => `<option value="${n.id}" ${existing?.assignedNurseId === n.id ? 'selected' : ''}>${n.name} — ${n.department}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Discharge Date</label>
                <input type="date" id="p-disDate" class="form-control" value="${existing?.dischargeDate ? existing.dischargeDate.slice(0, 10) : ''}">
              </div>
            </div>
          </div>

          <hr class="section-divider">

          <!-- Medical Details -->
          <div style="margin-bottom:24px">
            <div style="font-size:14px;font-weight:700;color:var(--primary);margin-bottom:14px">🩺 Medical Details</div>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label class="form-label">Medical History</label>
                <textarea id="p-history" class="form-control" placeholder="Previous conditions, surgeries, chronic illnesses...">${val('medicalHistory')}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Known Allergies</label>
                <textarea id="p-allergies" class="form-control" placeholder="Drug allergies, food allergies...">${val('allergies')}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Current Diagnosis</label>
                <textarea id="p-diagnosis" class="form-control" placeholder="Primary diagnosis...">${val('currentDiagnosis')}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Treatment Plan</label>
                <textarea id="p-treatment" class="form-control" placeholder="Treatment approach, medications, procedures...">${val('treatmentPlan')}</textarea>
              </div>
            </div>
          </div>

          <div id="form-errors" style="color:var(--danger);font-size:13px;margin-bottom:12px;display:none;"></div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="Router.navigate('patients')">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? '💾 Save Changes' : '➕ Register Patient'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

    window.submitPatientForm = function (e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('p-name').value.trim(),
            age: parseInt(document.getElementById('p-age').value),
            gender: document.getElementById('p-gender').value,
            bloodGroup: document.getElementById('p-blood').value,
            phone: document.getElementById('p-phone').value,
            email: document.getElementById('p-email').value,
            address: document.getElementById('p-address').value,
            department: document.getElementById('p-dept').value,
            admissionDate: document.getElementById('p-admDate').value,
            status: document.getElementById('p-status').value,
            assignedDoctorId: document.getElementById('p-doctor').value,
            assignedNurseId: document.getElementById('p-nurse').value,
            dischargeDate: document.getElementById('p-disDate').value || null,
            medicalHistory: document.getElementById('p-history').value,
            allergies: document.getElementById('p-allergies').value,
            currentDiagnosis: document.getElementById('p-diagnosis').value,
            treatmentPlan: document.getElementById('p-treatment').value,
        };
        const errors = Utils.validatePatientForm(data);
        const errEl = document.getElementById('form-errors');
        if (errors.length) {
            errEl.innerHTML = '⚠️ ' + errors.join('<br>⚠️ ');
            errEl.style.display = 'block';
            return;
        }
        errEl.style.display = 'none';
        if (isEdit) {
            DB.update('patients', params.id, data);
            DB.log('UPDATE_PATIENT', `Patient ${params.id} updated`);
            Utils.toast(`Patient record updated successfully!`, 'success');
            Router.navigate('patient-profile', { id: params.id });
        } else {
            const newPatient = { id: Utils.generatePatientId(), ...data, isDeleted: false, createdAt: Utils.nowISO(), updatedAt: Utils.nowISO() };
            DB.insert('patients', newPatient);
            DB.log('CREATE_PATIENT', `New patient registered: ${newPatient.id}`);
            Utils.toast(`Patient registered! ID: ${newPatient.id}`, 'success');
            Router.navigate('patient-profile', { id: newPatient.id });
        }
    };
}
