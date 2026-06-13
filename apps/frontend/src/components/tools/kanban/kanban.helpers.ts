export type KanbanColumnKey = 'draft' | 'scheduled' | 'published' | 'error';

export type KanbanPostState = 'DRAFT' | 'QUEUE' | 'PUBLISHED' | 'ERROR';

export type KanbanTransitionKind =
  | 'noop'
  | 'schedule'
  | 'publish_now'
  | 'move_to_draft'
  | 'reschedule'
  | 'invalid';

export type KanbanWorkflowTarget = KanbanColumnKey | 'publish_now';

export interface KanbanTransition {
  kind: KanbanTransitionKind;
  target?: KanbanWorkflowTarget;
  requiresDate: boolean;
  requiresConfirm: boolean;
  title: string;
  description: string;
  submitLabel: string;
}

export const KANBAN_COLUMNS: Array<{ state: KanbanColumnKey; label: string }> = [
  { state: 'draft', label: 'Draft' },
  { state: 'scheduled', label: 'Scheduled' },
  { state: 'published', label: 'Published' },
  { state: 'error', label: 'Error' },
];

export const normalizePostState = (state: string): KanbanPostState => {
  const upper = state.toUpperCase();
  if (upper === 'DRAFT') return 'DRAFT';
  if (upper === 'QUEUE' || upper === 'SCHEDULED') return 'QUEUE';
  if (upper === 'PUBLISHED') return 'PUBLISHED';
  if (upper === 'ERROR') return 'ERROR';
  return 'DRAFT';
};

export const canDragPost = (postState: string): boolean => {
  const state = normalizePostState(postState);
  return state === 'DRAFT' || state === 'QUEUE' || state === 'ERROR';
};

/** Backward-compatible alias used by kanban.view.tsx */
export const canDrag = canDragPost;

const transition = (
  kind: KanbanTransitionKind,
  target?: KanbanWorkflowTarget,
  title?: string,
  description?: string,
  submitLabel?: string,
  requiresDate = false,
  requiresConfirm = false
): KanbanTransition => ({
  kind,
  target,
  requiresDate,
  requiresConfirm,
  title: title ?? 'No change',
  description: description ?? '',
  submitLabel: submitLabel ?? 'Close',
});

export const getKanbanTransition = (
  postState: string,
  column: KanbanColumnKey
): KanbanTransition => {
  const state = normalizePostState(postState);

  if (state === 'DRAFT') {
    if (column === 'draft') return transition('noop');
    if (column === 'scheduled') return transition('schedule', 'scheduled', 'Schedule draft', 'Choose when this group should be published.', 'Schedule', true, true);
    if (column === 'published') return transition('publish_now', 'publish_now', 'Publish now', 'This group will start publishing immediately on its connected channels.', 'Publish now', false, true);
    return transition('invalid', undefined, 'Move not allowed', 'Drafts cannot be moved to Error manually.', 'Close');
  }

  if (state === 'QUEUE') {
    if (column === 'draft') return transition('move_to_draft', 'draft', 'Move to draft', 'This group will leave the publishing queue.', 'Move to draft', false, true);
    if (column === 'scheduled') return transition('reschedule', 'scheduled', 'Reschedule post', 'Choose a new publishing date for this group.', 'Reschedule', true, true);
    if (column === 'published') return transition('publish_now', 'publish_now', 'Publish now', 'This scheduled group will start publishing immediately.', 'Publish now', false, true);
    return transition('invalid', undefined, 'Move not allowed', 'Scheduled posts cannot be moved to Error manually.', 'Close');
  }

  if (state === 'ERROR') {
    if (column === 'draft') return transition('move_to_draft', 'draft', 'Move error to draft', 'Move this failed group back to drafts for correction.', 'Move to draft', false, true);
    if (column === 'scheduled') return transition('schedule', 'scheduled', 'Schedule retry', 'Choose when this failed group should retry publishing.', 'Schedule retry', true, true);
    if (column === 'published') return transition('publish_now', 'publish_now', 'Retry and publish now', 'This failed group will retry publishing immediately.', 'Retry now', false, true);
    if (column === 'error') return transition('noop');
    return transition('invalid', undefined, 'Move not allowed', 'This move is not allowed.', 'Close');
  }

  if (state === 'PUBLISHED') {
    if (column === 'published') return transition('noop');
    return transition('invalid', undefined, 'Move not allowed', 'Published posts cannot be moved.', 'Close');
  }

  return transition('invalid', undefined, 'Move not allowed', 'Unknown post state. Refresh the board and try again.', 'Close');
};

export const getDefaultScheduleDate = (
  post: { publishDate?: string | Date | null }
): string => {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const postDate = post.publishDate;
  if (!postDate) {
    return oneHourFromNow.toISOString();
  }

  const date = typeof postDate === 'string' ? new Date(postDate) : postDate;

  if (isNaN(date.getTime())) {
    return oneHourFromNow.toISOString();
  }

  if (date.getTime() > now.getTime()) {
    return date.toISOString();
  }

  return oneHourFromNow.toISOString();
};

export const canDropOn = (postState: string, column: KanbanColumnKey): boolean => {
  const t = getKanbanTransition(postState, column);
  return t.kind !== 'invalid' && t.kind !== 'noop';
};
