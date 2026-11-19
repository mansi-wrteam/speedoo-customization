import { describe, expect, it } from "vitest";
import {
  formatDuration,
  minutesBetween,
  parseApiDate,
  phpFormatToDateFns,
  timeAgo,
} from "./apiDate";

const panel = { dateFormat: "d-m-Y", timeFormat: "h:i A" };

describe("phpFormatToDateFns", () => {
  it("maps the panel's letters", () => {
    expect(phpFormatToDateFns("d-m-Y")).toBe("dd-MM-yyyy");
    expect(phpFormatToDateFns("j/n/y")).toBe("d/M/yy");
    expect(phpFormatToDateFns("h:i A")).toBe("hh:mm a");
    expect(phpFormatToDateFns("D, d M Y")).toBe("EEE, dd MMM yyyy");
  });

  // A letter outside the table means "don't guess" — better to show the text
  // as it came than to print a date built from a misread pattern.
  it("refuses a format it cannot read", () => {
    expect(phpFormatToDateFns("d-m-Y T")).toBeNull();
    expect(phpFormatToDateFns("U")).toBeNull();
    expect(phpFormatToDateFns(null)).toBeNull();
  });
});

describe("parseApiDate", () => {
  it("reads a panel-format date with the panel's own format", () => {
    const parsed = parseApiDate("08-10-2026 01:04 PM", panel);
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(9);
    expect(parsed?.getDate()).toBe(8);
    expect(parsed?.getHours()).toBe(13);
  });

  // dd-MM and MM-dd are indistinguishable up to the 12th, which is why the
  // panel's own format is tried before any guess.
  it("trusts the panel's format over a day/month guess", () => {
    expect(parseApiDate("05-10-2026", { dateFormat: "m-d-Y" })?.getMonth()).toBe(4);
    expect(parseApiDate("05-10-2026", { dateFormat: "d-m-Y" })?.getMonth()).toBe(9);
  });

  it("reads created_at as ISO", () => {
    expect(parseApiDate("2026-10-08T10:00:00Z")?.toISOString()).toBe("2026-10-08T10:00:00.000Z");
  });

  it("still reads common styles with no settings at all", () => {
    expect(parseApiDate("08-10-2026")?.getDate()).toBe(8);
    expect(parseApiDate("2026-10-08 13:04:00")?.getHours()).toBe(13);
  });

  it("returns null rather than a wrong date", () => {
    expect(parseApiDate("not a date")).toBeNull();
    expect(parseApiDate("")).toBeNull();
    expect(parseApiDate(null)).toBeNull();
  });
});

describe("minutesBetween", () => {
  it("subtracts two panel-format dates", () => {
    expect(minutesBetween("08-10-2026 10:00 AM", "08-10-2026 10:23 AM", panel)).toBe(23);
  });

  it("is null when either side is unreadable", () => {
    expect(minutesBetween("08-10-2026 10:00 AM", "nonsense", panel)).toBeNull();
  });
});

describe("formatDuration", () => {
  const labels = { minute: "Minutes", hour: "Hours" };

  it("folds whole hours and never prints 120 Minutes", () => {
    expect(formatDuration(10, labels)).toBe("10 Minutes");
    expect(formatDuration(90, labels)).toBe("90 Minutes");
    expect(formatDuration(120, labels)).toBe("2 Hours");
    expect(formatDuration(60, labels)).toBe("1 Hours");
  });

  it("has nothing to say about zero or less", () => {
    expect(formatDuration(0, labels)).toBeNull();
    expect(formatDuration(-5, labels)).toBeNull();
    expect(formatDuration(null, labels)).toBeNull();
  });
});

describe("timeAgo", () => {
  const labels = {
    justNow: "Just Now",
    minutesAgo: "Minutes Ago",
    hoursAgo: "Hours Ago",
    daysAgo: "Days Ago",
  };
  const now = new Date("2026-10-08T12:00:00Z");
  const ago = (iso: string) => timeAgo(iso, labels, {}, now);

  it("counts up through minutes, hours and days", () => {
    expect(ago("2026-10-08T11:59:40Z")).toBe("Just Now");
    expect(ago("2026-10-08T11:30:00Z")).toBe("30 Minutes Ago");
    expect(ago("2026-10-08T07:00:00Z")).toBe("5 Hours Ago");
    expect(ago("2026-10-05T12:00:00Z")).toBe("3 Days Ago");
  });

  // "63 Days Ago" says less than the date does.
  it("switches to the date itself from seven days", () => {
    expect(ago("2026-10-01T12:00:00Z")).toBe("1 Oct 2026");
    expect(ago("2026-08-06T12:00:00Z")).toBe("6 Aug 2026");
  });

  it("never reads as a negative age when the clock is skewed", () => {
    expect(ago("2026-10-08T12:00:30Z")).toBe("Just Now");
  });

  it("shows the text as it came when it cannot be read", () => {
    expect(timeAgo("whenever", labels, {}, now)).toBe("whenever");
  });
});
