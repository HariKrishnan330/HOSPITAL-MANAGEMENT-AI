/* =============================================================
   ADMIN DASHBOARD.JS — Hospital Overview with Charts
   ============================================================= */

function renderAdminDashboard(container) {
    if (!Auth.requireRole('admin', 'doctor', 'nurse')) return;
    const stats = DB.getStats();
    const session = Auth.getSession();
    const alerts = DB.getAll('aiAlerts').filter(a => !a.acknowledged).slice(0, 3);
    const recentPatients = DB.getAll('patients').filter(p => !p.isDeleted).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    container.innerHTML = `
    <div class="fade-in">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card" style="--stat-color:#00d4ff">
          <div class="stat-icon">🧑‍⚕️</div>
          <div class="stat-value">${stats.totalPatients}</div>
          <div class="stat-label">Total Patients</div>
          <div class="stat-change">↑ All time records</div>
        </div>
        <div class="stat-card" style="--stat-color:#3b82f6">
          <div class="stat-icon">🏥</div>
          <div class="stat-value">${stats.admitted}</div>
          <div class="stat-label">Currently Admitted</div>
        </div>
        <div class="stat-card" style="--stat-color:#ef4444">
          <div class="stat-icon">🚨</div>
          <div class="stat-value">${stats.critical}</div>
          <div class="stat-label">Critical Cases</div>
        </div>
        <div class="stat-card" style="--stat-color:#10b981">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${stats.discharged}</div>
          <div class="stat-label">Discharged</div>
        </div>
        <div class="stat-card" style="--stat-color:#00d4ff">
          <div class="stat-icon">👨‍⚕️</div>
          <div class="stat-value">${stats.totalDoctors}</div>
          <div class="stat-label">Active Doctors</div>
        </div>
        <div class="stat-card" style="--stat-color:#06d6a0">
          <div class="stat-icon">👩‍⚕️</div>
          <div class="stat-value">${stats.totalNurses}</div>
          <div class="stat-label">Active Nurses</div>
        </div>
        <div class="stat-card" style="--stat-color:#a855f7">
          <div class="stat-icon">🤖</div>
          <div class="stat-value">${stats.unacknowledgedAlerts}</div>
          <div class="stat-label">AI Risk Alerts</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">📈 Patient Status Distribution</div>
              <div class="card-subtitle">Current patient breakdown</div>
            </div>
          </div>
          <div class="chart-container" style="height:220px">
            <canvas id="statusChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">🏬 Department Workload</div>
              <div class="card-subtitle">Active patients per department</div>
            </div>
          </div>
          <div class="chart-container" style="height:220px">
            <canvas id="deptChart"></canvas>
          </div>
        </div>
      </div>

      <!-- AI Alerts + Recent Patients -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- AI Alerts -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">🤖 Active AI Risk Alerts</div>
              <div class="card-subtitle">Unacknowledged clinical alerts</div>
            </div>
            <button class="btn btn-sm btn-ai" onclick="Router.navigate('ai-insights')">View All</button>
          </div>
          ${alerts.length ? alerts.map(a => `
            <div class="alert-banner alert-${a.riskLevel}">
              <span class="alert-icon">${a.riskLevel === 'high' ? '🚨' : a.riskLevel === 'medium' ? '⚠️' : 'ℹ️'}</span>
              <div class="alert-body">
                <div class="alert-title">${Utils.escapeHtml(a.patientName)} — Risk Score: ${a.riskScore}/100</div>
                <div class="alert-desc">${a.patterns.slice(0, 2).map(p => Utils.escapeHtml(p)).join(' · ')}</div>
                <div class="alert-time">${Utils.timeAgo(a.generatedAt)}</div>
              </div>
              <span class="badge badge-${a.riskLevel}">${Utils.capitalize(a.riskLevel)}</span>
            </div>
          `).join('') : '<div class="empty-state"><div class="empty-icon">✅</div><h3>No Active Alerts</h3><p>All patients are within safe parameters</p></div>'}
        </div>

        <!-- Recent Patients -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">🧑‍⚕️ Recent Patients</div>
              <div class="card-subtitle">Latest admissions</div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="Router.navigate('patients')">View All</button>
          </div>
          <div>
            ${recentPatients.map(p => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="Router.navigate('patient-profile',{id:'${p.id}'})">
                <div class="avatar" style="background:${Utils.roleGradient('doctor')};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${Utils.initials(p.name)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13.5px">${Utils.escapeHtml(p.name)}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${p.id} · ${p.department}</div>
                </div>
                <span class="badge badge-${p.status}">${Utils.capitalize(p.status)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

    /* Charts */
    setTimeout(() => renderDashboardCharts(stats), 100);
}

function renderDashboardCharts(stats) {
    /* Status Chart */
    const statusCanvas = document.getElementById('statusChart');
    if (statusCanvas && typeof Chart !== 'undefined') {
        new Chart(statusCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Admitted', 'Critical', 'Improving', 'Discharged'],
                datasets: [{
                    data: [
                        stats.admitted - stats.critical,
                        stats.critical,
                        DB.getAll('patients').filter(p => p.status === 'improving' && !p.isDeleted).length,
                        stats.discharged
                    ],
                    backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(239,68,68,0.8)', 'rgba(245,158,11,0.8)', 'rgba(16,185,129,0.8)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 } } }
            }
        });
    }

    /* Department Chart */
    const deptCanvas = document.getElementById('deptChart');
    if (deptCanvas && typeof Chart !== 'undefined') {
        const deptData = stats.departmentStats || {};
        const labels = Object.keys(deptData);
        const values = Object.values(deptData);
        new Chart(deptCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Active Patients',
                    data: values,
                    backgroundColor: Utils.CHART_COLORS.slice(0, labels.length).map(c => c + '88'),
                    borderColor: Utils.CHART_COLORS.slice(0, labels.length),
                    borderWidth: 1, borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });
    }
}
