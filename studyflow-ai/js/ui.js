/**
 * StudyFlow AI - UI Controller & Renderer
 * Project Better Tomorrow
 */

import { state } from './state.js';
import { storage, DEFAULT_SUBJECTS } from './storage.js';
import { TaskManager, PriorityEngine } from './tasks.js';
import { SubjectManager, SUBJECT_COLOR_PALETTE } from './subjects.js';
import { WorkloadEngine } from './workload.js';
import { ScheduleEngine } from './scheduler.js';
import { PomodoroTimer } from './pomodoro.js';
import { AnalyticsService } from './analytics.js';
import { InsightsEngine, AIAssistantService } from './insights.js';
import { validateProfile } from './validation.js';
import { isToday, isThisWeek, escapeHtml, roundTo } from './utils.js';

export class UIController {
  constructor() {
    this.activeTab = 'dashboard';
    this.editingTaskId = null;
    this.deletingTaskId = null;
    this.editingSubjectId = null;
    this.deletingSubjectId = null;
    this.pomodoroTimer = null;
    this.onboardingStep = 1;
    this.scheduleDayFilter = 'all'; // 'today', 'tomorrow', 'all'
  }

  init() {
    this._initTheme();
    this._initPomodoro();
    this._bindNavigation();
    this._bindModals();
    this._bindTaskForm();
    this._bindSubjectForm();
    this._bindSettingsForm();
    this._bindAIAssistant();
    this._bindOnboarding();
    this._bindGlobalEvents();

    // Check if onboarding needed
    if (!storage.isOnboardingDone()) {
      this.openOnboarding();
    }

    // Subscribe to state changes
    state.subscribe((s, changeType) => {
      this.renderCurrentView();
      if (changeType === 'tasks' || changeType === 'subjects' || changeType === 'all') {
        this.renderHeader();
      }
    });

    this.renderAll();
  }

  // --- Theme Handling ---

  _initTheme() {
    const saved = state.theme || 'system';
    this.applyTheme(saved);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = state.theme || 'system';
        const next = current === 'light' ? 'dark' : (current === 'dark' ? 'system' : 'light');
        state.setTheme(next);
        this.applyTheme(next);
        this.showToast(`Theme changed to ${next} mode.`);
      });
    }
  }

  applyTheme(theme) {
    const root = document.documentElement;
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeText = document.getElementById('theme-toggle-text');

    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'Dark';
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'Light';
    } else {
      root.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '💻';
      if (themeText) themeText.textContent = 'Auto';
    }
  }

  // --- Navigation & Routing ---

  _bindNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Mobile Hamburger
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('app-sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Hash routing
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) this.switchTab(hash);
    });
  }

  switchTab(tabName) {
    const sections = document.querySelectorAll('.view-section');
    const navLinks = document.querySelectorAll('.nav-link');

    sections.forEach(s => s.classList.add('hidden'));
    navLinks.forEach(l => l.classList.remove('active'));

    const targetSection = document.getElementById(`view-${tabName}`);
    const targetLink = document.querySelector(`.nav-link[data-tab="${tabName}"]`);

    if (targetSection) {
      targetSection.classList.remove('hidden');
      this.activeTab = tabName;
      if (targetLink) targetLink.classList.add('active');
      window.location.hash = tabName;

      // Close mobile drawer if open
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar) sidebar.classList.remove('open');

      this.renderCurrentView();
    }
  }

  renderCurrentView() {
    this.renderHeader();
    if (this.activeTab === 'dashboard') this.renderDashboard();
    else if (this.activeTab === 'tasks') this.renderTasks();
    else if (this.activeTab === 'subjects') this.renderSubjects();
    else if (this.activeTab === 'schedule') this.renderSchedule();
    else if (this.activeTab === 'analytics') this.renderAnalytics();
    else if (this.activeTab === 'focus') this.renderFocus();
    else if (this.activeTab === 'settings') this.renderSettings();
  }

  renderAll() {
    this.renderHeader();
    this.renderDashboard();
    this.renderTasks();
    this.renderSubjects();
    this.renderSchedule();
    this.renderAnalytics();
    this.renderFocus();
    this.renderSettings();
  }

  // --- Header ---

  renderHeader() {
    const profile = state.profile;
    const greetingEl = document.getElementById('header-greeting');
    const nameEl = document.getElementById('header-student-name');
    const subtitleEl = document.getElementById('header-subtitle');
    const dateEl = document.getElementById('header-date');

    const now = new Date();
    const h = now.getHours();
    let greeting = 'Good evening';
    if (h < 12) greeting = 'Good morning';
    else if (h < 17) greeting = 'Good afternoon';

    if (greetingEl) greetingEl.textContent = greeting;
    if (nameEl) nameEl.textContent = profile.name || 'Student';
    if (subtitleEl) subtitleEl.textContent = `${profile.course || 'B.Tech Student'} • Let's make today's study plan manageable.`;

    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  // --- Dashboard View ---

  renderDashboard() {
    const workload = WorkloadEngine.analyze();
    const tasks = state.tasks;
    const activeTasks = state.getActiveTasks();
    const pomodoro = state.pomodoro;

    // 1. Workload Meter
    const badgeEl = document.getElementById('workload-badge');
    const barEl = document.getElementById('workload-meter-bar');
    const ratioTextEl = document.getElementById('workload-ratio-text');
    const descEl = document.getElementById('workload-description');
    const labelEl = document.getElementById('workload-status-label');

    if (badgeEl) {
      badgeEl.className = `badge ${workload.level.badgeClass}`;
      badgeEl.textContent = `${workload.level.meterLabel}: ${workload.level.label}`;
    }
    if (labelEl) {
      labelEl.textContent = workload.level.meterLabel;
      labelEl.style.color = workload.level.color;
    }
    if (barEl) {
      barEl.style.width = `${workload.meterFillPercent}%`;
      barEl.style.backgroundColor = workload.level.color;
    }
    if (ratioTextEl) {
      ratioTextEl.textContent = `${workload.totalPendingHours}h pending / ${workload.dailyAvailableHours}h daily capacity`;
    }
    if (descEl) {
      descEl.textContent = workload.level.recommendation;
    }

    // Active tick highlight
    ['tick-low', 'tick-med', 'tick-high', 'tick-crit'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active-tick');
    });
    let tickId = 'tick-low';
    if (workload.level.key === 'CRITICAL') tickId = 'tick-crit';
    else if (workload.level.key === 'HIGH') tickId = 'tick-high';
    else if (workload.level.key === 'MEDIUM') tickId = 'tick-med';
    const activeTick = document.getElementById(tickId);
    if (activeTick) activeTick.classList.add('active-tick');

    // Overload Alert Banner
    const alertBox = document.getElementById('dashboard-overload-alert');
    if (alertBox) {
      if (workload.isOverloaded) {
        alertBox.classList.remove('hidden');
        const alertMsg = document.getElementById('overload-alert-message');
        const alertTips = document.getElementById('overload-alert-tips');
        if (alertMsg) {
          alertMsg.textContent = `You have ${workload.totalPendingHours}h of pending work, but only ${workload.availableCapacity}h capacity in your ${workload.planningDays}-day horizon (${workload.overloadPercent}% overload).`;
        }
        if (alertTips) {
          alertTips.innerHTML = workload.level.tips.map(t => `<li>${t}</li>`).join('');
        }
      } else {
        alertBox.classList.add('hidden');
      }
    }

    // Quick Statistics Cards
    const todayTasks = activeTasks.filter(t => isToday(t.dueDate));
    const weekTasks = activeTasks.filter(t => isThisWeek(t.dueDate));
    const completedTasks = state.getCompletedTasks();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('metric-today-count', todayTasks.length);
    setVal('metric-week-count', weekTasks.length);
    setVal('metric-completed-count', completedTasks.length);
    setVal('metric-overdue-count', state.getOverdueTasks().length);
    setVal('metric-daily-hours', `${state.profile.dailyAvailableHours || 4}h`);
    setVal('metric-streak-days', `${pomodoro.streakDays || 1} 🔥`);

    // Today's Study Plan widget in dashboard
    this.renderDashboardTodayPlan();

    // Smart Insights in dashboard
    this.renderDashboardInsights();
  }

  renderDashboardTodayPlan() {
    const container = document.getElementById('dashboard-today-plan');
    const footerEl = document.getElementById('dashboard-plan-footer');
    if (!container) return;

    const schedule = state.schedule;
    if (!schedule || !schedule.days || schedule.days.length === 0) {
      container.innerHTML = `
        <div class="empty-state-sm">
          <div class="empty-icon">📅</div>
          <p>No study blocks scheduled for today yet.</p>
          <button class="btn btn-primary btn-sm btn-generate-schedule">✨ Generate Smart Schedule</button>
        </div>
      `;
      if (footerEl) footerEl.textContent = 'Workload: 0 hours • Available capacity: ' + (state.profile.dailyAvailableHours || 4) + ' hours';
      return;
    }

    const today = schedule.days[0];
    const studyBlocks = today.blocks.filter(b => !b.isBreak);

    if (studyBlocks.length === 0) {
      container.innerHTML = `<div class="empty-hint">No study blocks allocated for today! All tasks clear or deferred.</div>`;
    } else {
      container.innerHTML = today.blocks.map(b => {
        if (b.isBreak) {
          return `
            <div class="plan-preview-item plan-break-item">
              <span class="plan-time">${b.timeRange}</span>
              <span class="plan-title">${b.breakLabel} (${b.duration}m)</span>
            </div>
          `;
        }

        const subj = state.getSubjectByName(b.subject);
        const subjColor = subj ? subj.color : '#6366f1';

        return `
          <div class="plan-preview-item ${b.completed ? 'plan-completed' : ''}" style="border-left: 4px solid ${subjColor};">
            <label class="checkbox-container">
              <input type="checkbox" class="schedule-block-checkbox" data-block-id="${b.id}" ${b.completed ? 'checked' : ''}>
              <span class="checkmark"></span>
            </label>
            <div class="plan-preview-info">
              <div class="plan-preview-header">
                <span class="plan-time">${b.timeRange}</span>
                <span class="badge badge-sm" style="background-color: ${subjColor}20; color: ${subjColor};">${escapeHtml(b.subject)}</span>
                <span class="badge badge-sm ${b.priorityTier.badgeClass}">${b.priorityTier.label}</span>
              </div>
              <div class="plan-title">${escapeHtml(b.taskTitle)}</div>
            </div>
            <button class="btn btn-icon btn-start-focus" data-task-id="${b.taskId}" title="Launch 25m Focus Session">⏱️</button>
          </div>
        `;
      }).join('');
    }

    if (footerEl) {
      footerEl.innerHTML = `
        <span>Today's workload: <strong>${today.allocatedStudyHours} hours</strong></span>
        <span>•</span>
        <span>Available capacity: <strong>${today.dailyAvailableHours} hours</strong></span>
        <span>•</span>
        <span>Status: <strong class="text-${today.status.toLowerCase()}">${today.status}</strong></span>
      `;
    }
  }

  renderDashboardInsights() {
    const container = document.getElementById('dashboard-coach-preview');
    if (!container) return;

    const insights = InsightsEngine.generateInsights();
    if (insights.length === 0) {
      container.innerHTML = '<div class="empty-hint">All systems balanced. Keep up the good momentum!</div>';
      return;
    }

    container.innerHTML = insights.slice(0, 3).map(item => `
      <div class="coach-mini-card coach-${item.type === 'overload' ? 'critical' : (item.type === 'urgent' ? 'warning' : 'info')}">
        <div class="coach-mini-icon">${item.icon}</div>
        <div class="coach-mini-body">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.text)}</p>
        </div>
      </div>
    `).join('');
  }

  // --- Tasks View ---

  renderTasks() {
    const container = document.getElementById('tasks-list');
    const emptyEl = document.getElementById('tasks-empty-state');
    const badgeEl = document.getElementById('tasks-total-badge');
    const subjectSelect = document.getElementById('tasks-subject-filter');

    // Populate subject filter
    if (subjectSelect) {
      const cur = subjectSelect.value;
      subjectSelect.innerHTML = '<option value="all">All Subjects</option>' +
        state.subjects.map(s => `<option value="${escapeHtml(s.name)}" ${s.name === cur ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
    }

    // Read filters from UI inputs
    const statusFilter = document.querySelector('.task-filter-pill.active')?.getAttribute('data-filter') || 'all';
    const subjectFilter = subjectSelect?.value || 'all';
    const typeFilter = document.getElementById('tasks-type-filter')?.value || 'all';
    const difficultyFilter = document.getElementById('tasks-difficulty-filter')?.value || 'all';
    const priorityTierFilter = document.getElementById('tasks-priority-filter')?.value || 'all';
    const sortBy = document.getElementById('tasks-sort')?.value || 'priority';
    const searchQuery = document.getElementById('tasks-search')?.value || '';

    const tasks = TaskManager.getProcessedTasks({
      statusFilter,
      subjectFilter,
      typeFilter,
      difficultyFilter,
      priorityTierFilter,
      sortBy,
      searchQuery
    });

    if (badgeEl) {
      badgeEl.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;
    }

    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    container.innerHTML = tasks.map(t => {
      const p = t.priorityData;
      const subj = state.getSubjectByName(t.subject);
      const subjColor = subj ? subj.color : '#6366f1';
      const isDone = t.status === 'Completed';

      return `
        <div class="task-card ${isDone ? 'task-card-completed' : ''} ${p.isOverdue ? 'task-card-overdue' : ''}" data-task-id="${t.id}">
          <div class="task-card-header">
            <div class="task-card-badges">
              <span class="badge" style="background-color: ${subjColor}20; color: ${subjColor}; font-weight: 700;">
                ${escapeHtml(t.subject)}
              </span>
              <span class="badge badge-type">${t.type}</span>
              <span class="badge difficulty-${t.difficulty.toLowerCase().replace(/\s+/g, '-')}">${t.difficulty}</span>
              <span class="badge importance-${t.priority.toLowerCase()}">${t.priority}</span>
            </div>
            <div class="task-card-priority">
              <span class="badge ${p.tier.badgeClass}" title="Priority score: ${p.score}/100">
                Priority: ${p.score} (${p.tier.label})
              </span>
            </div>
          </div>

          <div class="task-card-body">
            <label class="task-checkbox-row">
              <input type="checkbox" class="task-toggle-checkbox" data-task-id="${t.id}" ${isDone ? 'checked' : ''}>
              <span class="checkmark"></span>
              <h3 class="task-title">${escapeHtml(t.title)}</h3>
            </label>
            ${t.notes ? `<p class="task-notes">${escapeHtml(t.notes)}</p>` : ''}
          </div>

          <div class="task-card-meta">
            <span class="meta-item ${t.countdown.isUrgent ? 'meta-urgent' : ''}">
              📅 ${t.countdown.text}
            </span>
            <span class="meta-item">⏱️ Effort: ${t.estimatedHours} ${t.estimatedHours === 1 ? 'hour' : 'hours'}</span>
            <span class="meta-item status-pill status-${t.status.toLowerCase().replace(/\s+/g, '-')}">${t.status}</span>
          </div>

          <!-- Explainable AI Decision Reason -->
          <div class="task-ai-explanation">
            <span class="ai-sparkle">🧠</span>
            <div class="ai-exp-text">
              <strong>Why this rank:</strong> ${escapeHtml(p.explanation)}
            </div>
          </div>

          <div class="task-card-actions">
            ${isDone ? `
              <button class="btn btn-sm btn-outline btn-restore-task" data-task-id="${t.id}">
                ↩️ Restore Task
              </button>
            ` : `
              <button class="btn btn-sm btn-outline btn-start-focus" data-task-id="${t.id}">
                ⏱️ Focus Mode
              </button>
            `}
            <button class="btn btn-sm btn-ghost btn-edit-task" data-task-id="${t.id}">
              ✏️ Edit
            </button>
            <button class="btn btn-sm btn-ghost text-danger btn-delete-task" data-task-id="${t.id}">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Subjects View ---

  renderSubjects() {
    const container = document.getElementById('subjects-grid');
    if (!container) return;

    const subjectsWithStats = SubjectManager.getSubjectStatistics();

    container.innerHTML = subjectsWithStats.map(s => `
      <div class="subject-item-card" style="--subject-color: ${s.color};">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3 class="subject-card-title">${escapeHtml(s.name)}</h3>
              ${s.code ? `<span class="subject-card-code">${escapeHtml(s.code)}</span>` : ''}
            </div>
            <span class="badge" style="background-color: ${s.color}20; color: ${s.color};">
              Target: ${s.weeklyTarget}h/wk
            </span>
          </div>
          ${s.teacher ? `<div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">Faculty: ${escapeHtml(s.teacher)}</div>` : ''}
        </div>

        <div class="subject-card-meta">
          <div style="display: flex; justify-content: space-between;">
            <span>Tasks: <strong>${s.completedTasks}/${s.totalTasks}</strong> completed</span>
            <span>Pending: <strong>${s.pendingHours}h</strong></span>
          </div>

          <div class="subject-bar-track" style="margin-top: 6px;">
            <div class="subject-bar-fill" style="width: ${s.progressPercent}%; background-color: ${s.color};"></div>
          </div>
          <div style="text-align: right; font-size: 0.72rem; color: var(--color-text-muted);">${s.progressPercent}% completed</div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--color-border);">
          <button class="btn btn-sm btn-ghost btn-edit-subject" data-subject-id="${s.id}">✏️ Edit</button>
          <button class="btn btn-sm btn-ghost text-danger btn-delete-subject" data-subject-id="${s.id}">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
  }

  // --- Schedule View ---

  renderSchedule() {
    const container = document.getElementById('schedule-days-container');
    const summaryEl = document.getElementById('schedule-ai-summary');
    const emptyEl = document.getElementById('schedule-empty-state');
    const schedule = state.schedule;

    if (!container) return;

    if (!schedule || !schedule.days || schedule.days.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (summaryEl) summaryEl.textContent = 'Click "Generate Smart Schedule" to organize your deliverables across study days.';
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (summaryEl) summaryEl.textContent = schedule.summary || 'Schedule generated realistically.';

    // Filter days if user selected Today / Tomorrow / This Week
    let daysToRender = schedule.days;
    if (this.scheduleDayFilter === 'today') {
      daysToRender = schedule.days.slice(0, 1);
    } else if (this.scheduleDayFilter === 'tomorrow') {
      daysToRender = schedule.days.slice(1, 2);
    }

    container.innerHTML = daysToRender.map(day => `
      <div class="schedule-day-column">
        <div class="schedule-day-header">
          <div>
            <h3 class="day-title">${day.dayLabel}</h3>
            <span class="day-allocated">${day.allocatedStudyHours}h allocated / ${day.dailyAvailableHours}h limit</span>
          </div>
          <span class="badge ${day.isToday ? 'badge-primary' : 'badge-outline'}">${day.status}</span>
        </div>

        <div class="schedule-blocks-list">
          ${day.blocks.length === 0 ? '<div class="empty-hint">No study blocks needed for this day. Free study window!</div>' : ''}
          ${day.blocks.map(b => {
            if (b.isBreak) {
              return `
                <div class="schedule-block break-block">
                  <div class="block-time">${b.timeRange}</div>
                  <div class="block-info">
                    <span class="break-label">${b.breakLabel}</span>
                    <span class="break-duration">${b.duration} mins</span>
                  </div>
                </div>
              `;
            }

            const subj = state.getSubjectByName(b.subject);
            const color = subj ? subj.color : '#6366f1';

            return `
              <div class="schedule-block study-block ${b.completed ? 'block-completed' : ''}" style="border-left: 4px solid ${color};">
                <div class="block-time">${b.timeRange} (${b.duration}m)</div>
                <div class="block-main">
                  <div class="block-top">
                    <span class="badge badge-sm" style="background-color: ${color}20; color: ${color};">${escapeHtml(b.subject)}</span>
                    <span class="badge badge-sm ${b.priorityTier.badgeClass}">Score: ${b.priorityScore}</span>
                    <span class="badge badge-sm badge-outline">${b.difficulty}</span>
                  </div>
                  <h4 class="block-task-title">${escapeHtml(b.taskTitle)}</h4>

                  <div class="block-why">
                    <span class="why-label">Reason:</span> ${escapeHtml(b.whyFirst)}
                  </div>

                  <div class="block-footer">
                    <label class="checkbox-container">
                      <input type="checkbox" class="schedule-block-checkbox" data-block-id="${b.id}" ${b.completed ? 'checked' : ''}>
                      <span class="checkmark"></span>
                      <span class="checkbox-label">${b.completed ? 'Done' : 'Mark Done'}</span>
                    </label>
                    <button class="btn btn-sm btn-ghost btn-start-focus" data-task-id="${b.taskId}">
                      ⏱️ Focus (${b.duration}m)
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  // --- Focus Mode View ---

  _initPomodoro() {
    this.pomodoroTimer = new PomodoroTimer({
      onTick: (formattedTime, progressPercent) => {
        const timeEl = document.getElementById('pomo-timer-display');
        const barEl = document.getElementById('pomo-timer-progress');
        if (timeEl) timeEl.textContent = formattedTime;
        if (barEl) barEl.style.width = `${progressPercent}%`;
      },
      onComplete: ({ mode, durationMinutes, task }) => {
        this.showToast(`🎉 ${mode === 'focus' ? 'Focus Session' : 'Break'} Completed (${durationMinutes}m)!`);
        this.renderFocus();
        this.renderDashboard();
      },
      onModeChange: (mode) => {
        document.querySelectorAll('.pomo-pill').forEach(p => {
          p.classList.toggle('active', p.getAttribute('data-mode') === mode);
        });
      }
    });
  }

  renderFocus() {
    const stats = state.pomodoro;
    const activeTasks = state.getActiveTasks();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('pomo-stat-sessions', stats.sessionsCompleted || 0);
    setVal('pomo-stat-total-mins', `${stats.totalFocusMinutes || 0}m`);
    setVal('pomo-stat-today-mins', `${stats.todayFocusMinutes || 0}m`);
    setVal('pomo-stat-streak', `${stats.streakDays || 1} days`);

    // Task selector dropdown for Pomodoro
    const taskSelect = document.getElementById('pomo-task-selector');
    if (taskSelect) {
      taskSelect.innerHTML = '<option value="">-- Focus on General Study --</option>' +
        activeTasks.map(t => `<option value="${t.id}">${escapeHtml(t.title)} (${t.subject})</option>`).join('');
    }
  }

  // --- Analytics View ---

  renderAnalytics() {
    const metrics = AnalyticsService.getMetrics();
    const workload = WorkloadEngine.analyze();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('ana-completed-tasks', `${metrics.completedCount} / ${metrics.totalTasks}`);
    setVal('ana-completion-rate', `${metrics.completionRate}%`);
    setVal('ana-completed-hours', `${metrics.completedHours}h`);
    setVal('ana-pending-hours', `${metrics.pendingHours}h`);
    setVal('ana-overload-rate', `${workload.loadRatioPercent}%`);
    setVal('ana-focus-sessions', metrics.focusSessionsCompleted);

    // Subject breakdown bars
    const subjects = SubjectManager.getSubjectStatistics();
    const subjectsListEl = document.getElementById('analytics-subjects-bars');
    if (subjectsListEl) {
      if (subjects.length === 0) {
        subjectsListEl.innerHTML = '<div class="empty-hint">No subjects created yet.</div>';
      } else {
        subjectsListEl.innerHTML = subjects.map(s => `
          <div class="subject-bar-row">
            <div class="subject-bar-header">
              <span><strong style="color: ${s.color};">${escapeHtml(s.name)}</strong> (${s.totalTasks} tasks)</span>
              <span>${s.pendingHours}h pending / ${s.totalHours}h total</span>
            </div>
            <div class="subject-bar-track">
              <div class="subject-bar-fill" style="width: ${s.progressPercent}%; background-color: ${s.color};"></div>
            </div>
          </div>
        `).join('');
      }
    }

    // Render Canvas / Chart.js charts
    setTimeout(() => {
      AnalyticsService.renderCharts();
    }, 60);
  }

  // --- Settings View ---

  renderSettings() {
    const profile = state.profile;
    const setInput = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined ? val : '';
    };

    setInput('setting-name', profile.name);
    setInput('setting-course', profile.course);
    setInput('setting-college', profile.college);
    setInput('setting-daily-hours', profile.dailyAvailableHours);
    setInput('setting-start-time', profile.preferredStartTime);
    setInput('setting-end-time', profile.preferredEndTime);
    setInput('setting-break-duration', profile.breakDuration);
    setInput('setting-focus-duration', profile.focusDuration);
  }

  // --- AI Assistant Chat Drawer / Modal ---

  _bindAIAssistant() {
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('btn-ai-chat-send');
    const messagesContainer = document.getElementById('ai-chat-messages');

    const handleSend = async (text) => {
      const query = (text || input.value || '').trim();
      if (!query) return;

      // Add user message
      this._appendChatMessage('user', query);
      if (input) input.value = '';

      // Show temporary typing indicator
      const typingId = 'typing-' + Date.now();
      const typingEl = document.createElement('div');
      typingEl.id = typingId;
      typingEl.className = 'chat-bubble chat-bubble-bot';
      typingEl.innerHTML = '<em>Thinking based on your academic workload...</em>';
      messagesContainer.appendChild(typingEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Get grounded response
      const answer = await AIAssistantService.ask(query);

      // Remove typing indicator and append answer
      const toRemove = document.getElementById(typingId);
      if (toRemove) toRemove.remove();

      this._appendChatMessage('bot', answer);
    };

    if (sendBtn) {
      sendBtn.addEventListener('click', () => handleSend());
    }
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSend();
      });
    }

    // Quick prompt chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) handleSend(prompt);
      });
    });

    // Toggle AI Assistant drawer/modal button
    const openAssistantBtns = document.querySelectorAll('.btn-open-ai-assistant');
    const assistantModal = document.getElementById('modal-ai-assistant');
    openAssistantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (assistantModal) assistantModal.classList.remove('hidden');
      });
    });
  }

  _appendChatMessage(role, text) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-bubble chat-bubble-${role}`;
    // Simple bold markdown parser for chat
    const formatted = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    div.innerHTML = formatted;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // --- Onboarding Setup Wizard ---

  _bindOnboarding() {
    const wizardModal = document.getElementById('modal-onboarding');
    if (!wizardModal) return;

    const nextBtn = document.getElementById('btn-wizard-next');
    const prevBtn = document.getElementById('btn-wizard-prev');
    const skipBtn = document.getElementById('btn-wizard-skip');

    const updateStep = (step) => {
      this.onboardingStep = step;
      document.querySelectorAll('.wizard-step').forEach((s, idx) => {
        s.classList.toggle('active', idx + 1 === step);
      });
      document.querySelectorAll('.step-dot').forEach((d, idx) => {
        d.classList.toggle('active', idx + 1 === step);
        d.classList.toggle('completed', idx + 1 < step);
      });

      if (prevBtn) prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';
      if (nextBtn) {
        nextBtn.textContent = step === 6 ? 'Launch Workspace 🚀' : 'Next →';
      }
    };

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.onboardingStep < 6) {
          updateStep(this.onboardingStep + 1);
        } else {
          // Save onboarding answers
          const name = document.getElementById('onboard-name')?.value.trim() || 'Student';
          const course = document.getElementById('onboard-course')?.value.trim() || 'B.Tech CS';
          const hours = parseFloat(document.getElementById('onboard-hours')?.value) || 4.0;
          const start = document.getElementById('onboard-start')?.value || '17:00';
          const end = document.getElementById('onboard-end')?.value || '22:00';

          state.setProfile({
            name,
            course,
            dailyAvailableHours: hours,
            preferredStartTime: start,
            preferredEndTime: end
          });

          storage.setOnboardingDone(true);
          wizardModal.classList.add('hidden');
          this.showToast('Your StudyFlow AI workspace is ready! ✨');
          this.renderAll();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.onboardingStep > 1) {
          updateStep(this.onboardingStep - 1);
        }
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        storage.seedDemoData();
        state.init();
        storage.setOnboardingDone(true);
        wizardModal.classList.add('hidden');
        this.showToast('Demo workspace loaded! ✨');
        this.renderAll();
      });
    }
  }

  openOnboarding() {
    const modal = document.getElementById('modal-onboarding');
    if (modal) {
      this.onboardingStep = 1;
      modal.classList.remove('hidden');
    }
  }

  // --- Modals & Forms Binding ---

  _bindModals() {
    // Backdrop close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal || e.target.classList.contains('modal-close-btn')) {
          modal.classList.add('hidden');
        }
      });
    });

    // Open Task Modal buttons
    document.querySelectorAll('.btn-open-add-task').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openTaskModal();
      });
    });

    // Open Subject Modal buttons
    document.querySelectorAll('.btn-open-add-subject').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openSubjectModal();
      });
    });
  }

  openTaskModal(task = null) {
    this.editingTaskId = task ? task.id : null;
    const modal = document.getElementById('modal-task');
    const form = document.getElementById('form-task');
    const titleEl = document.getElementById('modal-task-title');
    const submitBtn = document.getElementById('btn-save-task');
    const subjectSelect = document.getElementById('task-input-subject');

    if (!modal || !form) return;

    form.reset();
    document.getElementById('task-error-alert')?.classList.add('hidden');

    // Populate subjects in task form
    if (subjectSelect) {
      subjectSelect.innerHTML = state.subjects.map(
        s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`
      ).join('');
    }

    if (task) {
      if (titleEl) titleEl.textContent = 'Edit Academic Task';
      if (submitBtn) submitBtn.textContent = 'Update Task';

      document.getElementById('task-input-title').value = task.title;
      document.getElementById('task-input-subject').value = task.subject;
      document.getElementById('task-input-type').value = task.type;

      // Format datetime-local
      const d = new Date(task.dueDate);
      const pad = n => (n < 10 ? '0' + n : n);
      const dtLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      document.getElementById('task-input-deadline').value = dtLocal;

      document.getElementById('task-input-effort').value = task.estimatedHours;
      document.getElementById('task-input-difficulty').value = task.difficulty;
      document.getElementById('task-input-importance').value = task.priority;
      document.getElementById('task-input-notes').value = task.notes || '';
    } else {
      if (titleEl) titleEl.textContent = 'Add Academic Task';
      if (submitBtn) submitBtn.textContent = 'Add Task';

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      const pad = n => (n < 10 ? '0' + n : n);
      const dtLocal = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T18:00`;
      document.getElementById('task-input-deadline').value = dtLocal;
      document.getElementById('task-input-effort').value = '2.0';
      document.getElementById('task-input-difficulty').value = 'Medium';
      document.getElementById('task-input-importance').value = 'High';
    }

    modal.classList.remove('hidden');
  }

  _bindTaskForm() {
    const form = document.getElementById('form-task');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();

      const taskData = {
        title: document.getElementById('task-input-title').value,
        subject: document.getElementById('task-input-subject').value,
        type: document.getElementById('task-input-type').value,
        dueDate: document.getElementById('task-input-deadline').value,
        estimatedHours: parseFloat(document.getElementById('task-input-effort').value),
        difficulty: document.getElementById('task-input-difficulty').value,
        priority: document.getElementById('task-input-importance').value,
        notes: document.getElementById('task-input-notes').value
      };

      const errorAlert = document.getElementById('task-error-alert');

      if (this.editingTaskId) {
        const result = TaskManager.updateTask(this.editingTaskId, taskData);
        if (!result.success) {
          if (errorAlert) {
            errorAlert.textContent = result.errors.join(' ');
            errorAlert.classList.remove('hidden');
          }
          return;
        }
        this.showToast('Task updated successfully!');
      } else {
        const result = TaskManager.addTask(taskData);
        if (!result.success) {
          if (errorAlert) {
            errorAlert.textContent = result.errors.join(' ');
            errorAlert.classList.remove('hidden');
          }
          return;
        }
        this.showToast('✨ Task added and prioritized by Smart Priority Engine!');
      }

      document.getElementById('modal-task')?.classList.add('hidden');
      this.renderAll();
    });
  }

  // --- Subject Form Handling ---

  openSubjectModal(subject = null) {
    this.editingSubjectId = subject ? subject.id : null;
    const modal = document.getElementById('modal-subject');
    const form = document.getElementById('form-subject');
    const titleEl = document.getElementById('modal-subject-title');
    const submitBtn = document.getElementById('btn-save-subject');
    const swatchContainer = document.getElementById('subject-color-swatches');

    if (!modal || !form) return;

    form.reset();
    document.getElementById('subject-error-alert')?.classList.add('hidden');

    let selectedColor = subject ? subject.color : SUBJECT_COLOR_PALETTE[0].value;

    // Render color swatches
    if (swatchContainer) {
      swatchContainer.innerHTML = SUBJECT_COLOR_PALETTE.map(c => `
        <div class="color-swatch-radio ${c.value === selectedColor ? 'selected' : ''}" 
             style="background-color: ${c.value};" 
             data-color="${c.value}" title="${c.label}"></div>
      `).join('');

      swatchContainer.querySelectorAll('.color-swatch-radio').forEach(swatch => {
        swatch.addEventListener('click', () => {
          swatchContainer.querySelectorAll('.color-swatch-radio').forEach(s => s.classList.remove('selected'));
          swatch.classList.add('selected');
          selectedColor = swatch.getAttribute('data-color');
          const hiddenInput = document.getElementById('subject-input-color');
          if (hiddenInput) hiddenInput.value = selectedColor;
        });
      });
    }

    const hiddenInput = document.getElementById('subject-input-color');
    if (hiddenInput) hiddenInput.value = selectedColor;

    if (subject) {
      if (titleEl) titleEl.textContent = 'Edit Subject';
      if (submitBtn) submitBtn.textContent = 'Update Subject';

      document.getElementById('subject-input-name').value = subject.name;
      document.getElementById('subject-input-code').value = subject.code || '';
      document.getElementById('subject-input-teacher').value = subject.teacher || '';
      document.getElementById('subject-input-target').value = subject.weeklyTarget || 4.0;
      document.getElementById('subject-input-difficulty').value = subject.difficulty || 'Medium';
    } else {
      if (titleEl) titleEl.textContent = 'Add Academic Subject';
      if (submitBtn) submitBtn.textContent = 'Create Subject';
      document.getElementById('subject-input-target').value = '4.0';
      document.getElementById('subject-input-difficulty').value = 'Medium';
    }

    modal.classList.remove('hidden');
  }

  _bindSubjectForm() {
    const form = document.getElementById('form-subject');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();

      const data = {
        name: document.getElementById('subject-input-name').value,
        code: document.getElementById('subject-input-code').value,
        teacher: document.getElementById('subject-input-teacher').value,
        weeklyTarget: parseFloat(document.getElementById('subject-input-target').value),
        difficulty: document.getElementById('subject-input-difficulty').value,
        color: document.getElementById('subject-input-color').value
      };

      const errorAlert = document.getElementById('subject-error-alert');

      if (this.editingSubjectId) {
        const res = SubjectManager.updateSubject(this.editingSubjectId, data);
        if (!res.success) {
          if (errorAlert) {
            errorAlert.textContent = res.errors.join(' ');
            errorAlert.classList.remove('hidden');
          }
          return;
        }
        this.showToast(`Subject "${data.name}" updated.`);
      } else {
        const res = SubjectManager.addSubject(data);
        if (!res.success) {
          if (errorAlert) {
            errorAlert.textContent = res.errors.join(' ');
            errorAlert.classList.remove('hidden');
          }
          return;
        }
        this.showToast(`Subject "${data.name}" added successfully.`);
      }

      document.getElementById('modal-subject')?.classList.add('hidden');
      this.renderAll();
    });
  }

  // --- Settings Form ---

  _bindSettingsForm() {
    const form = document.getElementById('form-settings');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();

      const updatedProfile = {
        name: document.getElementById('setting-name').value.trim(),
        course: document.getElementById('setting-course').value.trim(),
        college: document.getElementById('setting-college').value.trim(),
        dailyAvailableHours: parseFloat(document.getElementById('setting-daily-hours').value),
        preferredStartTime: document.getElementById('setting-start-time').value,
        preferredEndTime: document.getElementById('setting-end-time').value,
        breakDuration: parseInt(document.getElementById('setting-break-duration').value, 10) || 10,
        focusDuration: parseInt(document.getElementById('setting-focus-duration').value, 10) || 25
      };

      const validation = validateProfile(updatedProfile);
      if (!validation.isValid) {
        this.showToast(validation.errors.join(' '), 'error');
        return;
      }

      state.setProfile(updatedProfile);
      this.showToast('Settings saved and capacity limits updated.');
      this.renderAll();
    });

    // Load Demo Data
    document.querySelectorAll('.btn-action-demo-data').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Reload realistic academic demo tasks and subjects?')) {
          storage.seedDemoData();
          state.init();
          this.showToast('Demo data reloaded successfully!');
          this.renderAll();
        }
      });
    });

    // Reset Data
    document.querySelectorAll('.btn-action-clear-data').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all tasks, subjects, and study data?')) {
          storage.clearAllData();
          state.init();
          this.showToast('All local data cleared.');
          this.renderAll();
        }
      });
    });

    // Export Backup
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = storage.exportBackupJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studyflow-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Backup JSON exported successfully.');
      });
    }

    // Import Backup
    const importInput = document.getElementById('input-import-data');
    if (importInput) {
      importInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const res = storage.importBackupJSON(ev.target.result);
          if (res.success) {
            state.init();
            this.showToast('Backup restored successfully!');
            this.renderAll();
          } else {
            this.showToast('Failed to import backup: ' + res.error, 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  // --- Global Event Delegation ---

  _bindGlobalEvents() {
    // Generate Smart Schedule buttons
    document.querySelectorAll('.btn-generate-schedule').forEach(btn => {
      btn.addEventListener('click', () => {
        ScheduleEngine.generateSchedule();
        this.showToast('✨ Smart schedule generated realistically!');
        this.switchTab('schedule');
        this.renderAll();
      });
    });

    // Reschedule My Day buttons
    document.querySelectorAll('.btn-reschedule-day').forEach(btn => {
      btn.addEventListener('click', () => {
        const { schedule, diff } = ScheduleEngine.rescheduleDay();
        this._showRescheduleDiffModal(diff);
        this.renderAll();
      });
    });

    // Task Filter Pills
    document.querySelectorAll('.task-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.task-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderTasks();
      });
    });

    // Task Toolbar inputs
    ['tasks-search', 'tasks-subject-filter', 'tasks-type-filter', 'tasks-difficulty-filter', 'tasks-priority-filter', 'tasks-sort'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.renderTasks());
        el.addEventListener('change', () => this.renderTasks());
      }
    });

    // Schedule Day Filter Pills (Today, Tomorrow, This Week)
    document.querySelectorAll('.schedule-day-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.schedule-day-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.scheduleDayFilter = pill.getAttribute('data-day-filter') || 'all';
        this.renderSchedule();
      });
    });

    // Dynamic Element Clicks (Event Delegation)
    document.addEventListener('click', e => {
      // 1. Task Checkbox Complete
      if (e.target.classList.contains('task-toggle-checkbox')) {
        const taskId = e.target.getAttribute('data-task-id');
        const res = TaskManager.toggleComplete(taskId);
        if (res) {
          this.showToast(res.status === 'completed' ? 'Task marked completed! 🏆' : 'Task restored to active.');
          this.renderAll();
        }
      }

      // 2. Task Restore Button
      const restoreBtn = e.target.closest('.btn-restore-task');
      if (restoreBtn) {
        const taskId = restoreBtn.getAttribute('data-task-id');
        TaskManager.restoreTask(taskId);
        this.showToast('Task restored to active list.');
        this.renderAll();
      }

      // 3. Edit Task Button
      const editTaskBtn = e.target.closest('.btn-edit-task');
      if (editTaskBtn) {
        const taskId = editTaskBtn.getAttribute('data-task-id');
        const task = state.tasks.find(t => t.id === taskId);
        if (task) this.openTaskModal(task);
      }

      // 4. Delete Task Button
      const deleteTaskBtn = e.target.closest('.btn-delete-task');
      if (deleteTaskBtn) {
        const taskId = deleteTaskBtn.getAttribute('data-task-id');
        this.openDeleteTaskModal(taskId);
      }

      // 5. Edit Subject Button
      const editSubjBtn = e.target.closest('.btn-edit-subject');
      if (editSubjBtn) {
        const subjId = editSubjBtn.getAttribute('data-subject-id');
        const subj = state.getSubjectById(subjId);
        if (subj) this.openSubjectModal(subj);
      }

      // 6. Delete Subject Button
      const deleteSubjBtn = e.target.closest('.btn-delete-subject');
      if (deleteSubjBtn) {
        const subjId = deleteSubjBtn.getAttribute('data-subject-id');
        this.openDeleteSubjectModal(subjId);
      }

      // 7. Schedule Block Checkbox
      if (e.target.classList.contains('schedule-block-checkbox')) {
        const blockId = e.target.getAttribute('data-block-id');
        ScheduleEngine.toggleBlockCompletion(blockId, e.target.checked);
        this.showToast(e.target.checked ? 'Study session completed! Focused effort. 👏' : 'Block unchecked.');
        this.renderDashboard();
        this.renderSchedule();
      }

      // 8. Launch Focus Pomodoro on Task
      const focusBtn = e.target.closest('.btn-start-focus');
      if (focusBtn) {
        const taskId = focusBtn.getAttribute('data-task-id');
        const task = state.tasks.find(t => t.id === taskId);
        this.launchFocusMode(task);
      }
    });

    // Pomodoro Controls
    const pomoStartBtn = document.getElementById('btn-pomo-start');
    const pomoPauseBtn = document.getElementById('btn-pomo-pause');
    const pomoResetBtn = document.getElementById('btn-pomo-reset');
    const pomoSkipBtn = document.getElementById('btn-pomo-skip');

    if (pomoStartBtn) {
      pomoStartBtn.addEventListener('click', () => {
        this.pomodoroTimer.start();
        pomoStartBtn.classList.add('hidden');
        pomoPauseBtn?.classList.remove('hidden');
      });
    }
    if (pomoPauseBtn) {
      pomoPauseBtn.addEventListener('click', () => {
        this.pomodoroTimer.pause();
        pomoPauseBtn.classList.add('hidden');
        pomoStartBtn?.classList.remove('hidden');
      });
    }
    if (pomoResetBtn) {
      pomoResetBtn.addEventListener('click', () => {
        this.pomodoroTimer.reset();
        pomoPauseBtn?.classList.add('hidden');
        pomoStartBtn?.classList.remove('hidden');
      });
    }
    if (pomoSkipBtn) {
      pomoSkipBtn.addEventListener('click', () => {
        this.pomodoroTimer.skip();
        pomoPauseBtn?.classList.add('hidden');
        pomoStartBtn?.classList.remove('hidden');
      });
    }

    // Pomodoro Mode Pills
    document.querySelectorAll('.pomo-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const mode = pill.getAttribute('data-mode');
        this.pomodoroTimer.setMode(mode);
        pomoPauseBtn?.classList.add('hidden');
        pomoStartBtn?.classList.remove('hidden');
      });
    });

    // Delete Task Confirmation
    const confirmDeleteTaskBtn = document.getElementById('btn-confirm-delete-task');
    if (confirmDeleteTaskBtn) {
      confirmDeleteTaskBtn.addEventListener('click', () => {
        if (this.deletingTaskId) {
          TaskManager.deleteTask(this.deletingTaskId);
          document.getElementById('modal-delete-task')?.classList.add('hidden');
          this.showToast('Task removed.');
          this.deletingTaskId = null;
          this.renderAll();
        }
      });
    }

    // Delete Subject Confirmation
    const confirmDeleteSubjBtn = document.getElementById('btn-confirm-delete-subject');
    if (confirmDeleteSubjBtn) {
      confirmDeleteSubjBtn.addEventListener('click', () => {
        if (this.deletingSubjectId) {
          SubjectManager.deleteSubject(this.deletingSubjectId);
          document.getElementById('modal-delete-subject')?.classList.add('hidden');
          this.showToast('Subject removed.');
          this.deletingSubjectId = null;
          this.renderAll();
        }
      });
    }
  }

  launchFocusMode(task = null) {
    if (task) {
      this.pomodoroTimer.setTask(task);
    }
    this.switchTab('focus');
  }

  openDeleteTaskModal(taskId) {
    this.deletingTaskId = taskId;
    const task = state.tasks.find(t => t.id === taskId);
    const titleEl = document.getElementById('delete-task-title');
    if (titleEl && task) titleEl.textContent = `"${task.title}"`;
    document.getElementById('modal-delete-task')?.classList.remove('hidden');
  }

  openDeleteSubjectModal(subjectId) {
    this.deletingSubjectId = subjectId;
    const subj = state.getSubjectById(subjectId);
    const titleEl = document.getElementById('delete-subject-title');
    if (titleEl && subj) titleEl.textContent = `"${subj.name}"`;
    document.getElementById('modal-delete-subject')?.classList.remove('hidden');
  }

  _showRescheduleDiffModal(diff) {
    const modal = document.getElementById('modal-reschedule-diff');
    if (!modal) return;

    const expEl = document.getElementById('diff-explanation-text');
    const listEl = document.getElementById('diff-moved-list');

    if (expEl) expEl.textContent = diff.explanation;

    if (listEl) {
      if (diff.movedTasks.length === 0) {
        listEl.innerHTML = '<li>Urgent deadlines preserved. Study intervals synchronized with remaining daily capacity.</li>';
      } else {
        listEl.innerHTML = diff.movedTasks.map(t => `
          <li><strong>${escapeHtml(t)}</strong> → Deferred to upcoming sessions to protect nearest deadlines.</li>
        `).join('');
      }
    }

    modal.classList.remove('hidden');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast toast-visible ${type === 'error' ? 'toast-error' : 'toast-info'}`;

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('toast-visible');
    }, 3200);
  }
}

export const ui = new UIController();
