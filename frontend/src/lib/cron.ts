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
