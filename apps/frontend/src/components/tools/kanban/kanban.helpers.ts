export type KanbanColumnKey = 'draft' | 'scheduled' | 'published' | 'error';

export const KANBAN_COLUMNS: Array<{ state: KanbanColumnKey; label: string }> = [
  { state: 'draft', label: 'Draft' },
  { state: 'scheduled', label: 'Scheduled' },
  { state: 'published', label: 'Published' },
  { state: 'error', label: 'Error' },
];

export const canDrag = (postState: string) => postState === 'QUEUE';
export const canDropOn = (postState: string, column: KanbanColumnKey) =>
  postState === 'QUEUE' && column === 'scheduled';
