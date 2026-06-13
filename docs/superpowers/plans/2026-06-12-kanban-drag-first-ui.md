# Kanban Drag-First UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Kanban cards and transition modal so workflow changes happen through drag-and-drop, cards show only useful information, and social network context is visible on the avatar.

**Architecture:** Keep all behavior inside the existing Kanban component and helpers. Add tiny display helpers only where they keep rendering logic readable, and do not change backend contracts.

**Tech Stack:** Next.js/React client component, Tailwind utility classes, SWR, Vitest, Testing Library/JSDOM SSR-style tests used by existing Kanban tests.

---

### Task 1: Add Display Helpers

**Files:**
- Modify: `apps/frontend/src/components/tools/kanban/kanban.view.tsx`

- [ ] **Step 1: Add small local helpers near `PAGE_SIZE`**

```tsx
const COLUMN_DESCRIPTIONS: Record<string, string> = {
  draft: 'Ideas and posts being edited',
  scheduled: 'Waiting for publish time',
  published: 'Already sent to channels',
  error: 'Needs attention or retry',
};

const STATE_BADGES: Record<string, string> = {
  DRAFT: 'Draft',
  QUEUE: 'Scheduled',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ERROR: 'Error',
};

const SOCIAL_LABELS: Record<string, string> = {
  x: 'X',
  twitter: 'X',
  linkedin: 'in',
  facebook: 'f',
  instagram: 'ig',
  threads: '@',
  youtube: '▶',
  tiktok: '♪',
  pinterest: 'p',
  reddit: 'r',
  bluesky: 'b',
  mastodon: 'm',
};

const getSocialLabel = (post: any): string => {
  const values = [
    post?.integration?.providerIdentifier,
    post?.integration?.provider,
    post?.integration?.identifier,
    post?.integration?.type,
    post?.integration?.name,
  ];

  const value = values
    .find((item) => typeof item === 'string' && item.trim())
    ?.toLowerCase();

  if (!value) return '';

  const key = Object.keys(SOCIAL_LABELS).find((item) => value.includes(item));
  return key ? SOCIAL_LABELS[key] : '';
};

const getPlainContent = (content?: string): string =>
  (content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'No content';
```

- [ ] **Step 2: Run TypeScript for helper syntax**

Run: `pnpm exec tsc --noEmit -p apps/frontend/tsconfig.json`

Expected: PASS.

### Task 2: Redesign Transition Modal

**Files:**
- Modify: `apps/frontend/src/components/tools/kanban/kanban.view.tsx:84-98`

- [ ] **Step 1: Replace modal content JSX**

```tsx
return (
  <div className="flex flex-col gap-[18px] text-textColor">
    <div className="flex flex-col gap-[6px]">
      <div className="text-[18px] font-[700]">{transition.title}</div>
      <div className="text-[14px] leading-[1.5] text-newTextColor/70">
        {transition.description}
      </div>
    </div>
    {transition.requiresDate && (
      <label className="flex flex-col gap-[8px] text-[13px] text-newTextColor/70">
        Publish date
        <input
          type="datetime-local"
          className="h-[44px] bg-newColColor rounded-[8px] px-[12px] text-textColor outline-none border border-newTextColor/10 focus:border-[#612BD3]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
    )}
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-[10px]">
      <button
        type="button"
        onClick={close}
        className="h-[40px] px-[18px] rounded-[8px] bg-newColColor text-textColor border border-newTextColor/10 hover:border-newTextColor/20"
      >
        Cancel
      </button>
      <Button onClick={save} loading={isSaving} className="rounded-[8px]">
        {transition.submitLabel}
      </Button>
    </div>
  </div>
);
```

- [ ] **Step 2: Run focused component test**

Run: `pnpm exec vitest run apps/frontend/src/components/tools/__tests__/kanban.view.spec.tsx`

Expected: PASS after snapshots/assertions are updated in later tasks; failures only from changed markup are acceptable at this point.

### Task 3: Redesign Column and Card Markup

**Files:**
- Modify: `apps/frontend/src/components/tools/kanban/kanban.view.tsx:271-391`

- [ ] **Step 1: Replace the column wrapper and header classes**

```tsx
<div
  className="group/column flex-1 min-w-[300px] sm:min-w-[320px] bg-newBgColorInner rounded-[14px] p-[12px] flex flex-col gap-[12px] max-h-[calc(100vh-180px)] border border-newTextColor/5 transition-colors data-[drag-over=true]:border-[#612BD3]/60 data-[drag-over=true]:bg-[#612BD3]/5"
  onDragOver={(e) => e.preventDefault()}
  onDrop={onDrop}
  aria-label={`${column.label} column`}
>
  <div className="flex justify-between items-start gap-[10px]">
    <div className="flex flex-col gap-[2px] min-w-0">
      <span className="font-bold text-[15px] text-textColor">{column.label}</span>
      <span className="text-[12px] leading-[1.35] text-newTextColor/55 truncate">
        {COLUMN_DESCRIPTIONS[column.state]}
      </span>
    </div>
    <span className="min-w-[28px] h-[24px] px-[8px] rounded-full bg-newColColor border border-newTextColor/10 text-[12px] text-newTextColor/70 flex items-center justify-center">
      {total || 0}
    </span>
  </div>
```

- [ ] **Step 2: Replace create button classes**

```tsx
<button
  onClick={openCreate}
  className="border border-dashed border-newTextColor/15 rounded-[12px] min-h-[64px] text-newTextColor/60 hover:text-white hover:border-[#612BD3] hover:bg-[#612BD3]/10 focus:outline-none focus:border-[#612BD3] transition-colors flex flex-col items-center justify-center gap-[4px]"
  title={column.state === 'error' ? 'Create draft to fix' : `Create ${column.label}`}
>
```

- [ ] **Step 3: Remove card transition button rendering**

Delete the `transitions` calculation and the `<div className="flex flex-wrap...">` block that maps transition buttons.

- [ ] **Step 4: Replace card JSX body**

```tsx
const socialLabel = getSocialLabel(post);
const stateLabel = STATE_BADGES[post.state] || post.state;
const canDrag = canDragPost(post.state);

return (
  <div
    key={post.id}
    draggable={canDrag}
    onDragStart={(e) => {
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          group: post.group,
          state: post.state,
          publishDate: post.publishDate,
        })
      );
    }}
    onClick={() => openEdit(post)}
    onKeyDown={onCardKeyDown(post)}
    tabIndex={0}
    role="button"
    aria-label={`Post by ${post.integration?.name || 'unknown'} in ${post.state} state`}
    className={
      'group/card bg-newColColor rounded-[12px] p-[12px] text-[13px] flex flex-col gap-[10px] border border-newTextColor/5 transition-all outline-none hover:border-[#612BD3]/40 hover:bg-newTextColor/[0.03] focus:border-[#612BD3] focus:ring-1 focus:ring-[#612BD3]/60 ' +
      (canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')
    }
  >
    <div className="flex items-center justify-between gap-[10px] min-w-0">
      <div className="flex items-center gap-[9px] min-w-0">
        <div className="relative w-[28px] h-[28px] shrink-0">
          {post.integration?.picture ? (
            <img
              src={post.integration.picture}
              className="w-[28px] h-[28px] rounded-full object-cover border border-newTextColor/10"
              alt=""
            />
          ) : (
            <div className="w-[28px] h-[28px] rounded-full bg-newBgColorInner border border-newTextColor/10" />
          )}
          {socialLabel && (
            <span
              className="absolute -bottom-[3px] -end-[3px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-newBgColorInner border border-newTextColor/15 text-[8px] font-[800] leading-none text-white flex items-center justify-center"
              aria-label={`Social network ${socialLabel}`}
            >
              {socialLabel}
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-[600] text-textColor truncate">
            {post.integration?.name || 'Unknown channel'}
          </span>
          <span className="text-[11px] text-newTextColor/45">
            {canDrag ? 'Drag to move' : 'Published'}
          </span>
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-newTextColor/10 bg-newBgColorInner px-[8px] py-[3px] text-[11px] text-newTextColor/70">
        {stateLabel}
      </span>
    </div>
    <div className="line-clamp-4 leading-[1.5] text-[13px] text-textColor/90">
      {getPlainContent(post.content)}
    </div>
    {post.publishDate && (
      <div className="flex items-center justify-between gap-[8px] border-t border-newTextColor/5 pt-[9px] text-[12px] text-newTextColor/55">
        <span>{post.state === 'PUBLISHED' ? 'Published' : 'Publish date'}</span>
        <span>{dayjs.utc(post.publishDate).local().format('DD MMM YYYY HH:mm')}</span>
      </div>
    )}
  </div>
);
```

- [ ] **Step 5: Replace board wrapper**

```tsx
<div className="flex gap-[14px] items-start overflow-x-auto p-[4px] pb-[10px] scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner">
```

### Task 4: Update Component Tests

**Files:**
- Modify: `apps/frontend/src/components/tools/__tests__/kanban.view.spec.tsx`

- [ ] **Step 1: Add provider data to mock posts**

```tsx
integration: {
  id: 'int-1',
  name: 'X Account',
  providerIdentifier: 'twitter',
  picture: 'https://example.com/pic.png',
},
```

- [ ] **Step 2: Replace action button expectation**

Remove assertions expecting `Schedule` or `Publish now` buttons inside cards.

- [ ] **Step 3: Add social badge assertion**

```tsx
it('renders a social network badge on the card avatar', () => {
  expect(doc.body.textContent).toContain('X Account');
  expect(doc.body.textContent).toContain('X');
});
```

- [ ] **Step 4: Add no-inline-actions assertion**

```tsx
it('does not render workflow action buttons inside cards', () => {
  const draftColumn = within(doc.body).getByLabelText('Draft column');
  expect(draftColumn.textContent).not.toContain('Publish now');
  expect(draftColumn.textContent).not.toContain('Schedule');
});
```

- [ ] **Step 5: Run component tests**

Run: `pnpm exec vitest run apps/frontend/src/components/tools/__tests__/kanban.view.spec.tsx`

Expected: PASS.

### Task 5: Verify and Commit

**Files:**
- Verify all modified frontend files.

- [ ] **Step 1: Run focused frontend tests**

Run: `pnpm exec vitest run apps/frontend/src/components/tools/__tests__/kanban.helpers.spec.ts apps/frontend/src/components/tools/__tests__/kanban.view.spec.tsx`

Expected: PASS.

- [ ] **Step 2: Run TypeScript**

Run: `pnpm exec tsc --noEmit -p apps/frontend/tsconfig.json`

Expected: PASS.

- [ ] **Step 3: Inspect git diff**

Run: `git diff -- apps/frontend/src/components/tools/kanban/kanban.view.tsx apps/frontend/src/components/tools/__tests__/kanban.view.spec.tsx`

Expected: only Kanban UI/test changes.

- [ ] **Step 4: Commit and push main**

```bash
git add apps/frontend/src/components/tools/kanban/kanban.view.tsx apps/frontend/src/components/tools/__tests__/kanban.view.spec.tsx docs/superpowers/specs/2026-06-12-kanban-drag-first-ui-design.md docs/superpowers/plans/2026-06-12-kanban-drag-first-ui.md
git commit -m "feat(kanban): improve drag-first board UI"
git push origin main
```

Expected: commit and push succeed.

## Self-Review

- Spec coverage: tasks cover visual redesign, removing card buttons, social badge, modal clarity, mobile scrolling, tests, and verification.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: helpers and component references match `kanban.view.tsx` and existing test file paths.
