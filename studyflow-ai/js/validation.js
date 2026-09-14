/**
 * StudyFlow AI - Validation Module
 * Project Better Tomorrow
 */

export const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Very Hard'];
export const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const VALID_TASK_TYPES = [
  'Assignment',
  'Exam',
  'Project',
  'Lab',
  'Revision',
  'Presentation',
  'Other'
];

/**
 * Validates a task object
 */
export function validateTask(task) {
  const errors = [];
  const warnings = [];

  if (!task || typeof task !== 'object') {
    return { isValid: false, errors: ['Invalid task data provided.'], warnings };
  }

  // 1. Title validation
  if (!task.title || !task.title.trim()) {
    errors.push('Task title is required.');
  } else if (task.title.trim().length > 150) {
    errors.push('Task title must be under 150 characters.');
  }

  // 2. Subject validation
  if (!task.subject || !task.subject.trim()) {
    errors.push('Subject name is required.');
  }

  // 3. Due date validation
  if (!task.dueDate) {
    errors.push('Due date is required.');
  } else {
    const d = new Date(task.dueDate);
    if (isNaN(d.getTime())) {
      errors.push('Due date must be a valid date and time.');
    } else if (d < new Date() && task.status !== 'Completed') {
      warnings.push('This task deadline is in the past (marked as Overdue).');
    }
  }

  // 4. Estimated hours validation
  const hours = parseFloat(task.estimatedHours);
  if (isNaN(hours) || hours <= 0) {
    errors.push('Estimated hours must be greater than 0.');
  } else if (hours > 24) {
    errors.push('Single task estimated effort cannot exceed 24 hours. Consider breaking it down.');
  }

  // 5. Difficulty validation
  if (task.difficulty && !VALID_DIFFICULTIES.includes(task.difficulty)) {
    errors.push(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}.`);
  }

  // 6. Priority validation
  if (task.priority && !VALID_PRIORITIES.includes(task.priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a subject object
 */
export function validateSubject(subject, existingSubjects = [], currentSubjectId = null) {
  const errors = [];

  if (!subject || typeof subject !== 'object') {
    return { isValid: false, errors: ['Invalid subject data provided.'] };
  }

  // 1. Name validation
  const name = (subject.name || '').trim();
  if (!name) {
    errors.push('Subject name is required.');
  } else {
    // Duplicate check
    const isDuplicate = existingSubjects.some(
      s => s.name.toLowerCase() === name.toLowerCase() && s.id !== currentSubjectId
    );
    if (isDuplicate) {
      errors.push(`Subject "${name}" already exists.`);
    }
  }

  // 2. Weekly target validation
  const target = parseFloat(subject.weeklyTarget);
  if (isNaN(target) || target <= 0) {
    errors.push('Weekly study target must be greater than 0 hours.');
  } else if (target > 50) {
    errors.push('Weekly target cannot exceed 50 hours.');
  }

  // 3. Color validation
  if (!subject.color || !subject.color.trim()) {
    errors.push('Subject accent color is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates student profile and routine settings
 */
export function validateProfile(profile) {
  const errors = [];

  if (!profile || typeof profile !== 'object') {
    return { isValid: false, errors: ['Invalid profile data provided.'] };
  }

  if (!profile.name || !profile.name.trim()) {
    errors.push('Student name is required.');
  }

  const hours = parseFloat(profile.dailyAvailableHours);
  if (isNaN(hours) || hours <= 0) {
    errors.push('Daily available study hours must be greater than 0.');
  } else if (hours > 16) {
    errors.push('Daily available study hours cannot exceed 16 hours for student well-being.');
  }

  if (!profile.preferredStartTime) {
    errors.push('Preferred study start time is required.');
  }
  if (!profile.preferredEndTime) {
    errors.push('Preferred study end time is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
