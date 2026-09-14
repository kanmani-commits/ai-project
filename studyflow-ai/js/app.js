/**
 * StudyFlow AI - Main Application Bootstrapper
 * Project Better Tomorrow
 */

import { state } from './state.js';
import { ui } from './ui.js';
import { ScheduleEngine } from './scheduler.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. Initialize reactive state and load persistent storage
    state.init();

    // 2. Ensure initial smart schedule exists if data is present
    if (!state.schedule && state.tasks.length > 0) {
      ScheduleEngine.generateSchedule();
    }

    // 3. Initialize UI controller and event handlers
    ui.init();

    // 4. Handle initial URL hash
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      ui.switchTab(hash);
    } else {
      ui.switchTab('dashboard');
    }

    console.log('⚡ StudyFlow AI initialized successfully. Turn Academic Overload into Action.');
  } catch (err) {
    console.error('StudyFlow AI initialization error:', err);
    const body = document.querySelector('.content-body') || document.body;
    const errorNotice = document.createElement('div');
    errorNotice.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 20px; border-radius: 12px; margin: 20px; border: 1px solid #f87171;';
    errorNotice.innerHTML = `
      <h3>⚠️ StudyFlow AI Notice</h3>
      <p>An error occurred while loading your study plan. Please click below to reset to default demo data:</p>
      <button onclick="localStorage.clear(); location.reload();" style="margin-top: 10px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Reset to Demo Data
      </button>
    `;
    body.prepend(errorNotice);
  }
});

// Global error catcher to prevent silent crashes
window.addEventListener('error', e => {
  console.warn('Unhandled runtime warning:', e.message);
});
