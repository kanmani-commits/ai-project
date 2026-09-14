/**
 * StudyFlow AI - Academic Overload Engine
 * Project Better Tomorrow
 */

import { state } from './state.js';
import { roundTo } from './utils.js';

export const OVERLOAD_LEVELS = {
  LOW: {
    key: 'LOW',
    label: 'Manageable',
    meterLabel: 'LOW',
    color: '#10b981', // Green
    badgeClass: 'badge-manageable',
    recommendation: 'Your workload is manageable.',
    tips: [
      'Your workload is well within your available study hours.',
      'Maintain your steady pace and consider starting ahead on upcoming projects.'
    ]
  },
  MEDIUM: {
    key: 'MEDIUM',
    label: 'Busy',
    meterLabel: 'MEDIUM',
    color: '#f59e0b', // Amber
    badgeClass: 'badge-busy',
    recommendation: 'Your workload is getting busy. Start high-priority tasks early.',
    tips: [
      'Schedule dedicated focus blocks today to avoid last-minute stress.',
      'Stick to your planned 25-minute Pomodoro sprints.'
    ]
  },
  HIGH: {
    key: 'HIGH',
    label: 'Heavy',
    meterLabel: 'HIGH',
    color: '#f97316', // Orange
    badgeClass: 'badge-heavy',
    recommendation: 'Your workload is heavy. Focus on critical deadlines and reduce low-priority tasks.',
    tips: [
      'Focus strictly on tasks marked High or Critical priority.',
      'Consider deferring optional readings to create buffer capacity.'
    ]
  },
  CRITICAL: {
    key: 'CRITICAL',
    label: 'Academic Overload Detected',
    meterLabel: 'CRITICAL',
    color: '#ef4444', // Red
    badgeClass: 'badge-overloaded',
    recommendation: 'Your workload exceeds your available study capacity. Consider rescheduling or reducing non-essential tasks.',
    tips: [
      'Pending deliverables exceed your realistic study capacity.',
      'Use the "↻ Reschedule My Day" button to spread tasks into future days.',
      'Never study without breaks; mandatory breaks protect retention during peak crunch.'
    ]
  }
};

export class WorkloadEngine {
  /**
   * Calculates academic workload, available capacity, overload percentage and classification
   */
  static analyze(planningDays = 7) {
    const profile = state.profile;
    const dailyAvailableHours = parseFloat(profile.dailyAvailableHours) || 4.0;
    const activeTasks = state.getActiveTasks();

    // 1. Total pending workload hours
    const totalPendingHours = activeTasks.reduce(
      (sum, t) => sum + (parseFloat(t.estimatedHours) || 1.0),
      0
    );

    // 2. Available study capacity
    const availableCapacity = dailyAvailableHours * planningDays;

    // 3. Overload calculations
    const capacityDifference = totalPendingHours - availableCapacity;

    // Ratio of pending workload to available capacity (e.g. 70% load, 120% load)
    const loadRatioPercent = availableCapacity > 0
      ? (totalPendingHours / availableCapacity) * 100
      : 100;

    // Direct overload percentage from specification: ((Pending - Capacity) / Capacity) * 100
    const overloadPercent = availableCapacity > 0
      ? ((totalPendingHours - availableCapacity) / availableCapacity) * 100
      : 0;

    // 4. Classification according to specification:
    // 0–70% = LOW
    // 70–100% = MEDIUM
    // 100–140% = HIGH
    // Above 140% = CRITICAL
    let level = OVERLOAD_LEVELS.LOW;
    if (loadRatioPercent > 140) {
      level = OVERLOAD_LEVELS.CRITICAL;
    } else if (loadRatioPercent >= 100) {
      level = OVERLOAD_LEVELS.HIGH;
    } else if (loadRatioPercent >= 70) {
      level = OVERLOAD_LEVELS.MEDIUM;
    } else {
      level = OVERLOAD_LEVELS.LOW;
    }

    // 5. Short-term immediate analysis (next 48 hours)
    const now = new Date();
    const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const immediateTasks = activeTasks.filter(t => new Date(t.dueDate) <= next48Hours);
    const immediateHours = immediateTasks.reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 1.0), 0);
    const immediateCapacity = dailyAvailableHours * 2;
    const isImmediateOverloaded = immediateHours > immediateCapacity;

    // If 48h window is in severe deficit, escalate to at least HIGH
    if (isImmediateOverloaded && level === OVERLOAD_LEVELS.LOW) {
      level = OVERLOAD_LEVELS.MEDIUM;
    }

    // Visual Meter bar fill (capped at 100%)
    const meterFillPercent = Math.min(100, Math.max(8, Math.round(loadRatioPercent)));

    return {
      totalPendingHours: roundTo(totalPendingHours, 1),
      availableCapacity: roundTo(availableCapacity, 1),
      dailyAvailableHours: roundTo(dailyAvailableHours, 1),
      planningDays,
      capacityDifference: roundTo(capacityDifference, 1),
      loadRatioPercent: Math.round(loadRatioPercent),
      overloadPercent: roundTo(overloadPercent, 1),
      level,
      isOverloaded: level.key === 'CRITICAL' || level.key === 'HIGH',
      meterFillPercent,
      activeTaskCount: activeTasks.length,
      immediateHours: roundTo(immediateHours, 1),
      immediateCapacity: roundTo(immediateCapacity, 1),
      immediateTaskCount: immediateTasks.length
    };
  }
}
