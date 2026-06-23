const BUSINESS_TIME_OFFSET = "-03:00";

export function timeToDate(time) {
  if (!time) return undefined;
  return new Date(`1970-01-01T${time}:00${BUSINESS_TIME_OFFSET}`);
}

export function formatDate(date) {
  if (!date) return undefined;

  return new Date(date);
}
