---
name: update-project-artifacts
description: Use this immediately after completing a significant feature, tool addition, architecture change, or notable bug fix in this project (Downsman) — before telling the user the work is done. Also invocable directly as /update-project-artifacts. Walks through updating CHANGELOG.md, TODO.md, README.md, STARTUP.md/DEPLOYMENT.md, and the design/ folder, verifying the change with a typecheck + test + build pass, and confirming new files are actually tracked by git, so no project artifact silently falls out of sync with what was actually built. Skip for genuinely trivial edits (typo fixes, comment-only changes, formatting) — this is for anything you would otherwise describe to the user as "I added/changed/fixed X."
---

# Keep project artifacts current

This project has already been bitten by skipping steps like these: a prod outage
(`63912a0`) where the Amplify build spec silently dropped `COGNITO_*` env vars and
every Cognito call 500'd, only caught after a real deploy; and a silent
error-handling gap (`0154e66`) where every dialog's `res.json()` crashed uncaught on
a non-JSON error body, leaving forms stuck with no feedback — "the code looks right"
wasn't enough to catch either one. Treat this checklist as part of finishing the
task, not an optional extra pass at the end.

## 1. Verify the change actually works

- [ ] Run a typecheck, the test suite, and a production build — `npx tsc --noEmit`,
      `npm test`, `npm run build` (this is what `scripts/build.sh` runs for the build
      step; there's no single combined `npm run verify` script in this repo, so run
      all three). Don't report something as done on the strength of "the code looks
      right" — see the two incidents above.
- [ ] If the change touches the UI, actually look at it — run `npm run dev` and
      exercise it in a browser, or lean on the Jest + React Testing Library suite
      (`__tests__/components.test.tsx`) — rather than trusting your mental model of
      the Tailwind classes. A control that looked fine in the diff has turned out to
      be visibly wrong before (the dialog-panel/background contrast bug fixed in
      `0154e66`).
- [ ] If the change touches session handling, `src/middleware.ts`, `src/lib/authz.ts`,
      or an API route's ownership/admin check, add or extend a test in
      `__tests__/api-authz.test.ts` rather than only eyeballing it — this is the
      security-critical path in this app, and it's exactly what that suite exists to
      pin down (see `design/data-model-and-authorization.md`).
- [ ] If you find yourself testing something by hand more than once, write it down as
      a real test instead — see `CODING_GUIDELINES.md` Section 6 for the testing
      patterns already in use (mocking `global.fetch` vs. mocking a service module,
      the `@jest-environment node` override for route-handler tests).

## 2. Update CHANGELOG.md

- [ ] Add an entry under today's date (`## YYYY-MM-DD` — start a new heading if the
      date has rolled over since the last entry; otherwise append to the existing
      day's section).
- [ ] File it under whichever of `### Added` / `### Changed` / `### Fixed` /
      `### Removed` / `### Security` actually applies — see the existing entries for
      the pattern (e.g. the 2026-08-12 Dependabot work is filed under `### Security`,
      not `### Fixed`).
- [ ] Say *why*, not just *what*, wherever the reason isn't obvious from the words
      alone — that's the standard the existing entries in this file already hold to
      (e.g. explaining why the `User` DynamoDB table was kept even after its code was
      removed, not just that it was removed).

## 3. Update TODO.md

- [ ] If this shipped something already tracked as deferred work, remove that bullet
      (or move it to a note in `CHANGELOG.md` if it's worth a record) rather than
      leaving it listed as still-pending. `TODO.md` is grouped by area (currently
      "Auth / Cognito", "Dependabot") — file under the closest existing heading, or
      add a new one if this is a genuinely new area.
- [ ] Fix any other bullet in the file that cross-references the thing you just
      shipped as if it were still pending.
- [ ] If the work surfaced a genuinely new idea, limitation, or natural follow-up
      that isn't urgent enough to act on now, add it as a new bullet rather than
      letting it evaporate at the end of the conversation — say why it's deferred,
      matching the style of the existing bullets (e.g. "no urgency" vs. "needs your
      input").

## 4. Update README.md — only if this changed

- [ ] A new environment variable → add a row to the "Environment Variables" table.
- [ ] A new DynamoDB table, or a change to an existing table's key schema → update
      the "DynamoDB Tables" section.
- [ ] A new top-level directory under `src/`, or a meaningfully new responsibility for
      an existing one → update the "Architecture" tree and its comments.
- [ ] A new dependency worth a reader knowing about (not every transitive bump —
      see `CHANGELOG.md` for those) → mention it near the closest relevant section
      (Environment Variables, Architecture) rather than adding a new table for it;
      this README doesn't currently have a standalone dependencies table.

## 5. Update STARTUP.md / DEPLOYMENT.md — only if this changed

- [ ] A new npm script, a new local prerequisite, or a change to the "get this
      running locally" steps → update `STARTUP.md`. That's where someone actually
      goes to run this project for the first time — `CHANGELOG.md` records that a
      script now exists, `STARTUP.md` is where someone learns how to use it, and both
      need to be right but aren't the same job.
- [ ] A change to how the app is hosted, deployed, or configured in Amplify (the
      build spec, a new required prod env var, a Cognito pool/Lambda/IAM change) →
      update `DEPLOYMENT.md`. This file has already gone stale in exactly this way
      once (`63912a0`'s prod outage was, in part, a config drift between what
      Amplify actually ran and what was documented) — don't let it happen again.

## 6. Update the design/ folder — only if this changed something design-worthy

`design/README.md` indexes the set; `design/design-principles.md` holds the standing,
retrospective principles. Neither should drift from what was actually built — a stale
design doc actively misleads instead of just being silent.

- [ ] Did this introduce a new architectural decision, reject a real alternative, get
      shaped by a bug, or ship a meaningfully new feature/service? Add or update the
      relevant document in `design/` — most changes extend an existing document
      (check `design/README.md`'s table for the closest match: auth-and-session,
      data-model-and-authorization, or frontend-conventions) rather than needing a
      new one.
- [ ] Does this confirm, refine, or contradict an existing entry in
      `design-principles.md`? Update that entry (with what actually happened, not
      just the abstract principle) rather than leaving it to only live in this
      conversation.
- [ ] If this is a genuinely new document, add a row to `design/README.md`'s index
      table so it's discoverable.
- [ ] Skip this step for changes that don't reflect a design decision worth
      remembering later — same "genuinely trivial" bar as the rest of this skill.

## 7. Confirm git actually has everything

- [ ] Run `git status --short` and read it — don't assume. New files show as `??`
      until staged; a commit that references a file which was never added will build
      locally (it's on disk) and break in CI/Amplify (it isn't in the repo).
- [ ] Scan the diff for anything that shouldn't be committed before handing back — a
      quick `git diff --cached | grep -iE "api[_-]?key|secret|token"` costs nothing,
      and this repo's `.env.local`/Cognito credentials must never end up in a commit.

## 8. Hand back to the user

- [ ] Don't commit or push unless asked — this project's user runs git themselves. End
      by summarizing what changed and asking whether they want it committed/pushed.
