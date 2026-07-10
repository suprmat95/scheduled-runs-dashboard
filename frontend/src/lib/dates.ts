// Local-date helpers as YYYY-MM-DD strings, matching what the backend's
// ?date= params expect.

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toIsoDate(d);
}

// Render an ISO datetime as a compact local "YYYY-MM-DD HH:MM", or a dash.
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const date = toIsoDate(d);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
}

// Just the HH:MM part, for the schedule/time columns.
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toTimeString().slice(0, 5);
}
