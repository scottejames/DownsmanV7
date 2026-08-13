# Code Review — 2026-08-13

Scope: full pass over `src/`, `lambda/`, and `scripts/` against `CODING_GUIDELINES.md`.
Method: manual trace of every mutating code path (client → API route → service layer),
cross-checked against what's actually called vs. what's only provisioned/documented.
Originally a static review (`node_modules` wasn't installed when this was written);
dependencies were later installed and all four High findings' fixes were verified with
`npx tsc --noEmit`, `npm test` (93/93 passing), and `npm run build`.

Findings are ranked by actual impact (data integrity / security first), each with the
file, why it matters, and a concrete fix. Numbering is for reference, not priority
order within a severity tier — treat every High as worth fixing before the next
release.

## High

### H1. Business-rule validation is client-side only — the API trusts it unchecked — FIXED 2026-08-13
`validateTeam()` (`src/utils/validation.ts`) is only ever called from `TeamDialog.tsx`.
`POST /api/teams`, `POST /api/scouts`, and `POST /api/support`
(`src/app/api/{teams,scouts,support}/route.ts`) all do `const x = await req.json();`
and save it directly — no server-side re-validation of shape or business rules.
Concretely, any authenticated user can, with a direct API call (bypassing the UI
entirely):
- Set `teamSubmitted: true` on a team that would fail every one of `validateTeam()`'s
  hike-class checks (wrong team size, no leader when required, combined age too low,
  no service crew, etc.) — `submitTeam()` in `TeamDialog.tsx` only validates
  client-side before its own `postJson`, and nothing stops a second, unvalidated POST.
- Create a `Scouts`/`Support` row with an empty `fullName`, a non-numeric `dobEpoch`,
  or any other malformed shape — `saveScout`/`saveSupport` in `src/services/db.ts`
  never check the payload.

This violates `CODING_GUIDELINES.md` Section 7's "Validate at the boundary" — the
boundary is the API route, not the dialog that happens to be the only client today.

**Fix applied:** `POST /api/teams` now re-fetches the team's current scouts/support
server-side and runs `validateTeam()` before saving whenever `teamSubmitted: true` is
set, rejecting with 400 (and not calling `saveTeam()`) on failure — a draft save
(`teamSubmitted` falsy) is unaffected. `POST /api/scouts` and `POST /api/support` each
gained a small local shape check (`fullName` non-empty, `dobEpoch` numeric for scouts;
`fullName`/`phoneNumber` non-empty for support), following the existing pattern of a
small `ownsTeam()` helper duplicated per route rather than a shared module. Regression
tests added in `__tests__/api-authz.test.ts` cover all three: an invalid submitted
team is rejected, a valid one is accepted, a draft save skips validation entirely, and
malformed scout/support payloads are rejected.

### H2. No double-submit guard on "Add Team" — duplicate rows on a fast double-click — FIXED 2026-08-13
`addTeam()` in `src/app/page.tsx` has **no** loading/disabled state on the triggering
button at all:
```tsx
{!effectiveLocked && <button onClick={addTeam} ...>Add Team</button>}
```
`saveTeam()` (`src/services/db.ts`) mints a new `uuid()` whenever `team.id` is falsy, so
two clicks landing before the first `await fetch(...)` resolves create two distinct
`Team` rows. `CODING_GUIDELINES.md` Section 3 is explicit that every save/submit
handler needs a `loading`-driven disable — this one has none.

The same class of risk is only partially mitigated elsewhere: `ScoutDialog`/
`SupportDialog`'s `save()` and `TeamDialog`'s `submitTeam()` do set a `loading` state
that disables the `Button`, but per the guidelines' own caveat, a state-based disable
doesn't close the window between two clicks landing in the same React batch — worth a
`useRef` guard on `addTeam` and the two dialog `save()`s specifically, since all three
mint a new row rather than updating an existing one.

**Fix applied:** `addTeam` in `page.tsx` now has both a `loading` state (button shows
"Adding…" and disables) and a synchronous `addingTeamRef` guard checked as the first
line of the handler. `ScoutDialog.save()`, `SupportDialog.save()`, and
`TeamDialog.submitTeam()` each gained the same synchronous `useRef` guard. A
regression test in `__tests__/components.test.tsx` dispatches two clicks inside a
single `act()` call specifically so React hasn't committed the disabling re-render
between them — reproducing the actual race the ref guard closes, not just confirming
the button was already disabled by the second click.

### H3. A-Class and V-Class team-size validation has no upper bound, despite its own error message — FIXED 2026-08-13
`validateTeam()` in `src/utils/validation.ts`:
```ts
} else if (hikeClass === 'A-Class') {
  if (teamSize < 3) results.push(`For A-Class team size must be 3 or 4 your team is ${teamSize}`);
  ...
} else if (hikeClass === 'V-Class') {
  if (teamSize < 3) results.push(`For V-Class team size must be 3 or 4 your team size is ${teamSize}`);
```
Both messages assert the team size "must be 3 or 4," but the code only checks
`teamSize < 3` — there's no `|| teamSize > 4` (or similar) the way B/S/E-Class use an
exact `!== 4` check and the Open classes use `< 3 || > 6`. A team of 8 registered as
A-Class or V-Class passes validation today.

**Fix applied:** added `|| teamSize > 4` to both branches' size check, matching the
bound the error message already asserted (V-Class's own combined-age logic already
special-cased exactly `teamSize === 3` and `teamSize === 4`, confirming 4 was always
the intended cap, not just message text). Regression tests added in
`__tests__/validation.test.ts` for both classes. **This used the existing error
message and V-Class's age logic as the source of truth for "4," since no external
rulebook was available in this environment — worth a quick sanity check against the
real hike rules before the next season, same as any other business-rule change.**

### H4. `HIKE_DATE` is a hardcoded, stale constant with no update mechanism — FIXED 2026-08-13
`src/models/referenceData.ts`:
```ts
export const HIKE_DATE: LocalDate = { year: 2024, month: 10, day: 5 };
```
Every age-based rule in `validateTeam()` and the "Age at hike" text in
`formatDob()` (`src/utils/date.ts`) are computed against this date. It's a hardcoded
constant with no seasonal-update step, no env var, and nothing in `TODO.md` tracking
that it needs to change. As of this review it's roughly two years stale relative to
today's date — if this hasn't already been caught and fixed out-of-band before the
2025/2026 seasons ran, every age-eligibility check for those seasons was computed
against the wrong date.

**Fix applied:** `HIKE_DATE` is now sourced from `NEXT_PUBLIC_DM_HIKE_DATE`
(`YYYY-MM-DD`), parsed by `parseHikeDate()` in `src/models/referenceData.ts`, which
**throws at module load if the var is unset or malformed** rather than defaulting
silently — a wrong-but-present default would just reproduce this exact bug one layer
down. See `design/frontend-conventions.md`'s env-var-flags section and
`TODO.md`'s new "Pre-season checklist" entry (setting the var correctly each season is
still a manual step nothing double-checks against the real event date).

## Medium

### M1. Admin's team actions trust a client-supplied object instead of re-fetching
`POST /api/admin`'s `togglePaid`/`toggleSubmitted`/`deleteTeam` actions
(`src/app/api/admin/route.ts`) operate on `data.team` — the full team object the
client sent back from its own earlier `GET /api/teams?all=true` — without re-fetching
it from DynamoDB first. `saveTeam()` does a full-item `PutCommand`, not a field-level
update, so any field on the admin's now-stale client-side copy overwrites whatever's
currently in the DB (a lost update if the team's owner edited it in between). This is
inconsistent with `/api/teams`'s `DELETE` handler, which explicitly fetches-and-verifies
server-side before acting — see `design/design-principles.md`'s "verify before
cascade." Lower severity than H1–H4 since it requires an admin plus a race window, but
a real gap against this repo's own documented pattern.

**Fix:** re-fetch the team by id server-side in each admin action before mutating it,
or switch `togglePaid`/`toggleSubmitted` to a DynamoDB `UpdateCommand` on just the
changed field instead of a full `Put`.

### M2. `ownerID` query param on `GET /api/teams` is dead
`loadTeams()` in `src/app/page.tsx` calls `/api/teams?ownerID=${user.id}` — but
`GET /api/teams` (`src/app/api/teams/route.ts`) never reads that param; it always
scopes to `session.ownerId` (or all teams, if `all=true`). The `ownerID` value in the
URL has zero effect and misleads a reader into thinking it's load-bearing.

**Fix:** drop the dead query param from the client call, or — if the intent was ever
"let an admin view one specific user's teams" — implement that read on the server side
and document it.

### M3. Dead audit-logging feature
`logEvent()` (`src/services/db.ts`) and the `Log` DynamoDB table (created in
`scripts/create-tables.js`, included in `scripts/backup-dynamo.sh`) are fully
provisioned but **never called** from anywhere in the app — `grep -rn "logEvent" src/`
finds only its own definition.

**Fix:** either wire `logEvent()` into the mutating routes it was clearly built for
(team/scout/support create-delete, admin actions), or remove the table and function
per `CODING_GUIDELINES.md` Section 1 ("prefer the smallest thing that solves the named
problem" — unused infrastructure isn't free, it's a table to back up and a schema to
maintain for a feature nothing exercises).

### M4. `DM_BANKDETS` is documented but never read
`.env.example`, `README.md`'s Environment Variables table, and `DEPLOYMENT.md`'s
Amplify env var table all list `DM_BANKDETS` ("Bank details shown for payment"), but
`grep -rn "DM_BANKDETS" src/ scripts/` returns nothing — it's read nowhere in the code.

**Fix:** either finish wiring it into the payment UI (`TeamDialog`'s payment status
area is the natural spot), or remove the dangling references from `.env.example`,
`README.md`, and `DEPLOYMENT.md` so the docs stop promising a feature that isn't there.

### M5. `breakLock` has no admin-UI action, unlike `admin`
`AdminPanel.tsx`'s Users tab only wires up `toggleAdmin`; there's no equivalent
`toggleBreakLock` action in `POST /api/admin`, even though `breakLock` is fully modeled
everywhere else (`UserModel`, `SessionIdentity`, `cognito.ts`'s `listUsers()`,
`page.tsx`'s `effectiveLocked` check). `STARTUP.md` documents the only way to grant it
today as a raw `aws cognito-idp admin-add-user-to-group` CLI call.

**Fix:** add a `toggleBreakLock` action mirroring `toggleAdmin` almost exactly, and a
matching button in `AdminPanel`'s Users table — or, if CLI-only is intentional (e.g. to
keep it rare/deliberate), say so in a comment and in `design/auth-and-session.md` so
it doesn't read as an oversight.

### M6. `paymentAmount` is never editable — the "Partial" payment status is dead in practice
`TeamModel.paymentAmount` is set to `0` on creation (`page.tsx`'s `addTeam`) and never
appears in any input anywhere — not in `TeamDialog`'s form, not in `AdminPanel`'s
`togglePaid` (which only flips the `paymentRecieved` boolean). `getPaymentStatus()`'s
`Partial (£X of £Y)` branch in `src/utils/validation.ts` can therefore never actually
trigger through normal use of the app today.

**Fix:** either add a way (admin-only, presumably) to record a partial amount, or drop
the partial-payment branch and simplify `TeamModel`/`getPaymentStatus` to the
paid/unpaid state the UI actually supports.

### M7. Several real Cognito failure modes fall through to a generic error
`src/services/cognito.ts`'s `login()`/`register()`/`refresh()`/`adminSetPassword()`
only special-case `NotAuthorizedException`, `UserNotFoundException`, and
`UsernameExistsException`. Real, reachable Cognito exceptions —
`UserNotConfirmedException`, `PasswordResetRequiredException`,
`TooManyRequestsException`, `InvalidPasswordException` (from
`AdminSetUserPasswordCommand` when an admin sets a temp password that doesn't meet
policy) — fall through to `throw e`, surfacing to the user only as `ui/api.ts`'s
generic "Something went wrong. Please try again." `CODING_GUIDELINES.md` Section 7
calls for "a plain-language fallback message" on a user-initiated failure; the
fallback exists, but for these specific, actionable cases it hides information the
user or admin needs (e.g. "you need to reset your password" vs. "try again").

**Fix:** add `AuthError` cases (or a passthrough of Cognito's own message) for these
known exception types, at least for the ones reachable from user-facing flows
(login, register).

## Low

### L1. No dialog uses a real `<form>` — Enter-to-submit is hand-wired and inconsistent
None of the six dialogs wraps its fields in `<form onSubmit={...}>`. Enter-to-submit is
instead wired ad hoc via `onKeyDown` on exactly one field each in `LoginDialog`/
`RegisterDialog`/`LoginDialog`'s new-password step (the last password field only) —
every other field in those dialogs, and every field in `TeamDialog`/`ScoutDialog`/
`SupportDialog`, has no Enter handling at all.

**Fix:** wrap each dialog's inputs in `<form onSubmit={e => { e.preventDefault();
submit(); }}>` for free, consistent, accessible Enter-to-submit, and drop the
per-field `onKeyDown` special cases.

### L2. DynamoDB table names are repeated string literals, not a shared constant
`'Team'`/`'Scouts'`/`'Support'`/`'Log'` are hardcoded independently in
`src/services/db.ts`, `scripts/create-tables.js`, `scripts/backup-dynamo.sh`, and
`scripts/resetDataYearEnd.sh`. Low priority given how rarely these change, but a typo
in one place wouldn't be caught by the type system.

**Fix:** low priority; worth a shared constants module only if one of these files is
touched again for another reason.

### L3. Revealed temp password has no dismiss/auto-clear
`AdminPanel.tsx`'s `tempPassword` banner shows a plaintext temporary password and stays
rendered — including on screen if the admin walks away or screen-shares — until another
admin action runs or the panel is closed.

**Fix:** add a manual dismiss control, or clear it automatically a short time after
display / after it's been copied.

### L4. Admin route mutates the parsed request body in place
`POST /api/admin`'s `togglePaid`/`toggleSubmitted` handlers do
`team.paymentRecieved = !team.paymentRecieved;` directly on the object returned by
`await req.json()`, then pass that same object to `saveTeam()`. Works, but reads as a
shortcut — per `CODING_GUIDELINES.md` Section 1 ("optimize for the next reader"),
building `{ ...team, paymentRecieved: !team.paymentRecieved }` would be clearer that a
new value is being computed rather than an existing object edited in place.

### L5. `calculateAge()` doesn't account for leap years
`src/utils/date.ts`'s `calculateAge()` divides elapsed days by a flat `365`. Ages are
`Math.floor()`-ed before use in `validateTeam()`, so this only matters in the rare case
where a scout's real age (accounting for leap days) sits within a day of an integer
year boundary that a class rule checks against. Noted for completeness; not worth
fixing in isolation unless H3/H4 are being touched anyway.

## Not flagged (checked, no issue found)

- `dangerouslySetInnerHTML`: not used anywhere in `src/` — passes
  `CODING_GUIDELINES.md` Section 8 cleanly.
- Ownership enforcement on `/api/scouts` and `/api/support` (`ownsTeam()` in both
  route files) correctly checks the *team's* ownership, not a naive `ownerID` string
  compare — matches `design/data-model-and-authorization.md`.
- Cookie flags (`httpOnly`, `secure` in production, `sameSite: 'lax'`) on both session
  cookies are correct.
