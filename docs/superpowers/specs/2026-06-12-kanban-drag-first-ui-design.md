# Kanban Drag-First UI Redesign

## Goal

Improve the Kanban workflow UI so cards feel native to the current app, work better on mobile, and communicate only the information needed to edit or move posts. Card workflow actions will be driven by drag-and-drop instead of inline buttons.

## Scope

- Redesign `apps/frontend/src/components/tools/kanban/kanban.view.tsx` visually while keeping the existing data flow and workflow endpoint.
- Remove transition action buttons from cards.
- Keep click, Enter, and Space as edit actions.
- Keep drag/drop as the only workflow transition trigger.
- Add a social network icon badge on the integration avatar when an icon is available.
- Improve mobile usability with better horizontal scrolling, column sizing, card spacing, and touch-friendly hit areas.
- Improve modal clarity for schedule, publish now, retry, reschedule, and move-to-draft transitions.

## Visual Direction

Use the existing app style: dark surfaces, `bg-newBgColorInner`, `bg-newColColor`, `text-textColor`, `text-newTextColor`, rounded 8-12px corners, subtle borders, and purple `#612BD3` accents. Avoid introducing a new visual language.

## Board Layout

- Desktop keeps horizontal columns with overflow scroll.
- Mobile keeps horizontal columns with comfortable `min-width` so cards remain readable.
- The board should use a little more breathing room than the current version without becoming low-density.
- Columns should visually communicate drop targets via hover/drag-over state.

## Column UI

- Header includes column label and count.
- Header includes a short helper line that explains the state, for example `Ideas and posts being edited` for Draft or `Waiting for publish time` for Scheduled.
- The create button remains per column but gets cleaner hierarchy and better hover/focus states.
- Empty states should describe useful action: create a post or drop a card into the column.

## Card UI

- Cards remove all workflow action buttons.
- Cards show the integration avatar, integration name, social network icon badge, content excerpt, publish date when available, and state badge.
- Avatar social icon badge appears at the avatar's bottom-right corner.
- If no icon is available, the avatar renders normally without the badge.
- Draggable cards show an affordance such as `Drag to move` or a small grip indicator.
- Published cards should not look draggable.
- Focus styles must be visible for keyboard users.

## Modal UI

- Transition modal includes title, description, optional datetime input, primary action, and secondary cancel action.
- Date input uses the app dark input style with visible focus state.
- Submit button uses the shared `Button` component and loading state.
- Copy should clearly explain the outcome before a destructive or immediate action such as `Publish now`.

## Behavior

- Clicking a card opens edit.
- Pressing Enter or Space on a focused card opens edit.
- Dragging a valid card to another valid column opens the relevant transition modal.
- Dragging to an invalid column shows the existing warning toast.
- Dropping on the current column does nothing.
- Removing card buttons must not remove any supported workflow transition.

## Tests

- Update component tests so action buttons are no longer expected.
- Add test coverage that cards render social icon badges when provided.
- Keep helper tests passing unchanged unless helper data shape needs a small display helper.
- Verify `pnpm exec vitest run apps/frontend/src/components/tools/__tests__/kanban.helpers.spec.ts apps/frontend/src/components/tools/__tests__/kanban.view.spec.tsx`.
- Verify `pnpm exec tsc --noEmit -p apps/frontend/tsconfig.json`.

## Out of Scope

- No backend changes.
- No new SVG assets.
- No redesign of `AddEditModal`.
- No changes to the workflow endpoint contract.
