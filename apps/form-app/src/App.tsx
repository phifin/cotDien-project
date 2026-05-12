import { useState, useCallback, useRef, useEffect, useMemo, type ChangeEvent } from 'react'
import { AccessProvider } from './contexts/AccessContext'
import { useAccess } from './contexts/accessContext'
import { SpreadsheetTable } from './components/SpreadsheetTable'
import { useDraftStorage } from './hooks/useDraftStorage'
import { FileSpreadsheet, FileUp, FileDown, Save, Send } from 'lucide-react'

// Utilities from shared packages
import {
  normalizeSubmissionPayload,
  buildCsvExportData,
  parseImportedJson,
  parseSubmissionPayload,
  validateImportedJsonAgainstContext,
  hydrateFormFromCanonical,
  validateDebtClassificationBalances,
  type MonthlyReportPayload,
  type SubmissionPayload,
  resolveYearlyPlannedRevenue,
} from '@repo/shared/domain'
import { insertSubmission } from '@repo/supabase/queries'
import { supabase } from './lib/supabaseClient'
import { resolveVisibleColumns, MONTHLY_REPORT_FORM_DEFS } from '@repo/shared/ui-metadata'

function unflattenRow(flatRow: Record<string, string>): Record<string, unknown> {
  const nested: Record<string, unknown> = {}

  for (const [path, value] of Object.entries(flatRow)) {
    if (!path || value === '') continue

    const parts = path.split('.')
    let cursor: Record<string, unknown> = nested

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      if (!part) continue
      const isLeaf = i === parts.length - 1
      if (isLeaf) {
        cursor[part] = value
      } else {
        const current = cursor[part]
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
          cursor[part] = {}
        }
        cursor = cursor[part] as Record<string, unknown>
      }
    }
  }

  return nested
}

function getNestedValue(source: unknown, path: string): unknown {
  if (!source || !path) return undefined
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, source)
}

function hasReportShapeHint(item: unknown): boolean {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false
  const record = item as Record<string, unknown>
  return [
    'notes',
    'general',
    'contract',
    'execution',
    'debt_analysis',
    'revenue_result',
    'pole_quantities',
  ].some((key) => key in record)
}

function canonicalToFlatRow(payload: MonthlyReportPayload, targetYears: number[]): Record<string, string> {
  const columns = resolveVisibleColumns(MONTHLY_REPORT_FORM_DEFS, targetYears)
  const row: Record<string, string> = {}

  for (const col of columns) {
    const raw = getNestedValue(payload, col.path)
    if (raw == null) {
      row[col.path] = ''
    } else if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      row[col.path] = String(raw)
    } else {
      row[col.path] = ''
    }
  }

  return row
}

const CONTEXT_DERIVED_ROW_FIELDS = new Set([
  'general.ten_pc',
  'general.doanh_thu_ke_hoach_nam',
])

function hasUserEnteredData(row: Record<string, string>): boolean {
  return Object.entries(row).some(([key, value]) => {
    if (CONTEXT_DERIVED_ROW_FIELDS.has(key)) return false
    return value.trim() !== ''
  })
}

function canonicalizeRows(
  rows: Array<Record<string, string>>,
  access: ReturnType<typeof useAccess>,
): MonthlyReportPayload[] {
  return rows
    .filter(hasUserEnteredData)
    .map((raw) => normalizeSubmissionPayload(
      unflattenRow(raw),
      { pcCode: access.pcCode, pcName: access.pcName },
      { year: access.period.year, month: access.period.month },
    ))
}

function buildSubmissionPayload(
  rows: Array<Record<string, string>>,
  access: ReturnType<typeof useAccess>,
  yearlyPlannedRevenue: number | null,
): SubmissionPayload {
  return {
    form_metadata: {
      pc_code: access.pcCode,
      pc_name: access.pcName,
      report_month: access.period.month,
      report_year: access.period.year,
      doanh_thu_ke_hoach_nam: yearlyPlannedRevenue ?? 0,
    },
    rows: canonicalizeRows(rows, access),
  }
}

function getImportItems(data: unknown): unknown[] {
  const formPayload = parseSubmissionPayload(data)
  if (formPayload.ok) return formPayload.data.rows

  const dataRecord = (data && typeof data === 'object' && !Array.isArray(data))
    ? (data as { rows?: unknown; submissions?: unknown })
    : null

  if (Array.isArray(dataRecord?.rows)) return dataRecord.rows
  if (Array.isArray(dataRecord?.submissions)) return dataRecord.submissions
  if (Array.isArray(data)) return data
  return data ? [data] : []
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}

function toCsv(records: Array<Record<string, string | number | null>>): string {
  if (records.length === 0) return ''
  const firstRow = records[0]
  if (!firstRow) return ''
  const headers = Object.keys(firstRow)
  const lines = [headers.join(',')]

  for (const row of records) {
    const serialized = headers.map((header) => {
      const val = String(row[header] ?? '').replace(/"/g, '""')
      return `"${val}"`
    })
    lines.push(serialized.join(','))
  }
  return `\uFEFF${lines.join('\n')}`
}

async function downloadExcel(records: Array<Record<string, string | number | null>>, fileName: string): Promise<void> {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(records)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao cao')
  XLSX.writeFile(workbook, fileName)
}

function excelValueToString(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function excelRowsToFlatRows(
  records: Array<Record<string, unknown>>,
  targetYears: number[],
): Array<Record<string, string>> {
  const columns = resolveVisibleColumns(MONTHLY_REPORT_FORM_DEFS, targetYears)
  const headerToPath = new Map<string, string>()

  for (const col of columns) {
    headerToPath.set(col.label.trim(), col.path)
    headerToPath.set(col.path, col.path)
  }

  return records.map((record) => {
    const row: Record<string, string> = {}
    for (const [header, value] of Object.entries(record)) {
      const path = headerToPath.get(header.trim())
      if (path) row[path] = excelValueToString(value).trim()
    }
    return row
  })
}

async function notifyTelegramSubmission(input: {
  pcCode: string
  pcName: string
  reportMonth: number
  reportYear: number
  rowCount: number
  submissionId: string
}): Promise<void> {
  try {
    const notifyResult: unknown = await supabase.functions.invoke<unknown>('notify-telegram', {
      body: input,
    })
    const notifyError = notifyResult && typeof notifyResult === 'object'
      ? (notifyResult as { error?: unknown }).error
      : null
    if (notifyError) {
      console.warn('Telegram notify failed', notifyError)
    }
  } catch (err) {
    console.warn('Telegram notify failed', err)
  }
}

function FormApp() {
  const access = useAccess()
  const { hasRestored, pendingRows, savedAt, saveDraft, clearDraft, restoreDraftRows, discardPendingRestore } = useDraftStorage(access)
  const targetYears = useMemo(() => [access.period.year], [access.period.year])
  
  // Local active view mimicking the spreadsheet rows initially seeded from drafts
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const yearlyPlannedRevenue = useMemo(() => {
    return resolveYearlyPlannedRevenue({ pcCode: access.pcCode, pcName: access.pcName })
  }, [access.pcCode, access.pcName])

  const applyContextDerivedValues = useCallback(
    (inputRows: Array<Record<string, string>>) => inputRows.map((row) => ({
      ...row,
      'general.ten_pc': access.pcName,
      'general.doanh_thu_ke_hoach_nam': String(yearlyPlannedRevenue ?? 0),
    })),
    [access.pcName, yearlyPlannedRevenue],
  )

  useEffect(() => {
    if (!hasRestored || !pendingRows || pendingRows.length === 0) return

    const readableTime = savedAt ? new Date(savedAt).toLocaleString() : 'unknown time'
    const shouldRestore = window.confirm(`Phát hiện bản nháp cho kỳ hiện tại (${readableTime}). Khôi phục?`)
    if (shouldRestore) {
      setRows(applyContextDerivedValues(restoreDraftRows()))
      return
    }

    discardPendingRestore()
  }, [hasRestored, pendingRows, savedAt, restoreDraftRows, discardPendingRestore, applyContextDerivedValues])

  useEffect(() => {
    if (!hasRestored) return
    saveDraft(rows)
  }, [rows, hasRestored, saveDraft])

  // Sync back to local storage whenever rows mutate meaningfully (debouncing not strictly required for primitive nested arrays inside O(100) boundaries according to Vercel rules)
  const handleRowsChange = useCallback((newRows: Array<Record<string, string>>) => {
    setRows(applyContextDerivedValues(newRows))
    setSuccessMsg(null)
  }, [applyContextDerivedValues])

  // Action: Tải CSV
  const handleExportCsv = () => {
    try {
      const payload = buildSubmissionPayload(rows, access, yearlyPlannedRevenue)
      if (payload.rows.length === 0) return

      const flatRecords = buildCsvExportData(payload.rows, targetYears)
      const csvContent = toCsv(flatRecords)
      downloadFile(
        csvContent,
        `EVNSPC_${access.pcCode}_${String(access.period.year)}_${String(access.period.month)}.csv`,
        'text/csv;charset=utf-8;',
      )
    } catch {
      alert("Lỗi xuất CSV. Bảng dữ liệu có thể không hợp lệ.")
    }
  }

  const handleExportExcel = async () => {
    try {
      const payload = buildSubmissionPayload(rows, access, yearlyPlannedRevenue)
      if (payload.rows.length === 0) return

      const flatRecords = buildCsvExportData(payload.rows, targetYears)
      await downloadExcel(
        flatRecords,
        `EVNSPC_${access.pcCode}_${String(access.period.year)}_${String(access.period.month)}.xlsx`,
      )
    } catch {
      alert('Lỗi xuất Excel. Bảng dữ liệu có thể không hợp lệ.')
    }
  }

  const handleExportJson = () => {
    try {
      const payload = buildSubmissionPayload(rows, access, yearlyPlannedRevenue)
      if (payload.rows.length === 0) return

      downloadFile(
        JSON.stringify(payload, null, 2),
        `EVNSPC_${access.pcCode}_${String(access.period.year)}_${String(access.period.month)}.json`,
        'application/json;charset=utf-8;',
      )
    } catch {
      alert('Không thể xuất JSON từ dữ liệu hiện tại.')
    }
  }

  // Action: Submit
  const handleSubmit = async () => {
    if (!confirm('Xác nhận gửi báo cáo tháng này lên hệ thống?')) return
    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
       const payload = buildSubmissionPayload(rows, access, yearlyPlannedRevenue)
       if (payload.rows.length === 0) {
         setErrorMsg('Chưa có dòng dữ liệu nào để gửi.')
         return
       }

       const debtValidationErrors = validateDebtClassificationBalances(payload.rows)
       if (debtValidationErrors.length > 0) {
         const firstError = debtValidationErrors[0]
         if (firstError) {
           setErrorMsg(
             `Dòng ${String(firstError.rowNumber)} chưa cân bằng: Tồn cuối kỳ ${firstError.closingBalance.toLocaleString()} phải bằng tổng phân tích nợ ${firstError.classificationTotal.toLocaleString()}. Vui lòng kiểm tra các cột phân tích nợ.`,
           )
         }
         return
       }

       const inserted = await insertSubmission(payload, {
         pcCode: access.pcCode,
         pcName: access.pcName,
         reportYear: access.period.year,
         reportMonth: access.period.month,
       })

       void notifyTelegramSubmission({
         pcCode: access.pcCode,
         pcName: access.pcName,
         reportMonth: access.period.month,
         reportYear: access.period.year,
         rowCount: payload.rows.length,
         submissionId: inserted.submissionId,
       })

       alert('Gửi báo cáo thành công!')
       setSuccessMsg('Đã gửi báo cáo thành công và xóa nháp cục bộ.')
       clearDraft()
       setRows([])
    } catch (err: unknown) {
       const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi submit data (Kiểm tra Schema Required).'
       setErrorMsg(message)
    } finally {
       setIsSubmitting(false)
    }
  }

  function parseImportItem(item: unknown): MonthlyReportPayload | null {
    const parsed = parseImportedJson(item)
    if (parsed.ok) return hydrateFormFromCanonical(parsed.data)
    if (!hasReportShapeHint(item)) return null

    const normalized = normalizeSubmissionPayload(
      item,
      { pcCode: access.pcCode, pcName: access.pcName },
      { year: access.period.year, month: access.period.month },
    )
    const fallbackParsed = parseImportedJson(normalized)
    return fallbackParsed.ok ? hydrateFormFromCanonical(fallbackParsed.data) : null
  }

  const importCanonicalRows = (items: unknown[], sourceLabel: string) => {
    if (items.length === 0) {
      alert(`Không có dữ liệu hợp lệ trong file ${sourceLabel}.`)
      return
    }

    const importedRows: Array<Record<string, string>> = []

    for (const item of items) {
      const hydrated = parseImportItem(item)
      if (!hydrated) {
        alert(`${sourceLabel} không đúng cấu trúc dữ liệu báo cáo.`)
        return
      }

      const contextCheck = validateImportedJsonAgainstContext(hydrated, {
        expectedPcCode: access.pcCode,
        expectedYear: access.period.year,
        expectedMonth: access.period.month,
      })

      if (!contextCheck.ok) {
        const details = contextCheck.error.map((mismatch) => mismatch.message).join('\n')
        alert(`Không thể import do sai ngữ cảnh:\n${details}`)
        return
      }

      importedRows.push(canonicalToFlatRow(hydrated, targetYears))
    }

    setRows(applyContextDerivedValues(importedRows))
    alert(`Đã import ${String(importedRows.length)} dòng dữ liệu.`)
  }

  async function importExcelFile(file: File): Promise<void> {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      alert('File Excel không có sheet dữ liệu.')
      return
    }

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      alert('File Excel không có sheet dữ liệu.')
      return
    }

    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
    const flatRows = excelRowsToFlatRows(records, targetYears).filter(hasUserEnteredData)
    const items = flatRows.map((row) => normalizeSubmissionPayload(
      unflattenRow(row),
      { pcCode: access.pcCode, pcName: access.pcName },
      { year: access.period.year, month: access.period.month },
    ))
    importCanonicalRows(items, 'Excel')
  }

  async function importJsonFile(file: File): Promise<void> {
    const rawResult = await file.text()
    const data: unknown = JSON.parse(rawResult)
    importCanonicalRows(getImportItems(data), 'JSON')
  }

  // Action: Import JSON / Excel
  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const input = e.target

    void (async () => {
      try {
        if (/\.(xlsx|xls)$/i.test(file.name)) {
          await importExcelFile(file)
          return
        }
        await importJsonFile(file)
      } catch {
        alert('File import không hợp lệ.')
      } finally {
        input.value = ''
      }
    })()
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
            Hệ Thống Báo Cáo Cột Điện
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Mã định danh: <span className="font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{access.pcCode}</span>
              <span className="mx-2 text-slate-300">|</span>
              Kỳ báo cáo: <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">Tháng {access.period.month}/{access.period.year}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-xs text-slate-500">
              Trạng thái lưu: <span className="font-medium text-slate-700">Tự động</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="file" accept=".json,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImportFile} />

              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <FileUp className="w-4 h-4" /> Import JSON/Excel
              </button>

              <button onClick={handleExportJson} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <FileDown className="w-4 h-4" /> Tải JSON
              </button>

              <button onClick={handleExportCsv} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <FileDown className="w-4 h-4" /> Tải CSV
              </button>

              <button onClick={() => { void handleExportExcel() }} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Tải Excel
              </button>

              <button onClick={() => { saveDraft(rows) }} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <Save className="w-4 h-4" /> Lưu Nháp
              </button>

              <button
                disabled={isSubmitting || rows.length === 0}
                onClick={() => { void handleSubmit() }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Đang gửi...' : 'Gửi Báo Cáo'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 mx-6 mt-4 shadow-sm" role="alert">
          <p className="font-medium">Lỗi Xác Thực Dữ Liệu</p>
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-4 py-3 mx-6 mt-4 shadow-sm" role="status">
          <p className="font-medium">Thao tác thành công</p>
          <p className="text-sm">{successMsg}</p>
        </div>
      )}

      <main className="flex-1 overflow-hidden p-6">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đơn vị</div>
              <div className="mt-1 text-slate-800 font-medium">{access.pcName}</div>
              <div className="text-xs text-slate-500 font-mono">{access.pcCode}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kỳ báo cáo</div>
              <div className="mt-1 text-slate-800 font-medium">
                Tháng {access.period.month}/{access.period.year}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Doanh thu kế hoạch năm (trước VAT)</div>
              <div className="mt-1 text-slate-800 font-semibold font-mono">
                {(yearlyPlannedRevenue ?? 0).toLocaleString()} VND
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
            Tồn đầu kỳ 2023/2024/2025 giữ cố định giữa các tháng báo cáo. Nếu gửi lại cùng PC/kỳ, hệ thống vẫn lưu thêm bản ghi mới và dashboard lấy lần gửi mới nhất làm báo cáo hiệu lực.
          </div>
        </div>
        <SpreadsheetTable 
          period={access.period}
          rows={rows}
          onChange={handleRowsChange}
        />
      </main>
    </div>
  )
}

function App() {
  return (
    <>
      <AccessProvider>
        <FormApp />
      </AccessProvider>
    </>
  )
}

export default App
