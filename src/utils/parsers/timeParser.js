const BUSINESS_TIME_OFFSET = "-03:00";

export function parseTimeToDate(time) {
  if (!time) return null;

  if (time instanceof Date) return time;
  if (typeof time === 'string' && time.includes('T')) {
    return new Date(time);
  }

  return new Date(`1970-01-01T${time}:00${BUSINESS_TIME_OFFSET}`);
};
