export default function timeToDate(time) {
  if (!time) return;

  const [h, m] = time.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date;
}