export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

export function epochDayToDate(epoch: number): LocalDate {
  const d = new Date(epoch * 86400000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function dateToEpochDay(d: LocalDate): number {
  return Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86400000);
}

export function calculateAge(dobEpoch: number, hikeDate: LocalDate): number {
  if (dobEpoch === 0) return 0;
  const dob = new Date(dobEpoch * 86400000);
  const hike = new Date(Date.UTC(hikeDate.year, hikeDate.month - 1, hikeDate.day));
  const days = (hike.getTime() - dob.getTime()) / 86400000;
  return days / 365;
}

export function formatDob(dobEpoch: number, hikeDate: LocalDate): string {
  if (dobEpoch === 0) return 'Not Entered';
  const d = epochDayToDate(dobEpoch);
  const age = calculateAge(dobEpoch, hikeDate).toFixed(2);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.day} ${months[d.month - 1]} ${d.year} (Age at hike: ${age})`;
}
