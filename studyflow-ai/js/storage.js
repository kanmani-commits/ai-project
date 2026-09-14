/**
 * StudyFlow AI - Storage Manager
 * Project Better Tomorrow
 * Safe localStorage abstraction with in-memory fallback and demo seed data
 */

import { getRelativeDateISO } from './utils.js';

export const STORAGE_KEYS = {
  TASKS: 'studyflow_tasks_v2',
  SUBJECTS: 'studyflow_subjects_v2',
  PROFILE: 'studyflow_profile_v2',
  SCHEDULE: 'studyflow_schedule_v2',
  POMODORO: 'studyflow_pomodoro_v2',
  THEME: 'studyflow_theme_v2',
  ONBOARDING_DONE: 'studyflow_onboarding_done_v2',
  CHAT_HISTORY: 'studyflow_chat_history_v2'
};

export const DEFAULT_PROFILE = {
  name: 'Aarav Sharma',
  course: 'B.Tech Computer Science (6th Sem)',
  college: 'Institute of Engineering & Technology',
  dailyAvailableHours: 4.0,
  preferredStartTime: '17:00', // 5:00 PM
  preferredEndTime: '22:00',   // 10:00 PM
  breakDuration: 10,           // 10 minutes break
  focusDuration: 25,           // 25 min pomodoro
  shortBreakDuration: 5,
  longBreakDuration: 15
};

export const DEFAULT_SUBJECTS = [
  {
    id: 'subj-1',
    name: 'Data Structures',
    code: 'CS201',
    teacher: 'Prof. Ramanathan',
    color: '#6366f1', // Indigo
    weeklyTarget: 6.0,
    difficulty: 'Hard'
  },
  {
    id: 'subj-2',
    name: 'Database Management Systems',
    code: 'CS202',
    teacher: 'Dr. Ananya Iyer',
    color: '#0ea5e9', // Sky Blue
    weeklyTarget: 5.0,
    difficulty: 'Medium'
  },
  {
    id: 'subj-3',
    name: 'Operating Systems',
    code: 'CS203',
    teacher: 'Dr. K. Murthy',
    color: '#f59e0b', // Amber
    weeklyTarget: 5.0,
    difficulty: 'Hard'
  },
  {
    id: 'subj-4',
    name: 'Computer Networks',
    code: 'CS204',
    teacher: 'Prof. S. Sen',
    color: '#10b981', // Emerald
    weeklyTarget: 4.0,
    difficulty: 'Medium'
  },
  {
    id: 'subj-5',
    name: 'Web Technology',
    code: 'CS205',
    teacher: 'Prof. T. Sharma',
    color: '#8b5cf6', // Violet
    weeklyTarget: 4.0,
    difficulty: 'Medium'
  }
];

export const DEFAULT_TASKS = [
  // Exact test scenario tasks from prompt Section 29
  {
    id: 'task-test-1',
    title: 'Mathematics Assignment',
    subject: 'Data Structures', // Or Mathematics
    type: 'Assignment',
    dueDate: getRelativeDateISO(1, 23, 59), // Due tomorrow
    estimatedHours: 3.0,
    difficulty: 'Hard',
    priority: 'High',
    status: 'In Progress',
    notes: 'Solve recurrence relations and AVL tree balance rotation proofs.',
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: 'task-test-2',
    title: 'DBMS Revision',
    subject: 'Database Management Systems',
    type: 'Revision',
    dueDate: getRelativeDateISO(3, 18, 0), // Due in 3 days
    estimatedHours: 2.0,
    difficulty: 'Medium',
    priority: 'Medium',
    status: 'Not Started',
    notes: 'Revise BCNF normalization and ACID transaction isolation levels.',
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: 'task-test-3',
    title: 'Web Project',
    subject: 'Web Technology',
    type: 'Project',
    dueDate: getRelativeDateISO(5, 20, 0), // Due in 5 days
    estimatedHours: 4.0,
    difficulty: 'Hard',
    priority: 'High',
    status: 'In Progress',
    notes: 'Complete REST API endpoints and responsive CSS dashboard layout.',
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  // Additional realistic tasks
  {
    id: 'task-test-4',
    title: 'OS Scheduling Notes & Simulation',
    subject: 'Operating Systems',
    type: 'Exam',
    dueDate: getRelativeDateISO(2, 9, 30), // Due in 2 days morning
    estimatedHours: 2.5,
    difficulty: 'Very Hard',
    priority: 'Critical',
    status: 'Not Started',
    notes: 'Mid-term preparation on Bankers Algorithm & Multilevel Feedback Queues.',
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: 'task-test-5',
    title: 'Computer Networks Socket Lab Record',
    subject: 'Computer Networks',
    type: 'Lab',
    dueDate: getRelativeDateISO(1, 15, 0), // Due tomorrow afternoon
    estimatedHours: 1.0,
    difficulty: 'Easy',
    priority: 'Medium',
    status: 'Not Started',
    notes: 'TCP echo client-server program output graphs and lab manual write-up.',
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: 'task-test-6',
    title: 'SQL Trigger Presentation Slides',
    subject: 'Database Management Systems',
    type: 'Presentation',
    dueDate: getRelativeDateISO(0, 21, 0), // Today evening
    estimatedHours: 0.5,
    difficulty: 'Easy',
    priority: 'Low',
    status: 'Completed',
    notes: '6 slides on BEFORE INSERT triggers with live demo screenshots.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 7200000).toISOString()
  }
];

class StorageService {
  constructor() {
    this.isStorageSupported = this._testStorage();
    this.memoryStore = new Map();
  }

  _testStorage() {
    try {
      const test = '__studyflow_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage not available; using in-memory fallback.', e);
      return false;
    }
  }

  get(key, defaultValue = null) {
    if (!this.isStorageSupported) {
      return this.memoryStore.has(key) ? this.memoryStore.get(key) : defaultValue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Storage error reading key "${key}":`, e);
      return defaultValue;
    }
  }

  set(key, value) {
    if (!this.isStorageSupported) {
      this.memoryStore.set(key, value);
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Storage error saving key "${key}":`, e);
    }
  }

  remove(key) {
    if (!this.isStorageSupported) {
      this.memoryStore.delete(key);
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.error(`Storage error removing key "${key}":`, e);
    }
  }

  // --- Specific Entity Accessors ---

  getTasks() {
    return this.get(STORAGE_KEYS.TASKS, null);
  }

  saveTasks(tasks) {
    this.set(STORAGE_KEYS.TASKS, tasks);
  }

  getSubjects() {
    return this.get(STORAGE_KEYS.SUBJECTS, null);
  }

  saveSubjects(subjects) {
    this.set(STORAGE_KEYS.SUBJECTS, subjects);
  }

  getProfile() {
    return this.get(STORAGE_KEYS.PROFILE, { ...DEFAULT_PROFILE });
  }

  saveProfile(profile) {
    this.set(STORAGE_KEYS.PROFILE, profile);
  }

  getSchedule() {
    return this.get(STORAGE_KEYS.SCHEDULE, null);
  }

  saveSchedule(schedule) {
    this.set(STORAGE_KEYS.SCHEDULE, schedule);
  }

  getPomodoro() {
    return this.get(STORAGE_KEYS.POMODORO, {
      sessionsCompleted: 0,
      totalFocusMinutes: 0,
      todayFocusMinutes: 0,
      streakDays: 1,
      lastSessionDate: new Date().toISOString().split('T')[0]
    });
  }

  savePomodoro(data) {
    this.set(STORAGE_KEYS.POMODORO, data);
  }

  getTheme() {
    return this.get(STORAGE_KEYS.THEME, 'system');
  }

  saveTheme(theme) {
    this.set(STORAGE_KEYS.THEME, theme);
  }

  isOnboardingDone() {
    return this.get(STORAGE_KEYS.ONBOARDING_DONE, false);
  }

  setOnboardingDone(done = true) {
    this.set(STORAGE_KEYS.ONBOARDING_DONE, done);
  }

  // --- Demo Seeding & Reset ---

  hasAnyData() {
    const tasks = this.getTasks();
    const subjects = this.getSubjects();
    return (Array.isArray(tasks) && tasks.length > 0) || (Array.isArray(subjects) && subjects.length > 0);
  }

  seedDemoData() {
    this.saveSubjects([...DEFAULT_SUBJECTS]);
    this.saveTasks([...DEFAULT_TASKS]);
    this.saveProfile({ ...DEFAULT_PROFILE });
    this.saveSchedule(null);
    this.setOnboardingDone(true);
    return {
      subjects: DEFAULT_SUBJECTS,
      tasks: DEFAULT_TASKS,
      profile: DEFAULT_PROFILE
    };
  }

  clearAllData() {
    Object.values(STORAGE_KEYS).forEach(k => this.remove(k));
    this.memoryStore.clear();
  }

  exportBackupJSON() {
    return JSON.stringify({
      version: '2.0',
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      subjects: this.getSubjects() || [],
      tasks: this.getTasks() || [],
      schedule: this.getSchedule(),
      pomodoro: this.getPomodoro(),
      theme: this.getTheme()
    }, null, 2);
  }

  importBackupJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.profile) this.saveProfile(parsed.profile);
      if (Array.isArray(parsed.subjects)) this.saveSubjects(parsed.subjects);
      if (Array.isArray(parsed.tasks)) this.saveTasks(parsed.tasks);
      if (parsed.schedule) this.saveSchedule(parsed.schedule);
      if (parsed.pomodoro) this.savePomodoro(parsed.pomodoro);
      if (parsed.theme) this.saveTheme(parsed.theme);
      this.setOnboardingDone(true);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export const storage = new StorageService();
