import { useState, useCallback, useRef, useEffect, useMemo, type ChangeEvent } from 'react'
import { AccessProvider, useAccess } from './contexts/AccessContext'
import { SpreadsheetTable } from './components/SpreadsheetTable'
import { useDraftStorage } from './hooks/useDraftStorage'
import { FileUp, FileDown, Save, Send } from 'lucide-react'

// Utilities from shared packages
import {
  normalizeSubmissionPayload,
  buildCsvExportData,
  parseImportedJson,
  validateImportedJsonAgainstContext,
  hydrateFormFromCanonical,
  type MonthlyReportPayload,
} from '@repo/shared/domain'
import { insertSubmission } from '@repo/supabase/queries'
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

function canonicalizeRows(
  rows: Array<Record<string, string>>,
  access: ReturnType<typeof useAccess>,
): MonthlyReportPayload[] {
  return rows
    .filter((r) => Object.keys(r).length > 0 && Object.values(r).some((v) => v.trim() !== ''))
    .map((raw) => normalizeSubmissionPayload(
      unflattenRow(raw),
      { pcCode: access.pcCode, pcName: access.pcName },
      { year: access.period.year, month: access.period.month },
    ))
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

  const applyContextDerivedValues = useCallback(
    (inputRows: Array<Record<string, string>>) => inputRows.map((row) => ({
      ...row,
      'general.ten_pc': access.pcName,
    })),
    [access.pcName],
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
      const canonicalPayloads = canonicalizeRows(rows, access)
      if (canonicalPayloads.length === 0) return

      const flatRecords = buildCsvExportData(canonicalPayloads, targetYears)
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

  const handleExportJson = () => {
    try {
      const canonicalPayloads = canonicalizeRows(rows, access)
      if (canonicalPayloads.length === 0) return

      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        context: {
          pcCode: access.pcCode,
          period: access.period,
        },
        submissions: canonicalPayloads,
      }

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
       const payloads = canonicalizeRows(rows, access)
       const promises = payloads.map((payload) => insertSubmission(payload, {
         pcCode: access.pcCode,
         pcName: access.pcName,
         reportYear: access.period.year,
         reportMonth: access.period.month,
       }))

       await Promise.all(promises)

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

  // Action: Import JSON
  const handleImportJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
         const rawResult = event.target?.result
         if (typeof rawResult !== 'string') {
           alert('File JSON không hợp lệ.')
           return
         }

         const data: unknown = JSON.parse(rawResult)
         const dataRecord = (data && typeof data === 'object' && !Array.isArray(data))
           ? (data as { submissions?: unknown })
           : null
         const importItems: unknown[] = Array.isArray(data)
           ? data
           : Array.isArray(dataRecord?.submissions)
           ? dataRecord.submissions
           : data
           ? [data]
           : []

         if (importItems.length === 0) {
           alert('Không có dữ liệu hợp lệ trong file JSON.')
           return
         }

         const importedRows: Array<Record<string, string>> = []

         for (const item of importItems) {
           const parsed = parseImportedJson(item)
           if (!parsed.ok) {
             alert('JSON không đúng cấu trúc canonical.')
             return
           }

           const contextCheck = validateImportedJsonAgainstContext(parsed.data, {
             expectedPcCode: access.pcCode,
             expectedYear: access.period.year,
             expectedMonth: access.period.month,
           })

           if (!contextCheck.ok) {
             const details = contextCheck.error.map((mismatch) => mismatch.message).join('\n')
             alert(`Không thể import do sai ngữ cảnh:\n${details}`)
             return
           }

           const hydrated = hydrateFormFromCanonical(parsed.data)
           importedRows.push(canonicalToFlatRow(hydrated, targetYears))
         }

         setRows(applyContextDerivedValues(importedRows))
         alert(`Đã import ${String(importedRows.length)} dòng dữ liệu canonical.`)
      } catch {
         alert('File JSON không hợp lệ.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
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
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJson} />

              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <FileUp className="w-4 h-4" /> Import JSON
              </button>

              <button onClick={handleExportJson} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <FileDown className="w-4 h-4" /> Tải JSON
              </button>

              <button onClick={handleExportCsv} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                <FileDown className="w-4 h-4" /> Tải CSV
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
