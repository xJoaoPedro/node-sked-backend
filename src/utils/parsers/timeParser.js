export function parseTimeToDate(time) {
  if (!time) return null;

  if (time instanceof Date) return time;
  if (typeof time === 'string' && time.includes('T')) {
    return new Date(time);
  }

  const [h, m] = time.split(':').map(Number);

  const d = new Date();
  d.setFullYear(1970, 0, 1);
  d.setHours(h, m, 0, 0);

  return d;
};