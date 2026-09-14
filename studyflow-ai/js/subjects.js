/**
 * StudyFlow AI - Subject Management Module
 * Project Better Tomorrow
 */

import { state } from './state.js';
import { validateSubject } from './validation.js';
import { generateId, roundTo } from './utils.js';

export const SUBJECT_COLOR_PALETTE = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Sky Blue', value: '#0ea5e9' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Orange', value: '#f97316' }
];

export class SubjectManager {
  /**
   * Add a new subject
   */
  static addSubject(data) {
    const existing = state.subjects;
    const validation = validateSubject(data, existing);

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const newSubj = {
      id: generateId('subj'),
      name: data.name.trim(),
      code: (data.code || '').trim().toUpperCase(),
      teacher: (data.teacher || '').trim(),
      color: data.color || '#6366f1',
      weeklyTarget: parseFloat(data.weeklyTarget) || 4.0,
      difficulty: data.difficulty || 'Medium',
      createdAt: new Date().toISOString()
    };

    state.addSubject(newSubj);
    return { success: true, subject: newSubj };
  }

  /**
   * Update an existing subject
   */
  static updateSubject(id, data) {
    const existing = state.subjects;
    const validation = validateSubject(data, existing, id);

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const updated = state.updateSubject(id, {
      name: data.name.trim(),
      code: (data.code || '').trim().toUpperCase(),
      teacher: (data.teacher || '').trim(),
      color: data.color,
      weeklyTarget: parseFloat(data.weeklyTarget) || 4.0,
      difficulty: data.difficulty || 'Medium'
    });

    if (!updated) {
      return { success: false, errors: ['Subject not found.'] };
    }

    return { success: true, subject: updated };
  }

  /**
   * Delete subject
   */
  static deleteSubject(id) {
    const subj = state.getSubjectById(id);
    if (!subj) return { success: false, error: 'Subject not found.' };

    const tasks = state.getTasksForSubject(subj.name);
    state.deleteSubject(id);

    return {
      success: true,
      deletedSubject: subj,
      affectedTasksCount: tasks.length
    };
  }

  /**
   * Calculate detailed statistics for all subjects
   */
  static getSubjectStatistics() {
    const subjects = state.subjects;
    const tasks = state.tasks;

    return subjects.map(subj => {
      const subjectTasks = tasks.filter(
        t => (t.subject || '').toLowerCase() === subj.name.toLowerCase()
      );

      const totalTasks = subjectTasks.length;
      const completedTasks = subjectTasks.filter(t => t.status === 'Completed').length;
      const pendingTasks = totalTasks - completedTasks;

      const totalHours = subjectTasks.reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 0), 0);
      const completedHours = subjectTasks
        .filter(t => t.status === 'Completed')
        .reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 0), 0);
      const pendingHours = totalHours - completedHours;

      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...subj,
        totalTasks,
        completedTasks,
        pendingTasks,
        totalHours: roundTo(totalHours, 1),
        completedHours: roundTo(completedHours, 1),
        pendingHours: roundTo(pendingHours, 1),
        progressPercent
      };
    });
  }
}
