# Auth and session architecture

## What it replaced

Before `f3cc06a` (2026-08-13), user management was bespoke: unsalted MD5 password
hashes, no server-side session persistence at all (a page reload always logged you
out — nothing was carrying login state beyond in-memory React state), and API routes
that trusted whatever `ownerID` the client sent, unauthenticated. All of that is now
Amazon Cognito plus a verified session cookie. The legacy code path was fully removed
in `487b331` once the migration was confirmed complete; see
[design-principles.md](./design-principles.md)'s "decouple delete-the-code from
delete-the-data" for why the underlying `User` table itself is still around.

## Migrating existing accounts without a data migration or a forced reset

Every `Team`/`Scouts`/`Support` row's `ownerID` points at a user id that predates
Cognito. Rather than rewriting that data, Cognito users carry a `custom:legacyId`
attribute that resolves back to it:

- `lambda/cognito-migrate-user` is wired to Cognito's `UserMigration_Authentication`
  and `UserMigration_ForgotPassword` triggers. On a legacy user's first login attempt
  post-cutover, it checks the *old* MD5 hash directly against the `User` table (the
  hash function is deliberately duplicated from `src/utils/hash.ts` rather than
  imported — see design-principles.md), and if it matches, seeds a new Cognito user
  with `custom:legacyId` set to the old app-generated id and marks them `CONFIRMED`.
  From that point on, the account is a normal Cognito account; the Lambda never runs
  for that user again.
- `lambda/cognito-post-auth` (the Post Authentication trigger) syncs the legacy
  `admin`/`breakLock` boolean flags off the `User` table onto same-named Cognito
  groups, once, gated by a `custom:groupsSynced` attribute so it doesn't re-scan the
  table on every subsequent login. A user with no `custom:legacyId` (a brand-new,
  post-Cognito signup) has nothing to sync and is marked synced immediately.
- `src/lib/session.ts`'s `resolveOwnerId()` is the read-side of this: it returns
  `claims['custom:legacyId'] || claims.sub`, so every DB read/write uses the correct
  id transparently regardless of whether the user predates the migration.

## Session model

- Two httpOnly cookies: `dm_id_token` and `dm_refresh_token` (`ID_COOKIE`/
  `REFRESH_COOKIE` in `src/lib/session.ts`). `secure` is set from `NODE_ENV`, not a
  separate flag.
- The browser **never talks to Cognito directly** — only to this app's own
  `/api/auth/*` routes (`route.ts`, `logout/route.ts`, `refresh/route.ts`,
  `session/route.ts`). Those routes call the AWS SDK server-side
  (`src/services/cognito.ts`, using `Admin*` API calls) and set/clear the cookies.
  This keeps the Cognito app client secret-free on the client and means a Cognito
  outage or API shape change only ever needs handling in one server-side module.
- `src/app/page.tsx` restores the session on mount via `GET /api/auth/session` (this
  is what fixes the "reload always logs you out" bug — there was previously nothing
  behind React state at all), and silently refreshes on a client-side 45-minute
  timer, well under the ~60 minute id token expiry, so an open tab never hits a hard
  logout mid-session.

## The middleware trust boundary

`src/middleware.ts` runs on every `/api/:path*` request (its `matcher`) except
`/api/auth/*`, which is excluded because that's how a session gets established in the
first place — there's nothing to verify yet. For everything else, it:

1. Reads and verifies the id token cookie (`verifyIdToken`, backed by
   `aws-jwt-verify`'s `CognitoJwtVerifier`) — a missing or invalid token is a 401,
   full stop.
2. **Strips** any incoming `x-user-owner-id`/`x-user-sub`/`x-user-groups` headers
   before setting its own — so a client can't spoof trusted identity by sending those
   headers directly. Only middleware is allowed to set them, and it does so right
   before forwarding.
3. Sets them from the verified claims and forwards the request.

Every route handler downstream reads identity via `getSession()`
(`src/lib/authz.ts`), which reads those headers back out — and **throws** if they're
missing, rather than treating that as a normal unauthenticated state. That's a
deliberate signal: if a route reaches `getSession()` without the headers set, the
route was excluded from the middleware matcher, which is a bug (an unprotected
route), not a request an external caller can trigger. See
[design-principles.md](./design-principles.md).

## Password / challenge handling

- `register()` (`src/services/cognito.ts`) creates the user with `AdminCreateUserCommand`
  then immediately promotes the password to permanent with `AdminSetUserPasswordCommand`
  — deliberately skipping Cognito's default forced-password-change and email
  confirmation flow, to match the legacy register-then-login UX (no extra step).
- Admin-initiated password resets (`AdminPanel`, `POST /api/admin` with
  `action: 'resetPassword'`) generate a random *non-permanent* password
  (`generateTempPassword()`), which forces a real `NEW_PASSWORD_REQUIRED` challenge on
  the user's next login — replacing what used to be a fixed, known reset password
  (`password1`) in the legacy system. `LoginDialog` handles this challenge by prompting
  for a new password and calling `completeNewPassword`. The temp password is returned
  once in the API response for the admin to relay out of band (phone/email) — it is
  never emailed automatically (see `TODO.md` re: Cognito's email cap).
- `forgotPassword()`/`confirmForgotPassword()` already exist in `src/services/cognito.ts`
  and work, but nothing calls them yet — no `/api/auth` action, no UI. Tracked in
  `TODO.md`; the only live reset path today is the admin-initiated one above.

## Admin/breakLock as Cognito groups, not a data flag

`admin` and `breakLock` are Cognito groups, checked off the `cognito:groups` claim —
not a boolean column read from a database on every request. The chain is:
`middleware.ts` puts the group list on `x-user-groups` → `getSession()` computes
`isAdmin`/exposes `groups` → route handlers and `src/app/page.tsx` branch on that
directly. `POST /api/admin`'s `toggleAdmin` action calls
`cognito.setGroupMembership()`, which is a real IAM-backed group add/remove, not a
row update. This is why removing the legacy `db.ts` user functions in `487b331` didn't
touch authorization at all — it was already fully migrated off the `User` table by
that point.
