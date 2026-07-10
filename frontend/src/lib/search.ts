import type { Automation } from "../api/types";
import { formatDateTime } from "./dates";

// The exercise requires the search box to match "all the displayed fields",
// e.g. typing "09:00" should hit both a row scheduled at 09:00 and a row whose
// last run was at 09:00. We reproduce exactly what the table renders into one
// lowercase string, then substring-match against it — so search always agrees
// with what the user sees on screen.
export function rowSearchText(a: Automation): string {
  return [
    a.name,
    a.schedule_display,
    a.active ? "active" : "inactive",
    formatDateTime(a.last_run_at),
    a.last_run_status ?? "",
    formatDateTime(a.next_run_at),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesSearch(a: Automation, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return rowSearchText(a).includes(q);
}
