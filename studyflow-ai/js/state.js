/**
 * StudyFlow AI - Centralized Reactive State Store
 * Project Better Tomorrow
 */

import { storage } from './storage.js';

class StateStore {
  constructor() {
    this.tasks = [];
    this.subjects = [];
    this.profile = {};
    this.schedule = null;
    this.pomodoro = {};
    this.theme = 'system';
    this.listeners = [];
  }

  init() {
    // 1. Check if first launch; seed demo if completely fresh
    if (!storage.hasAnyData()) {
      storage.seedDemoData();
    }

    this.tasks = storage.getTasks() || [];
    this.subjects = storage.getSubjects() || [];
    this.profile = storage.getProfile();
    this.schedule = storage.getSchedule();
    this.pomodoro = storage.getPomodoro();
    this.theme = storage.getTheme();

    this._updateOverdueStatuses();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(changeType = 'all') {
    this.listeners.forEach(fn => {
      try {
        fn(this, changeType);
      } catch (e) {
        console.error('Error in state subscriber:', e);
      }
    });
  }

  _updateOverdueStatuses() {
    const now = new Date();
    let changed = false;
    this.tasks.forEach(task => {
      if (task.status !== 'Completed' && new Date(task.dueDate) < now) {
        if (task.status !== 'Overdue') {
          task.status = 'Overdue';
          changed = true;
        }
      } else if (task.status === 'Overdue' && new Date(task.dueDate) >= now) {
        task.status = 'In Progress';
        changed = true;
      }
    });
    if (changed) {
      storage.saveTasks(this.tasks);
    }
  }

  // --- Task Mutators ---

  setTasks(tasks) {
    this.tasks = tasks;
    storage.saveTasks(this.tasks);
    this.notify('tasks');
  }

  addTask(task) {
    this.tasks.unshift(task);
    storage.saveTasks(this.tasks);
    this.notify('tasks');
  }

  updateTask(id, updatedFields) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.tasks[idx] = { ...this.tasks[idx], ...updatedFields, updatedAt: new Date().toISOString() };
      storage.saveTasks(this.tasks);
      this.notify('tasks');
      return this.tasks[idx];
    }
    return null;
  }

  deleteTask(id) {
    const prevLen = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== id);
    if (this.tasks.length !== prevLen) {
      storage.saveTasks(this.tasks);
      this.notify('tasks');
      return true;
    }
    return false;
  }

  // --- Subject Mutators ---

  setSubjects(subjects) {
    this.subjects = subjects;
    storage.saveSubjects(this.subjects);
    this.notify('subjects');
  }

  addSubject(subject) {
    this.subjects.push(subject);
    storage.saveSubjects(this.subjects);
    this.notify('subjects');
  }

  updateSubject(id, updatedFields) {
    const idx = this.subjects.findIndex(s => s.id === id);
    if (idx !== -1) {
      const oldName = this.subjects[idx].name;
      this.subjects[idx] = { ...this.subjects[idx], ...updatedFields };
      storage.saveSubjects(this.subjects);

      // If subject name changed, cascade update to corresponding tasks
      if (updatedFields.name && updatedFields.name !== oldName) {
        this.tasks.forEach(t => {
          if (t.subject === oldName) {
            t.subject = updatedFields.name;
          }
        });
        storage.saveTasks(this.tasks);
      }

      this.notify('subjects');
      return this.subjects[idx];
    }
    return null;
  }

  deleteSubject(id) {
    const subj = this.subjects.find(s => s.id === id);
    if (!subj) return false;
    this.subjects = this.subjects.filter(s => s.id !== id);
    storage.saveSubjects(this.subjects);
    this.notify('subjects');
    return true;
  }

  // --- Profile Mutators ---

  setProfile(profile) {
    this.profile = { ...this.profile, ...profile };
    storage.saveProfile(this.profile);
    this.notify('profile');
  }

  // --- Schedule Mutators ---

  setSchedule(schedule) {
    this.schedule = schedule;
    storage.saveSchedule(this.schedule);
    this.notify('schedule');
  }

  // --- Pomodoro Mutators ---

  updatePomodoro(data) {
    this.pomodoro = { ...this.pomodoro, ...data };
    storage.savePomodoro(this.pomodoro);
    this.notify('pomodoro');
  }

  // --- Theme Mutators ---

  setTheme(theme) {
    this.theme = theme;
    storage.saveTheme(this.theme);
    this.notify('theme');
  }

  // --- Queries & Helpers ---

  getActiveTasks() {
    this._updateOverdueStatuses();
    return this.tasks.filter(t => t.status !== 'Completed');
  }

  getCompletedTasks() {
    return this.tasks.filter(t => t.status === 'Completed');
  }

  getOverdueTasks() {
    this._updateOverdueStatuses();
    return this.tasks.filter(t => t.status === 'Overdue');
  }

  getSubjectByName(name) {
    return this.subjects.find(s => s.name.toLowerCase() === (name || '').toLowerCase()) || null;
  }

  getSubjectById(id) {
    return this.subjects.find(s => s.id === id) || null;
  }

  getTasksForSubject(subjectName) {
    return this.tasks.filter(t => (t.subject || '').toLowerCase() === (subjectName || '').toLowerCase());
  }
}

export const state = new StateStore();
