/**
 * StudyFlow AI - Analytics & Chart Engine
 * Project Better Tomorrow
 * Uses Chart.js (via CDN) with full native HTML5 Canvas fallback for offline reliability
 */

import { state } from './state.js';
import { SubjectManager } from './subjects.js';
import { WorkloadEngine } from './workload.js';
import { roundTo } from './utils.js';

export class AnalyticsService {
  /**
   * Computes top-level analytics metrics
   */
  static getMetrics() {
    const tasks = state.tasks;
    const completed = tasks.filter(t => t.status === 'Completed');
    const pending = tasks.filter(t => t.status !== 'Completed');
    const pomodoro = state.pomodoro;
    const workload = WorkloadEngine.analyze();

    const totalTasks = tasks.length;
    const completedCount = completed.length;
    const pendingCount = pending.length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    const completedHours = completed.reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 0), 0);
    const pendingHours = pending.reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 0), 0);

    return {
      totalTasks,
      completedCount,
      pendingCount,
      completionRate,
      completedHours: roundTo(completedHours, 1),
      pendingHours: roundTo(pendingHours, 1),
      totalHours: roundTo(completedHours + pendingHours, 1),
      overloadPercent: workload.overloadPercent,
      overloadLevel: workload.level,
      focusSessionsCompleted: pomodoro.sessionsCompleted || 0,
      totalFocusMinutes: pomodoro.totalFocusMinutes || 0,
      totalFocusHours: roundTo((pomodoro.totalFocusMinutes || 0) / 60, 1),
      todayFocusMinutes: pomodoro.todayFocusMinutes || 0,
      streakDays: pomodoro.streakDays || 1
    };
  }

  /**
   * Render all 4 charts
   */
  static renderCharts() {
    this.renderWeeklyHoursChart('chart-weekly-hours');
    this.renderSubjectDoughnutChart('chart-subject-distribution');
    this.renderCompletedVsPendingChart('chart-status-donut');
    this.renderWorkloadTrendChart('chart-workload-trend');
  }

  /**
   * 1. Weekly Study Hours Bar Chart
   */
  static renderWeeklyHoursChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyCap = state.profile.dailyAvailableHours || 4.0;
    const planned = [dailyCap, dailyCap, dailyCap, dailyCap, dailyCap, dailyCap * 0.75, dailyCap * 0.5];

    // Compute actual scheduled hours from current schedule
    const completed = [3.5, 4.0, 3.0, 4.2, 3.8, 2.0, 1.5]; // Sample history + live active
    if (state.schedule && state.schedule.days) {
      state.schedule.days.slice(0, 7).forEach((d, idx) => {
        if (idx < completed.length) {
          completed[idx] = d.allocatedStudyHours || 0;
        }
      });
    }

    if (window.Chart) {
      this._destroyChartInstance(canvas);
      canvas._chartInstance = new window.Chart(canvas, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [
            {
              label: 'Planned Capacity (h)',
              data: planned,
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              borderRadius: 6
            },
            {
              label: 'Scheduled Study (h)',
              data: completed,
              backgroundColor: '#6366f1',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true, max: Math.max(6, Math.ceil(dailyCap * 1.4)) }
          }
        }
      });
    } else {
      this._renderFallbackBarChart(canvas, days, planned, completed);
    }
  }

  /**
   * 2. Subject Distribution Doughnut Chart
   */
  static renderSubjectDoughnutChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const subjects = SubjectManager.getSubjectStatistics().filter(s => s.totalHours > 0);
    const labels = subjects.length > 0 ? subjects.map(s => s.name) : ['No Data'];
    const data = subjects.length > 0 ? subjects.map(s => s.totalHours) : [1];
    const colors = subjects.length > 0 ? subjects.map(s => s.color) : ['#cbd5e1'];

    if (window.Chart) {
      this._destroyChartInstance(canvas);
      canvas._chartInstance = new window.Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    } else {
      this._renderFallbackDonutChart(canvas, data, colors, labels);
    }
  }

  /**
   * 3. Completed vs Pending Tasks
   */
  static renderCompletedVsPendingChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const metrics = this.getMetrics();
    const activeTasks = state.getActiveTasks();
    const inProgress = activeTasks.filter(t => t.status === 'In Progress').length;
    const notStarted = activeTasks.filter(t => t.status === 'Not Started').length;
    const overdue = activeTasks.filter(t => t.status === 'Overdue').length;

    const labels = ['Completed', 'In Progress', 'Not Started', 'Overdue'];
    const data = [metrics.completedCount, inProgress, notStarted, overdue];
    const colors = ['#10b981', '#6366f1', '#94a3b8', '#ef4444'];

    if (window.Chart) {
      this._destroyChartInstance(canvas);
      canvas._chartInstance = new window.Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    } else {
      this._renderFallbackDonutChart(canvas, data, colors, labels);
    }
  }

  /**
   * 4. Workload Trend Line Chart
   */
  static renderWorkloadTrendChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const workload = WorkloadEngine.analyze();
    const dailyCap = state.profile.dailyAvailableHours || 4.0;

    // Projected descending pending hours as tasks are completed
    let rem = workload.totalPendingHours;
    const trend = days.map(() => {
      const val = Math.max(0, rem);
      rem = Math.max(0, rem - dailyCap * 0.9);
      return roundTo(val, 1);
    });

    if (window.Chart) {
      this._destroyChartInstance(canvas);
      canvas._chartInstance = new window.Chart(canvas, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Projected Pending Workload (h)',
            data: trend,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.35
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    } else {
      this._renderFallbackLineChart(canvas, days, trend);
    }
  }

  static _destroyChartInstance(canvas) {
    if (canvas && canvas._chartInstance) {
      try {
        canvas._chartInstance.destroy();
      } catch (e) {
        // Ignore
      }
      canvas._chartInstance = null;
    }
  }

  // --- Offline Fallback Canvas Renderers ---

  static _renderFallbackBarChart(canvas, labels, planned, completed) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...planned, ...completed, 6);
    const padX = 40;
    const padY = 30;
    const colW = (w - padX * 2) / labels.length;

    labels.forEach((lbl, idx) => {
      const x = padX + idx * colW + colW / 2;
      const pH = (planned[idx] / maxVal) * (h - padY * 2);
      const cH = (completed[idx] / maxVal) * (h - padY * 2);

      // Planned
      ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.fillRect(x - 14, h - padY - pH, 12, pH);

      // Completed
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(x + 2, h - padY - cH, 12, cH);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x, h - 8);
    });
  }

  static _renderFallbackDonutChart(canvas, data, colors, labels) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const total = data.reduce((a, b) => a + b, 0) || 1;
    let start = -0.5 * Math.PI;
    const cx = w / 2;
    const cy = h / 2 - 10;
    const r = Math.min(cx, cy) - 20;

    data.forEach((val, idx) => {
      const slice = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.arc(cx, cy, r * 0.6, start + slice, start, true);
      ctx.closePath();
      ctx.fillStyle = colors[idx] || '#cbd5e1';
      ctx.fill();
      start += slice;
    });
  }

  static _renderFallbackLineChart(canvas, labels, trend) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...trend, 10);
    const pad = 35;
    const stepX = (w - pad * 2) / (labels.length - 1);

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();

    trend.forEach((val, idx) => {
      const x = pad + idx * stepX;
      const y = h - pad - (val / maxVal) * (h - pad * 2);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}
