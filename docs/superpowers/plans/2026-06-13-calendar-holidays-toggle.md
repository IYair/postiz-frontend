# Calendar Holidays Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the calendar holiday button a persistent toggle that shows holidays by default and hides or shows holiday badges immediately without reloading the page.

**Architecture:** Add a tiny local preference API in the existing holiday badge module so both the filter button and holiday badge hook use the same storage key, default, and browser event. Update the filter button to keep React state and expose active/inactive UI. Update `useHolidays` to subscribe to preference changes and disable SWR only when holidays are hidden.

**Tech Stack:** React client components, Next.js app frontend, TypeScript, SWR, `localStorage`, Vitest with happy-dom.

---

## File Structure

- Modify `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`: owns holiday preference helpers, event dispatch/listening, and SWR gating for holiday badge data.
- Modify `apps/frontend/src/components/launches/filters.tsx`: uses the shared preference helpers for the calendar filter holiday toggle UI.
- Create `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`: verifies default-enabled behavior, persisted disable behavior, and event-driven hook updates.

## Task 1: Holiday Visibility Preference API

**Files:**
- Modify: `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`
- Test: `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx` with:

```tsx
import React from 'react';
import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import {
  areHolidaysVisible,
  HOLIDAY_VISIBILITY_CHANGE_EVENT,
  setHolidaysVisible,
  useHolidays,
} from '@gitroom/frontend/components/tools/holidays/holiday.badge';

const swrCalls = vi.hoisted(() => [] as Array<string | null>);

vi.mock('swr', () => ({
  default: (key: string | null) => {
    swrCalls.push(key);
    return { data: [] };
  },
}));

vi.mock('@gitroom/helpers/utils/custom.fetch', () => ({
  useFetch: () => vi.fn(),
}));

vi.mock('@gitroom/frontend/components/layout/new-modal', () => ({
  useModals: () => ({ openModal: vi.fn() }),
}));

vi.mock('@gitroom/react/toaster/toaster', () => ({
  useToaster: () => ({ show: vi.fn() }),
}));

vi.mock('@gitroom/react/form/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const Probe = () => {
  useHolidays(dayjs('2026-06-13'));
  return null;
};

describe('holiday visibility preference', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    swrCalls.length = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    localStorage.clear();
    swrCalls.length = 0;
  });

  it('shows holidays by default when no preference is stored', () => {
    expect(areHolidaysVisible()).toBe(true);

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026');
  });

  it('persists disabled holidays and prevents the holiday request', () => {
    setHolidaysVisible(false);

    expect(areHolidaysVisible()).toBe(false);
    expect(localStorage.getItem('show-holidays')).toBe('false');

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBeNull();
  });

  it('notifies mounted holiday hooks when the preference changes', async () => {
    const listener = vi.fn();
    window.addEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, listener);

    act(() => {
      root.render(<Probe />);
    });
    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026');

    act(() => {
      setHolidaysVisible(false);
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(swrCalls.at(-1)).toBeNull();

    window.removeEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, listener);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: FAIL because `areHolidaysVisible`, `HOLIDAY_VISIBILITY_CHANGE_EVENT`, and `setHolidaysVisible` are not exported from `holiday.badge.tsx`.

- [ ] **Step 3: Add the preference helpers and event-backed hook state**

Modify the imports at the top of `apps/frontend/src/components/tools/holidays/holiday.badge.tsx` from:

```tsx
import { FC, MouseEvent, useCallback } from 'react';
```

to:

```tsx
import { FC, MouseEvent, useCallback, useEffect, useState } from 'react';
```

Add this block after the `Holiday` interface:

```tsx
export const HOLIDAY_VISIBILITY_STORAGE_KEY = 'show-holidays';
export const HOLIDAY_VISIBILITY_CHANGE_EVENT = 'holiday-visibility-change';

export const areHolidaysVisible = () => {
  if (typeof window === 'undefined') return true;

  try {
    return localStorage.getItem(HOLIDAY_VISIBILITY_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const setHolidaysVisible = (visible: boolean) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(HOLIDAY_VISIBILITY_STORAGE_KEY, String(visible));
  } catch {
    return;
  }

  window.dispatchEvent(new Event(HOLIDAY_VISIBILITY_CHANGE_EVENT));
};

export const useHolidayVisibility = () => {
  const [visible, setVisible] = useState(areHolidaysVisible);

  useEffect(() => {
    const update = () => setVisible(areHolidaysVisible());

    window.addEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, update);
    window.addEventListener('storage', update);

    return () => {
      window.removeEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const setVisibility = useCallback((nextVisible: boolean) => {
    setVisible(nextVisible);
    setHolidaysVisible(nextVisible);
  }, []);

  return [visible, setVisibility] as const;
};
```

Replace the `useHolidays` function with:

```tsx
export const useHolidays = (date: dayjs.Dayjs) => {
  const fetch = useFetch();
  const [holidaysVisible] = useHolidayVisibility();
  const month = date.month() + 1;
  const year = date.year();
  const { data } = useSWR<Holiday[]>(
    holidaysVisible ? `/tools/holidays?month=${month}&year=${year}` : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    { revalidateOnFocus: false }
  );
  return data || [];
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: PASS, with all three tests passing.

- [ ] **Step 5: Commit**

Run only if the user explicitly asked for commits:

```bash
git add apps/frontend/src/components/tools/holidays/holiday.badge.tsx apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx
git commit -m "feat(calendar): add holiday visibility preference"
```

## Task 2: Calendar Filter Toggle UI

**Files:**
- Modify: `apps/frontend/src/components/launches/filters.tsx`
- Test: `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

- [ ] **Step 1: Extend the failing tests for direct toggle usage**

Append this test to `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx` inside the existing `describe` block:

```tsx
  it('allows callers to toggle the stored visibility value repeatedly', () => {
    expect(areHolidaysVisible()).toBe(true);

    setHolidaysVisible(false);
    expect(areHolidaysVisible()).toBe(false);
    expect(localStorage.getItem('show-holidays')).toBe('false');

    setHolidaysVisible(true);
    expect(areHolidaysVisible()).toBe(true);
    expect(localStorage.getItem('show-holidays')).toBe('true');
  });
```

- [ ] **Step 2: Run test to verify the preference behavior still passes before UI wiring**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: PASS. This confirms the shared setter supports the filter UI needs before modifying `filters.tsx`.

- [ ] **Step 3: Wire the filter button to React state and shared preference helpers**

Modify imports in `apps/frontend/src/components/launches/filters.tsx` from:

```tsx
import { useCallback } from 'react';
```

to:

```tsx
import { useCallback } from 'react';
import { useHolidayVisibility } from '@gitroom/frontend/components/tools/holidays/holiday.badge';
```

Add this after `const t = useT();` inside `Filters`:

```tsx
  const [holidaysVisible, setHolidaysVisible] = useHolidayVisibility();
```

Replace the holiday button block at lines 454-463:

```tsx
      <div
        className="cursor-pointer text-[13px] select-none"
        onClick={() => {
          const v = localStorage.getItem('hide-holidays') === 'true';
          localStorage.setItem('hide-holidays', String(!v));
          window.location.reload();
        }}
      >
        🎉
      </div>
```

with:

```tsx
      <button
        type="button"
        aria-pressed={holidaysVisible}
        title={
          holidaysVisible
            ? t('hide_holidays', 'Hide holidays')
            : t('show_holidays', 'Show holidays')
        }
        className={clsx(
          'cursor-pointer text-[13px] select-none rounded-[8px] border border-newTableBorder px-[10px] py-[6px] transition-colors',
          holidaysVisible
            ? 'bg-boxFocused text-textItemFocused'
            : 'text-newTableText opacity-60 hover:opacity-100'
        )}
        onClick={() => setHolidaysVisible(!holidaysVisible)}
      >
        🎉
      </button>
```

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: PASS.

- [ ] **Step 5: Run TypeScript or build verification for the frontend**

Run: `pnpm --filter ./apps/frontend run build`

Expected: PASS. If the full build fails for unrelated environment issues, capture the exact error and run `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx` as the focused verification.

- [ ] **Step 6: Commit**

Run only if the user explicitly asked for commits:

```bash
git add apps/frontend/src/components/launches/filters.tsx apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx
git commit -m "feat(calendar): make holidays button a persistent toggle"
```

## Task 3: Manual Verification

**Files:**
- Verify: `apps/frontend/src/components/launches/filters.tsx`
- Verify: `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`

- [ ] **Step 1: Start the frontend if a running dev server is not already available**

Run: `pnpm dev:frontend`

Expected: the frontend dev server starts without compile errors.

- [ ] **Step 2: Verify default visible behavior in the browser**

Open the calendar view with a clean `localStorage` value for `show-holidays`.

Expected: the holiday toggle appears active and holiday badges are eligible to render for dates returned by `/tools/holidays`.

- [ ] **Step 3: Verify persistent disabled behavior**

Click the holiday toggle once.

Expected: the button becomes visually inactive, `localStorage.getItem('show-holidays')` returns `'false'`, visible holiday badges disappear without a full page reload, and the browser no longer requests `/tools/holidays` for mounted holiday badges.

- [ ] **Step 4: Verify persistent enabled behavior**

Reload the page, then click the holiday toggle again.

Expected: the button starts inactive after reload, becomes active after click, `localStorage.getItem('show-holidays')` returns `'true'`, and holiday badges are eligible to render again.

- [ ] **Step 5: Final status check**

Run: `git status --short`

Expected: only intended files are modified or created:

```text
 M apps/frontend/src/components/launches/filters.tsx
 M apps/frontend/src/components/tools/holidays/holiday.badge.tsx
?? apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx
?? docs/superpowers/plans/2026-06-13-calendar-holidays-toggle.md
?? docs/superpowers/specs/2026-06-13-calendar-holidays-toggle-design.md
```

Existing unrelated untracked files may also appear; do not modify or delete them.

## Self-Review

- Spec coverage: Task 1 implements default-enabled storage, persistence, event updates, SWR gating, and storage fallback. Task 2 implements active/inactive toggle UI with accessibility labels. Task 3 covers manual persistence and no-reload behavior.
- Placeholder scan: no placeholder steps remain; each code change includes exact content and each verification has a concrete command or expected result.
- Type consistency: exported names are `HOLIDAY_VISIBILITY_STORAGE_KEY`, `HOLIDAY_VISIBILITY_CHANGE_EVENT`, `areHolidaysVisible`, `setHolidaysVisible`, and `useHolidayVisibility`; later tasks reference those same names.
