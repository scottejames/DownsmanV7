# TODO

Deferred work from the Cognito auth migration and related cleanup. None of
these are blocking - they're held back on purpose, either because they need
your input or because there's no urgency.

## Auth / Cognito

- **Wire up self-service "Forgot password."** `forgotPassword()` and
  `confirmForgotPassword()` already exist in `src/services/cognito.ts` and
  work against Cognito, but nothing calls them - there's no `/api/auth`
  action for either and no "Forgot password?" link in `LoginDialog`. Right
  now the only password reset path is an admin doing it manually via
  `AdminPanel`.
- **Drop the legacy `User` DynamoDB table.** It's backed up
  (`backups/dynamodb/20260813-143456/`) and nothing in the live app reads or
  writes it anymore - only the `cognito-migrate-user` Lambda still touches it,
  as a safety net for any account that hasn't logged in since the cutover.
  Safe to delete once you're comfortable there's no one left to migrate.
- **`scripts/resetDataYearEnd.sh` is stale.** It was written for the old
  bespoke auth system - it wipes `Team`/`Scouts`/`Support` and preserves only
  `scott` in the `User` table. Now that Cognito is the real user store, that
  User-table logic doesn't mean anything (Cognito accounts aren't
  season-scoped data, so a year-end reset shouldn't touch anyone's login at
  all). Needs a rewrite before it's next run, not just a tweak.
- **Refresh token lifetime is still Cognito's default (30 days).** The
  original migration plan suggested considering 60-90 days given this is a
  seasonal signup event, but it was never revisited - still on the default.
- **Cognito's default email service caps at 50/day.** Fine for normal usage,
  but a registration rush (67 people signed up in the last real season) could
  exceed it. No action needed until "Forgot password" is wired up and actually
  gets exercised at volume - if it does, this means setting up SES.
- **`lambda/cognito-post-auth`'s DynamoDB dependency is now mostly vestigial.**
  It only does anything for accounts with a `custom:legacyId` still unsynced.
  Low priority - it's a cheap, harmless no-op for everyone else - but could be
  stripped out once you're confident no legacy accounts remain.

## Pre-season checklist

- **Set `NEXT_PUBLIC_DM_HIKE_DATE` to the real hike date before each season opens** -
  both locally (`.env.local`) and in the Amplify Console for prod. The app throws on
  load if it's unset, so this can't be silently forgotten the way the old hardcoded
  `HIKE_DATE` constant was (see `CODE_REVIEW_2026-08-13.md`'s H4) - but it still has
  to be *set correctly*, which nothing currently double-checks against the actual
  event date. If this ever bites again, consider a startup check that warns when the
  configured date is more than ~a year in the past.

## Dependabot

- **`io.github.bonigarcia:webdrivermanager` (critical)** - lives in the
  legacy Java/Vaadin project's `pom.xml` at the repo root, not `NewDownsman`.
  Explicitly out of scope for everything done so far; nobody's looked at that
  codebase.
