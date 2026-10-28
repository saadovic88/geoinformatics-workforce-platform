/** Company calendar values are always calendar dates in Cairo, never UTC days. */
export const COMPANY_TIME_ZONE = 'Africa/Cairo';

export const companyDate = (value: Date = new Date()): string => {
  const pieces = new Intl.DateTimeFormat('en-US', {
    timeZone: COMPANY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => pieces.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const isCompanyDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day;
};

export const isCompanyDateRange = (startDate: string, endDate: string) =>
  isCompanyDate(startDate) && isCompanyDate(endDate) && startDate <= endDate;

export const addCompanyDays = (value: string, days: number): string => {
  if (!isCompanyDate(value)) return value;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};
