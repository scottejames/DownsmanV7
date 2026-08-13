# Design principles

Retrospective — *why* past decisions were made, illustrated with what actually
happened in this codebase, not abstract advice. Update an entry when a later change
confirms, refines, or contradicts it.

## Migrate transparently rather than force a reset

The Cognito cutover (`f3cc06a`) preserved every existing account rather than requiring
re-registration. `lambda/cognito-migrate-user` checks a user's legacy MD5 hash exactly
once, on their next real login, and stamps their existing app-generated id onto
`custom:legacyId` so every `Team`/`Scouts`/`Support` row keeps resolving without a data
migration. See [auth-and-session.md](./auth-and-session.md).

**Why:** this is a low-traffic seasonal signup tool used by real Scout leaders — forcing
everyone to re-register or reset a password on a hard cutover date would have been
disruptive for no security benefit the transparent path doesn't also get.

**How to apply:** when replacing a system real users depend on, prefer a path that
migrates identity/state on next natural use over one that requires everyone to take an
action on a deadline.

## Fail loud on a missing trust boundary, not silent

`getSession()` (`src/lib/authz.ts`) throws if the identity headers `middleware.ts` is
supposed to inject aren't present, rather than returning `null` and letting the caller
degrade gracefully. The comment is explicit: this means the route isn't covered by the
middleware matcher, which is a bug in the app, not a request state a real caller can
trigger.

**How to apply:** when a value should be structurally guaranteed by something upstream
(middleware, a wrapper, a build step), throwing on its absence surfaces a real
programming error immediately instead of letting it masquerade as a data problem.

## The server always overrides client-supplied identity, never trusts it

`POST /api/teams` sets `team.ownerID = session.ownerId` unconditionally, discarding
whatever `ownerID` the client sent — see `src/app/api/teams/route.ts`. `DELETE
/api/teams` goes further: it re-fetches the team server-side by id and checks
`existing.ownerID` before allowing the delete, rather than trusting the client-supplied
object it was given (which is about to drive a cascading delete into `Scouts`/
`Support`). Same pattern in `src/app/api/scouts/route.ts` and `support/route.ts`.

**Why:** a `PutCommand` will happily overwrite any row if you get the key wrong, and the
`ownerID` partition key is the actual multi-tenancy boundary (see
[data-model-and-authorization.md](./data-model-and-authorization.md)) — trusting a
client-sent `ownerID` would let any authenticated user write into another user's
partition just by editing the request body.

**How to apply:** any field that determines *who owns this row* must be set from the
verified session server-side, never round-tripped from client input — even on an
authenticated route.

## Decouple "delete the code" from "delete the data"

`487b331` removed the legacy MD5 auth code (`hash.ts`, the legacy CRUD functions in
`db.ts`, `make-admin.sh`) once the Cognito migration was verified complete. It
deliberately left the `User` DynamoDB table itself in place, after taking a backup —
see `TODO.md`'s "Drop the legacy `User` DynamoDB table" item. Removing the dead code
path and removing the underlying data are treated as two separate decisions with two
separate risk profiles; the second one is explicitly deferred to a human, with a backup
already in hand.

**How to apply:** when retiring a system, code removal can happen as soon as nothing
live depends on it; irreversible data removal is a separate, later decision — don't
bundle them into one commit just because they're related.

## Prefer the narrowest fix; escalate scope only once it's justified

The Dependabot cleanup (`8c7ff9c` → `3182b9b` → `e7e830e`) started with `package.json`
`overrides` pinning transitive dependencies — the smallest change that clears an alert
without touching app code. The Next.js 14→15 major bump was only taken once it was
confirmed the two biggest 15.x breaking changes (`cookies()`/`headers()`/`params`
becoming async, `next/image`) don't apply to this app's actual code, and was verified
with the full test suite, a production build, and a live browser walkthrough of the
core register → login → add team → edit team flow — not just "the types still compile."

**How to apply:** reach for the smallest change that fixes the actual problem first;
justify a wider-blast-radius change (a major version bump, a rewrite) with a concrete
reason the narrow fix doesn't cover, and verify it with more than a type-check.

## Fix a bug once, at its root, after it appears more than once

Every dialog component independently did `const d = await res.json(); setError(d.error)`,
which throws uncaught (silently, from the user's perspective) if the server ever returns
a non-JSON body — a bare 500, a dropped connection. This was the actual root cause of a
real prod incident (registration silently doing nothing). Rather than patching each of
the six dialogs, `0154e66` centralized response parsing once in
`src/components/ui/api.ts` and rebuilt every dialog on top of it. See
[frontend-conventions.md](./frontend-conventions.md).

**How to apply:** when the same defensive fix would need to be copy-pasted into three or
more call sites, that's the signal to extract it instead — not before a real second (or
third) occurrence justifies it.

## A duplicated legacy secret computation can be the deliberately correct choice

`lambda/cognito-migrate-user/index.js` reimplements the MD5 hash from
`src/utils/hash.ts` verbatim instead of importing it, with a comment explaining why:
the Lambda ships as its own zip with no build step, and — since this hash is
deliberately weak and legacy-only — this is meant to be the *last* place it ever runs.

**How to apply:** this is a deliberate exception to normal DRY practice, not a
precedent — duplicate only when sharing the code would require infrastructure
(a build/bundling step) that doesn't otherwise exist for a code path that's explicitly
being phased out, and say so in a comment at the point of duplication.

## Environment-driven behavior over separate build configs

Dev-vs-prod DynamoDB endpoint (`DM_DEV`), a visible "DEV" banner
(`NEXT_PUBLIC_DM_DEV`), and a global read-only "entries closed" mode
(`NEXT_PUBLIC_DM_LOCK`, overridable per-user via the `breakLock` Cognito group) are all
plain runtime env vars read directly in `src/services/db.ts` and `src/app/page.tsx`,
not separate build targets or config files.

**How to apply:** for an app this size, a boolean env var checked at the point of use is
enough — don't introduce a config-file layer or build-time branching until a flag
actually needs more than true/false.

## Give admins a way to see live config, not just documented config

`CODE_REVIEW_2026-08-13.md`'s H4 and `63912a0` are two separate real incidents caused
by the same underlying problem: a config value (`HIKE_DATE`, then later the
`COGNITO_*` env vars in the Amplify build spec) silently drifted from what the docs
claimed, and nothing surfaced the mismatch until it broke something in production. The
System Config screen (admin-only, `src/components/SystemConfig.tsx` +
`GET /api/admin/config`) exists to close that gap for the app's own env vars: it
reads `process.env` directly and shows exactly what a given deployment actually has
set, right now — not what `.env.example`/`README.md`/`DEPLOYMENT.md` say *should* be
set. It deliberately includes `DM_BANKDETS` even though it's dead code (see M4),
because hiding a variable from this screen would defeat the point of it being a source
of truth.

**How to apply:** when documentation and runtime config can drift apart silently (an
env var, a feature flag, anything set outside the codebase itself), prefer building a
way to inspect the *live* value over trusting the docs to stay accurate — this repo has
already been bitten twice by the alternative.
