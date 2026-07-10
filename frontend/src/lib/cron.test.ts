import { describe, expect, it } from "vitest";

import { crontabToForm, repetitionToCrontab, type Repetition } from "./cron";

describe("repetitionToCrontab", () => {
  const start = new Date("2026-07-06T09:30:00"); // a Monday, 09:30 local

  it("builds a daily expression from the time", () => {
    expect(repetitionToCrontab("daily", start)).toBe("30 9 * * *");
  });

  it("pins weekly to the start date's weekday", () => {
    // 2026-07-06 is a Monday -> day-of-week 1.
    expect(repetitionToCrontab("weekly", start)).toBe("30 9 * * 1");
  });

  it("pins monthly to the start date's day-of-month", () => {
    expect(repetitionToCrontab("monthly", start)).toBe("30 9 6 * *");
  });
});

describe("crontabToForm ↔ repetitionToCrontab round-trip", () => {
  const startIso = "2026-06-08T21:44:03Z";
  const cases = [
    "0 23 * * *",
    "0 0 * * *",
    "0 9 * * *",
    "0 9 * * 1",
    "0 12 16 * *",
    "30 8 * * 0", // Sunday
  ];

  it.each(cases)("round-trips %s unchanged", (crontab) => {
    const form = crontabToForm(crontab, startIso);
    expect(form).not.toBeNull();
    expect(repetitionToCrontab(form!.repetition, form!.startDate)).toBe(crontab);
  });

  it("maps the repetition kind correctly", () => {
    const kind = (c: string): Repetition | undefined =>
      crontabToForm(c, startIso)?.repetition;
    expect(kind("0 9 * * *")).toBe("daily");
    expect(kind("0 9 * * 1")).toBe("weekly");
    expect(kind("0 12 16 * *")).toBe("monthly");
  });

  it("returns null for expressions the simple form can't represent", () => {
    expect(crontabToForm("*/5 * * * *", startIso)).toBeNull(); // step
    expect(crontabToForm("0 9 * 6 *", startIso)).toBeNull(); // month constraint
    expect(crontabToForm("garbage", startIso)).toBeNull();
  });
});
