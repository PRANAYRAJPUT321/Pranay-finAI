import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine } from "@/server/engagement/calendar";
import { GLOSSARY } from "@/content/glossary";

describe("iCalendar export", () => {
  it("escapes special characters", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
  });
  it("folds long lines at 75 octets with a leading space", () => {
    const folded = foldLine("SUMMARY:" + "x".repeat(200));
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(2);
    parts.forEach((p) => expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75));
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
  });
  it("writes all-day events with an exclusive end date", () => {
    const ics = buildIcs([{ uid: "t1", date: "2027-02-22", endDate: "2027-02-28", title: "CFA L1, window" }], new Date("2026-10-30T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270222");
    expect(ics).toContain("DTEND;VALUE=DATE:20270301");
    expect(ics).toContain("SUMMARY:CFA L1\\, window");
    expect(ics).toContain("UID:t1@pd-finprep");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("glossary", () => {
  it("has unique terms with definitions and at least one exam tag", () => {
    const names = GLOSSARY.map((t) => t.term.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(140);
    GLOSSARY.forEach((t) => {
      expect(t.definition.length, t.term).toBeGreaterThan(20);
      expect(t.programs.length, t.term).toBeGreaterThan(0);
    });
  });
});
