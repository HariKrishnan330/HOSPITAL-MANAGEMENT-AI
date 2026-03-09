/* =============================================================
   LOGIN.JS — Secure Login Page
   ============================================================= */

function renderLogin(container) {
    container.innerHTML = `
    <div class="login-page">
      <div class="login-bg"></div>
      <div class="login-grid-lines"></div>
      <div class="login-card fade-in">
        <div class="login-logo">
          <div class="logo-circle">🏥</div>
          <h1>MediAI Hospital System</h1>
          <p>AI-Powered Clinical Management Platform</p>
        </div>
        <div class="login-demo-creds">
          <h4>🔑 Demo Credentials</h4>
          <div class="cred-row"><span class="cred-role">Admin</span><span class="cred-val">admin@hospital.ai / Admin@123</span></div>
          <div class="cred-row"><span class="cred-role">Doctor</span><span class="cred-val">doctor@hospital.ai / Doctor@123</span></div>
          <div class="cred-row"><span class="cred-role">Nurse</span><span class="cred-val">nurse@hospital.ai / Nurse@123</span></div>
        </div>
        <div class="quick-login-btns">
          <button class="quick-login-btn" style="background:rgba(168,85,247,0.1);color:#a855f7;border-color:rgba(168,85,247,0.3)" onclick="quickLogin('admin')">👨‍💼 Admin</button>
          <button class="quick-login-btn" style="background:rgba(0,212,255,0.1);color:#00d4ff;border-color:rgba(0,212,255,0.3)" onclick="quickLogin('doctor')">👩‍⚕️ Doctor</button>
          <button class="quick-login-btn" style="background:rgba(6,214,160,0.1);color:#06d6a0;border-color:rgba(6,214,160,0.3)" onclick="quickLogin('nurse')">👨‍⚕️ Nurse</button>
        </div>
        <form id="login-form" onsubmit="handleLogin(event)">
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Email Address</label>
            <input type="email" id="login-email" class="form-control" placeholder="Enter your email" required>
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="Enter your password" required>
          </div>
          <div id="login-error" style="color:var(--danger);font-size:13px;margin-bottom:12px;display:none;"></div>
          <button type="submit" class="btn btn-primary w-100 btn-lg" id="login-btn">
            🔐 Sign In Securely
          </button>
        </form>
        <p style="text-align:center;margin-top:20px;font-size:12px;color:var(--text-muted)">
          🔒 End-to-end encrypted · HIPAA-ready architecture
        </p>
      </div>
    </div>
  `;

    window.handleLogin = function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        const errEl = document.getElementById('login-error');
        btn.textContent = '⏳ Authenticating...'; btn.disabled = true;
        setTimeout(() => {
            const result = Auth.login(email, password);
            if (result.success) {
                const dest = { admin: 'admin-dashboard', doctor: 'doctor-panel', nurse: 'nurse-panel' }[result.user.role];
                Router.navigate(dest);
            } else {
                errEl.textContent = result.message; errEl.style.display = 'block';
                btn.textContent = '🔐 Sign In Securely'; btn.disabled = false;
            }
        }, 600);
    };

    window.quickLogin = function (role) {
        const creds = { admin: ['admin@hospital.ai', 'Admin@123'], doctor: ['doctor@hospital.ai', 'Doctor@123'], nurse: ['nurse@hospital.ai', 'Nurse@123'] };
        document.getElementById('login-email').value = creds[role][0];
        document.getElementById('login-password').value = creds[role][1];
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
    };
}
