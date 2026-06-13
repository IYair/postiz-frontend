# Calendar Holiday Cards And Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render holidays as styled calendar cards and let each browser choose the holiday country from Global Settings.

**Architecture:** Extend the existing holiday preference module in `holiday.badge.tsx` with a local `holiday-country` store and event subscription, reusing the existing `useSyncExternalStore` pattern. Add a small settings component under Global Settings that writes the country preference. Update `HolidayBadge` markup/content and calendar placement so holidays render as intentional blocks inside day cells while still opening the existing create-post modal.

**Tech Stack:** React client components, Next.js frontend, TypeScript, SWR, `localStorage`, `useSyncExternalStore`, Vitest with happy-dom.

---

## File Structure

- Modify `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`: owns visibility and country preferences, `useHolidays` request key, holiday card markup, and modal create-post content.
- Modify `apps/frontend/src/components/launches/calendar.tsx`: moves the month holiday card below the day top spacing and keeps week header rendering compact.
- Create `apps/frontend/src/components/settings/holiday-location.component.tsx`: browser-local country selector for Global Settings.
- Modify `apps/frontend/src/components/settings/global.settings.tsx`: renders the new holiday location setting.
- Modify `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`: adds focused tests for country preference and SWR keys.

## Task 1: Holiday Country Preference And Request Key

**Files:**
- Modify: `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`
- Modify: `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

- [ ] **Step 1: Write failing tests for country preference**

Append these imports to the existing import from `holiday.badge.tsx` in `apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`:

```tsx
  getHolidayCountry,
  HOLIDAY_COUNTRY_CHANGE_EVENT,
  HOLIDAY_COUNTRY_STORAGE_KEY,
  setHolidayCountry,
  useHolidayCountry,
```

Add these probes after `VisibilityProbe`:

```tsx
let setCountryFromHook: ((country: string) => void) | undefined;

const CountryProbe = () => {
  const [, setCountry] = useHolidayCountry();
  setCountryFromHook = setCountry;
  useHolidays(dayjs('2026-06-13'));
  return null;
};

const CountrySnapshotProbe = () => {
  const [country] = useHolidayCountry();
  return <span>{country}</span>;
};
```

Update `beforeEach` and `afterEach` to reset `setCountryFromHook`:

```tsx
setCountryFromHook = undefined;
```

Append these tests inside the existing `describe('holiday visibility preference', () => { ... })` block:

```tsx
  it('uses MX as the default holiday country', () => {
    expect(getHolidayCountry()).toBe('MX');

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');
  });

  it('persists selected holiday country and includes it in holiday requests', () => {
    setHolidayCountry('US');

    expect(getHolidayCountry()).toBe('US');
    expect(localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY)).toBe('US');

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=US');
  });

  it('notifies mounted holiday hooks when the country changes', async () => {
    const listener = vi.fn();
    window.addEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, listener);

    act(() => {
      root.render(<CountryProbe />);
    });
    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');

    act(() => {
      setCountryFromHook?.('ES');
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY)).toBe('ES');
    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=ES');

    window.removeEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, listener);
  });

  it('keeps holiday requests disabled when holidays are hidden even if country changes', async () => {
    setHolidaysVisible(false);

    act(() => {
      root.render(<CountryProbe />);
    });
    expect(swrCalls.at(-1)).toBeNull();

    act(() => {
      setCountryFromHook?.('CO');
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY)).toBe('CO');
    expect(swrCalls.at(-1)).toBeNull();
  });

  it('uses a stable MX server snapshot for holiday country', () => {
    localStorage.setItem(HOLIDAY_COUNTRY_STORAGE_KEY, 'US');

    expect(renderToString(<CountrySnapshotProbe />)).toBe('<span>MX</span>');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: FAIL because `getHolidayCountry`, `HOLIDAY_COUNTRY_CHANGE_EVENT`, `HOLIDAY_COUNTRY_STORAGE_KEY`, `setHolidayCountry`, and `useHolidayCountry` are not exported, and the existing request key has no `country` parameter.

- [ ] **Step 3: Add country preference helpers and update `useHolidays`**

In `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`, add these constants after `HOLIDAY_VISIBILITY_CHANGE_EVENT`:

```tsx
export const HOLIDAY_COUNTRY_STORAGE_KEY = 'holiday-country';
export const HOLIDAY_COUNTRY_CHANGE_EVENT = 'holiday-country-change';
const DEFAULT_HOLIDAY_COUNTRY = 'MX';
```

Add these helpers after `useHolidayVisibility`:

```tsx
export const getHolidayCountry = () => {
  if (typeof window === 'undefined') return DEFAULT_HOLIDAY_COUNTRY;

  try {
    const country = localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY);
    return country || DEFAULT_HOLIDAY_COUNTRY;
  } catch {
    return DEFAULT_HOLIDAY_COUNTRY;
  }
};

export const setHolidayCountry = (country: string) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(HOLIDAY_COUNTRY_STORAGE_KEY, country);
  } catch {
    // Storage unavailable falls back to getHolidayCountry(), which returns MX.
  }

  window.dispatchEvent(new Event(HOLIDAY_COUNTRY_CHANGE_EVENT));
};

const subscribeHolidayCountry = (onStoreChange: () => void) => {
  window.addEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);

  return () => {
    window.removeEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
};

export const useHolidayCountry = () => {
  const country = useSyncExternalStore(
    subscribeHolidayCountry,
    getHolidayCountry,
    () => DEFAULT_HOLIDAY_COUNTRY
  );

  const setCountry = useCallback((nextCountry: string) => {
    setHolidayCountry(nextCountry);
  }, []);

  return [country, setCountry] as const;
};
```

Replace `useHolidays` with:

```tsx
export const useHolidays = (date: dayjs.Dayjs) => {
  const fetch = useFetch();
  const [holidaysVisible] = useHolidayVisibility();
  const [country] = useHolidayCountry();
  const month = date.month() + 1;
  const year = date.year();
  const { data } = useSWR<Holiday[]>(
    holidaysVisible
      ? `/tools/holidays?month=${month}&year=${year}&country=${country}`
      : null,
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

Update existing test expectations that currently expect `/tools/holidays?month=6&year=2026` so they expect `/tools/holidays?month=6&year=2026&country=MX`.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: PASS with existing visibility tests plus the new country tests.

- [ ] **Step 5: Commit**

Run only if commits are requested for this implementation session:

```bash
git add apps/frontend/src/components/tools/holidays/holiday.badge.tsx apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx
git commit -m "feat(calendar): add holiday country preference"
```

## Task 2: Global Settings Holiday Location Selector

**Files:**
- Create: `apps/frontend/src/components/settings/holiday-location.component.tsx`
- Modify: `apps/frontend/src/components/settings/global.settings.tsx`

- [ ] **Step 1: Create the settings component**

Create `apps/frontend/src/components/settings/holiday-location.component.tsx`:

```tsx
'use client';

import React, { useCallback } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useHolidayCountry } from '@gitroom/frontend/components/tools/holidays/holiday.badge';

const HOLIDAY_COUNTRY_OPTIONS = [
  { value: 'MX', label: 'Mexico' },
  { value: 'US', label: 'United States' },
  { value: 'ES', label: 'Spain' },
  { value: 'CO', label: 'Colombia' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Peru' },
  { value: 'BR', label: 'Brazil' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
];

const HolidayLocationComponent = () => {
  const t = useT();
  const [country, setCountry] = useHolidayCountry();

  const changeCountry = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setCountry(event.target.value);
    },
    [setCountry]
  );

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">
        {t('holiday_location_settings', 'Holiday Location')}
      </div>
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col flex-1">
          <div className="text-[14px]">
            {t('holiday_country', 'Holiday country')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t(
              'holiday_country_description',
              'Choose which country\'s holidays appear in your calendar. This is saved in this browser only.'
            )}
          </div>
        </div>
        <div className="w-[220px]">
          <Select
            name="holiday-country"
            label=""
            disableForm={true}
            hideErrors={true}
            value={country}
            onChange={changeCountry}
          >
            {HOLIDAY_COUNTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
};

export default HolidayLocationComponent;
```

- [ ] **Step 2: Render the setting in Global Settings**

Modify `apps/frontend/src/components/settings/global.settings.tsx` imports:

```tsx
import HolidayLocationComponent from '@gitroom/frontend/components/settings/holiday-location.component';
```

Render it after `MetricComponent`:

```tsx
      <MetricComponent />
      <HolidayLocationComponent />
      <EmailNotificationsComponent />
```

- [ ] **Step 3: Run focused tests**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: PASS. This verifies the setting uses the same country hook that drives calendar requests.

- [ ] **Step 4: Commit**

Run only if commits are requested for this implementation session:

```bash
git add apps/frontend/src/components/settings/holiday-location.component.tsx apps/frontend/src/components/settings/global.settings.tsx
git commit -m "feat(settings): add holiday location preference"
```

## Task 3: Holiday Card UI And Create-Post Content

**Files:**
- Modify: `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`
- Modify: `apps/frontend/src/components/launches/calendar.tsx`

- [ ] **Step 1: Update holiday modal create-post content**

In `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`, add this helper before `HolidayBadge`:

```tsx
const getHolidayPostContent = (holiday: Holiday) => {
  const hashtags = holiday.hashtags.map((x) => `#${x}`).join(' ');
  return [holiday.name, holiday.description, hashtags].filter(Boolean).join('\n\n');
};
```

Inside the `open` callback, after `const h = todays[0];`, add:

```tsx
      if (!h) return;

      const hashtags = h.hashtags.map((x) => `#${x}`).join(' ');
      const postContent = getHolidayPostContent(h);
```

Replace the modal children content with:

```tsx
          <div className="flex flex-col gap-[12px]">
            <div className="text-[14px] font-[600] text-textColor">
              {h.name}
            </div>
            {h.description && (
              <div className="text-[14px] text-textColor/80">{h.description}</div>
            )}
            {!!hashtags && (
              <div className="text-[14px] text-forth">{hashtags}</div>
            )}
            <div className="flex gap-[8px]">
              {!!hashtags && (
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(hashtags);
                    toaster.show('Copied', 'success');
                  }}
                >
                  Copy hashtags
                </Button>
              )}
              {onCreatePost && (
                <Button
                  onClick={() => {
                    close();
                    onCreatePost(postContent, date);
                  }}
                >
                  Create post
                </Button>
              )}
            </div>
          </div>
```

- [ ] **Step 2: Replace inline badge markup with a calendar card button**

Replace the current `HolidayBadge` return markup:

```tsx
    <div
      onClick={open}
      title={todays.map((h) => h.name).join(', ')}
      className="cursor-pointer text-[10px] leading-[14px] px-[4px] rounded-[4px] bg-forth/20 text-forth truncate"
    >
      🎉 {todays[0].name}
    </div>
```

with:

```tsx
    <button
      type="button"
      onClick={open}
      title={todays.map((h) => h.name).join(', ')}
      aria-label={`Create post for ${todays[0].name}`}
      className="group w-full cursor-pointer rounded-[8px] border border-forth/30 bg-forth/10 px-[8px] py-[6px] text-left shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-colors hover:border-forth/60 hover:bg-forth/15 focus:outline-none focus:ring-2 focus:ring-forth/40"
    >
      <div className="flex items-start gap-[6px] min-w-0">
        <span className="mt-[1px] text-[12px] leading-[14px]">🎉</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-[600] leading-[14px] text-forth">
            {todays[0].name}
          </div>
          {!!todays[0].description && (
            <div className="mt-[2px] line-clamp-2 text-[10px] leading-[13px] text-textColor/70">
              {todays[0].description}
            </div>
          )}
        </div>
      </div>
    </button>
```

- [ ] **Step 3: Move month card below the day top spacing**

In `apps/frontend/src/components/launches/calendar.tsx`, replace the month view holiday wrapper:

```tsx
                <div className="absolute left-[6px] right-[6px] top-[6px] z-[10]">
                  <HolidayBadge
                    date={cellDate}
                    onCreatePost={createPostWithContent}
                  />
                </div>
```

with:

```tsx
                <div className="absolute left-[8px] right-[8px] top-[34px] z-[10]">
                  <HolidayBadge
                    date={cellDate}
                    onCreatePost={createPostWithContent}
                  />
                </div>
```

Keep the existing week header `HolidayBadge` placement, since it already lives under the date text in the header.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: PASS. These tests should remain green because the preference/request behavior is unchanged.

- [ ] **Step 5: Commit**

Run only if commits are requested for this implementation session:

```bash
git add apps/frontend/src/components/tools/holidays/holiday.badge.tsx apps/frontend/src/components/launches/calendar.tsx
git commit -m "feat(calendar): render holidays as day cards"
```

## Task 4: Verification

**Files:**
- Verify: `apps/frontend/src/components/tools/holidays/holiday.badge.tsx`
- Verify: `apps/frontend/src/components/settings/holiday-location.component.tsx`
- Verify: `apps/frontend/src/components/launches/calendar.tsx`

- [ ] **Step 1: Run focused tests**

Run: `pnpm vitest run apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx`

Expected: PASS with all holiday preference tests passing.

- [ ] **Step 2: Run frontend build**

Run: `pnpm --filter ./apps/frontend run build`

Expected: PASS if required backend rewrite environment variables are configured. If it fails with `destination: "undefined/:path*"`, record it as the existing rewrite configuration blocker already observed before this feature.

- [ ] **Step 3: Manual browser verification**

Start the frontend with the existing project command if no dev server is running:

```bash
pnpm dev:frontend
```

Expected browser behavior:

- Calendar month view shows holidays as styled blocks below the day number.
- Clicking a holiday block opens the modal.
- Clicking `Create post` opens the post modal with holiday name, description when available, and hashtags when available.
- Settings > Global Settings shows `Holiday Location`.
- Changing the setting to `US`, `ES`, or another supported country updates `localStorage.holiday-country` and subsequent holiday requests include `country=US`, `country=ES`, etc.
- Hiding holidays still suppresses holiday requests and visible cards.

- [ ] **Step 4: Final status check**

Run: `git status --short`

Expected intended files:

```text
 M apps/frontend/src/components/launches/calendar.tsx
 M apps/frontend/src/components/settings/global.settings.tsx
 M apps/frontend/src/components/tools/__tests__/holiday.visibility.spec.tsx
 M apps/frontend/src/components/tools/holidays/holiday.badge.tsx
?? apps/frontend/src/components/settings/holiday-location.component.tsx
?? docs/superpowers/plans/2026-06-13-calendar-holiday-cards-location.md
?? docs/superpowers/specs/2026-06-13-calendar-holiday-cards-location-design.md
```

Other unrelated untracked files may remain; do not stage or modify them unless the user explicitly asks.

## Self-Review

- Spec coverage: Task 1 covers country storage, default `MX`, event refresh, SWR country key, hidden-request suppression, and hydration-safe country snapshot. Task 2 covers Global Settings browser-local selector. Task 3 covers styled holiday cards, month placement, and create-post content fallback. Task 4 covers focused tests, build, and browser verification.
- Placeholder scan: no placeholders or vague implementation steps remain; every code change includes concrete snippets.
- Type consistency: country helpers are consistently named `HOLIDAY_COUNTRY_STORAGE_KEY`, `HOLIDAY_COUNTRY_CHANGE_EVENT`, `getHolidayCountry`, `setHolidayCountry`, and `useHolidayCountry`; tests and settings use those names.
