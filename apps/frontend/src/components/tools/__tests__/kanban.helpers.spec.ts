import { describe, it, expect } from 'vitest';
import { canDrag, canDropOn, KANBAN_COLUMNS } from '../kanban/kanban.helpers';

describe('kanban rules', () => {
  it('defines 4 columns in order', () => {
    expect(KANBAN_COLUMNS.map((c) => c.state)).toEqual([
      'draft',
      'scheduled',
      'published',
      'error',
    ]);
  });

  it('only QUEUE posts are draggable', () => {
    expect(canDrag('QUEUE')).toBe(true);
    expect(canDrag('DRAFT')).toBe(false);
    expect(canDrag('PUBLISHED')).toBe(false);
    expect(canDrag('ERROR')).toBe(false);
  });

  it('QUEUE posts can only drop on scheduled column', () => {
    expect(canDropOn('QUEUE', 'scheduled')).toBe(true);
    expect(canDropOn('QUEUE', 'draft')).toBe(false);
    expect(canDropOn('QUEUE', 'published')).toBe(false);
  });
});
