/* =============================================================
   DB.JS — LocalStorage Database Layer
   Normalized Schema with Seed Data
   ============================================================= */

const DB = (() => {
    const STORE = {
        users: 'hms_users',
        patients: 'hms_patients',
        vitals: 'hms_vitals',
        doctorNotes: 'hms_doctorNotes',
        prescriptions: 'hms_prescriptions',
        departments: 'hms_departments',
        auditLogs: 'hms_auditLogs',
        aiAlerts: 'hms_aiAlerts',
        operations: 'hms_operations'
    };

    /* ── Core CRUD ── */
    function getAll(collection) {
        try { return JSON.parse(localStorage.getItem(STORE[collection]) || '[]'); }
        catch (e) { return []; }
    }
    function save(collection, data) {
        localStorage.setItem(STORE[collection], JSON.stringify(data));
    }
    function getById(collection, id) {
        return getAll(collection).find(item => item.id === id) || null;
    }
    function insert(collection, item) {
        const data = getAll(collection);
        data.push(item);
        save(collection, data);
        return item;
    }
    function update(collection, id, updates) {
        const data = getAll(collection);
        const idx = data.findIndex(item => item.id === id);
        if (idx === -1) return null;
        data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
        save(collection, data);
        return data[idx];
    }
    function remove(collection, id) {
        const data = getAll(collection).filter(item => item.id !== id);
        save(collection, data);
    }
    function query(collection, predicate) {
        return getAll(collection).filter(predicate);
    }
    function clearAll() {
        Object.values(STORE).forEach(key => localStorage.removeItem(key));
    }

    /* ── Audit Logging ── */
    function log(action, details, userId = null) {
        const session = Auth ? Auth.getSession() : null;
        insert('auditLogs', {
            id: `LOG-${Date.now()}`,
            userId: userId || session?.userId || 'system',
            userName: session?.name || 'System',
            userRole: session?.role || 'system',
            action,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /* ── Statistics ── */
    function getStats() {
        const patients = getAll('patients').filter(p => !p.isDeleted);
        const users = getAll('users').filter(u => u.isActive);
        const alerts = getAll('aiAlerts').filter(a => !a.acknowledged);
        return {
            totalPatients: patients.length,
            admitted: patients.filter(p => p.status !== 'discharged').length,
            discharged: patients.filter(p => p.status === 'discharged').length,
            critical: patients.filter(p => p.status === 'critical').length,
            totalDoctors: users.filter(u => u.role === 'doctor').length,
            totalNurses: users.filter(u => u.role === 'nurse').length,
            unacknowledgedAlerts: alerts.length,
            departmentStats: getDeptStats(patients)
        };
    }
    function getDeptStats(patients) {
        const map = {};
        patients.forEach(p => {
            if (p.status !== 'discharged') {
                map[p.department] = (map[p.department] || 0) + 1;
            }
        });
        return map;
    }

    /* ── Patient Helpers ── */
    function getPatientVitals(patientId) {
        return query('vitals', v => v.patientId === patientId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    function getPatientNotes(patientId) {
        return query('doctorNotes', n => n.patientId === patientId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    function getPatientAlerts(patientId) {
        return query('aiAlerts', a => a.patientId === patientId)
            .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    }
    function getDoctorPatients(doctorId) {
        return query('patients', p => p.assignedDoctorId === doctorId && !p.isDeleted);
    }
    function getNursePatients(nurseId) {
        return query('patients', p => p.assignedNurseId === nurseId && !p.isDeleted);
    }

    /* ── Seed Data ── */
    function isInitialized() {
        return localStorage.getItem('hms_initialized') === 'true';
    }
    function initialize() {
        if (isInitialized()) return;
        seedDepartments();
        seedUsers();
        seedPatients();
        seedVitals();
        seedDoctorNotes();
        seedAIAlerts();
        seedOperations();
        localStorage.setItem('hms_initialized', 'true');
        console.log('✅ HMS Database Initialized with Seed Data');
    }

    function seedDepartments() {
        const depts = ['Cardiology', 'Emergency', 'Pediatrics', 'Neurology', 'Orthopedics', 'Oncology', 'General Medicine', 'Gynecology', 'Surgery', 'ICU'];
        depts.forEach((name, i) => {
            insert('departments', { id: `DEPT-${String(i + 1).padStart(2, '0')}`, name, headDoctorId: null, bedCount: 20 + (i * 5) });
        });
    }

    function seedUsers() {
        const users = [
            { id: 'USR-001', name: 'Dr. Arjun Mehta', email: 'admin@hospital.ai', passwordHash: hashPwd('Admin@123'), role: 'admin', department: 'General Medicine', specialization: 'Hospital Administrator', shift: 'morning', phone: '9876500001', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
            { id: 'USR-002', name: 'Dr. Priya Sharma', email: 'doctor@hospital.ai', passwordHash: hashPwd('Doctor@123'), role: 'doctor', department: 'Cardiology', specialization: 'Cardiologist', shift: 'morning', phone: '9876500002', isActive: true, createdAt: '2024-01-02T00:00:00Z' },
            { id: 'USR-003', name: 'Nurse Kavitha Reddy', email: 'nurse@hospital.ai', passwordHash: hashPwd('Nurse@123'), role: 'nurse', department: 'Cardiology', specialization: 'Cardiac Nurse', shift: 'morning', phone: '9876500003', isActive: true, createdAt: '2024-01-03T00:00:00Z' },
            { id: 'USR-004', name: 'Dr. Rahul Gupta', email: 'doctor2@hospital.ai', passwordHash: hashPwd('Doctor@123'), role: 'doctor', department: 'Emergency', specialization: 'Emergency Medicine', shift: 'evening', phone: '9876500004', isActive: true, createdAt: '2024-01-04T00:00:00Z' },
            { id: 'USR-005', name: 'Nurse Sunita Patel', email: 'nurse2@hospital.ai', passwordHash: hashPwd('Nurse@123'), role: 'nurse', department: 'Emergency', specialization: 'Emergency Nurse', shift: 'evening', phone: '9876500005', isActive: true, createdAt: '2024-01-05T00:00:00Z' },
            { id: 'USR-006', name: 'Dr. Lakshmi Iyer', email: 'doctor3@hospital.ai', passwordHash: hashPwd('Doctor@123'), role: 'doctor', department: 'Neurology', specialization: 'Neurologist', shift: 'morning', phone: '9876500006', isActive: true, createdAt: '2024-01-06T00:00:00Z' }
        ];
        users.forEach(u => insert('users', u));
    }

    function hashPwd(p) {
        let hash = 0;
        for (let i = 0; i < p.length; i++) { hash = ((hash << 5) - hash) + p.charCodeAt(i); hash = hash & hash; }
        return `hashed_${Math.abs(hash)}_${btoa(p)}`;
    }

    function seedPatients() {
        const now = new Date();
        const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
        const patients = [
            { id: 'PAT-2026-0001', name: 'Ravi Kumar', age: 54, gender: 'male', phone: '9811234567', email: 'ravi@email.com', bloodGroup: 'O+', address: '15 MG Road, Bangalore', department: 'Cardiology', admissionDate: daysAgo(5), dischargeDate: null, status: 'critical', assignedDoctorId: 'USR-002', assignedNurseId: 'USR-003', medicalHistory: 'Hypertension for 10 years, Diabetes Type 2', allergies: 'Penicillin', currentDiagnosis: 'Acute Myocardial Infarction', treatmentPlan: 'Thrombolysis + Monitoring', isDeleted: false, createdAt: daysAgo(5), updatedAt: daysAgo(1) },
            { id: 'PAT-2026-0002', name: 'Sunita Devi', age: 38, gender: 'female', phone: '9821234568', email: 'sunita@email.com', bloodGroup: 'B+', address: '22 Park Street, Chennai', department: 'Cardiology', admissionDate: daysAgo(3), dischargeDate: null, status: 'stable', assignedDoctorId: 'USR-002', assignedNurseId: 'USR-003', medicalHistory: 'No prior cardiac issues', allergies: 'None known', currentDiagnosis: 'Arrhythmia — Atrial Fibrillation', treatmentPlan: 'Beta-blockers, monitoring', isDeleted: false, createdAt: daysAgo(3), updatedAt: daysAgo(1) },
            { id: 'PAT-2026-0003', name: 'Mohammed Farhan', age: 67, gender: 'male', phone: '9831234569', email: 'farhan@email.com', bloodGroup: 'A-', address: '7 Lake View, Hyderabad', department: 'Emergency', admissionDate: daysAgo(1), dischargeDate: null, status: 'critical', assignedDoctorId: 'USR-004', assignedNurseId: 'USR-005', medicalHistory: 'COPD, Smoking history 30 years', allergies: 'Aspirin', currentDiagnosis: 'Acute COPD Exacerbation', treatmentPlan: 'O2 therapy, bronchodilators', isDeleted: false, createdAt: daysAgo(1), updatedAt: daysAgo(0) },
            { id: 'PAT-2026-0004', name: 'Anita Krishnaswamy', age: 45, gender: 'female', phone: '9841234570', email: 'anita@email.com', bloodGroup: 'AB+', address: '88 Gandhi Nagar, Pune', department: 'Neurology', admissionDate: daysAgo(7), dischargeDate: null, status: 'improving', assignedDoctorId: 'USR-006', assignedNurseId: 'USR-003', medicalHistory: 'Migraine since age 25', allergies: 'Sulfa drugs', currentDiagnosis: 'Ischemic Stroke — TIA', treatmentPlan: 'Antiplatelet, physiotherapy', isDeleted: false, createdAt: daysAgo(7), updatedAt: daysAgo(2) },
            { id: 'PAT-2026-0005', name: 'Rohan Desai', age: 28, gender: 'male', phone: '9851234571', email: 'rohan@email.com', bloodGroup: 'O-', address: '3 College Road, Mumbai', department: 'Emergency', admissionDate: daysAgo(2), dischargeDate: new Date().toISOString(), status: 'discharged', assignedDoctorId: 'USR-004', assignedNurseId: 'USR-005', medicalHistory: 'Fit and healthy', allergies: 'None', currentDiagnosis: 'Fracture — Left Radius', treatmentPlan: 'Cast, analgesics, follow-up in 4 weeks', isDeleted: false, createdAt: daysAgo(2), updatedAt: daysAgo(0) },
            { id: 'PAT-2026-0006', name: 'Meera Nair', age: 62, gender: 'female', phone: '9861234572', email: 'meera@email.com', bloodGroup: 'B-', address: '55 Nehru Street, Kochi', department: 'Cardiology', admissionDate: daysAgo(10), dischargeDate: null, status: 'stable', assignedDoctorId: 'USR-002', assignedNurseId: 'USR-003', medicalHistory: 'CHF diagnosed 3 years ago', allergies: 'ACE Inhibitors', currentDiagnosis: 'Congestive Heart Failure — Exacerbation', treatmentPlan: 'Diuretics, fluid restriction', isDeleted: false, createdAt: daysAgo(10), updatedAt: daysAgo(3) }
        ];
        patients.forEach(p => insert('patients', p));
    }

    function seedVitals() {
        const now = new Date();
        const hoursAgo = (h) => new Date(now - h * 3600000).toISOString();
        const vitals = [
            // Patient 1 — Critical (Ravi Kumar)
            { id: 'VIT-001', patientId: 'PAT-2026-0001', recordedByNurseId: 'USR-003', temperature: 38.9, systolicBP: 165, diastolicBP: 105, heartRate: 112, oxygenSaturation: 91, respiratoryRate: 24, observations: 'Patient is anxious, diaphoretic', conditionFlag: 'worsening', timestamp: hoursAgo(2), isAbnormal: true },
            { id: 'VIT-002', patientId: 'PAT-2026-0001', recordedByNurseId: 'USR-003', temperature: 38.5, systolicBP: 158, diastolicBP: 98, heartRate: 105, oxygenSaturation: 93, respiratoryRate: 22, observations: 'Slight improvement after medication', conditionFlag: 'stable', timestamp: hoursAgo(8), isAbnormal: true },
            { id: 'VIT-003', patientId: 'PAT-2026-0001', recordedByNurseId: 'USR-003', temperature: 38.1, systolicBP: 170, diastolicBP: 110, heartRate: 118, oxygenSaturation: 90, respiratoryRate: 26, observations: 'Chest pain reported', conditionFlag: 'worsening', timestamp: hoursAgo(16), isAbnormal: true },
            // Patient 2 — Stable (Sunita Devi)
            { id: 'VIT-004', patientId: 'PAT-2026-0002', recordedByNurseId: 'USR-003', temperature: 36.8, systolicBP: 128, diastolicBP: 82, heartRate: 88, oxygenSaturation: 97, respiratoryRate: 16, observations: 'Patient stable, resting comfortably', conditionFlag: 'stable', timestamp: hoursAgo(4), isAbnormal: false },
            { id: 'VIT-005', patientId: 'PAT-2026-0002', recordedByNurseId: 'USR-003', temperature: 37.0, systolicBP: 132, diastolicBP: 85, heartRate: 92, oxygenSaturation: 96, respiratoryRate: 17, observations: 'Mild palpitations reported', conditionFlag: 'stable', timestamp: hoursAgo(12), isAbnormal: false },
            // Patient 3 — Critical (Mohammed)
            { id: 'VIT-006', patientId: 'PAT-2026-0003', recordedByNurseId: 'USR-005', temperature: 38.7, systolicBP: 148, diastolicBP: 92, heartRate: 108, oxygenSaturation: 86, respiratoryRate: 28, observations: 'Severe dyspnea, using accessory muscles', conditionFlag: 'worsening', timestamp: hoursAgo(1), isAbnormal: true },
            // Patient 4 — Improving (Anita)
            { id: 'VIT-007', patientId: 'PAT-2026-0004', recordedByNurseId: 'USR-003', temperature: 36.9, systolicBP: 135, diastolicBP: 84, heartRate: 78, oxygenSaturation: 97, respiratoryRate: 15, observations: 'Responding well, speech improving', conditionFlag: 'stable', timestamp: hoursAgo(6), isAbnormal: false }
        ];
        vitals.forEach(v => insert('vitals', v));
    }

    function seedDoctorNotes() {
        const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
        const notes = [
            { id: 'NOTE-001', patientId: 'PAT-2026-0001', doctorId: 'USR-002', diagnosis: 'Acute STEMI — Inferior wall MI', prescription: [{ drug: 'Aspirin', dose: '325mg', frequency: 'Once daily' }, { drug: 'Clopidogrel', dose: '75mg', frequency: 'Once daily' }, { drug: 'Atorvastatin', dose: '40mg', frequency: 'Once at night' }, { drug: 'Metoprolol', dose: '25mg', frequency: 'Twice daily' }], treatmentPlan: 'Immediate thrombolysis completed. ICU monitoring. Echocardiography scheduled.', notes: 'Patient was brought with 2hr chest pain. ECG showed ST elevation. Troponin elevated 12x. Thrombolysis administered.', patientStatus: 'critical', timestamp: hoursAgo(10) },
            { id: 'NOTE-002', patientId: 'PAT-2026-0002', doctorId: 'USR-002', diagnosis: 'Paroxysmal Atrial Fibrillation', prescription: [{ drug: 'Bisoprolol', dose: '5mg', frequency: 'Once daily' }, { drug: 'Warfarin', dose: '5mg', frequency: 'Once daily as per INR' }], treatmentPlan: 'Rate control with beta blockers. Anticoagulation started. Holter monitoring arranged.', notes: 'INR target 2-3. Patient educated on bleeding risk. Follow Cardiology OPD in 2 weeks.', patientStatus: 'stable', timestamp: hoursAgo(20) },
            { id: 'NOTE-003', patientId: 'PAT-2026-0004', doctorId: 'USR-006', diagnosis: 'TIA — Transient Ischemic Attack', prescription: [{ drug: 'Aspirin', dose: '75mg', frequency: 'Once daily' }, { drug: 'Clopidogrel', dose: '75mg', frequency: 'Once daily for 21 days' }], treatmentPlan: 'Dual antiplatelet for 21 days. MRI brain done — no infarct. Carotid Doppler normal. BP target <130/80.', notes: 'Patient presented with 20 min right-sided weakness and slurred speech. Resolved spontaneously. High-risk TIA score (ABCD2 = 5).', patientStatus: 'improving', timestamp: hoursAgo(36) }
        ];
        notes.forEach(n => insert('doctorNotes', n));
    }

    function seedAIAlerts() {
        const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
        const alerts = [
            { id: 'ALERT-001', patientId: 'PAT-2026-0001', patientName: 'Ravi Kumar', riskScore: 87, riskLevel: 'high', patterns: ['Worsening HR trend (90→118→112 bpm)', 'Persistent fever (38.1→38.9°C)', 'O2 saturation dropping (93→91%)', 'Elevated BP despite medication'], suggestedDiagnoses: ['Cardiogenic Shock Risk', 'Sepsis Secondary to MI', 'Acute Heart Failure'], drugInteractions: [], readmissionRisk: 'high', recoveryTimeline: 'Uncertain — requires intensive monitoring', generatedAt: hoursAgo(1.5), acknowledged: false },
            { id: 'ALERT-002', patientId: 'PAT-2026-0003', patientName: 'Mohammed Farhan', riskScore: 79, riskLevel: 'high', patterns: ['Critical O2 sat (86%) — below safe threshold', 'High respiratory rate (28/min)', 'Fever with tachycardia'], suggestedDiagnoses: ['Respiratory Failure Risk', 'HAP — Hospital-Acquired Pneumonia', 'Acute Cor Pulmonale'], drugInteractions: [], readmissionRisk: 'high', recoveryTimeline: '4-7 days with aggressive treatment', generatedAt: hoursAgo(0.5), acknowledged: false },
            { id: 'ALERT-003', patientId: 'PAT-2026-0002', patientName: 'Sunita Devi', riskScore: 42, riskLevel: 'medium', patterns: ['Occasional tachycardia episodes', 'INR monitoring required for Warfarin'], suggestedDiagnoses: ['Possible AF progression', 'Bleeding risk on anticoagulation'], drugInteractions: [{ drug1: 'Warfarin', drug2: 'Aspirin (future)', risk: 'Increased bleeding risk if added together' }], readmissionRisk: 'medium', recoveryTimeline: '7-10 days', generatedAt: hoursAgo(5), acknowledged: false }
        ];
        alerts.forEach(a => insert('aiAlerts', a));
    }

    function seedOperations() {
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

        const ops = [
            /* ──── TODAY ──── */
            { id: 'OP-001', type: 'Brain Tumor Resection', patientId: 'PAT-2026-0004', patientName: 'Anita Krishnaswamy', surgeonId: 'USR-006', anesthesiologistId: 'USR-002', assistingSurgeon: 'Dr. Rahul Gupta', scheduledDate: today, scheduledTime: '08:00', durationMinutes: 240, theatre: 'OT-1', priority: 'urgent', notes: 'Pre-op MRI completed. Neurosurgery team on standby. Blood bank alerted.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-002', type: 'Cardiac Bypass Grafting', patientId: 'PAT-2026-0001', patientName: 'Ravi Kumar', surgeonId: 'USR-002', anesthesiologistId: 'USR-004', assistingSurgeon: 'Dr. Lakshmi Iyer', scheduledDate: today, scheduledTime: '11:00', durationMinutes: 300, theatre: 'OT-2', priority: 'emergency', notes: 'STEMI patient. Perfusionist on standby. ICU bed reserved post-op.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-003', type: 'Knee Replacement', patientId: 'PAT-2026-0005', patientName: 'Rohan Desai', surgeonId: 'USR-004', anesthesiologistId: 'USR-002', assistingSurgeon: null, scheduledDate: today, scheduledTime: '14:00', durationMinutes: 120, theatre: 'OT-3', priority: 'routine', notes: 'Right TKR. Spinal anesthesia planned. Physiotherapy team informed.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-004', type: 'Laparoscopic Cholecystectomy', patientId: 'PAT-2026-0002', patientName: 'Sunita Devi', surgeonId: 'USR-002', anesthesiologistId: 'USR-006', assistingSurgeon: 'Dr. Rahul Gupta', scheduledDate: today, scheduledTime: '09:30', durationMinutes: 90, theatre: 'OT-3', priority: 'routine', notes: 'Gallstone disease. Elective laparoscopic approach.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-005', type: 'Craniotomy for Hemorrhage', patientId: 'PAT-2026-0003', patientName: 'Mohammed Farhan', surgeonId: 'USR-006', anesthesiologistId: 'USR-002', assistingSurgeon: null, scheduledDate: today, scheduledTime: '17:00', durationMinutes: 180, theatre: 'Emergency OT', priority: 'emergency', notes: 'Acute subdural hematoma. Emergency craniotomy.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-006', type: 'Appendectomy', patientId: 'PAT-2026-0006', patientName: 'Meera Nair', surgeonId: 'USR-004', anesthesiologistId: 'USR-002', assistingSurgeon: null, scheduledDate: today, scheduledTime: '07:00', durationMinutes: 60, theatre: 'OT-4', priority: 'urgent', notes: 'Acute appendicitis confirmed by CT.', status: 'completed', createdAt: new Date().toISOString() },
            /* ──── TOMORROW ──── */
            { id: 'OP-007', type: 'Heart Valve Replacement', patientId: 'PAT-2026-0001', patientName: 'Ravi Kumar', surgeonId: 'USR-002', anesthesiologistId: 'USR-004', assistingSurgeon: 'Dr. Lakshmi Iyer', scheduledDate: tomorrow, scheduledTime: '09:00', durationMinutes: 360, theatre: 'OT-1', priority: 'urgent', notes: 'Mechanical valve planned. Cardiopulmonary bypass required. Post-op ICU.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-008', type: 'Spinal Fusion — L4/L5', patientId: 'PAT-2026-0004', patientName: 'Anita Krishnaswamy', surgeonId: 'USR-006', anesthesiologistId: 'USR-002', assistingSurgeon: 'Dr. Rahul Gupta', scheduledDate: tomorrow, scheduledTime: '11:30', durationMinutes: 210, theatre: 'OT-2', priority: 'routine', notes: 'Posterior lumbar inter-body fusion. Neuro monitoring throughout.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-009', type: 'Hip Replacement', patientId: 'PAT-2026-0006', patientName: 'Meera Nair', surgeonId: 'USR-004', anesthesiologistId: 'USR-006', assistingSurgeon: null, scheduledDate: tomorrow, scheduledTime: '15:00', durationMinutes: 150, theatre: 'OT-3', priority: 'routine', notes: 'Right THR. Cementless prosthesis planned.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-010', type: 'Thyroidectomy', patientId: 'PAT-2026-0002', patientName: 'Sunita Devi', surgeonId: 'USR-002', anesthesiologistId: 'USR-004', assistingSurgeon: null, scheduledDate: tomorrow, scheduledTime: '08:00', durationMinutes: 120, theatre: 'OT-4', priority: 'routine', notes: 'Total thyroidectomy for multinodular goiter.', status: 'upcoming', createdAt: new Date().toISOString() },
            /* ──── DAY AFTER ──── */
            { id: 'OP-011', type: 'Coronary Angioplasty', patientId: 'PAT-2026-0001', patientName: 'Ravi Kumar', surgeonId: 'USR-002', anesthesiologistId: 'USR-006', assistingSurgeon: null, scheduledDate: dayAfter, scheduledTime: '10:00', durationMinutes: 90, theatre: 'OT-2', priority: 'urgent', notes: 'Cath lab reserved. Drug-eluting stent planned.', status: 'upcoming', createdAt: new Date().toISOString() },
            { id: 'OP-012', type: 'Kidney Transplant', patientId: 'PAT-2026-0003', patientName: 'Mohammed Farhan', surgeonId: 'USR-004', anesthesiologistId: 'USR-002', assistingSurgeon: 'Dr. Lakshmi Iyer', scheduledDate: dayAfter, scheduledTime: '08:00', durationMinutes: 300, theatre: 'OT-1', priority: 'urgent', notes: 'Living related donor. Transplant team briefed.', status: 'upcoming', createdAt: new Date().toISOString() }
        ];
        ops.forEach(op => insert('operations', op));
    }

    return {
        getAll, save, getById, insert, update, remove, query,
        log, getStats,
        getPatientVitals, getPatientNotes, getPatientAlerts,
        getDoctorPatients, getNursePatients,
        initialize, clearAll, isInitialized
    };
})();
