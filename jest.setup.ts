// Required env vars that modules read eagerly at import time - see
// src/models/referenceData.ts's parseHikeDate(), which throws at module load if
// NEXT_PUBLIC_DM_HIKE_DATE is missing. Jest doesn't read .env.local the way Next's
// dev server does, so this has to be set explicitly for the test environment.
// The actual value doesn't matter for test correctness - validation.test.ts computes
// scout ages relative to whatever HIKE_DATE resolves to.
process.env.NEXT_PUBLIC_DM_HIKE_DATE = '2026-10-03';
