/* =============================================================
   UTILS.JS — Shared Utility Functions
   ============================================================= */

const Utils = (() => {
    /* ── ID Generators ── */
    function generatePatientId() {
        const year = new Date().getFullYear();
        const patients = DB.getAll('patients');
        const num = String(patients.length + 1).padStart(4, '0');
        return `PAT-${year}-${num}`;
    }
    function generateId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }
    function generateUserId() {
        const users = DB.getAll('users');
        const num = String(users.length + 1).padStart(3, '0');
        return `USR-${num}`;
    }

    /* ── Date / Time ── */
    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    function formatDateTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    function timeAgo(iso) {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    }
    function nowISO() { return new Date().toISOString(); }

    /* ── Password Hash (simple SHA-256-like obfuscation for demo) ── */
    function hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `hashed_${Math.abs(hash)}_${btoa(password)}`;
    }
    function checkPassword(plain, hashed) {
        return hashPassword(plain) === hashed;
    }

    /* ── String Helpers ── */
    function initials(name) {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function truncate(str, len = 50) {
        if (!str) return '';
        return str.length > len ? str.slice(0, len) + '…' : str;
    }

    /* ── Role Colors ── */
    function roleColor(role) {
        return { admin: '#a855f7', doctor: '#00d4ff', nurse: '#06d6a0' }[role] || '#94a3b8';
    }
    function roleGradient(role) {
        const map = {
            admin: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            doctor: 'linear-gradient(135deg,#0099cc,#00d4ff)',
            nurse: 'linear-gradient(135deg,#059669,#06d6a0)'
        };
        return map[role] || 'linear-gradient(135deg,#475569,#94a3b8)';
    }
    function statusBadge(status) {
        const map = {
            admitted: '🏥 Admitted', discharged: '✅ Discharged',
            critical: '🚨 Critical', stable: '💚 Stable', improving: '📈 Improving'
        };
        return map[status] || status || '—';
    }

    /* ── Toast Notifications ── */
    function toast(msg, type = 'info', duration = 4000) {
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', ai: '🤖' };
        const container = document.getElementById('toast-container') || (() => {
            const c = document.createElement('div');
            c.id = 'toast-container'; c.className = 'toast-container';
            document.body.appendChild(c); return c;
        })();
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-msg">${escapeHtml(msg)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
        container.appendChild(t);
        setTimeout(() => { t.style.animation = 'none'; t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
    }

    /* ── Modal ── */
    function showModal(html, size = '') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'active-modal';
        overlay.innerHTML = `<div class="modal ${size}">${html}</div>`;
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        document.body.appendChild(overlay);
        return overlay;
    }
    function closeModal() {
        const m = document.getElementById('active-modal');
        if (m) m.remove();
    }

    /* ── Confirm Dialog ── */
    function confirm(message, title = 'Confirm Action') {
        return new Promise(resolve => {
            showModal(`
        <div class="modal-header">
          <h3 class="modal-title">⚠️ ${escapeHtml(title)}</h3>
          <button class="modal-close" onclick="Utils.closeModal()">✕</button>
        </div>
        <p style="color:var(--text-secondary);margin-bottom:24px;">${escapeHtml(message)}</p>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="Utils.closeModal();window._confirmResolve(false)">Cancel</button>
          <button class="btn btn-danger" onclick="Utils.closeModal();window._confirmResolve(true)">Confirm</button>
        </div>
      `);
            window._confirmResolve = resolve;
        });
    }

    /* ── Validation ── */
    function validatePatientForm(data) {
        const errors = [];
        if (!data.name?.trim()) errors.push('Patient name is required');
        if (!data.age || data.age < 0 || data.age > 150) errors.push('Valid age is required (0-150)');
        if (!data.gender) errors.push('Gender is required');
        if (!data.department) errors.push('Department is required');
        if (!data.admissionDate) errors.push('Admission date is required');
        return errors;
    }
    function validateVitalsForm(data) {
        const errors = [];
        if (!data.temperature && data.temperature !== 0) errors.push('Temperature is required');
        if (!data.systolicBP && data.systolicBP !== 0) errors.push('Systolic BP is required');
        if (!data.diastolicBP && data.diastolicBP !== 0) errors.push('Diastolic BP is required');
        if (!data.heartRate && data.heartRate !== 0) errors.push('Heart rate is required');
        if (!data.oxygenSaturation && data.oxygenSaturation !== 0) errors.push('Oxygen saturation is required');
        return errors;
    }

    /* ── Department List ── */
    const DEPARTMENTS = ['Cardiology', 'Emergency', 'Pediatrics', 'Neurology', 'Orthopedics', 'Oncology', 'General Medicine', 'Gynecology', 'Surgery', 'ICU'];

    /* ── Normal Vital Ranges ── */
    const VITAL_RANGES = {
        temperature: { min: 36.1, max: 37.5, unit: '°C', name: 'Temperature', icon: '🌡️' },
        systolicBP: { min: 90, max: 140, unit: 'mmHg', name: 'Systolic BP', icon: '🫀' },
        diastolicBP: { min: 60, max: 90, unit: 'mmHg', name: 'Diastolic BP', icon: '🫀' },
        heartRate: { min: 60, max: 100, unit: 'bpm', name: 'Heart Rate', icon: '💓' },
        oxygenSaturation: { min: 95, max: 100, unit: '%', name: 'O₂ Saturation', icon: '🫁' },
        respiratoryRate: { min: 12, max: 20, unit: '/min', name: 'Resp. Rate', icon: '💨' }
    };

    function isVitalAbnormal(key, value) {
        const range = VITAL_RANGES[key];
        if (!range || value === null || value === undefined || value === '') return false;
        return parseFloat(value) < range.min || parseFloat(value) > range.max;
    }

    /* ── Chart Colors ── */
    const CHART_COLORS = ['#00d4ff', '#a855f7', '#06d6a0', '#f59e0b', '#ef4444', '#3b82f6'];

    return {
        generatePatientId, generateId, generateUserId,
        formatDate, formatDateTime, timeAgo, nowISO,
        hashPassword, checkPassword,
        initials, capitalize, escapeHtml, truncate,
        roleColor, roleGradient, statusBadge,
        toast, showModal, closeModal, confirm,
        validatePatientForm, validateVitalsForm,
        DEPARTMENTS, VITAL_RANGES, CHART_COLORS,
        isVitalAbnormal
    };
})();
