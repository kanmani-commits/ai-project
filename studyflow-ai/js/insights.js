/**
 * StudyFlow AI - Smart Study Insights & Local AI Assistant
 * Project Better Tomorrow
 * Rule-based heuristic intelligence grounded in live student application state
 */

import { state } from './state.js';
import { SubjectManager } from './subjects.js';
import { WorkloadEngine } from './workload.js';
import { PriorityEngine } from './tasks.js';

export class InsightsEngine {
  /**
   * Generates dynamic rule-based insights from real student data
   */
  static generateInsights() {
    const insights = [];
    const activeTasks = state.getActiveTasks();
    const completedTasks = state.getCompletedTasks();
    const workload = WorkloadEngine.analyze();
    const subjects = SubjectManager.getSubjectStatistics();

    const now = new Date();
    const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // 1. Critical Deadline Proximity (next 48h)
    const urgentTasks = activeTasks.filter(t => new Date(t.dueDate) <= next48Hours);
    if (urgentTasks.length > 0) {
      const topUrgent = urgentTasks[0];
      insights.push({
        type: 'urgent',
        icon: '⏳',
        title: `${urgentTasks.length} Urgent Deliverables Due in 48h`,
        text: `You have ${urgentTasks.length} tasks due soon. Prioritize "${topUrgent.title}" (${topUrgent.subject}) first to avoid deadline pressure.`
      });
    }

    // 2. Subject Time Dominance
    const sortedSubjects = [...subjects].sort((a, b) => b.pendingHours - a.pendingHours);
    if (sortedSubjects.length > 0 && sortedSubjects[0].pendingHours >= 3) {
      const top = sortedSubjects[0];
      insights.push({
        type: 'subject',
        icon: '📚',
        title: `${top.name} Consumes the Highest Workload`,
        text: `You have ~${top.pendingHours} hours of unfinished work in ${top.name}. Allocate dedicated 50-minute blocks to tackle this course.`
      });
    }

    // 3. Workload Capacity Insight
    if (workload.isOverloaded) {
      insights.push({
        type: 'overload',
        icon: '⚠️',
        title: 'Academic Overload Detected',
        text: `You currently have ${workload.totalPendingHours}h of work competing for ${workload.dailyAvailableHours}h daily capacity. Use "↻ Reschedule My Day" to balance your days.`
      });
    } else {
      insights.push({
        type: 'capacity',
        icon: '✨',
        title: 'Study Capacity is Balanced',
        text: `You have sufficient study capacity (${workload.availableCapacity}h over the next ${workload.planningDays} days) to finish all current deliverables comfortably.`
      });
    }

    // 4. Study Momentum / Completed Velocity
    if (completedTasks.length > 0) {
      insights.push({
        type: 'streak',
        icon: '🎯',
        title: 'Productive Momentum',
        text: `You have completed ${completedTasks.length} academic tasks so far. Keep your study streak active with a 25-minute Pomodoro session today.`
      });
    }

    return insights;
  }
}

export class AIAssistantService {
  /**
   * Processes a user question and returns a grounded response based on actual data
   */
  static async ask(question) {
    const q = (question || '').toLowerCase().trim();
    const activeTasks = state.getActiveTasks()
      .map(t => ({ ...t, priorityData: PriorityEngine.calculateScore(t) }))
      .sort((a, b) => b.priorityData.score - a.priorityData.score);
    const workload = WorkloadEngine.analyze();
    const profile = state.profile;

    // 1. "What should I study first?" / "Which task should I complete first?"
    if (q.includes('what should i study first') || q.includes('which task') || q.includes('first')) {
      if (activeTasks.length === 0) {
        return 'You have no pending academic tasks! All your deliverables are marked completed. Take a well-deserved break or review next week’s syllabus.';
      }
      const top = activeTasks[0];
      return `Start with your **${top.title}** (${top.subject})! It has a **${top.priorityData.tier.label} priority score of ${top.priorityData.score}/100** because: ${top.priorityData.explanation}. Estimated effort is ${top.estimatedHours} hours.`;
    }

    // 2. "Am I overloaded?" / "Is my workload too much?"
    if (q.includes('overloaded') || q.includes('workload') || q.includes('too much') || q.includes('manageable')) {
      if (workload.isOverloaded) {
        return `⚠️ **Yes, you are currently overloaded (${workload.level.meterLabel} status)**. You have **${workload.totalPendingHours} hours** of pending deliverables, which exceeds your planned daily capacity of **${workload.dailyAvailableHours} hours/day**. I recommend clicking **"↻ Reschedule My Day"** to redistribute low-priority tasks into later sessions.`;
      }
      return `🟢 **Your workload is currently manageable (${workload.level.meterLabel} status)**. You have **${workload.totalPendingHours} hours** of pending tasks across your ${workload.planningDays}-day planning window with **${workload.dailyAvailableHours} hours/day** available. You can complete all tasks on time if you adhere to your study schedule!`;
    }

    // 3. "How should I study today?" / "Plan for today"
    if (q.includes('how should i study today') || q.includes('today') || q.includes('plan')) {
      if (activeTasks.length === 0) {
        return 'Today is free from urgent deadlines! You can spend 25 minutes reviewing notes or preparing upcoming materials.';
      }
      const topTwo = activeTasks.slice(0, 2);
      const taskNames = topTwo.map(t => `"${t.title}" (${t.subject}, ~${t.estimatedHours}h)`).join(' and ');
      return `For today, focus strictly on **${taskNames}**. Study in **50-minute focused sessions** separated by **10-minute restoration breaks**. Do not study more than your planned **${profile.dailyAvailableHours} hours** to prevent cognitive fatigue!`;
    }

    // 4. "How much time do I need?" / "Total hours"
    if (q.includes('how much time') || q.includes('hours') || q.includes('time needed')) {
      const activeCount = activeTasks.length;
      const daysNeeded = Math.ceil(workload.totalPendingHours / (profile.dailyAvailableHours || 4));
      return `You currently have **${activeCount} pending tasks** totaling **${workload.totalPendingHours} estimated study hours**. At your pace of **${profile.dailyAvailableHours} hours/day**, you will need approximately **${daysNeeded} dedicated study days** to finish everything.`;
    }

    // Default intelligent fallback
    if (activeTasks.length > 0) {
      const top = activeTasks[0];
      return `Based on your live academic data: You have ${workload.totalPendingHours}h of pending workload across ${activeTasks.length} tasks. Your highest priority item is "${top.title}" (${top.subject}). Would you like to schedule it, start a 25-minute Pomodoro session, or check your workload meter?`;
    }

    return 'Your academic workspace is completely up to date. You can add new tasks, configure subjects in Settings, or run the Smart Schedule Generator at any time.';
  }
}
