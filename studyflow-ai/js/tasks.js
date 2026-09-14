/**
 * StudyFlow AI - Task Management & Priority Engine
 * Project Better Tomorrow
 */

import { state } from './state.js';
import { validateTask } from './validation.js';
import { generateId, isToday, isThisWeek, roundTo, getRelativeDeadline } from './utils.js';

export const PRIORITY_TIERS = {
  CRITICAL: { label: 'Critical', min: 76, max: 100, color: '#ef4444', badgeClass: 'badge-critical' },
  HIGH:     { label: 'High',     min: 51, max: 75,  color: '#f97316', badgeClass: 'badge-high' },
  MEDIUM:   { label: 'Medium',   min: 26, max: 50,  color: '#f59e0b', badgeClass: 'badge-medium' },
  LOW:      { label: 'Low',      min: 0,  max: 25,  color: '#10b981', badgeClass: 'badge-low' }
};

export class PriorityEngine {
  /**
   * Calculates dynamic multi-factor priority score (0-100) and human-readable reasoning
   */
  static calculateScore(task) {
    if (!task) return { score: 0, tier: PRIORITY_TIERS.LOW, explanation: 'No task data' };

    if (task.status === 'Completed') {
      return {
        score: 0,
        tier: PRIORITY_TIERS.LOW,
        isOverdue: false,
        explanation: 'Completed task. No pending study required.'
      };
    }

    const now = new Date();
    const deadline = new Date(task.dueDate);
    const diffMs = deadline - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    let deadlineWeight = 5;
    let isOverdue = false;

    // 1. Deadline Urgency (max 35 pts)
    if (diffMs < 0) {
      isOverdue = true;
      deadlineWeight = 35; // Maximum urgency for overdue
    } else if (diffHours <= 24) {
      deadlineWeight = 35;
    } else if (diffHours <= 48) {
      deadlineWeight = 28;
    } else if (diffDays <= 3) {
      deadlineWeight = 20;
    } else if (diffDays <= 7) {
      deadlineWeight = 12;
    } else {
      deadlineWeight = 5;
    }

    // 2. Difficulty Weight (max 20 pts)
    let difficultyWeight = 10;
    const diff = (task.difficulty || 'Medium').toLowerCase();
    if (diff === 'very hard') difficultyWeight = 20;
    else if (diff === 'hard') difficultyWeight = 15;
    else if (diff === 'medium') difficultyWeight = 10;
    else if (diff === 'easy') difficultyWeight = 5;

    // 3. Effort Weight (max 20 pts)
    let effortWeight = 8;
    const hours = parseFloat(task.estimatedHours) || 1.0;
    if (hours >= 4.0) effortWeight = 20;
    else if (hours >= 3.0) effortWeight = 16;
    else if (hours >= 2.0) effortWeight = 12;
    else if (hours >= 1.0) effortWeight = 8;
    else effortWeight = 4;

    // 4. Academic Importance Weight (max 25 pts)
    let importanceWeight = 10;
    const imp = (task.priority || 'Medium').toLowerCase();
    if (imp === 'critical') importanceWeight = 25;
    else if (imp === 'high') importanceWeight = 18;
    else if (imp === 'medium') importanceWeight = 10;
    else if (imp === 'low') importanceWeight = 5;

    // 5. Type & Proximity Risk Bonus
    let riskBonus = 0;
    if (task.type === 'Exam') riskBonus += 5;
    if (task.type === 'Project') riskBonus += 3;
    if (diffHours <= 48 && hours >= 3) riskBonus += 5; // Heavy task due soon
    if (isOverdue) riskBonus += 10;

    // Total raw score and normalize to 0-100
    const rawScore = deadlineWeight + difficultyWeight + effortWeight + importanceWeight + riskBonus;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Categorize
    let tier = PRIORITY_TIERS.LOW;
    if (score >= 76) tier = PRIORITY_TIERS.CRITICAL;
    else if (score >= 51) tier = PRIORITY_TIERS.HIGH;
    else if (score >= 26) tier = PRIORITY_TIERS.MEDIUM;

    // Build human-readable reason
    const explanation = this.generateExplanation(task, {
      score,
      tier,
      isOverdue,
      diffHours,
      diffDays,
      hours
    });

    return {
      score,
      tier,
      isOverdue,
      explanation
    };
  }

  static generateExplanation(task, meta) {
    let deadlineStr = '';
    if (meta.isOverdue) {
      deadlineStr = 'deadline passed (overdue)';
    } else if (meta.diffHours <= 24) {
      deadlineStr = 'due in less than 24 hours';
    } else if (meta.diffHours <= 48) {
      deadlineStr = 'due tomorrow';
    } else {
      deadlineStr = `due in ${Math.ceil(meta.diffDays)} days`;
    }

    const diffStr = (task.difficulty || 'Medium').toLowerCase();
    const effortStr = `estimated ${meta.hours} ${meta.hours === 1 ? 'hour' : 'hours'}`;

    return `${meta.tier.label} Priority — ${deadlineStr}, ${diffStr} difficulty, ${effortStr}.`;
  }
}

export class TaskManager {
  /**
   * Add a new task
   */
  static addTask(data) {
    const validation = validateTask(data);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const newTask = {
      id: generateId('task'),
      title: data.title.trim(),
      subject: data.subject.trim(),
      type: data.type || 'Assignment',
      dueDate: new Date(data.dueDate).toISOString(),
      estimatedHours: roundTo(parseFloat(data.estimatedHours) || 1.0, 1),
      difficulty: data.difficulty || 'Medium',
      priority: data.priority || 'Medium', // Declared user importance
      status: data.status || 'Not Started',
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    // Immediate overdue check
    if (new Date(newTask.dueDate) < new Date() && newTask.status !== 'Completed') {
      newTask.status = 'Overdue';
    }

    state.addTask(newTask);
    return { success: true, task: newTask, warnings: validation.warnings };
  }

  /**
   * Update an existing task
   */
  static updateTask(id, data) {
    const existing = state.tasks.find(t => t.id === id);
    if (!existing) return { success: false, errors: ['Task not found.'] };

    const validation = validateTask(data);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const updated = state.updateTask(id, {
      title: data.title.trim(),
      subject: data.subject.trim(),
      type: data.type || existing.type,
      dueDate: new Date(data.dueDate).toISOString(),
      estimatedHours: roundTo(parseFloat(data.estimatedHours) || existing.estimatedHours, 1),
      difficulty: data.difficulty || existing.difficulty,
      priority: data.priority || existing.priority,
      status: data.status || existing.status,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes
    });

    return { success: true, task: updated, warnings: validation.warnings };
  }

  /**
   * Toggle task completion status
   */
  static toggleComplete(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return false;

    if (task.status === 'Completed') {
      // Restore task
      const isPast = new Date(task.dueDate) < new Date();
      state.updateTask(id, {
        status: isPast ? 'Overdue' : 'In Progress',
        completedAt: null
      });
      return { status: 'restored', task };
    } else {
      // Mark complete
      state.updateTask(id, {
        status: 'Completed',
        completedAt: new Date().toISOString()
      });
      return { status: 'completed', task };
    }
  }

  /**
   * Restore a completed task explicitly
   */
  static restoreTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return false;
    const isPast = new Date(task.dueDate) < new Date();
    state.updateTask(id, {
      status: isPast ? 'Overdue' : 'In Progress',
      completedAt: null
    });
    return true;
  }

  /**
   * Delete task
   */
  static deleteTask(id) {
    return state.deleteTask(id);
  }

  /**
   * Get filtered, searched, and sorted tasks with computed priority
   */
  static getProcessedTasks(options = {}) {
    const {
      statusFilter = 'all',
      subjectFilter = 'all',
      typeFilter = 'all',
      difficultyFilter = 'all',
      priorityTierFilter = 'all',
      searchQuery = '',
      sortBy = 'priority'
    } = options;

    let list = [...state.tasks];

    // Compute priority and metadata for each task
    let enriched = list.map(t => {
      const priorityData = PriorityEngine.calculateScore(t);
      const countdown = getRelativeDeadline(t.dueDate);
      return {
        ...t,
        priorityData,
        countdown
      };
    });

    // 1. Status Filter
    if (statusFilter === 'active') {
      enriched = enriched.filter(t => t.status !== 'Completed');
    } else if (statusFilter === 'today') {
      enriched = enriched.filter(t => isToday(t.dueDate) && t.status !== 'Completed');
    } else if (statusFilter === 'this_week') {
      enriched = enriched.filter(t => isThisWeek(t.dueDate) && t.status !== 'Completed');
    } else if (statusFilter === 'in_progress') {
      enriched = enriched.filter(t => t.status === 'In Progress');
    } else if (statusFilter === 'completed') {
      enriched = enriched.filter(t => t.status === 'Completed');
    } else if (statusFilter === 'overdue') {
      enriched = enriched.filter(t => t.status === 'Overdue');
    }

    // 2. Subject Filter
    if (subjectFilter !== 'all') {
      enriched = enriched.filter(t => (t.subject || '').toLowerCase() === subjectFilter.toLowerCase());
    }

    // 3. Type Filter
    if (typeFilter !== 'all') {
      enriched = enriched.filter(t => t.type === typeFilter);
    }

    // 4. Difficulty Filter
    if (difficultyFilter !== 'all') {
      enriched = enriched.filter(t => t.difficulty === difficultyFilter);
    }

    // 5. Priority Tier Filter
    if (priorityTierFilter !== 'all') {
      enriched = enriched.filter(t => t.priorityData.tier.label.toLowerCase() === priorityTierFilter.toLowerCase());
    }

    // 6. Search Query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      enriched = enriched.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // 7. Sorting
    if (sortBy === 'priority') {
      enriched.sort((a, b) => {
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return b.priorityData.score - a.priorityData.score;
      });
    } else if (sortBy === 'due_date') {
      enriched.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else if (sortBy === 'hours_desc') {
      enriched.sort((a, b) => b.estimatedHours - a.estimatedHours);
    } else if (sortBy === 'hours_asc') {
      enriched.sort((a, b) => a.estimatedHours - b.estimatedHours);
    } else if (sortBy === 'title') {
      enriched.sort((a, b) => a.title.localeCompare(b.title));
    }

    return enriched;
  }
}
