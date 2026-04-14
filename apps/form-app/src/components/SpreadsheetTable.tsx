import { getPartnerFullNameByCode } from '@repo/shared/domain'
import { MONTHLY_REPORT_FORM_DEFS, resolveVisibleColumns } from '@repo/shared/ui-metadata'
import { cn } from '@repo/shared/utils'
import {
  formatDecimalDisplay,
  formatThousandsFromRaw,
  isDecimalNumericPath,
  sanitizeDecimalInput,
  sanitizeIntegerDigitsInput,
} from '../lib/spreadsheetNumeric'
import { ChevronLeft, ChevronRight, Copy, Plus, Trash } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface SpreadsheetTableProps {
  period: { year: number; month: number }
  rows: Array<Record<string, string>>
  onChange: (rows: Array<Record<string, string>>) => void
}

function headerGroupLabelFromPath(path: string): string {
  if (path.startsWith('general.')) return 'Th\u00f4ng tin chung'
  if (path.startsWith('contract.')) return 'Th\u00f4ng tin h\u1ee3p \u0111\u1ed3ng'
  if (path.startsWith('execution.')) return 'T\u00ecnh h\u00ecnh th\u1ef1c hi\u1ec7n'
  if (path.startsWith('pole_quantities.')) return 'S\u1ed1 l\u01b0\u1ee3ng c\u1ed9t \u0111i\u1ec7n'
  if (path.startsWith('revenue_result.')) return 'Doanh thu'
  if (path.startsWith('debt_analysis.')) return 'Ph\u00e2n t\u00edch n\u1ee3'
  if (path.startsWith('notes.')) return 'Ghi ch\u00fa'
  return 'Kh\u00e1c'
}

function InputToast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-8 right-8 z-50 px-5 py-3.5 rounded-xl bg-slate-900 text-white text-[15px] leading-snug font-medium shadow-[0_8px_24px_rgba(0,0,0,0.22)] pointer-events-none animate-fade-in max-w-sm"
    >
      {message}
    </div>
  )
}

export function SpreadsheetTable({ period, rows, onChange }: SpreadsheetTableProps) {
  const targetYears = useMemo(() => [period.year - 1, period.year], [period.year])

  const columns = useMemo(
    () => resolveVisibleColumns(MONTHLY_REPORT_FORM_DEFS, targetYears),
    [targetYears],
  )

  const groupedColumns = useMemo(() => {
    const groups: Array<{ label: string; cols: typeof columns }> = []
    for (const col of columns) {
      const label = headerGroupLabelFromPath(col.path)
      const last = groups[groups.length - 1]
      if (!last || last.label !== label) {
        groups.push({ label, cols: [col] })
      } else {
        last.cols.push(col)
      }
    }
    return groups
  }, [columns])

  const sectionBoundaryColumns = useMemo(() => {
    const starts = new Set<number>()
    let prev = ''
    columns.forEach((col, i) => {
      const g = headerGroupLabelFromPath(col.path)
      if (i === 0 || g !== prev) starts.add(i)
      prev = g
    })
    return starts
  }, [columns])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputHint, setInputHint] = useState<string | null>(null)
  const hintTimerRef = useRef<number | null>(null)

  const flashHint = useCallback((msg: string) => {
    setInputHint(msg)
    if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current)
    hintTimerRef.current = window.setTimeout(() => {
      setInputHint(null)
      hintTimerRef.current = null
    }, 2400)
  }, [])

  useEffect(() => {
    return () => {
      if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current)
    }
  }, [])

  if (rows.length === 0) {
    onChange(Array.from({ length: 5 }, () => ({})))
    return null
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm">
        {'\u0110ang t\u1ea3i c\u1ea5u h\u00ecnh bi\u1ec3u m\u1eabu...'}
      </div>
    )
  }

  // Section divider: single-pixel slate-200 in body, slate-300 in header
  const sectionBorderBody = 'border-l border-l-slate-200'
  const sectionBorderHeader = 'border-l border-l-slate-300'

  const updateCell = (rowIndex: number, columnKey: string, value: string) => {
    const next = [...rows]
    next[rowIndex] = { ...next[rowIndex], [columnKey]: value }
    if (rowIndex === rows.length - 1 && value.trim() !== '') {
      next.push({})
    }
    onChange(next)
  }

  const handleNumericChange = (rowIndex: number, path: string, raw: string) => {
    if (isDecimalNumericPath(path)) {
      const { value, hadInvalid } = sanitizeDecimalInput(raw)
      if (hadInvalid) {
        flashHint('Chỉ nhập số; tối đa một dấu thập phân.')
      }
      updateCell(rowIndex, path, value)
      return
    }
    const { digits, hadInvalid } = sanitizeIntegerDigitsInput(raw)
    if (hadInvalid) {
      flashHint('Ô này chỉ nhập số nguyên.')
    }
    updateCell(rowIndex, path, digits)
  }

  const deleteRow = (index: number) => {
    if (rows.length === 1) {
      onChange([{}])
      return
    }
    const next = [...rows]
    next.splice(index, 1)
    onChange(next)
  }

  const duplicateRow = (index: number) => {
    const next = [...rows]
    const clone = { ...next[index] }
    next.splice(index + 1, 0, clone)
    onChange(next)
  }

  const addManualRow = () => {
    onChange([...rows, {}])
  }

  const scrollByAmount = (direction: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  return (
    <>
      <InputToast message={inputHint} />
      <div className="flex flex-col h-full min-h-0 gap-1.5">
        {/* Scroll controls — rendered above the card, never inside overflow */}
        <div className="flex justify-end px-0.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { scrollByAmount(-1) }}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors"
              title="Cuộn trái"
              aria-label="Cuộn bảng sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { scrollByAmount(1) }}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors"
              title="Cuộn phải"
              aria-label="Cuộn bảng sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col flex-1 min-h-0 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.300)_theme(colors.slate.100)]"
        >
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-100 z-20 sticky top-0 shadow-[0_1px_0_0_#e2e8f0]">
                <th
                  rowSpan={2}
                  className="w-12 p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-200 bg-slate-100 align-middle z-20"
                >
                  #
                </th>
                {groupedColumns.map((group, gi) => (
                  <th
                    key={`${group.label}-${String(gi)}`}
                    colSpan={group.cols.length}
                    className={cn(
                      'h-9 px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap border-r border-slate-200 bg-slate-100',
                      gi > 0 && sectionBorderHeader,
                    )}
                  >
                    {group.label}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="w-20 p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide sticky right-0 bg-slate-100 border-l border-slate-200 shadow-[-1px_0_0_0_#e2e8f0] align-middle z-20"
                >
                  Thao tác
                </th>
              </tr>
              <tr className="bg-slate-50 z-10 sticky top-9 shadow-[0_1px_0_0_#e2e8f0]">
                {columns.map((col, colIndex) => (
                  <th
                    key={col.path}
                    className={cn(
                      'p-3 text-xs font-medium text-slate-600 whitespace-nowrap border-r border-slate-200 bg-slate-50 align-bottom',
                      sectionBoundaryColumns.has(colIndex) && colIndex > 0 && sectionBorderHeader,
                    )}
                    style={col.widthHint ? { minWidth: col.widthHint, maxWidth: col.widthHint } : undefined}
                  >
                    <span>{col.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, rIndex) => (
                <tr key={rIndex} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="p-0 border-r border-slate-200 bg-slate-50/30 text-center text-xs text-slate-400 font-mono w-12 sticky left-0 z-[5] group-hover:bg-slate-100">
                    {rIndex + 1}
                  </td>

                  {columns.map((col, colIndex) => (
                    <td
                      key={col.path}
                      className={cn(
                        'p-0 border-r border-slate-100',
                        sectionBoundaryColumns.has(colIndex) && colIndex > 0 && sectionBorderBody,
                      )}
                    >
                      {col.inputType === 'select' ? (
                        <select
                          value={row[col.path] || ''}
                          onChange={(e) => { updateCell(rIndex, col.path, e.target.value) }}
                          disabled={col.isReadOnly}
                          title={getPartnerFullNameByCode(row[col.path]) ?? ''}
                          className={cn(
                            'w-full h-11 px-3 py-2 text-sm text-slate-900 bg-transparent border-none focus:ring-0 focus:outline-none focus:bg-blue-50/70 transition-colors',
                            col.isReadOnly && 'text-slate-400 cursor-default',
                          )}
                        >
                          <option value="" disabled>
                            Chọn đối tác
                          </option>
                          {(col.options ?? []).map((opt) => (
                            <option key={opt} value={opt} title={getPartnerFullNameByCode(opt) ?? ''}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : col.inputType === 'number' || col.inputType === 'currency' ? (
                        <input
                          type="text"
                          inputMode={isDecimalNumericPath(col.path) ? 'decimal' : 'numeric'}
                          autoComplete="off"
                          value={
                            isDecimalNumericPath(col.path)
                              ? formatDecimalDisplay(row[col.path] || '')
                              : formatThousandsFromRaw(row[col.path] || '')
                          }
                          onChange={(e) => { handleNumericChange(rIndex, col.path, e.target.value) }}
                          readOnly={col.isReadOnly}
                          className={cn(
                            'w-full h-11 px-3 py-2 text-sm text-slate-900 bg-transparent border-none focus:ring-0 focus:outline-none focus:bg-blue-50/70 transition-colors text-right font-mono',
                            col.isReadOnly && 'text-slate-400 cursor-default',
                          )}
                        />
                      ) : (
                        <input
                          type={col.inputType === 'date' ? 'date' : 'text'}
                          value={row[col.path] || ''}
                          onChange={(e) => { updateCell(rIndex, col.path, e.target.value) }}
                          readOnly={col.isReadOnly}
                          className={cn(
                            'w-full h-11 px-3 py-2 text-sm text-slate-900 bg-transparent border-none focus:ring-0 focus:outline-none focus:bg-blue-50/70 transition-colors',
                            col.isReadOnly && 'text-slate-400 cursor-default',
                          )}
                        />
                      )}
                    </td>
                  ))}

                  <td className="p-0 border-l border-slate-200 sticky right-0 z-[5] bg-white group-hover:bg-slate-50">
                    <div className="flex h-11 items-center justify-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { duplicateRow(rIndex) }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Nhân bản dòng"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { deleteRow(rIndex) }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Xóa dòng"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="h-11 bg-slate-50 border-t border-slate-200 flex items-center px-4 shrink-0">
          <button
            type="button"
            onClick={addManualRow}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm dòng</span>
          </button>
          <div className="ml-auto text-xs text-slate-400">
            {rows.length} d\u00f2ng
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
