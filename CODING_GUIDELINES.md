# Coding Guidelines

Prescriptive, forward-looking rules for writing code in this repo — as opposed to
`design/design-principles.md`, which is retrospective (*why* past decisions were
made). This document is normative: follow it for new code, and bring existing code
into line with it opportunistically when you're already touching a file, not as a
dedicated pass.

Scope: this repo's actual stack — **Next.js 15 (App Router) + TypeScript + Tailwind
CSS** for both the frontend and the API routes, **AWS SDK v3 clients called directly
from server-side code** (`src/services/db.ts` for DynamoDB, `src/services/cognito.ts`
for Cognito — no Amplify Gen2 or other backend framework in between), plus two
standalone Lambda functions (`lambda/cognito-migrate-user`, `lambda/cognito-post-auth`)
that ship as their own zips with no shared build step, and **Jest (`ts-jest`, jsdom) +
React Testing Library** for verification (no Vitest, no Playwright in this repo). Every
principle below is illustrated with a real example already in this codebase where one
exists, rather than a generic snippet, so this stays checkable against the code instead
of just aspirational.

## 1. General principles (apply to everything)

- **Prefer the smallest thing that solves the named problem.** No speculative
  flexibility, no config options nobody asked for, no abstraction built for a second
  use case that doesn't exist yet. Three similar lines across two API routes is better
  than a shared helper extracted for them — see `design/design-principles.md`'s "Prefer
  the narrowest fix; escalate scope only once it's justified" for the product-level
  version of this same rule.
- **Optimize for the next reader, not for cleverness.** A junior engineer or a future
  you, six months on, should be able to read a function top to bottom and understand
  it without reaching for a debugger. If a one-liner needs a comment to explain what
  it does, it's usually clearer as three lines that don't.
- **Comments explain *why*, never *what*.** Well-named identifiers already say what
  the code does. A comment earns its place only when it records a non-obvious
  constraint, a workaround for a specific bug, or a reason a reader would otherwise
  have to reverse-engineer — see the comment above `resolveOwnerId()` in
  `src/lib/session.ts` (explains *why* a legacy id takes priority over the Cognito
  `sub`, not what the one-line function does) for the standard this repo already holds
  itself to.
- **DRY is about knowledge, not text.** Two pieces of code that look similar but
  change for unrelated reasons should stay separate, even if that means some
  duplication. Only unify code whose *reason to change* is genuinely the same. See
  `lambda/cognito-migrate-user/index.js`'s `hashPassword()` — deliberately duplicated
  from `src/utils/hash.ts` rather than imported, because the Lambda ships as its own
  zip with no build step and this hash is meant to be the last place it ever runs; see
  `design/design-principles.md`'s "A duplicated legacy secret computation can be the
  deliberately correct choice."
- **YAGNI beats extensibility theater.** Don't add a plugin system, a strategy
  pattern, or a generic config object for a requirement that's currently exactly
  one case. `POST /api/admin` and `POST /api/auth` are each a flat `if (action === ...)`
  chain over a handful of concrete actions, not a registered-handler framework — resist
  building one ahead of an actual need for that flexibility.

## 2. SOLID, adapted to functional TypeScript/React

SOLID was written for class-based OOP; this codebase has no classes outside the AWS
SDK's own internals. The principles still apply — just to functions, components, and
modules instead of classes. Treat "a class" below as "a function, component, or
module."

- **S — Single Responsibility.** A function, hook, or component should have one
  reason to change. `src/services/db.ts`'s `saveTeam`/`deleteTeam`/`getTeamsByOwner`
  are each a few lines doing exactly one thing; `src/components/ui/api.ts`'s
  `apiRequest()` only knows how to turn a `fetch` response into parsed data or a typed
  `ApiError`, nothing about what any specific endpoint's payload looks like. If a
  function's name needs "and" to describe it, split it.
- **O — Open/Closed.** Prefer extension over modification. The action-dispatch API
  routes are the canonical example: adding a new admin action to `POST /api/admin`
  (`src/app/api/admin/route.ts`) means adding one more `if (action === '...')` block —
  every existing action's block, and every caller of the route, is untouched. When
  adding a new case to an existing concept (a new admin action, a new hike class in
  `src/utils/validation.ts`), look for the place that's already designed to be
  extended before editing unrelated call sites.
- **L — Liskov Substitution.** Anything implementing a shared shape must be usable
  everywhere that shape is expected, without surprising the caller. `Modal`
  (`src/components/ui/Modal.tsx`) doesn't know or care what any of the six dialogs
  (Login, Register, AdminPanel, Team, Scout, Support) render as `children` — every one
  of them is substitutable as "a thing that renders inside a Modal" with identical
  title/close/Escape-key behavior. If a new dialog needs Modal itself to special-case
  it, the shared contract is wrong, not just the new dialog.
- **I — Interface Segregation.** Depend on the narrowest shape that does the job, not
  a fat one with unused fields. `SessionIdentity` (`src/lib/authz.ts`) carries exactly
  `ownerId`, `sub`, `groups`, `isAdmin` — a route that only needs to check `isAdmin`
  isn't forced to depend on the full raw Cognito claim set (`SessionClaims` in
  `src/lib/session.ts`) to get it. Don't force a caller to depend on a wider type than
  the one field it actually uses.
- **D — Dependency Inversion.** Components should depend on an abstraction, not the
  concrete implementation underneath it. No dialog component calls `fetch` directly —
  they call `postJson()`/`deleteJson()` from `src/components/ui/api.ts`. No page
  component calls DynamoDB or Cognito directly — `src/app/page.tsx` calls this app's
  own `/api/*` routes, and only the route handlers import `src/services/db.ts`/
  `src/services/cognito.ts`. That boundary is what let the response-parsing bug fix in
  `0154e66` land in one file (`ui/api.ts`) instead of six dialogs each needing an
  individual patch.

## 3. React + TypeScript conventions

- **Strict mode, always.** `tsconfig.json` already has `"strict": true` — don't relax
  this or add an `any` to make an error go away; fix the actual type issue.
- **Function components + hooks only.** No class components anywhere in this repo;
  don't introduce one.
- **Type props and state explicitly**, especially when a value can be `null`/
  `undefined` — see `ScoutDialog`'s `Props` (`scout: ScoutModel | null`) and the
  model interfaces in `src/models/types.ts` for the house style: a plain `interface`,
  no unnecessary generics.
- **Hooks only at the top level, never inside a condition or loop** — this is a React
  rule, not a style preference; breaking it produces silent, hard-to-debug state bugs.
- **Prefer a `Set`/`Map` keyed lookup over `.find()` in a loop** when a value is
  checked repeatedly against a growing collection — see `listUsersInGroup()` in
  `src/services/cognito.ts`, which returns a `Set<string>` of usernames specifically
  so `listUsers()` can check membership with `.has()` while mapping over every user,
  instead of an O(n²) `.find()` per user.
- **This app currently favors "await the network call, then render the response"
  over optimistic local updates** — see `addTeam`/`deleteTeamHandler` in
  `src/app/page.tsx`, which `await` the `fetch` and only update state from what the
  server actually returned. There's no `src/context/`-style global store here for an
  optimistic update to reconcile against later, so don't introduce one speculatively.
  If a specific interaction later needs to feel instant (a large list, a slow
  endpoint), that's a deliberate, scoped decision to make at that point — update this
  guideline with the real pattern once it exists, rather than assuming it retroactively.
- **Guard double-submission with a `loading` state that disables the triggering
  control**, not just a `disabled` prop tied to something else. Every dialog's `save`/
  `submit` handler sets `loading` to `true` before the `await` and passes it to
  `Button`'s `loading` prop (which sets `disabled` and `aria-busy`) — see
  `ScoutDialog.tsx`'s `save()`. If a specific action turns out to be vulnerable to two
  fast clicks landing before a re-render (this hasn't been an observed bug here yet),
  a synchronous `useRef` guard set as the first line of the handler is the stronger
  fix — reach for it only once a real race is demonstrated, per Section 1.
- **Pick the correct ARIA role for what a control actually does** — `Banner.tsx` uses
  `role="alert"` for error/success/warning messaging because that's genuinely an
  assertive live-region announcement, not decoration. Getting this wrong reads fine
  visually but is actively misleading to assistive tech.

## 4. State management

This app has no global state library and no `React.createContext` anywhere in
`src/` — state lives as local `useState` in the component that owns it, and flows
down through props.

- **Lift state only as far as its actual consumers require**, and no further.
  `src/app/page.tsx` owns `user`, `teams`, and which dialog is open, because those are
  genuinely shared across the page; each dialog (`ScoutDialog`, `TeamDialog`, ...)
  owns its own form fields (`fullName`, `dob`, `loading`, `error`, ...) locally,
  because nothing outside that dialog needs them. Don't hoist form-local state up to
  `page.tsx` "in case" a sibling needs it later.
- **If a future feature genuinely needs state shared across unrelated parts of the
  tree** (not just parent-to-child props), that's the point to introduce a
  `React.createContext` — not before. When that happens, give the new context one job
  (mirroring `src/lib/authz.ts`'s `SessionIdentity` being scoped to exactly identity,
  nothing else), and record the decision in `design/design-principles.md` the same way
  every other architectural choice in this repo is recorded.
- **Server-held state (DynamoDB rows, Cognito users) is only ever read/written through
  this app's own `/api/*` routes from client code** — see Section 2's Dependency
  Inversion bullet. Don't introduce a second way to reach `src/services/db.ts` or
  `src/services/cognito.ts` from a `'use client'` component.

## 5. AWS integration (DynamoDB + Cognito, called directly)

There's no Amplify Data/Auth layer generating a typed client here — `src/services/
db.ts` and `src/services/cognito.ts` are thin, hand-written wrappers around the AWS
SDK v3, and every authorization decision is explicit application code.

- **Deny-by-default, and the most specific check wins.** `src/middleware.ts` rejects
  any `/api/*` request without a verified session before a route handler ever runs;
  every handler that needs more than "any logged-in user" (admin actions, `GET
  /api/teams?all=true`) then adds its own explicit `if (!session.isAdmin) return 403`
  check as the first line — see `src/app/api/admin/route.ts` and `teams/route.ts`.
  Never assume the middleware's baseline check is sufficient for a route that actually
  needs more.
- **Never let a query silently return more than the caller is authorized to see.**
  There's no framework-level `authMode` here to get wrong, but the same failure mode
  exists in `src/services/db.ts`: `getTeamsByOwner()` (scoped by `ownerID` via
  `QueryCommand`) and `getAllTeams()` (unscoped `ScanCommand`, admin-only) must never
  be conflated. `getAllTeams()` may only ever be called from a code path that has
  already checked `session.isAdmin` — see `GET /api/teams`'s `all=true` branch.
- **Keep secrets and credentials server-side, always.** `CognitoIdentityProviderClient`
  and the DynamoDB client are only ever constructed in server-side modules
  (`src/services/*.ts`, route handlers, `src/middleware.ts`) — never imported into a
  `'use client'` component. `COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID`/AWS credentials
  are plain server env vars, never `NEXT_PUBLIC_*`. The session/refresh tokens
  themselves are set as `httpOnly` cookies (`src/lib/session.ts`) specifically so
  client-side JS can never read them. `NEXT_PUBLIC_DM_DEV`/`NEXT_PUBLIC_DM_LOCK` are
  intentionally public, non-secret display flags — don't confuse a build-time
  `NEXT_PUBLIC_*` var with anything that needs to stay private; anything in one ships
  in the browser bundle.
- **Prefer a plain string field over a TypeScript union/enum for a value the business
  might extend.** `TeamModel.hikeClass` (`src/models/types.ts`) is a plain
  `string | undefined`, even though `validateTeam()` (`src/utils/validation.ts`)
  branches on a fixed, known set of class names (`'A-Class'`, `'B-Class'`, the
  `openClasses` list, ...). Adding a new hike class is a one-line addition to that
  branch, not a type change that has to propagate everywhere the field is referenced.
- **An id is assigned server-side if the caller doesn't already have one** — see
  `saveTeam`/`saveScout`/`saveSupport` in `src/services/db.ts`:
  `if (!team.id) team.id = uuid();`. This app doesn't do optimistic local updates (see
  Section 3), so there's no need for the client to mint an id up front the way an
  optimistic-UI app would; the server is free to assign one and the client renders
  from what the server returns.
- **A relation you don't need referential integrity for is a plain foreign-key-style
  field, not a managed relation.** DynamoDB has no relations at all here — `Scouts`/
  `Support`'s `ownerID` field is just a string pointing at a `Team`'s `id`. Nothing
  enforces that link automatically: `deleteTeam()` has to explicitly look up and
  delete each associated `Scouts`/`Support` row itself before deleting the team (see
  `src/services/db.ts`). Any change to that cascade is application logic, not a schema
  concern.

## 6. Testing (Jest + ts-jest + React Testing Library)

- **Test behavior, not implementation.** Query by role, label, or visible text
  (`getByRole`, `getByPlaceholderText`) — not by CSS class or a test-only id — so a
  test keeps passing through a refactor that doesn't change what the user sees or
  does. See `__tests__/components.test.tsx`.
- **Mock at the actual network/service boundary, not a hand-rolled fake of your own
  component's props.** Component tests mock `global.fetch` directly (see
  `components.test.tsx`'s `global.fetch = jest.fn()`); API route tests mock the
  service module the route imports (`jest.mock('@/services/db', ...)`,
  `jest.mock('@/services/cognito', ...)` in `__tests__/api-authz.test.ts`) rather than
  mocking the route handler's own internals.
- **A guard against a real incident deserves a regression test that reproduces it,
  not just a happy-path test.** `components.test.tsx`'s "shows a fallback error
  instead of crashing on a bare 500 (no JSON body)" test exists because that exact
  scenario silently broke registration in production before `ui/api.ts` existed — see
  `design/design-principles.md`. When you fix a bug that actually shipped, add the
  test that would have caught it, not only the fix.
- **Verify an authorization boundary with a request built from explicit headers, not
  just a logged-in happy path.** `api-authz.test.ts`'s `req()` helper constructs a
  `NextRequest` with specific `x-user-owner-id`/`x-user-groups` values so each test can
  assert the exact denial (wrong owner, missing admin group) a route handler is
  responsible for — this is the pattern to follow for any new authorization check, the
  same way `design/data-model-and-authorization.md` documents what each check is
  guarding against.
- **A route handler under test that touches `NextRequest`/`NextResponse` needs the
  node test environment, not the default jsdom one.** See the `/** @jest-environment
  node */` pragma at the top of `api-authz.test.ts` — jsdom (this project's default,
  set in `jest.config.ts`) doesn't provide the Fetch API globals route handlers use.
- **When you find yourself manually testing the same thing twice, write it down as a
  real test instead.**

## 7. Error handling

- **Fire-and-forget backend writes get a `.catch(console.error)`, not a silent
  swallow and not a re-thrown exception that would crash an optimistic update
  already shown to the user.** Log the failure for diagnosis rather than surfacing a
  disruptive error for something the user can't act on in the moment.
- **A user-initiated action that can fail (a save, a login, a delete) gets a real
  error state surfaced in the UI**, with a plain-language fallback message — see
  every dialog's `catch (e) { setError(e instanceof ApiError ? e.message :
  '...') }` pattern (e.g. `ScoutDialog.tsx`'s `save()`), not a console-only log the
  user never sees for something they're actively waiting on.
- **Never let a caught error be silently discarded with an empty `catch {}`** unless
  the comment directly above or on the line explains why swallowing it is correct.
  See `src/components/ui/api.ts`'s `catch { // Non-JSON or empty body - fall through
  with body left as null. }` and `src/lib/session.ts`'s `verifyIdToken`'s
  `catch { return null; }` (an unverifiable token — expired, tampered, wrong pool —
  deliberately becomes "no session" for the caller, not a thrown error) for the
  standard: the fallback behavior is intentional and documented, not an oversight.
- **Validate at the boundary, trust internal code past it.** API route handlers
  validate request bodies at the edge — see `POST /api/auth`'s password-length/
  complexity checks in `src/app/api/auth/route.ts` before ever calling
  `cognito.register()`. `src/services/db.ts`'s functions trust the shape of what a
  route handler passes them rather than re-validating it.

## 8. Security

- **Never introduce `dangerouslySetInnerHTML`.** Nothing in this app currently
  renders raw HTML — every dialog and page renders plain data through ordinary JSX.
  If a future feature seems to need raw HTML rendering (e.g. rich text), that's a
  signal to reconsider the feature's design, not to add `dangerouslySetInnerHTML`.
- **No secret, token, or credential ever appears in frontend code, a committed file,
  or a build-time `NEXT_PUBLIC_*` env var.** See Section 5 — server-only env vars and
  `httpOnly` cookies are the only sanctioned path for anything like this.
- **Treat every external input as untrusted** — a request body, a cookie, a URL
  param. Parse it defensively rather than assuming it matches the expected shape: see
  `src/components/ui/api.ts`'s `try { body = await res.json(); } catch { ... }`, and
  `src/lib/authz.ts`'s `getSession()` explicitly checking `ownerId`/`sub` are present
  before trusting them. See `design/design-principles.md`'s "the server always
  overrides client-supplied identity" for why a request body's own claimed `ownerID`
  is never trusted for a write, even from an authenticated user.

## Keeping this useful

Like `design/design-principles.md`, this is a living document. When a new pattern
gets established, a principle above turns out to be wrong, or a real bug reveals a
rule that should have been here, update this file in the same change rather than
letting the lesson live only in `CHANGELOG.md` or a conversation.
