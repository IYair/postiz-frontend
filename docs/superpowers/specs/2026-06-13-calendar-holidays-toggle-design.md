# Calendar Holidays Toggle Design

## Goal

Make the holiday button in the calendar filters behave as a real persistent toggle. Holidays should be visible by default for first-time users. If a user disables holidays, that preference should persist across reloads and sessions.

## Current Behavior

The filter bar button writes `hide-holidays` to `localStorage` and forces `window.location.reload()`. `HolidayBadge` reads `hide-holidays` from `localStorage` when building its SWR key. The button has no visible active state, and the UI depends on a full page reload to reflect the preference.

## Approach

Use a small React-backed browser preference instead of a reload-based toggle.

- Store the preference as `show-holidays` in `localStorage`.
- Treat missing `show-holidays` as enabled.
- Update the filter button state immediately on click.
- Dispatch a browser event after preference changes so `HolidayBadge` instances update without a page reload.
- Keep the implementation local to `filters.tsx` and `holiday.badge.tsx`.

## UI Behavior

The holiday button remains in the existing filter bar location. It shows an active visual style when holidays are enabled and an inactive style when disabled. It includes `aria-pressed` and a descriptive title so the toggle state is clear to assistive technology and mouse users.

## Data Flow

On initial render, the filter button and holiday hook read `localStorage.getItem('show-holidays')`. Any value other than `'false'` means holidays are enabled. When the button is clicked, it writes the inverse value to `localStorage` and dispatches a custom `holiday-visibility-change` event. `HolidayBadge` listens for this event, updates local state, and changes the SWR key to either fetch holidays or return `null`.

## Error Handling

If browser storage is unavailable, the UI falls back to showing holidays. Failed holiday fetches continue to return an empty list, matching the current behavior.

## Testing

Add focused tests for the holiday preference helper or hook behavior if existing test setup supports it with minimal mocking. At minimum, verify with TypeScript or the existing frontend test command that the edited files compile and the toggle logic does not introduce regressions.
