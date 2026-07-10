// Bridge between the friendly Create form (Repetition + Start Date) and the
// backend's crontab field. The mockup's form has exactly two schedule inputs —
// a Repetition dropdown and a Start Date (with time) — so we derive the crontab
// from them:
//   - the minute/hour come from the Start Date's time
//   - Weekly pins the day-of-week to the Start Date's weekday
//   - Monthly pins the day-of-month to the Start Date's day
//
// This keeps the UI simple (no raw cron editing) while the backend stays the
// single, expressive source of truth.

export type Repetition = "daily" | "weekly" | "monthly";

export const REPETITION_OPTIONS: { value: Repetition; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// JS getDay() is 0=Sunday..6=Saturday, which is exactly cron's day-of-week
// convention (0 or 7 = Sunday), so no remapping is needed.
export function repetitionToCrontab(
  repetition: Repetition,
  startDate: Date,
): string {
  const m = startDate.getMinutes();
  const h = startDate.getHours();
  switch (repetition) {
    case "daily":
      return `${m} ${h} * * *`;
    case "weekly":
      return `${m} ${h} * * ${startDate.getDay()}`;
    case "monthly":
      return `${m} ${h} ${startDate.getDate()} * *`;
  }
}

// Inverse of repetitionToCrontab, for pre-filling the edit form. Reconstructs
// the Repetition and a Start Date such that repetitionToCrontab() reproduces the
// original crontab — so opening the dialog and saving without edits is a no-op.
// The date is based on `startDateIso` (preserving the automation's start) with
// its time/day adjusted to match the crontab. Returns null for expressions the
// simple form can't represent (ranges/steps/lists), in which case the caller
// falls back to defaults.
export function crontabToForm(
  crontab: string,
  startDateIso: string,
): { repetition: Repetition; startDate: Date } | null {
  const parts = crontab.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minRaw, hourRaw, domRaw, monthRaw, dowRaw] = parts;
  const minute = Number(minRaw);
  const hour = Number(hourRaw);
  // Only plain daily/weekly/monthly shapes (month always "*") are representable.
  if (Number.isNaN(minute) || Number.isNaN(hour) || monthRaw !== "*") return null;

  const base = new Date(startDateIso);
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(hour, minute, 0, 0);

  if (dowRaw !== "*") {
    const dow = Number(dowRaw) % 7; // cron allows 7 for Sunday; JS uses 0
    if (Number.isNaN(dow)) return null;
    // Shift the base date onto the crontab's weekday.
    base.setDate(base.getDate() + ((dow - base.getDay() + 7) % 7));
    return { repetition: "weekly", startDate: base };
  }
  if (domRaw !== "*") {
    const dom = Number(domRaw);
    if (Number.isNaN(dom)) return null;
    base.setDate(dom);
    return { repetition: "monthly", startDate: base };
  }
  return { repetition: "daily", startDate: base };
}
