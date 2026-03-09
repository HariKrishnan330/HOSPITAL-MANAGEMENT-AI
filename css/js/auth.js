/* =============================================================
   AUTH.JS — Authentication & Role-Based Access Control
   ============================================================= */

const Auth = (() => {
    const SESSION_KEY = 'hms_session';

    /* ── Session Management ── */
    function getSession() {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
        catch (e) { return null; }
    }
    function setSession(user) {
        const session = {
            userId: user.id, name: user.name, email: user.email,
            role: user.role, department: user.department
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    }
    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }
    function isLoggedIn() { return getSession() !== null; }
    function getRole() { return getSession()?.role || null; }
    function getUserId() { return getSession()?.userId || null; }

    /* ── Login / Logout ── */
    function login(email, password) {
        const users = DB.getAll('users');
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.isActive);
        if (!user) return { success: false, message: 'Invalid email or account not found.' };
        if (!Utils.checkPassword(password, user.passwordHash)) {
            DB.log('LOGIN_FAILED', `Failed login attempt for ${email}`);
            return { success: false, message: 'Incorrect password. Please try again.' };
        }
        const session = setSession(user);
        DB.log('LOGIN', `User logged in as ${user.role}`);
        return { success: true, session, user };
    }
    function logout() {
        DB.log('LOGOUT', 'User logged out');
        clearSession();
        Router.navigate('login');
    }

    /* ── RBAC Permission Map ── */
    const PERMISSIONS = {
        admin: [
            'view:dashboard', 'view:patients', 'manage:patients',
            'view:staff', 'manage:staff', 'view:audit', 'view:ai',
            'view:departments', 'manage:departments', 'view:allPatients'
        ],
        doctor: [
            'view:dashboard', 'view:patients', 'manage:patients',
            'view:doctorPanel', 'add:diagnosis', 'add:prescription',
            'view:vitals', 'add:notes', 'update:patientStatus', 'view:ai'
        ],
        nurse: [
            'view:dashboard', 'view:patients', 'view:nursePanel',
            'add:vitals', 'view:vitals', 'update:conditionFlag'
        ]
    };

    function can(permission) {
        const role = getRole();
        if (!role) return false;
        return PERMISSIONS[role]?.includes(permission) || false;
    }
    function requireAuth() {
        if (!isLoggedIn()) { Router.navigate('login'); return false; }
        return true;
    }
    function requireRole(...roles) {
        if (!isLoggedIn()) { Router.navigate('login'); return false; }
        if (!roles.includes(getRole())) {
            Utils.toast('Access denied: insufficient permissions.', 'error');
            /* redirect to appropriate home */
            const home = { admin: 'admin-dashboard', doctor: 'doctor-panel', nurse: 'nurse-panel' }[getRole()];
            Router.navigate(home || 'login');
            return false;
        }
        return true;
    }

    /* ── User Self Profile ── */
    function getCurrentUser() {
        const s = getSession();
        if (!s) return null;
        return DB.getById('users', s.userId);
    }

    return {
        getSession, setSession, clearSession,
        isLoggedIn, getRole, getUserId,
        login, logout,
        can, requireAuth, requireRole,
        getCurrentUser, PERMISSIONS
    };
})();
