# Design documentation

This folder records *why* this app is built the way it is — architectural decisions,
rejected alternatives, and lessons from real bugs/incidents — so future changes stay
consistent with reasoning that already happened, instead of re-litigating it or
accidentally reversing it.

`design-principles.md` holds the standing principles in one place. Everything else is a
topic doc going into more depth on one area. Most future work should extend an existing
document below rather than needing a new one.

| Document | Covers |
|---|---|
| [design-principles.md](./design-principles.md) | Cross-cutting principles distilled from decisions made across the app |
| [auth-and-session.md](./auth-and-session.md) | The Cognito migration, session/cookie model, and the middleware trust boundary |
| [data-model-and-authorization.md](./data-model-and-authorization.md) | DynamoDB schema, multi-tenancy via `ownerID`, and how ownership is enforced server-side |
| [frontend-conventions.md](./frontend-conventions.md) | Shared UI primitives, centralized API error handling, and session bootstrap/refresh |

## Keeping this useful

Update the relevant document in the same change that makes it true, not afterward as a
separate pass. A design doc that's drifted from what's actually built is worse than no
doc — it actively misleads the next person (or the next AI session) instead of just
being silent. If a change introduces a new architectural decision, rejects a real
alternative, or gets shaped by a bug, it belongs here.
