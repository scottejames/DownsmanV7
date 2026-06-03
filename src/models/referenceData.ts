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

export const HIKE_DATE: LocalDate = { year: 2024, month: 10, day: 5 };
export const ENTRY_COST = 10;
