import type { DateRange, DateRangePreset } from "@/types";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";

export function resolveDateRange(preset: DateRangePreset, custom?: DateRange): DateRange {
  const now = new Date();
  switch (preset) {
    case "TODAY":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "THIS_WEEK":
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      };
    case "THIS_MONTH":
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
    case "THIS_YEAR":
      return { from: startOfYear(now).toISOString(), to: endOfYear(now).toISOString() };
    case "CUSTOM":
      return custom ?? { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
}

export function resolveQuarterRange(quarterDate: Date): DateRange {
  return {
    from: startOfQuarter(quarterDate).toISOString(),
    to: endOfQuarter(quarterDate).toISOString(),
  };
}

/** Indian financial year runs 1 April – 31 March. */
export function resolveIndianFinancialYearRange(referenceDate: Date): DateRange {
  const year = referenceDate.getMonth() >= 3 ? referenceDate.getFullYear() : referenceDate.getFullYear() - 1;
  return {
    from: new Date(year, 3, 1).toISOString(),
    to: new Date(year + 1, 2, 31, 23, 59, 59).toISOString(),
  };
}

export function isWithinRange(isoDate: string, range: DateRange): boolean {
  const t = new Date(isoDate).getTime();
  return t >= new Date(range.from).getTime() && t <= new Date(range.to).getTime();
}
