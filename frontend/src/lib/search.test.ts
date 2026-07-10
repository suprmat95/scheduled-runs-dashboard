import { describe, expect, it } from "vitest";

import type { Automation } from "../api/types";
import { formatDateTime } from "./dates";
import { matchesSearch } from "./search";

function makeAutomation(over: Partial<Automation> = {}): Automation {
  return {
    id: 1,
    name: "Email newsletter",
    crontab: "0 9 * * *",
    schedule_display: "At 09:00",
    active: true,
    start_date: "2026-06-08T09:00:00Z",
    next_run_at: "2026-07-11T09:00:00Z",
    last_run_at: "2026-07-09T09:00:00Z",
    last_run_status: "success",
    created_at: "2026-06-08T09:00:00Z",
    updated_at: "2026-06-08T09:00:00Z",
    ...over,
  };
}

describe("matchesSearch", () => {
  it("matches by name (case-insensitive)", () => {
    expect(matchesSearch(makeAutomation(), "EMAIL")).toBe(true);
  });

  it("matches by schedule text", () => {
    expect(matchesSearch(makeAutomation(), "09:00")).toBe(true);
  });

  it("matches by status and active/inactive words", () => {
    expect(matchesSearch(makeAutomation(), "success")).toBe(true);
    expect(matchesSearch(makeAutomation({ active: false }), "inactive")).toBe(
      true,
    );
  });

  it("matches on the last-run time too (the '09:00' requirement)", () => {
    // A query for the last-run time hits the row even when it isn't the name.
    const a = makeAutomation({
      name: "Backup",
      schedule_display: "At 23:00",
    });
    const lastRunTime = formatDateTime(a.last_run_at).slice(11); // "HH:MM" local
    expect(matchesSearch(a, lastRunTime)).toBe(true);
  });

  it("returns true for an empty query", () => {
    expect(matchesSearch(makeAutomation(), "  ")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(matchesSearch(makeAutomation(), "zzz-nope")).toBe(false);
  });
});
