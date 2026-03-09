/* =============================================================
   NAVBAR.JS — Role-Aware Sidebar Navigation
   ============================================================= */

const Navbar = (() => {
  function render(session) {
    if (!session) return '';
    const role = session.role;
    const color = Utils.roleColor(role);
    const gradient = Utils.roleGradient(role);
    const alerts = DB.getAll('aiAlerts').filter(a => !a.acknowledged).length;

    const navLinks = {
      admin: `
        <p class="nav-section-title">OPERATIONS</p>
        <div class="nav-item" data-route="admin-dashboard" onclick="Router.navigate('admin-dashboard')">
          <span class="nav-icon">📊</span> Dashboard
        </div>
        <div class="nav-item" data-route="patients" onclick="Router.navigate('patients')">
          <span class="nav-icon">🧑‍⚕️</span> Patients
        </div>
        <div class="nav-item" data-route="staff-management" onclick="Router.navigate('staff-management')">
          <span class="nav-icon">👥</span> Staff Management
        </div>
        <p class="nav-section-title">SURGERY</p>
        <div class="nav-item" data-route="operation-timeline" onclick="Router.navigate('operation-timeline')">
          <span class="nav-icon">🗓️</span> OT Timeline
        </div>
        <p class="nav-section-title">AI & ANALYTICS</p>
        <div class="nav-item" data-route="ai-insights" onclick="Router.navigate('ai-insights')">
          <span class="nav-icon">🤖</span> AI Insights
          ${alerts > 0 ? `<span class="nav-badge">${alerts}</span>` : ''}
        </div>
        <p class="nav-section-title">SYSTEM</p>
        <div class="nav-item" data-route="audit-logs" onclick="Router.navigate('audit-logs')">
          <span class="nav-icon">📋</span> Audit Logs
        </div>
      `,
      doctor: `
        <p class="nav-section-title">CLINICAL</p>
        <div class="nav-item" data-route="doctor-panel" onclick="Router.navigate('doctor-panel')">
          <span class="nav-icon">👨‍⚕️</span> My Patients
        </div>
        <div class="nav-item" data-route="patients" onclick="Router.navigate('patients')">
          <span class="nav-icon">🧑‍⚕️</span> All Patients
        </div>
        <p class="nav-section-title">SURGERY</p>
        <div class="nav-item" data-route="operation-timeline" onclick="Router.navigate('operation-timeline')">
          <span class="nav-icon">🗓️</span> OT Timeline
        </div>
        <p class="nav-section-title">TOOLS</p>
        <div class="nav-item" data-route="ai-insights" onclick="Router.navigate('ai-insights')">
          <span class="nav-icon">🤖</span> AI Insights
          ${alerts > 0 ? `<span class="nav-badge">${alerts}</span>` : ''}
        </div>
      `,
      nurse: `
        <p class="nav-section-title">NURSING</p>
        <div class="nav-item" data-route="nurse-panel" onclick="Router.navigate('nurse-panel')">
          <span class="nav-icon">👩‍⚕️</span> My Patients
        </div>
        <div class="nav-item" data-route="patients" onclick="Router.navigate('patients')">
          <span class="nav-icon">🧑‍⚕️</span> Patient Directory
        </div>
        <p class="nav-section-title">SURGERY</p>
        <div class="nav-item" data-route="operation-timeline" onclick="Router.navigate('operation-timeline')">
          <span class="nav-icon">🗓️</span> OT Timeline
        </div>
      `
    };

    return `
      <div class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">🏥</div>
          <div class="logo-text">
            <h2>MediAI HMS</h2>
            <span>Hospital Management</span>
          </div>
        </div>
        <div class="sidebar-user">
          <div class="avatar" style="background:${gradient}">${Utils.initials(session.name)}</div>
          <div class="user-info">
            <div class="user-name">${Utils.escapeHtml(session.name)}</div>
            <span class="user-role" style="background:${color}22;color:${color};border:1px solid ${color}44">${Utils.capitalize(role)}</span>
          </div>
        </div>
        <nav class="sidebar-nav">${navLinks[role] || ''}</nav>
        <div class="sidebar-footer">
          <button class="logout-btn" onclick="Auth.logout()">🚪 Sign Out</button>
        </div>
      </div>
      <div class="main-content">
        <header class="topbar">
          <div class="topbar-title" id="topbar-title">🏥 Dashboard</div>
          <div class="topbar-right">
            <div class="topbar-time" id="topbar-time"></div>
            <button class="topbar-alert-btn" onclick="Router.navigate('ai-insights')">
              🔔
              ${alerts > 0 ? '<span class="alert-dot"></span>' : ''}
            </button>
            <div class="avatar" style="background:${gradient};width:32px;height:32px;font-size:12px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700">${Utils.initials(session.name)}</div>
          </div>
        </header>
        <main class="page-content" id="page-content"></main>
      </div>
      <div id="toast-container" class="toast-container"></div>
    `;
  }

  function bindEvents() {
    /* Live clock */
    function updateClock() {
      const el = document.getElementById('topbar-time');
      if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  return { render, bindEvents };
})();
