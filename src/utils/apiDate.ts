// Reading the dates the API sends (WEB_PARITY_V4.0.2 §9).
//
// API dates arrive ALREADY FORMATTED, in the admin panel's style and in the
// shop's timezone — "08-10-2026 01:04 PM", not an ISO stamp. The one exception
// is `created_at`, which is ISO UTC.
//
// That makes trap 5 easy to hit: subtracting a panel-format date from a UTC one
// is off by the shop's offset. Anything that computes with these dates
// (countdowns, durations, "time ago") must parse them with the panel's own
// `date_format` / `time_format` from settings, which is what this does.
//
// `dd-MM` and `MM-dd` cannot be told apart for days up to 12, which is exactly
// why the panel's own format is tried first and the guesses come after.
import { format, parse as parseDate, isValid } from "date-fns";

type Maybe<T> = T | null | undefined;

/**
 * PHP date() letters → date-fns tokens. A letter outside this table means
 * "don't guess": the format is rejected and the caller shows the text as it
 * came, rather than printing a date built from a misread pattern.
 */
const PHP_TO_DATE_FNS: Record<string, string> = {
  d: "dd",
  j: "d",
  m: "MM",
  n: "M",
  Y: "yyyy",
  y: "yy",
  M: "MMM",
  F: "MMMM",
  D: "EEE",
  l: "EEEE",
  H: "HH",
  G: "H",
  h: "hh",
  g: "h",
  i: "mm",
  s: "ss",
  A: "a",
  a: "a",
};

/** Separators a panel format may contain verbatim. */
const LITERALS = new Set([" ", "-", "/", ":", ",", ".", "'"]);

/**
 * Convert a PHP format string to a date-fns one, or null when it contains a
 * letter this table doesn't cover.
 */
export const phpFormatToDateFns = (phpFormat: Maybe<string>): string | null => {
  if (!phpFormat) return null;
  let out = "";
  for (const character of phpFormat) {
    if (PHP_TO_DATE_FNS[character]) {
      out += PHP_TO_DATE_FNS[character];
      continue;
    }
    if (LITERALS.has(character)) {
      // date-fns treats letters as tokens, so a literal is quoted. Separators
      // in this set are punctuation, safe to pass through.
      out += character;
      continue;
    }
    return null;
  }
  return out;
};

/** Day-first before month-first: the panels in the wild overwhelmingly use day-first. */
const FALLBACK_FORMATS = [
  "dd-MM-yyyy hh:mm a",
  "dd-MM-yyyy HH:mm",
  "dd-MM-yyyy",
  "dd/MM/yyyy hh:mm a",
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "yyyy-MM-dd",
  "MM-dd-yyyy hh:mm a",
  "MM/dd/yyyy hh:mm a",
  "MM/dd/yyyy",
  "d MMM yyyy hh:mm a",
  "d MMM yyyy",
];

export interface PanelFormats {
  /** `date_format` from settings, in PHP letters. */
  dateFormat?: Maybe<string>;
  /** `time_format` from settings, in PHP letters. */
  timeFormat?: Maybe<string>;
}

/** An ISO stamp parses on its own; `created_at` is the one field that sends them. */
const parseIso = (value: string) => {
  // Only treat it as ISO when it actually looks like one — `new Date("8-10-2026")`
  // happily returns a (wrong, month-first) date otherwise.
  if (!/^\d{4}-\d{2}-\d{2}[T ]/.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value);
  return isValid(parsed) ? parsed : null;
};

/**
 * Parse a date the API sent. Returns null when nothing matched — the caller
 * then shows the original text instead of inventing a date.
 *
 * Order of attempts: ISO → `date_format + " " + time_format` → `date_format`
 * → the panel's other common styles. Every attempt is strict.
 */
export const parseApiDate = (
  value: Maybe<string>,
  { dateFormat, timeFormat }: PanelFormats = {}
): Date | null => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const iso = parseIso(text);
  if (iso) return iso;

  const panelDate = phpFormatToDateFns(dateFormat);
  const panelTime = phpFormatToDateFns(timeFormat);
  const candidates = [
    panelDate && panelTime ? `${panelDate} ${panelTime}` : null,
    panelDate,
    ...FALLBACK_FORMATS,
  ].filter(Boolean) as string[];

  for (const format of candidates) {
    // A reference date is required; it only fills fields the format omits.
    const parsed = parseDate(text, format, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
};

/**
 * Minutes between two API dates, or null when either is unreadable.
 *
 * Both must come from the same clock: a panel-format date and a UTC `created_at`
 * are off by the shop's offset (trap 5), so callers pass like with like.
 */
export const minutesBetween = (
  from: Maybe<string>,
  to: Maybe<string>,
  formats: PanelFormats = {}
): number | null => {
  const start = parseApiDate(from, formats);
  const end = parseApiDate(to, formats);
  if (!start || !end) return null;
  return (end.getTime() - start.getTime()) / 60000;
};

/**
 * "10 Minutes", or "2 Hours" when the minutes are whole hours (≥ 60 and
 * divisible by 60). Never "120 Minutes".
 */
export const formatDuration = (
  minutes: Maybe<number>,
  labels: { minute: string; hour: string }
): string | null => {
  const value = Math.round(Number(minutes));
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 60 && value % 60 === 0) return `${value / 60} ${labels.hour}`;
  return `${value} ${labels.minute}`;
};

export interface TimeAgoLabels {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
}

/**
 * "Just Now", "N Minutes Ago", "N Hours Ago", "N Days Ago" — and from SEVEN
 * DAYS the date itself, `d MMM y` (§9).
 *
 * The cutover is the point: "63 Days Ago" says less than "8 Oct 2026" does.
 * Returns the original text when the date cannot be read, rather than
 * inventing one.
 */
export const timeAgo = (
  value: Maybe<string>,
  labels: TimeAgoLabels,
  formats: PanelFormats = {},
  now: Date = new Date()
): string => {
  const parsed = parseApiDate(value, formats);
  if (!parsed) return String(value ?? "");

  const minutes = Math.floor((now.getTime() - parsed.getTime()) / 60000);
  // A clock skew that puts the date slightly ahead reads as "just now", not
  // as a negative age.
  if (minutes < 1) return labels.justNow;
  if (minutes < 60) return `${minutes} ${labels.minutesAgo}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${labels.hoursAgo}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${labels.daysAgo}`;

  return format(parsed, "d MMM y");
};
