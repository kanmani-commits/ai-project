/**
 * StudyFlow AI - Utility Functions
 * Project Better Tomorrow
 */

/**
 * Generate a unique ID with an optional prefix
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to specified decimal places
 */
export function roundTo(value, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Convert HH:MM string to total minutes from midnight
 */
export function timeStrToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 540; // Default 09:00 (540 mins)
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert minutes from midnight to HH:MM format (24h)
 */
export function minutesToTimeStr24(totalMinutes) {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const pad = n => (n < 10 ? '0' + n : n);
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Convert minutes from midnight to formatted 12-hour string (e.g. "09:30 AM")
 */
export function minutesToTimeStr12(totalMinutes) {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const pad = n => (n < 10 ? '0' + n : n);
  return `${h}:${pad(m)} ${period}`;
}

/**
 * Format ISO date string into readable date (e.g., "Mon, Sep 15")
 */
export function formatDate(isoStr, includeYear = false) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  if (includeYear) options.year = 'numeric';
  return d.toLocaleDateString(undefined, options);
}

/**
 * Format ISO date into time string (e.g., "11:59 PM")
 */
export function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format ISO date into combined readable string
 */
export function formatDateTime(isoStr) {
  if (!isoStr) return '';
  return `${formatDate(isoStr)} at ${formatTime(isoStr)}`;
}

/**
 * Generate human-friendly countdown / relative deadline string
 */
export function getRelativeDeadline(isoStr) {
  if (!isoStr) return { text: 'No deadline', isUrgent: false, isOverdue: false, diffHours: 0 };
  const now = new Date();
  const target = new Date(isoStr);
  const diffMs = target - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs < 0) {
    const overdueHours = Math.abs(Math.round(diffHours));
    if (overdueHours < 24) {
      return { text: `Overdue by ${overdueHours}h`, isUrgent: true, isOverdue: true, diffHours };
    }
    const overdueDays = Math.abs(Math.round(diffDays));
    return { text: `Overdue by ${overdueDays}d`, isUrgent: true, isOverdue: true, diffHours };
  }

  if (diffHours <= 24) {
    return { text: `Due today (${Math.max(1, Math.round(diffHours))}h left)`, isUrgent: true, isOverdue: false, diffHours };
  }
  if (diffHours <= 48) {
    return { text: 'Due tomorrow', isUrgent: true, isOverdue: false, diffHours };
  }
  if (diffDays <= 7) {
    return { text: `Due in ${Math.ceil(diffDays)} days`, isUrgent: false, isOverdue: false, diffHours };
  }
  return { text: formatDate(isoStr), isUrgent: false, isOverdue: false, diffHours };
}

/**
 * Check if a date string falls on today
 */
export function isToday(isoStr) {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const today = new Date();
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
}

/**
 * Check if date string falls within the next 7 days
 */
export function isThisWeek(isoStr) {
  if (!isoStr) return false;
  const target = new Date(isoStr);
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return target >= now && target <= nextWeek;
}

/**
 * Helper to produce dynamic relative ISO dates for demo tasks
 */
export function getRelativeDateISO(daysOffset, hours = 18, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

/**
 * Simple HTML escape to prevent XSS
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Debounce utility
 */
export function debounce(func, wait = 250) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
