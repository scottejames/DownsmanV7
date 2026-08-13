# Data model and authorization

## Schema

Four DynamoDB tables (`src/services/db.ts`, provisioned by `scripts/create-tables.js`):

- **Team** — hash `ownerID`, range `id`. One row per registered team.
- **Scouts** — hash `ownerID`, range `id`. `ownerID` here is the *team's* id, not a
  user id — a scout belongs to a team, not directly to a user.
- **Support** — hash `ownerID`, range `id`. Same shape as Scouts: `ownerID` is the
  owning team's id.
- **Log** — hash `ownerID` (always the literal string `"log"`), range `id`. A flat
  append-only event log, not partitioned per user — see `logEvent()`.

User accounts do **not** live in DynamoDB anymore. Cognito is the source of truth for
identity; see [auth-and-session.md](./auth-and-session.md). The legacy `User` table
still exists (kept as a reversible safety net, backed up) but the live app never reads
or writes it.

## `ownerID` is the multi-tenancy boundary, and it's enforced server-side

Every table's partition key is `ownerID`, and every query scopes by it
(`getTeamsByOwner`, `getScoutsByOwner`, `getSupportByOwner` all use `QueryCommand`
with `KeyConditionExpression: 'ownerID = :o'`). This is the actual mechanism that
keeps one user's teams invisible to another user — not an application-level filter
after fetching everything.

Because of that, the API routes are careful never to let a client's request body
determine which partition a write lands in or a delete reads from:

- `POST /api/teams` forces `team.ownerID = session.ownerId` before saving, discarding
  whatever the client sent.
- `DELETE /api/teams` re-fetches the team server-side by id (`getTeamById`, a `Scan`
  with a filter — see "known scan usage" below) and checks
  `existing.ownerID === session.ownerId` (or `session.isAdmin`) *before* calling
  `deleteTeam()`, rather than trusting the client-supplied team object it was given.
  This matters specifically because `deleteTeam()` cascades: it looks up and deletes
  every `Scouts`/`Support` row for that team's id first. A trusted-but-wrong `ownerID`
  in a client-supplied object would cascade-delete another user's child rows.
- `src/app/api/scouts/route.ts` and `support/route.ts` follow the same
  fetch-then-verify-then-mutate shape.
- Admin routes (`GET/POST /api/admin`) check `session.isAdmin` as the very first line
  of every handler and return 403 otherwise — admin bypasses the ownership check
  entirely rather than being modeled as "owns everything."

See [design-principles.md](./design-principles.md)'s "server always overrides
client-supplied identity" for the general form of this rule.

## Cascading deletes are application code, not a DB feature

`deleteTeam()` loops over that team's scouts and support rows and deletes them
individually before deleting the team itself — there's no DynamoDB Stream, TTL, or
foreign-key mechanism doing this. At this app's scale (a seasonal registration tool,
tens of teams) that's a deliberate, acceptable trade-off rather than an oversight;
revisit only if row counts genuinely grow large enough for N+1 deletes to matter.

## Known `Scan` usage

`getAllTeams()` (admin "view all teams") and `getTeamById()` (used specifically to
verify ownership before a delete) both use `ScanCommand` rather than a `Query`,
because neither has an index to query by by (there's no secondary index on `id`
alone, and "all teams" has no key to query by definition). Both are bounded by this
app's actual data volume — acceptable here, but a `getTeamById` on a
significantly larger table would want a GSI on `id` instead of scanning the whole
table on every delete-authorization check.

## Admin/breakLock live in Cognito, not this schema

The legacy `User` table had `admin`/`breakLock` boolean columns; they're now Cognito
group memberships, not DynamoDB fields — see
[auth-and-session.md](./auth-and-session.md)'s "Admin/breakLock as Cognito groups"
section. `TeamModel`/`ScoutModel`/`SupportModel`/`LogModel` in `src/models/types.ts`
have no user-identity fields beyond `ownerID`; `UserModel` still exists as a type
(used for the shape of `safeUserFromClaims()`'s return value) but nothing constructs
one from a database row anymore.

## Action-dispatch API routes for admin and auth

`POST /api/admin` and `POST /api/auth` both use a single endpoint with an `action`
field in the body (`toggleAdmin`, `deleteUser`, `resetPassword`, `togglePaid`,
`toggleSubmitted`, `deleteTeam` for admin; `login`, `completeNewPassword`, `register`
for auth) rather than one REST-shaped route per action. This keeps every admin/auth
operation's authorization check (`session.isAdmin`) in exactly one place per file
instead of duplicated across many small route files, at the cost of the route not
being self-documenting from its URL alone. If this set of actions grows much larger,
revisit whether it should split — but as of this writing each file is a short,
flat `if (action === ...)` chain that's easy to read top to bottom.
