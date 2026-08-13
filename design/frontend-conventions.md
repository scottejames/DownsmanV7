# Frontend conventions

## Shared UI primitives (`src/components/ui/`)

`0154e66` rebuilt all six dialogs (Login, Register, AdminPanel, Team, Scout, Support)
on a small shared set of primitives after they'd organically diverged:
`Modal.tsx` (the panel shell — title, close button, Escape-to-close, focus styling),
`Button.tsx`, `Banner.tsx` (error/status messaging), and `form.ts` (shared field
styling helpers). New dialogs should be built on these rather than reimplementing a
panel/overlay from scratch.

Alongside this, `tailwind.config.js` gained dedicated elevation color tokens —
`scout-surface`, `scout-field`, `scout-field-border` — because dialog panels and the
page background had previously both resolved to the same `#004851` teal, so a panel
had no visual separation from the backdrop besides the semi-transparent overlay. Use
these tokens (not a raw hex or the base `scout-teal`) for any new elevated surface.

## Centralized API error handling (`src/components/ui/api.ts`)

`apiRequest()`/`postJson()`/`deleteJson()` are the only sanctioned way to call this
app's own `/api/*` routes from a component. It exists specifically because
`const d = await res.json(); setError(d.error)`, written independently in every
dialog, throws an uncaught `SyntaxError` when the server returns a non-JSON body (a
bare 500, a gateway timeout page, a dropped connection) — and that crash was silent
to the user, since nothing caught it. This is what caused a real production
registration failure (see [design-principles.md](./design-principles.md)). `apiRequest`
never throws on an unexpected response shape: a network failure, a non-OK status, and
a malformed body are all normalized into a single `ApiError` with a plain-language
fallback message. New API calls from components should go through this, not a bare
`fetch`.

## Every mutating action has an explicit loading/in-flight state

Following the same `0154e66` change, every save/submit/delete handler in the dialogs
sets a loading flag and disables the triggering control for the duration of the
request, specifically to prevent double-submit from a fast double-click before React
re-renders the disabled state.

## Session bootstrap and refresh live in `page.tsx`, not per-component

`src/app/page.tsx` is the single place that: restores the session on mount (`GET
/api/auth/session`, so a page reload doesn't log the user out — see
[auth-and-session.md](./auth-and-session.md)), and runs the silent-refresh timer
(`SILENT_REFRESH_INTERVAL_MS`, `POST /api/auth/refresh` every 45 minutes) while a
user is present. Child components (`LoginDialog`, `TeamDialog`, etc.) receive `user`/
callbacks as props rather than each independently checking session state — keep new
top-level session-dependent logic here rather than duplicating a session check inside
an individual dialog.

## Runtime env-var flags instead of build-time config

Independent flags, read directly at the point of use rather than funneled through a
config module:

- `DM_DEV` (server-side, `src/services/db.ts`) — points at local DynamoDB on
  `localhost:8000` instead of real AWS when not explicitly `'false'`.
- `NEXT_PUBLIC_DM_DEV` (client-side, `src/app/page.tsx`) — shows a yellow "DEV"/
  banner so it's visually obvious which environment is loaded.
- `NEXT_PUBLIC_DM_LOCK` (client-side) — puts the whole app in a read-only "entries
  closed" mode (used once the season's registration window closes), with a
  per-request override: a user in the `breakLock` Cognito group (`user.breakLock`)
  still gets to edit even when locked. See `effectiveLocked = locked &&
  !user.breakLock` in `page.tsx`.
- `NEXT_PUBLIC_DM_HIKE_DATE` (client-side, `src/models/referenceData.ts`) — this
  season's hike date, which every age-based rule in `validateTeam()` is computed
  against. Unlike the flags above, this one is **required**: `parseHikeDate()` throws
  at module load if it's unset or malformed, rather than silently falling back to a
  default. This is a deliberate divergence from "env var with a sensible default" —
  see `design-principles.md`'s "Fail loud on a missing trust boundary, not silent"
  and `CODE_REVIEW_2026-08-13.md`'s H4: the constant this replaced was hardcoded and
  went stale for roughly two seasons without anyone noticing, so a silent fallback
  here would just reproduce the same failure mode one layer down.

See [design-principles.md](./design-principles.md)'s "environment-driven behavior over
separate build configs" for why this stays flags-at-the-point-of-use rather than
growing into a config layer.
