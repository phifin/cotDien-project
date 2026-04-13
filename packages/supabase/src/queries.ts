import { getSupabaseBrowserClient } from './client.js'
import { parseImportedJson, type MonthlyReportPayload, type ParsedSubmissionEntry } from '@repo/shared/domain'
import type { Database } from './types.js'

type SubmissionRow = Database['public']['Tables']['submissions']['Row']
type LegacyYearMap = Record<string, number>

export interface SubmissionFetchDebug {
  fetchedCount: number
  latestPerPcCount: number
  parsedCount: number
  skippedCount: number
  sampleRaw: unknown
  sampleParsed: ParsedSubmissionEntry | null
  skipReasons: string[]
}

export interface FormKeyRow {
  id: string
  access_key: string
  pc_code: string
  report_month: number
  report_year: number
  is_active: boolean
  created_at?: string
}

export interface PcRow {
  pc_code: string
  pc_name: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function toOptionalDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toYearMap(value: unknown): LegacyYearMap {
  const obj = asRecord(value)
  if (!obj) return {}

  const mapped: LegacyYearMap = {}
  for (const [year, rawAmount] of Object.entries(obj)) {
    if (/^\d{4}$/.test(year)) {
      mapped[year] = toNumber(rawAmount)
    }
  }
  return mapped
}

function getRowPeriodYear(row: SubmissionRow): number {
  const record = row as unknown as Record<string, unknown>
  return toNumber(record.report_year ?? record.period_year)
}

function getRowPeriodMonth(row: SubmissionRow): number {
  const record = row as unknown as Record<string, unknown>
  return toNumber(record.report_month ?? record.period_month)
}

function getRowPcName(row: SubmissionRow): string {
  const record = row as unknown as Record<string, unknown>
  if (typeof record.pc_name === 'string' && record.pc_name.length > 0) return record.pc_name
  if (typeof record.pcName === 'string' && record.pcName.length > 0) return record.pcName
  return row.pc_code
}

function pickLatestRowsPerPc(rows: SubmissionRow[]): SubmissionRow[] {
  const latestByPc = new Map<string, SubmissionRow>()

  for (const row of rows) {
    const existing = latestByPc.get(row.pc_code)
    if (!existing) {
      latestByPc.set(row.pc_code, row)
      continue
    }

    const currentTime = Date.parse(row.created_at)
    const existingTime = Date.parse(existing.created_at)
    if (Number.isFinite(currentTime) && Number.isFinite(existingTime)) {
      if (currentTime > existingTime) {
        latestByPc.set(row.pc_code, row)
      } else if (currentTime === existingTime && row.id > existing.id) {
        latestByPc.set(row.pc_code, row)
      }
      continue
    }

    if (row.created_at > existing.created_at || (row.created_at === existing.created_at && row.id > existing.id)) {
      latestByPc.set(row.pc_code, row)
    }
  }

  return Array.from(latestByPc.values())
}

function normalizeLegacyPayload(row: SubmissionRow): MonthlyReportPayload {
  const payload = asRecord(row.payload) ?? {}
  const general = asRecord(payload.general) ?? {}
  const contract = asRecord(payload.contract) ?? {}
  const execution = asRecord(payload.execution) ?? {}
  const revenueResult = asRecord(payload.revenue_result) ?? {}
  const debtAnalysis = asRecord(payload.debt_analysis) ?? {}
  const poleQuantities = asRecord(payload.pole_quantities) ?? {}
  const notes = asRecord(payload.notes) ?? {}

  const generatedByYear = toYearMap(execution.generated_by_year)
  const collectedByYear = toYearMap(execution.collected_by_year)
  const openingBalanceByYear = toYearMap(execution.opening_balance_by_year)

  const normalizedExecution = Object.keys({
    ...generatedByYear,
    ...collectedByYear,
  }).reduce<MonthlyReportPayload['execution']>((acc, year) => {
    acc[year] = {
      planned: generatedByYear[year] ?? 0,
      actual: collectedByYear[year] ?? 0,
      completionPercentage: toNumber(revenueResult.ti_le_thuc_hien),
    }
    return acc
  }, {})

  const debtBuckets = {
    below6Months: toNumber(debtAnalysis.duoi_6_thang),
    from6To12Months: toNumber(debtAnalysis.tu_6_den_duoi_12_thang),
    from12To24Months: toNumber(debtAnalysis.tu_12_den_duoi_24_thang),
    from24To36Months: toNumber(debtAnalysis.tu_24_den_duoi_36_thang),
    above36Months: toNumber(debtAnalysis.tren_36_thang),
  }

  const overdueDebt = Object.values(debtBuckets).reduce((total, item) => total + item, 0)
  const totalDebt = toNumber(execution.closing_balance)

  return {
    period: {
      year: getRowPeriodYear(row),
      month: getRowPeriodMonth(row),
    },
    identity: {
      pcCode: row.pc_code,
      pcName: typeof general.ten_pc === 'string' ? general.ten_pc : getRowPcName(row),
    },
    general: {
      partnerCode: typeof general.doi_tac === 'string' && general.doi_tac.length > 0
        ? (general.doi_tac as MonthlyReportPayload['general']['partnerCode'])
        : 'KHAC',
      contactPerson: '',
      contactPhone: '',
    },
    contract: {
      contractNumber: typeof contract.so_hd_phu_luc_hop_dong === 'string' ? contract.so_hd_phu_luc_hop_dong : 'N/A',
      signedDate: toOptionalDate(contract.ngay_ky_hd_plhd),
      validUntil: toOptionalDate(contract.hieu_luc_den),
    },
    execution: normalizedExecution,
    poleQuantities: {
      totalPoles: toNumber(poleQuantities.duoi_8_5m)
        + toNumber(poleQuantities.tu_8_5_den_10_5m)
        + toNumber(poleQuantities.tu_10_5_den_12_5m)
        + toNumber(poleQuantities.tren_12_5m),
      sharedPoles: 0,
      newlyAdded: 0,
      heightBuckets: {
        below8_5m: toNumber(poleQuantities.duoi_8_5m),
        from8_5mTo10_5m: toNumber(poleQuantities.tu_8_5_den_10_5m),
        from10_5mTo12_5m: toNumber(poleQuantities.tu_10_5_den_12_5m),
        above12_5m: toNumber(poleQuantities.tren_12_5m),
      },
    },
    revenueResult: {
      expectedRevenue: toNumber(general.doanh_thu_ke_hoach_nam),
      actualCollected: toNumber(revenueResult.doanh_thu_thuc_hien_nam),
      currency: 'VND',
    },
    debtAnalysis: {
      totalDebt,
      overdueDebt,
      debtClassification: undefined,
      yearlyDebts: openingBalanceByYear,
      agingBuckets: debtBuckets,
    },
    notes: typeof notes.ghi_chu === 'string' ? notes.ghi_chu : '',
  }
}

function mapRowToParsedEntry(row: SubmissionRow): ParsedSubmissionEntry | null {
  const canonicalAttempt = parseImportedJson(row.payload)
  const canonicalPayload = canonicalAttempt.ok
    ? canonicalAttempt.data
    : normalizeLegacyPayload(row)
  const validated = parseImportedJson(canonicalPayload)
  if (!validated.ok) return null

  return {
    meta: {
      id: row.id,
      submittedAt: row.created_at,
      status: 'SUBMITTED', // Or default if missing in DB schema
    },
    data: validated.data,
  }
}

/**
 * Fetches all submissions matching a given reporting period (for standard dashboard)
 */
export async function fetchSubmissionsByPeriod(
  year: number,
  month: number,
): Promise<ParsedSubmissionEntry[]> {
  const { entries } = await fetchSubmissionsByPeriodWithDebug(year, month, { includeDebugPayloads: false })
  return entries
}

export async function fetchSubmissionsByPeriodWithDebug(
  year: number,
  month: number,
  options: { includeDebugPayloads?: boolean } = {},
): Promise<{ entries: ParsedSubmissionEntry[]; debug: SubmissionFetchDebug }> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('report_year', year)
    .eq('report_month', month)

  if (error) throw error

  const includeDebugPayloads = options.includeDebugPayloads ?? false
  const rows: SubmissionRow[] = data as SubmissionRow[]
  const latestRows = pickLatestRowsPerPc(rows)
  const entries: ParsedSubmissionEntry[] = []
  const skipReasons: string[] = []

  for (const row of latestRows) {
    const mapped = mapRowToParsedEntry(row)
    if (!mapped) {
      skipReasons.push(`Invalid payload skipped for submission id=${row.id}`)
      continue
    }
    entries.push(mapped)
  }

  return {
    entries,
    debug: {
      fetchedCount: rows.length,
      latestPerPcCount: latestRows.length,
      parsedCount: entries.length,
      skippedCount: latestRows.length - entries.length,
      sampleRaw: includeDebugPayloads ? rows[0]?.payload ?? null : null,
      sampleParsed: includeDebugPayloads ? entries[0] ?? null : null,
      skipReasons: includeDebugPayloads ? skipReasons : [],
    },
  }
}

/**
 * Executes a single parallel lookup retrieving merged raw data for month A and B.
 * 
 * Rules applied:
 * - `async-parallel` (Executing cross-network DB queries simultaneously)
 */
export async function fetchSubmissionsForCompare(
  periodA: { year: number; month: number },
  periodB: { year: number; month: number },
) {
  const supabase = getSupabaseBrowserClient()
  const [resA, resB] = await Promise.all([
    supabase
      .from('submissions')
      .select('*')
      .eq('report_year', periodA.year)
      .eq('report_month', periodA.month),
    supabase
      .from('submissions')
      .select('*')
      .eq('report_year', periodB.year)
      .eq('report_month', periodB.month),
  ])

  if (resA.error) throw resA.error
  if (resB.error) throw resB.error

  const rawA = resA.data as SubmissionRow[]
  const rawB = resB.data as SubmissionRow[]
  const latestA = pickLatestRowsPerPc(rawA)
  const latestB = pickLatestRowsPerPc(rawB)

  return {
    monthA: latestA
      .map(mapRowToParsedEntry)
      .filter((entry): entry is ParsedSubmissionEntry => Boolean(entry)),
    monthB: latestB
      .map(mapRowToParsedEntry)
      .filter((entry): entry is ParsedSubmissionEntry => Boolean(entry)),
  }
}

/**
 * Pushes exactly one Canonical Payload object into the DB flat row mapping.
 */
export async function insertSubmission(payload: MonthlyReportPayload) {
  const supabase = getSupabaseBrowserClient()
  const insertRow: Database['public']['Tables']['submissions']['Insert'] = {
    report_year: payload.period.year,
    report_month: payload.period.month,
    pc_code: payload.identity.pcCode,
    pc_name: payload.identity.pcName,
    payload,
  }

  const { data, error } = await supabase
    .from('submissions')
    .insert(insertRow)
    .select()
    .single()

  if (error) throw error
  const mapped = mapRowToParsedEntry(data as SubmissionRow)
  if (!mapped) {
    throw new Error('Inserted submission could not be parsed into canonical format')
  }
  return mapped
}

export async function listFormKeys(): Promise<FormKeyRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('form_keys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as FormKeyRow[]
}

export async function listPcs(): Promise<PcRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('pcs')
    .select('pc_code, pc_name')
    .order('pc_code', { ascending: true })

  if (error) throw error
  return data as PcRow[]
}

export async function createFormKey(input: {
  accessKey: string
  pcCode: string
  reportMonth: number
  reportYear: number
  isActive?: boolean
}): Promise<FormKeyRow> {
  const supabase = getSupabaseBrowserClient()
  const insertRow: Database['public']['Tables']['form_keys']['Insert'] = {
    access_key: input.accessKey,
    pc_code: input.pcCode,
    report_month: input.reportMonth,
    report_year: input.reportYear,
    is_active: input.isActive ?? true,
  }

  const { data, error } = await supabase
    .from('form_keys')
    .insert({
      ...insertRow,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as FormKeyRow
}

export async function setFormKeyActive(id: string, isActive: boolean): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('form_keys')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw error
}
