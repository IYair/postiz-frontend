import { describe, it, expect, vi } from 'vitest';
import {
  KANBAN_COLUMNS,
  canDragPost,
  getKanbanTransition,
  getDefaultScheduleDate,
} from '../kanban/kanban.helpers';

describe('kanban helpers', () => {
  it('KANBAN_COLUMNS defines 4 columns in order', () => {
    expect(KANBAN_COLUMNS.map((c) => c.state)).toEqual([
      'draft',
      'scheduled',
      'published',
      'error',
    ]);
  });

  it('canDragPost allows drag for DRAFT, QUEUE, ERROR and blocks PUBLISHED', () => {
    expect(canDragPost('DRAFT')).toBe(true);
    expect(canDragPost('QUEUE')).toBe(true);
    expect(canDragPost('ERROR')).toBe(true);
    expect(canDragPost('PUBLISHED')).toBe(false);
  });

  it('getKanbanTransition covers all matrix scenarios', () => {
    // DRAFT
    expect(getKanbanTransition('DRAFT', 'draft').kind).toBe('noop');
    expect(getKanbanTransition('DRAFT', 'scheduled').kind).toBe('schedule');
    expect(getKanbanTransition('DRAFT', 'published').kind).toBe('publish_now');
    expect(getKanbanTransition('DRAFT', 'error').kind).toBe('invalid');

    // QUEUE
    expect(getKanbanTransition('QUEUE', 'draft').kind).toBe('move_to_draft');
    expect(getKanbanTransition('QUEUE', 'scheduled').kind).toBe('reschedule');
    expect(getKanbanTransition('QUEUE', 'published').kind).toBe('publish_now');
    expect(getKanbanTransition('QUEUE', 'error').kind).toBe('invalid');

    // ERROR
    expect(getKanbanTransition('ERROR', 'draft').kind).toBe('move_to_draft');
    expect(getKanbanTransition('ERROR', 'scheduled').kind).toBe('schedule');
    expect(getKanbanTransition('ERROR', 'published').kind).toBe('publish_now');
    expect(getKanbanTransition('ERROR', 'error').kind).toBe('noop');

    // PUBLISHED
    expect(getKanbanTransition('PUBLISHED', 'draft').kind).toBe('invalid');
    expect(getKanbanTransition('PUBLISHED', 'scheduled').kind).toBe('invalid');
    expect(getKanbanTransition('PUBLISHED', 'published').kind).toBe('noop');
    expect(getKanbanTransition('PUBLISHED', 'error').kind).toBe('invalid');
  });

  it('getDefaultScheduleDate uses future post date if present, otherwise now+1h', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const future = new Date('2024-01-02T10:00:00Z');
    expect(getDefaultScheduleDate({ publishDate: future })).toBe(future.toISOString());

    const expected = new Date('2024-01-01T13:00:00Z').toISOString();
    expect(getDefaultScheduleDate({})).toBe(expected);
    expect(getDefaultScheduleDate({ publishDate: null })).toBe(expected);
    expect(getDefaultScheduleDate({ publishDate: undefined })).toBe(expected);

    vi.useRealTimers();
  });
});
