import { LocalDate } from '../utils/date';

export const HIKE_CLASSES = [
  'A-Class',
  'S-Class',
  'S-Class walk',
  'V-Class',
  'E-Class',
  'B-Class',
  'Open, Bigor - Washington',
  'Open, Bigor - Steyning',
  'Open, Plumpton - Itford',
  'Open, Plumpton - Firle',
  'Open, Itford - Eastbourne',
] as const;

// Sourced from an env var, not hardcoded, because this changes every season and a
// forgotten hardcoded date silently miscalculates every age-based validation rule
// below - see CODE_REVIEW_2026-08-13.md's H4. Read at module load so a missing/
// malformed value fails the build itself (page.tsx statically prerenders and pulls
// this in transitively) rather than validating a live registration season against
// the wrong date.
function parseHikeDate(raw: string | undefined): LocalDate {
  const match = raw && /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    throw new Error(
      `NEXT_PUBLIC_DM_HIKE_DATE must be set to this season's hike date in YYYY-MM-DD ` +
      `format (got ${JSON.stringify(raw)}) - see .env.example.`
    );
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export const HIKE_DATE: LocalDate = parseHikeDate(process.env.NEXT_PUBLIC_DM_HIKE_DATE);
export const ENTRY_COST = 10;
