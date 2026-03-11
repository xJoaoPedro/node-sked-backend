export function timeToDate(time) {
  if (!time) return undefined;

  const [h, m] = time.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date;
}

export function formatDate(date) {
  if (!date) return undefined;

  return new Date(date);
}