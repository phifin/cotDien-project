import {
  REPORT_DEADLINE_DAY,
  REPORT_DEADLINE_MONTH_OFFSET,
} from './constants.js'
import type { ParsedSubmissionEntry } from './merger.js'
import type { ReportPeriod } from './types.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type ReportTimelinessStatus = 'ON_TIME' | 'LATE' | 'NOT_SUBMITTED'

export interface ReportTimelinessConfig {
  deadlineDay: number
  deadlineMonthOffset: number
}

export interface ReportTimelinessPc {
  pcCode: string
  pcName: string
}

export interface ReportTimelinessRow {
  pcCode: string
  pcName: string
  submittedAt: string | null
  deadlineAt: string
  status: ReportTimelinessStatus
  daysLate: number
}

export const DEFAULT_REPORT_TIMELINESS_CONFIG: ReportTimelinessConfig = {
  deadlineDay: REPORT_DEADLINE_DAY,
  deadlineMonthOffset: REPORT_DEADLINE_MONTH_OFFSET,
}

function clampDeadlineDay(year: number, monthIndex: number, deadlineDay: number): number {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(Math.max(1, deadlineDay), lastDayOfMonth)
}

export function buildReportDeadline(
  period: ReportPeriod,
  config: ReportTimelinessConfig = DEFAULT_REPORT_TIMELINESS_CONFIG,
): Date {
  const deadlineMonthIndex = period.month - 1 + config.deadlineMonthOffset
  const deadlineYear = period.year + Math.floor(deadlineMonthIndex / 12)
  const normalizedMonthIndex = ((deadlineMonthIndex % 12) + 12) % 12
  const day = clampDeadlineDay(deadlineYear, normalizedMonthIndex, config.deadlineDay)

  return new Date(deadlineYear, normalizedMonthIndex, day, 23, 59, 59, 999)
}

export function calculateDaysLate(submittedAt: string, deadline: Date): number {
  const submittedTime = Date.parse(submittedAt)
  if (!Number.isFinite(submittedTime)) return 0

  const diff = submittedTime - deadline.getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / MS_PER_DAY)
}

export function buildReportTimelinessRows(
  period: ReportPeriod,
  pcs: ReportTimelinessPc[],
  entries: ParsedSubmissionEntry[],
  config: ReportTimelinessConfig = DEFAULT_REPORT_TIMELINESS_CONFIG,
): ReportTimelinessRow[] {
  const deadline = buildReportDeadline(period, config)
  const deadlineAt = deadline.toISOString()
  const latestByPc = new Map<string, ParsedSubmissionEntry>()

  for (const entry of entries) {
    if (entry.meta.reportYear !== period.year || entry.meta.reportMonth !== period.month) continue
    const existing = latestByPc.get(entry.meta.pcCode)
    if (!existing || Date.parse(entry.meta.submittedAt) > Date.parse(existing.meta.submittedAt)) {
      latestByPc.set(entry.meta.pcCode, entry)
    }
  }

  const pcRows = pcs.length > 0
    ? pcs
    : Array.from(latestByPc.values()).map((entry) => ({
      pcCode: entry.meta.pcCode,
      pcName: entry.meta.pcName,
    }))

  return pcRows
    .map((pc) => {
      const entry = latestByPc.get(pc.pcCode)
      if (!entry) {
        return {
          pcCode: pc.pcCode,
          pcName: pc.pcName,
          submittedAt: null,
          deadlineAt,
          status: 'NOT_SUBMITTED' as const,
          daysLate: 0,
        }
      }

      const daysLate = calculateDaysLate(entry.meta.submittedAt, deadline)
      return {
        pcCode: pc.pcCode,
        pcName: pc.pcName,
        submittedAt: entry.meta.submittedAt,
        deadlineAt,
        status: daysLate > 0 ? 'LATE' as const : 'ON_TIME' as const,
        daysLate,
      }
    })
    .sort((a, b) => a.pcCode.localeCompare(b.pcCode))
}
