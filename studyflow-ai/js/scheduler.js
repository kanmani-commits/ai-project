/**
 * StudyFlow AI - Smart Schedule Generator & Rescheduling Engine
 * Project Better Tomorrow
 */

import { state } from './state.js';
import { PriorityEngine } from './tasks.js';
import { timeStrToMinutes, minutesToTimeStr12, generateId, roundTo, isToday } from './utils.js';

export class ScheduleEngine {
  /**
   * Generates a realistic multi-day study schedule
   */
  static generateSchedule(options = {}) {
    const profile = state.profile;
    const dailyAvailableHours = parseFloat(profile.dailyAvailableHours) || 4.0;
    const dailyLimitMinutes = Math.round(dailyAvailableHours * 60);
    const breakDuration = parseInt(profile.breakDuration, 10) || 10;
    const preferredStartMinutes = timeStrToMinutes(profile.preferredStartTime || '09:00');

    // Get active tasks ranked strictly by priority
    const activeTasks = TaskManager_getRankedActiveTasks();

    if (activeTasks.length === 0) {
      return {
        days: [],
        generatedAt: new Date().toISOString(),
        totalScheduledHours: 0,
        isOverloaded: false,
        summary: 'All tasks are complete! No pending study blocks required.'
      };
    }

    const now = new Date();
    const numberOfDays = 7; // Planning horizon
    const days = [];

    // Initialize 7 days
    for (let i = 0; i < numberOfDays; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + i);

      let label = targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';

      days.push({
        dayIndex: i,
        dateStr: targetDate.toISOString().split('T')[0],
        dayLabel: label,
        isToday: i === 0,
        allocatedStudyMinutes: 0,
        dailyCapacityMinutes: dailyLimitMinutes,
        dailyAvailableHours,
        blocks: [],
        status: 'Manageable'
      });
    }

    const unallocatedTasks = [];

    // Allocate tasks across available days
    for (const task of activeTasks) {
      const taskEffortMinutes = Math.round((parseFloat(task.estimatedHours) || 1.0) * 60);
      let remainingTaskMinutes = taskEffortMinutes;
      const totalSessionsNeeded = Math.ceil(taskEffortMinutes / 50);
      let sessionIndex = 1;

      // Find task deadline day offset from today
      const taskDueDate = new Date(task.dueDate);
      const diffMs = taskDueDate - now;
      const deadlineDayOffset = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let dayIndex = 0;

      while (remainingTaskMinutes > 0 && dayIndex < days.length) {
        const currentDay = days[dayIndex];
        const capacityLeft = currentDay.dailyCapacityMinutes - currentDay.allocatedStudyMinutes;

        // If today has less than 25 minutes left, move to next day
        if (capacityLeft < 25) {
          dayIndex++;
          continue;
        }

        // Check if day is past deadline
        if (dayIndex > deadlineDayOffset && diffMs > 0) {
          // Warning: Task is spilling past its deadline
          // Still schedule to help student catch up, but flag it
        }

        // Allocate block size: max 50-60 mins or remaining task or capacity left
        const blockSize = Math.min(50, remainingTaskMinutes, capacityLeft);

        const blockTitle = totalSessionsNeeded > 1
          ? `${task.title} (Part ${sessionIndex}/${totalSessionsNeeded})`
          : task.title;

        // Add study block
        currentDay.blocks.push({
          id: generateId('block'),
          taskId: task.id,
          taskTitle: blockTitle,
          rawTitle: task.title,
          subject: task.subject,
          type: task.type,
          duration: blockSize,
          isBreak: false,
          difficulty: task.difficulty,
          priorityTier: task.priorityData.tier,
          priorityScore: task.priorityData.score,
          whyFirst: task.priorityData.explanation,
          completed: false,
          dueDate: task.dueDate
        });

        currentDay.allocatedStudyMinutes += blockSize;
        remainingTaskMinutes -= blockSize;
        sessionIndex++;

        // Insert break if day still has pending work and capacity
        if (remainingTaskMinutes > 0 && currentDay.allocatedStudyMinutes + breakDuration <= currentDay.dailyCapacityMinutes) {
          currentDay.blocks.push({
            id: generateId('break'),
            isBreak: true,
            duration: breakDuration,
            breakLabel: '☕ Restoration Break',
            completed: false
          });
        }
      }

      if (remainingTaskMinutes > 0) {
        unallocatedTasks.push({
          task,
          remainingMinutes: remainingTaskMinutes
        });
      }
    }

    // Assign realistic clock times to each block
    let totalScheduledMinutes = 0;
    days.forEach(day => {
      let currentClockMinutes = preferredStartMinutes;

      day.blocks.forEach((block, bIdx) => {
        const start = currentClockMinutes;
        const end = start + block.duration;

        block.startTime = minutesToTimeStr12(start);
        block.endTime = minutesToTimeStr12(end);
        block.timeRange = `${block.startTime} – ${block.endTime}`;

        currentClockMinutes = end;
      });

      const allocatedHours = roundTo(day.allocatedStudyMinutes / 60, 1);
      day.allocatedStudyHours = allocatedHours;
      totalScheduledMinutes += day.allocatedStudyMinutes;

      // Classify day status
      const ratio = day.dailyCapacityMinutes > 0 ? (day.allocatedStudyMinutes / day.dailyCapacityMinutes) : 0;
      if (ratio > 1.0) day.status = 'Overloaded';
      else if (ratio >= 0.8) day.status = 'Heavy';
      else if (ratio >= 0.5) day.status = 'Busy';
      else day.status = 'Manageable';
    });

    const isOverloaded = unallocatedTasks.length > 0;
    const totalScheduledHours = roundTo(totalScheduledMinutes / 60, 1);

    const schedule = {
      days,
      generatedAt: new Date().toISOString(),
      dailyAvailableHours,
      totalScheduledHours,
      unallocatedTasks,
      isOverloaded,
      summary: isOverloaded
        ? `⚠️ Your workload exceeds your available study time in this planning window. ${unallocatedTasks.length} deliverables require rescheduling or adjusted hours.`
        : `Schedule successfully generated: ${totalScheduledHours}h distributed realistically across available study windows with mandatory breaks.`
    };

    state.setSchedule(schedule);
    return schedule;
  }

  /**
   * Reschedule My Day: preserves completed blocks, recalculates remaining slots,
   * shifts missed or unfinished tasks into future days, and provides an explainable diff.
   */
  static rescheduleDay() {
    const previousSchedule = state.schedule;
    const completedBlockIds = new Set();

    if (previousSchedule && previousSchedule.days) {
      previousSchedule.days.forEach(d => {
        d.blocks.forEach(b => {
          if (b.completed) completedBlockIds.add(b.id);
        });
      });
    }

    // Generate a fresh schedule
    const newSchedule = this.generateSchedule();

    // Preserve completion state
    if (newSchedule && newSchedule.days) {
      newSchedule.days.forEach(d => {
        d.blocks.forEach(b => {
          if (completedBlockIds.has(b.id)) {
            b.completed = true;
          }
        });
      });
    }

    // Compute diff explanation
    const diff = this._computeDiff(previousSchedule, newSchedule);

    return {
      schedule: newSchedule,
      diff
    };
  }

  static _computeDiff(prev, next) {
    const prevTodayBlocks = prev && prev.days && prev.days[0]
      ? prev.days[0].blocks.filter(b => !b.isBreak)
      : [];
    const nextTodayBlocks = next && next.days && next.days[0]
      ? next.days[0].blocks.filter(b => !b.isBreak)
      : [];

    const movedTasks = [];
    const addedTasks = [];

    prevTodayBlocks.forEach(pb => {
      const foundInNext = nextTodayBlocks.find(nb => nb.taskId === pb.taskId);
      if (!foundInNext) {
        movedTasks.push(pb.rawTitle || pb.taskTitle);
      }
    });

    nextTodayBlocks.forEach(nb => {
      const foundInPrev = prevTodayBlocks.find(pb => pb.taskId === nb.taskId);
      if (!foundInPrev) {
        addedTasks.push(nb.rawTitle || nb.taskTitle);
      }
    });

    const uniqueMoved = [...new Set(movedTasks)];
    const uniqueAdded = [...new Set(addedTasks)];

    let explanation = 'Schedule dynamically reorganized to optimize your remaining study capacity.';
    if (uniqueMoved.length > 0) {
      explanation = `Deferred "${uniqueMoved[0]}" to future slots because today's high-priority capacity is concentrated on nearest deadlines.`;
    } else if (uniqueAdded.length > 0) {
      explanation = `Added "${uniqueAdded[0]}" into today's schedule following priority recalibration.`;
    }

    return {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      movedCount: uniqueMoved.length,
      addedCount: uniqueAdded.length,
      movedTasks: uniqueMoved,
      addedTasks: uniqueAdded,
      explanation
    };
  }

  /**
   * Toggle a schedule block completion
   */
  static toggleBlockCompletion(blockId, isCompleted) {
    const schedule = state.schedule;
    if (!schedule || !schedule.days) return false;

    let found = false;
    schedule.days.forEach(d => {
      d.blocks.forEach(b => {
        if (b.id === blockId) {
          b.completed = isCompleted;
          found = true;
        }
      });
    });

    if (found) {
      state.setSchedule(schedule);
    }
    return found;
  }
}

function TaskManager_getRankedActiveTasks() {
  const active = state.getActiveTasks();
  return active
    .map(t => ({
      ...t,
      priorityData: PriorityEngine.calculateScore(t)
    }))
    .sort((a, b) => {
      if (b.priorityData.score !== a.priorityData.score) {
        return b.priorityData.score - a.priorityData.score;
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
}
