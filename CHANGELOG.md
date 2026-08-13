# Changelog

All notable changes to this project are documented here, newest first.
This project doesn't cut versioned releases, so entries are grouped by date rather than version number.

## 2026-08-13 (6)

### Fixed
- **Editing a team and saving could silently revert the previous save.** `page.tsx`'s `selectedTeam` was never refreshed after a successful save/submit/withdraw in `TeamDialog` - only the `teams` list was reloaded. Reopening "Edit Team" without first re-clicking the team's row in the table handed `TeamDialog` a stale copy of the team, and since a save does a full-item overwrite (not a merge), saving again - even with no further changes - wrote that stale copy straight back over the real data, wiping out whatever was changed in the prior save (reported: assign a hike class, save, "Edit Team" again shows the class as unset, saving again blanks it in the database). `loadTeams()` now re-derives `selectedTeam` from the freshly-fetched list by id. Regression test in `__tests__/teamEditFlow.test.tsx` reproduces the exact repro steps.

## 2026-08-13 (5)

### Added
- `scripts/toggle-admin.js` (also `npm run toggle-admin -- <dev|prod> <username>`) - grants/revokes the Cognito `admin` group for a user, toggling on repeated runs. Looks up the target pool by name (`Downsman-dev`/`Downsman-prod`, same pattern as `create-cognito-pool.js`), describes the exact change (current state, new state, which environment), and requires typed `"yes"` confirmation before making it - matching the confirmation bar `resetDataYearEnd.sh` already holds itself to. Replaces the manual `aws cognito-idp admin-add-user-to-group` CLI step in `STARTUP.md`.

## 2026-08-13 (4)

### Added
- **System Config screen** (`src/components/SystemConfig.tsx`), admin-only, launched from a new "System Config" button in `AdminPanel`. Shows the live value of every environment variable that configures this app (`NEXT_PUBLIC_DM_DEV`, `NEXT_PUBLIC_DM_LOCK`, `NEXT_PUBLIC_DM_HIKE_DATE`, `DM_DEV`, `DM_BANKDETS`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`), backed by a new `GET /api/admin/config` route (admin-gated, same pattern as the rest of `/api/admin`). Includes `DM_BANKDETS` deliberately even though it's dead code (see M4 in `CODE_REVIEW_2026-08-13.md`) rather than hiding it, since the point of this screen is to show what's actually configured, not a curated subset.

## 2026-08-13 (3)

### Fixed
- Closed the three remaining High-severity findings from `CODE_REVIEW_2026-08-13.md`:
  - **H1** — `POST /api/teams` now re-validates a team server-side with `validateTeam()` before allowing `teamSubmitted: true` (a direct API call could previously bypass `TeamDialog.tsx`'s client-side check entirely); `POST /api/scouts`/`POST /api/support` gained basic payload shape checks.
  - **H2** — `addTeam()` in `src/app/page.tsx` had no double-submit guard at all; it and `ScoutDialog`/`SupportDialog`'s `save()` and `TeamDialog`'s `submitTeam()` now use a synchronous `useRef` guard, since a `loading`-state disable alone can't close the window between two clicks landing in the same render batch.
  - **H3** — `validateTeam()`'s A-Class and V-Class branches only checked a lower team-size bound (`< 3`) despite their own error messages stating "must be 3 or 4"; added the missing `> 4` check to both.
  - 11 new regression tests added across `__tests__/api-authz.test.ts`, `__tests__/validation.test.ts`, and `__tests__/components.test.tsx` (93/93 passing).

## 2026-08-13 (2)

### Fixed
- `HIKE_DATE` (`src/models/referenceData.ts`), which every age-based hike-class validation rule depends on, was a hardcoded constant frozen at 2024-10-05 — silently stale for roughly two seasons. It's now sourced from a required `NEXT_PUBLIC_DM_HIKE_DATE` env var that throws at load if unset or malformed, instead of falling back to a wrong default that would reproduce the same silent-staleness bug. See `CODE_REVIEW_2026-08-13.md`'s H4 and the new "Pre-season checklist" section in `TODO.md`.

## 2026-08-13

### Changed
- Updated `DEPLOYMENT.md`, `README.md`, and `STARTUP.md` to match the standalone repo: Cognito-based auth/admin, this repo's own root as the app root, and the current script inventory (they previously still described the deleted `User` table, MD5 auth, and the old `NewDownsman/` monorepo layout).
- Refreshed the dialog UI: added proper elevation tokens (`scout-surface`/`field`/`field-border`) so dialog panels are no longer the same color as the page background, and rebuilt all six dialogs (Login, Register, AdminPanel, Team, Scout, Support) on new shared primitives (`src/components/ui/{Modal,Button,Banner,form}`).

### Added
- Migrated user management from bespoke MD5 auth to Amazon Cognito: server-side Cognito client and httpOnly-cookie session handling (`src/services/cognito.ts`, `src/lib/session.ts`), request-level session verification and authorization (`src/middleware.ts`, `src/lib/authz.ts`), and Lambda triggers for transparent migration of existing users and syncing legacy admin/breakLock flags to Cognito groups (`lambda/cognito-migrate-user`, `lambda/cognito-post-auth`).
- Session now survives a page reload, with a silent-refresh timer and handling for the `NEW_PASSWORD_REQUIRED` challenge used by admin password resets.
- Centralized fetch/error handling in `src/components/ui/api.ts`; every save/submit/delete action now has a loading state and disables itself in flight to prevent double-submits.
- `TODO.md` tracking deferred work from the Cognito migration.

### Fixed
- Prod 500s on register/login: the Amplify build spec's env grep only forwarded `DM_`/`NEXT_PUBLIC_` prefixed vars, so `COGNITO_USER_POOL_ID`/`CLIENT_ID`/`REGION` never reached `.env.production`. Added a `COGNITO_` grep line to the build spec and documented the Cognito pools/Lambdas/IAM setup.
- Silent error handling gaps: `ScoutDialog`/`SupportDialog` previously had no error handling at all, and a bad JSON parse on a non-JSON error body (bare 500, dropped connection) crashed uncaught, leaving forms stuck with no feedback. This was the root cause of the earlier prod registration failure.

### Removed
- Legacy MD5 auth code, now that the Cognito migration was verified complete against the one real legacy account: `src/utils/hash.ts`, the legacy user CRUD functions in `src/services/db.ts`, and `scripts/make-admin.sh`. `scripts/create-tables.js` no longer creates the `User` table. The `User` DynamoDB table itself was left in place (backed up first) as a separate, more easily reversible decision.

## 2026-08-12

### Security
- Upgraded Next.js 14.2.15 → 15.5.21, clearing 30 Dependabot alerts (1 critical, 10 high, 15 medium, 4 low). Also overrode the `sharp@0.34.5` optional dependency to `0.35.3` to close a high-severity libvips CVE.
- Cleared remaining `fast-xml-parser` (override to 5.7.0) and `jsoup` (1.18.2 → 1.23.1, legacy Java/Vaadin app) Dependabot alerts. Leaves only an unrelated `webdrivermanager` alert in the legacy Java project.
- Patched low-risk Dependabot alerts via `package.json` overrides: pinned `fast-xml-parser`, `js-yaml`, `nanoid`, `uuid`, `brace-expansion`, and `@smithy/config-resolver` to patched versions; bumped `postcss` to 8.5.23. Cleared 21 of 60 open alerts.

### Added
- DynamoDB backup and year-end data reset scripts: `backup-dynamo.sh` dumps `User`/`Team`/`Scouts`/`Support`/`Log` to a timestamped, gitignored directory (refuses to overwrite an existing backup); `resetDataYearEnd.sh` wipes all tables except the `scott` User record, gated on a recent backup and typed confirmation.

### Fixed
- Amplify deployment URL in the docs (the bare `defaultDomain` 404s; Amplify serves branches under a branch-name subdomain).

## 2026-06-06

### Added
- Test suite covering validation, date utils, and components.

## 2026-06-05

### Added
- Build/deploy scripts and deployment docs.

### Changed
- Updated colours to Scouts UK brand (purple & teal).

## 2026-06-03

### Added
- Initial NewDownsman Next.js application.
