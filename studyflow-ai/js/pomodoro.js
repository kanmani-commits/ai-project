/**
 * StudyFlow AI - Pomodoro / Focus Mode Module
 * Project Better Tomorrow
 */

import { state } from './state.js';

export const POMODORO_MODES = {
  FOCUS: { key: 'focus', label: 'Focus Session', defaultMinutes: 25 },
  SHORT_BREAK: { key: 'shortBreak', label: 'Short Break', defaultMinutes: 5 },
  LONG_BREAK: { key: 'longBreak', label: 'Long Break', defaultMinutes: 15 }
};

export class PomodoroTimer {
  constructor(callbacks = {}) {
    this.currentMode = POMODORO_MODES.FOCUS.key;
    this.durationMinutes = 25;
    this.remainingSeconds = 25 * 60;
    this.isRunning = false;
    this.timerId = null;
    this.currentTask = null;

    this.onTick = callbacks.onTick || (() => {});
    this.onComplete = callbacks.onComplete || (() => {});
    this.onModeChange = callbacks.onModeChange || (() => {});
  }

  setTask(task) {
    this.currentTask = task;
  }

  setMode(modeKey) {
    this.pause();
    this.currentMode = modeKey;

    if (modeKey === POMODORO_MODES.FOCUS.key) {
      this.durationMinutes = state.profile.focusDuration || 25;
    } else if (modeKey === POMODORO_MODES.SHORT_BREAK.key) {
      this.durationMinutes = state.profile.shortBreakDuration || 5;
    } else if (modeKey === POMODORO_MODES.LONG_BREAK.key) {
      this.durationMinutes = state.profile.longBreakDuration || 15;
    }

    this.remainingSeconds = this.durationMinutes * 60;
    this.onModeChange(this.currentMode, this.durationMinutes);
    this.onTick(this.getFormattedTime(), 0);
  }

  setCustomMinutes(mins) {
    this.pause();
    this.durationMinutes = mins;
    this.remainingSeconds = mins * 60;
    this.onTick(this.getFormattedTime(), 0);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timerId = setInterval(() => {
      this.remainingSeconds--;
      this.onTick(this.getFormattedTime(), this.getProgressPercent());

      if (this.remainingSeconds <= 0) {
        this.complete();
      }
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  resume() {
    this.start();
  }

  reset() {
    this.pause();
    this.remainingSeconds = this.durationMinutes * 60;
    this.onTick(this.getFormattedTime(), 0);
  }

  skip() {
    this.pause();
    if (this.currentMode === POMODORO_MODES.FOCUS.key) {
      this.setMode(POMODORO_MODES.SHORT_BREAK.key);
    } else {
      this.setMode(POMODORO_MODES.FOCUS.key);
    }
  }

  complete() {
    this.pause();
    this.playAudioChime();

    // If it was a focus session, record statistics
    if (this.currentMode === POMODORO_MODES.FOCUS.key) {
      const pomodoro = state.pomodoro;
      const today = new Date().toISOString().split('T')[0];

      let todayMins = pomodoro.todayFocusMinutes || 0;
      if (pomodoro.lastSessionDate !== today) {
        todayMins = 0; // Reset daily count if date changed
      }

      state.updatePomodoro({
        sessionsCompleted: (pomodoro.sessionsCompleted || 0) + 1,
        totalFocusMinutes: (pomodoro.totalFocusMinutes || 0) + this.durationMinutes,
        todayFocusMinutes: todayMins + this.durationMinutes,
        lastSessionDate: today
      });
    }

    this.onComplete({
      mode: this.currentMode,
      durationMinutes: this.durationMinutes,
      task: this.currentTask
    });

    // Auto switch mode
    if (this.currentMode === POMODORO_MODES.FOCUS.key) {
      const completedCount = state.pomodoro.sessionsCompleted || 0;
      const nextMode = completedCount % 4 === 0
        ? POMODORO_MODES.LONG_BREAK.key
        : POMODORO_MODES.SHORT_BREAK.key;
      this.setMode(nextMode);
    } else {
      this.setMode(POMODORO_MODES.FOCUS.key);
    }
  }

  getFormattedTime() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const pad = n => (n < 10 ? '0' + n : n);
    return `${pad(mins)}:${pad(secs)}`;
  }

  getProgressPercent() {
    const total = this.durationMinutes * 60;
    const elapsed = total - this.remainingSeconds;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  playAudioChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Gentle celebratory chime: E5 -> G#5 -> B5
      playTone(659.25, 0, 0.35);
      playTone(830.61, 0.22, 0.45);
      playTone(987.77, 0.45, 0.7);
    } catch (e) {
      console.log('Audio playback skipped or not permitted:', e);
    }
  }
}
