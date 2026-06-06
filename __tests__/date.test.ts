import { calculateAge, dateToEpochDay, epochDayToDate, formatDob } from '@/utils/date';
import { HIKE_DATE } from '@/models/referenceData';

describe('dateToEpochDay and epochDayToDate', () => {
  it('roundtrips correctly', () => {
    const date = { year: 2010, month: 3, day: 15 };
    const epoch = dateToEpochDay(date);
    expect(epochDayToDate(epoch)).toEqual(date);
  });

  it('handles Jan 1 1970 as epoch 0', () => {
    expect(dateToEpochDay({ year: 1970, month: 1, day: 1 })).toBe(0);
  });

  it('handles dates before epoch', () => {
    const epoch = dateToEpochDay({ year: 1969, month: 12, day: 31 });
    expect(epoch).toBe(-1);
  });
});

describe('calculateAge', () => {
  it('calculates exact years correctly', () => {
    const dob = dateToEpochDay({ year: HIKE_DATE.year - 14, month: HIKE_DATE.month, day: HIKE_DATE.day });
    const age = calculateAge(dob, HIKE_DATE);
    expect(Math.floor(age)).toBe(14);
  });

  it('returns age < 14 when birthday is after hike date', () => {
    const dob = dateToEpochDay({ year: HIKE_DATE.year - 14, month: HIKE_DATE.month + 1, day: HIKE_DATE.day });
    const age = calculateAge(dob, HIKE_DATE);
    expect(age).toBeLessThan(14);
  });

  it('returns age > 14 when birthday is before hike date', () => {
    const dob = dateToEpochDay({ year: HIKE_DATE.year - 14, month: HIKE_DATE.month - 1, day: HIKE_DATE.day });
    const age = calculateAge(dob, HIKE_DATE);
    expect(age).toBeGreaterThan(14);
  });

  it('returns 0 for dobEpoch of 0', () => {
    expect(calculateAge(0, HIKE_DATE)).toBe(0);
  });
});

describe('formatDob', () => {
  it('returns Not Entered for epoch 0', () => {
    expect(formatDob(0, HIKE_DATE)).toBe('Not Entered');
  });

  it('includes date and age', () => {
    const dob = dateToEpochDay({ year: 2010, month: 3, day: 15 });
    const result = formatDob(dob, HIKE_DATE);
    expect(result).toContain('15 Mar 2010');
    expect(result).toContain('Age at hike:');
  });
});
