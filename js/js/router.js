/* =============================================================
   ROUTER.JS — Hash-based SPA Router with Role Guards
   ============================================================= */

const Router = (() => {
    const routes = {};
    let currentRoute = null;

    function register(name, handler, allowedRoles = null) {
        routes[name] = { handler, allowedRoles };
    }

    function navigate(name, params = {}) {
        window.location.hash = params && Object.keys(params).length
            ? `#/${name}?${new URLSearchParams(params).toString()}`
            : `#/${name}`;
    }

    function getParams() {
        const hash = window.location.hash.slice(1);
        const [path, query] = hash.split('?');
        const params = {};
        if (query) new URLSearchParams(query).forEach((v, k) => params[k] = v);
        return params;
    }

    function getCurrentRouteName() {
        const hash = window.location.hash.slice(1);
        return hash.split('?')[0].replace(/^\//, '');
    }

    function dispatch() {
        const name = getCurrentRouteName() || 'login';
        const route = routes[name];

        /* Default to login */
        if (!route) { navigate('login'); return; }

        /* Auth guard */
        if (name !== 'login' && !Auth.isLoggedIn()) { navigate('login'); return; }

        /* Role guard */
        if (route.allowedRoles && !route.allowedRoles.includes(Auth.getRole())) {
            Utils.toast('Access denied for your role.', 'error');
            const home = { admin: 'admin-dashboard', doctor: 'doctor-panel', nurse: 'nurse-panel' }[Auth.getRole()] || 'login';
            navigate(home); return;
        }

        currentRoute = name;
        const params = getParams();

        /* Render layout wrapper */
        renderLayout(name);

        /* Run page handler */
        const contentEl = document.getElementById('page-content');
        if (contentEl && route.handler) route.handler(contentEl, params);
    }

    function renderLayout(name) {
        if (name === 'login') {
            document.getElementById('app').innerHTML = '<div id="page-content"></div>';
        } else {
            const session = Auth.getSession();
            if (!document.getElementById('sidebar')) {
                document.getElementById('app').innerHTML = Navbar.render(session);
                Navbar.bindEvents();
            }
            updateActiveNav(name);
        }
    }

    function updateActiveNav(name) {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.route === name);
        });
        /* Update topbar title */
        const titles = {
            'admin-dashboard': '🏥 Dashboard', 'staff-management': '👥 Staff Management',
            'audit-logs': '📋 Audit Logs', 'patients': '🧑‍⚕️ Patient Management',
            'patient-form': '📝 Patient Form', 'patient-profile': '📊 Patient Profile',
            'doctor-panel': '👨‍⚕️ Doctor Panel', 'nurse-panel': '👩‍⚕️ Nurse Panel',
            'ai-insights': '🤖 AI Clinical Insights', 'operation-timeline': '🗓️ Operation Timeline'
        };
        const titleEl = document.getElementById('topbar-title');
        if (titleEl) titleEl.textContent = titles[name] || 'HMS';
    }

    function init() {
        window.addEventListener('hashchange', dispatch);
        dispatch();
    }

    return { register, navigate, getParams, getCurrentRouteName, init };
})();
