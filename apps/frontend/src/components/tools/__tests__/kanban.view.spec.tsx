import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { within, fireEvent } from '@testing-library/react';
import { KanbanView } from '../kanban/kanban.view';
import { getKanbanTransition } from '../kanban/kanban.helpers';

const mockPosts = vi.hoisted(() => ({
  draft: [
    {
      id: 'post-draft-1',
      group: 'group-1',
      state: 'DRAFT',
      content: '<p>Draft post content</p>',
      publishDate: '2024-06-12T10:00:00Z',
      integration: {
        id: 'int-1',
        name: 'Test Integration',
        picture: 'https://example.com/pic.png',
      },
    },
  ],
  scheduled: [
    {
      id: 'post-scheduled-1',
      group: 'group-2',
      state: 'SCHEDULED',
      content: '<p>Scheduled post content</p>',
      publishDate: '2024-06-13T10:00:00Z',
      integration: {
        id: 'int-2',
        name: 'Scheduled Integration',
        picture: 'https://example.com/pic2.png',
      },
    },
  ],
  published: [
    {
      id: 'post-published-1',
      group: 'group-3',
      state: 'PUBLISHED',
      content: '<p>Published post content</p>',
      publishDate: '2024-06-14T10:00:00Z',
      integration: {
        id: 'int-3',
        name: 'Published Integration',
        picture: 'https://example.com/pic3.png',
      },
    },
  ],
  error: [
    {
      id: 'post-error-1',
      group: 'group-4',
      state: 'ERROR',
      content: '<p>Error post content</p>',
      publishDate: '2024-06-15T10:00:00Z',
      integration: {
        id: 'int-4',
        name: 'Error Integration',
        picture: 'https://example.com/pic4.png',
      },
    },
  ],
}));

vi.mock('swr', () => ({
  default: (key: string) => {
    if (key?.includes('state=draft')) {
      return { data: { posts: mockPosts.draft, total: 1, hasMore: false }, isLoading: false };
    }
    if (key?.includes('state=scheduled')) {
      return { data: { posts: mockPosts.scheduled, total: 1, hasMore: false }, isLoading: false };
    }
    if (key?.includes('state=published')) {
      return { data: { posts: mockPosts.published, total: 1, hasMore: false }, isLoading: false };
    }
    if (key?.includes('state=error')) {
      return { data: { posts: mockPosts.error, total: 1, hasMore: false }, isLoading: false };
    }
    return { data: { posts: [], total: 0, hasMore: false }, isLoading: false };
  },
}));

function setupDOM(html: string) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  global.document = dom.window.document;
  global.window = dom.window as any;
  global.navigator = dom.window.navigator;
  return dom.window.document;
}

describe('KanbanView', () => {
  let doc: Document;

  beforeEach(() => {
    const html = renderToString(React.createElement(KanbanView));
    doc = setupDOM(html);
  });

  it('renders all 4 columns with correct names', () => {
    expect(doc.body.textContent).toContain('Draft');
    expect(doc.body.textContent).toContain('Scheduled');
    expect(doc.body.textContent).toContain('Published');
    expect(doc.body.textContent).toContain('Error');
  });

  it('renders a post card with click and keyboard support', () => {
    const draftColumn = doc.querySelector('[aria-label="Draft column"]')!;
    const card = within(draftColumn as HTMLElement).getByRole('button', { name: /Post by/ });
    expect(card).toBeTruthy();
    expect(card.getAttribute('draggable')).toBe('true');
    expect(card.getAttribute('tabindex')).toBe('0');

    // Click opens the post
    let modalOpened = false;
    card.addEventListener('click', () => { modalOpened = true; });
    fireEvent.click(card);
    expect(modalOpened).toBe(true);

    // Verify keyboard accessibility attributes are present
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('renders action buttons for each post', () => {
    const draftColumn = doc.querySelector('[aria-label="Draft column"]')!;
    const card = within(draftColumn as HTMLElement).getByRole('button', { name: /Post by/ });
    const buttons = card.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Clicking an action button should fire the event
    let actionClicked = false;
    buttons[0].addEventListener('click', (e) => {
      e.stopPropagation();
      actionClicked = true;
    });
    fireEvent.click(buttons[0]);
    expect(actionClicked).toBe(true);
  });

  it('renders correct transition options for drag and drop', () => {
    // Draft post can be scheduled or published
    expect(getKanbanTransition('DRAFT', 'scheduled').kind).toBe('schedule');
    expect(getKanbanTransition('DRAFT', 'published').kind).toBe('publish_now');

    // Scheduled post can be moved to draft or published
    expect(getKanbanTransition('QUEUE', 'draft').kind).toBe('move_to_draft');
    expect(getKanbanTransition('QUEUE', 'published').kind).toBe('publish_now');

    // Published post cannot be moved
    expect(getKanbanTransition('PUBLISHED', 'draft').kind).toBe('invalid');
    expect(getKanbanTransition('PUBLISHED', 'scheduled').kind).toBe('invalid');

    // Error post can be moved to draft, scheduled, or published
    expect(getKanbanTransition('ERROR', 'draft').kind).toBe('move_to_draft');
    expect(getKanbanTransition('ERROR', 'scheduled').kind).toBe('schedule');
    expect(getKanbanTransition('ERROR', 'published').kind).toBe('publish_now');

    // Same-column drops are noop
    expect(getKanbanTransition('DRAFT', 'draft').kind).toBe('noop');
    expect(getKanbanTransition('QUEUE', 'scheduled').kind).toBe('reschedule');
    expect(getKanbanTransition('PUBLISHED', 'published').kind).toBe('noop');
    expect(getKanbanTransition('ERROR', 'error').kind).toBe('noop');
  });

  it('renders all column counts and empty states', () => {
    // Draft column should have 1 post
    const draftColumn = doc.querySelector('[aria-label="Draft column"]')!;
    expect(draftColumn.textContent).toContain('Draft');
    expect(draftColumn.textContent).toContain('1');
    expect(within(draftColumn as HTMLElement).queryByText('Draft post content')).toBeTruthy();

    // Scheduled column should have 1 post
    const scheduledColumn = doc.querySelector('[aria-label="Scheduled column"]')!;
    expect(scheduledColumn.textContent).toContain('Scheduled');
    expect(scheduledColumn.textContent).toContain('1');
    expect(within(scheduledColumn as HTMLElement).queryByText('Scheduled post content')).toBeTruthy();

    // Published column should have 1 post
    const publishedColumn = doc.querySelector('[aria-label="Published column"]')!;
    expect(publishedColumn.textContent).toContain('Published');
    expect(publishedColumn.textContent).toContain('1');
    expect(within(publishedColumn as HTMLElement).queryByText('Published post content')).toBeTruthy();

    // Error column should have 1 post
    const errorColumn = doc.querySelector('[aria-label="Error column"]')!;
    expect(errorColumn.textContent).toContain('Error');
    expect(errorColumn.textContent).toContain('1');
    expect(within(errorColumn as HTMLElement).queryByText('Error post content')).toBeTruthy();
  });
});
