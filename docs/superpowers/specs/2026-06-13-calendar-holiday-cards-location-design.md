# Calendar Holiday Cards And Location Design

## Goal

Improve calendar holiday presentation and let each browser choose which country's holidays to show. Holidays should look like intentional blocks inside each day cell, and clicking one should help create a post for that holiday.

## Current Behavior

`HolidayBadge` renders a very small inline text badge. In month view it can overlap visually with the day number and does not feel like a calendar item. The existing frontend holiday request does not send a country, so the backend defaults to `MX`. The backend endpoint already accepts `country` on `/tools/holidays`.

## Scope

This change is frontend-only. The selected holiday country is stored per browser in `localStorage`, not in the user account or organization. No database or backend API changes are needed.

## Holiday Card UI

Holiday badges become compact calendar cards:

- Render as full-width blocks inside the day content area.
- Use a subtle celebratory style with background, border, spacing, and readable text.
- Truncate long holiday names without overlapping the day number.
- Keep keyboard and pointer affordances through a button-like clickable element.
- Preserve the existing modal interaction with description, hashtags, copy action, and create-post action.

In month view, the card is positioned below the top day spacing so it reads as content inside the day. In week view, it remains in the day header but uses the same styled block language at a compact size.

## Create Post Behavior

Clicking a holiday card opens the existing holiday modal. The modal should include a primary action to create a post from that holiday. If enriched description and hashtags exist, the post content should use them. If not, it should still create useful draft content using the holiday name and available hashtags.

## Holiday Location Setting

Add a `HolidayLocationComponent` to `GlobalSettings`. It shows a `Holiday location` selector with country options supported by Nager.Date, starting with a practical set:

- Mexico (`MX`)
- United States (`US`)
- Spain (`ES`)
- Colombia (`CO`)
- Argentina (`AR`)
- Chile (`CL`)
- Peru (`PE`)
- Brazil (`BR`)
- United Kingdom (`GB`)
- Canada (`CA`)

Default is `MX` when no preference exists. The value is stored in `localStorage` as `holiday-country`.

## Data Flow

The holiday preferences module exposes a country hook alongside the existing visibility hook. `useHolidays(date)` includes `country=${country}` in the SWR key. When Settings changes the country, it writes `holiday-country` and dispatches a browser event so all mounted holiday badges refresh without a page reload.

Visibility and country are independent: hiding holidays prevents requests; changing country while hidden persists the selected country and applies when holidays are shown again.

## Error Handling

If storage is unavailable, the country falls back to `MX`. If the backend returns no holidays for a country/month, the calendar shows no holiday cards. Existing fetch failure behavior remains an empty list.

## Testing

Add focused tests for:

- Default country is `MX`.
- Changing country persists to `holiday-country`.
- `useHolidays` includes the selected country in the request key.
- Country changes notify mounted holiday hooks.
- Hidden holidays still suppress requests regardless of country.

Add UI coverage where practical for the settings selector or card markup. At minimum, run the focused Vitest tests and note any existing build blockers separately.
