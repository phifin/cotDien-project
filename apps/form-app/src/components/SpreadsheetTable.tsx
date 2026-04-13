import React, { useMemo } from 'react'
import { resolveVisibleColumns, MONTHLY_REPORT_FORM_DEFS } from '@repo/shared/ui-metadata'
import { Plus, Trash, Copy } from 'lucide-react'
import { cn } from '@repo/shared/utils'

// The form operates on a loose array of "Record<string, string>" (raw user input strings).
// These get normalized into a canonical MonthlyReportPayload via `normalizeSubmissionPayload` on submit.

export interface SpreadsheetTableProps {
  period: { year: number; month: number }
  rows: Array<Record<string, string>>
  onChange: (rows: Array<Record<string, string>>) => void
}

/**
 * Excel-like interface for extremely low-tech end users.
 *
 * Root cause fix: resolveVisibleColumns(period) was wrong — `period` is an object, not an array.
 * Correct call: resolveVisibleColumns(definitions: FormFieldDefinition[], targetYears: number[])
 */
export function SpreadsheetTable({ period, rows, onChange }: SpreadsheetTableProps) {
  // Include current year and previous year for year-keyed fields
  const targetYears = useMemo(() => [period.year - 1, period.year], [period.year])

  // Defensive: use ?? [] to guard against any undefined definitions
  const columns = useMemo(
    () => resolveVisibleColumns(MONTHLY_REPORT_FORM_DEFS, targetYears),
    [targetYears]
  )

  // Auto-grow fallback: if rows are empty, seed 5 blank rows
  if (rows.length === 0) {
    onChange(Array.from({ length: 5 }, () => ({})))
    return null
  }

  // Defensive: render loading state if column definitions are not ready
  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm">
        Đang tải cấu hình biểu mẫu...
      </div>
    )
  }

  const updateCell = (rowIndex: number, columnKey: string, value: string) => {
    const next = [...rows]
    next[rowIndex] = { ...next[rowIndex], [columnKey]: value }
    // Auto-grow: if user edits the last row, append a new blank row
    if (rowIndex === rows.length - 1 && value.trim() !== '') {
      next.push({})
    }
    onChange(next)
  }

  const deleteRow = (index: number) => {
    if (rows.length === 1) {
      onChange([{}]) // keep at least 1
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

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
        <span className="font-medium">Bảng nhập liệu theo dòng (Excel-like)</span>
        <span>Mỗi dòng tương ứng 1 báo cáo chuẩn hóa</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50 z-10 sticky top-0 shadow-[0_1px_0_0_#e2e8f0]">
              <th className="w-12 p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-200">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.path}
                  className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200 bg-slate-50 align-bottom"
                  style={col.widthHint ? { minWidth: col.widthHint, maxWidth: col.widthHint } : undefined}
                >
                  <div className="flex flex-col">
                    <span>{col.label}</span>
                    {col.section && (
                      <span className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                        {col.section}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-20 p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide sticky right-0 bg-slate-100 border-l border-slate-200 shadow-[-1px_0_0_0_#e2e8f0]">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row, rIndex) => (
              <tr key={rIndex} className="hover:bg-slate-50/50 group transition-colors">
                <td className="p-0 border-r border-slate-200 bg-slate-50/30 text-center text-xs text-slate-400 font-mono w-12 sticky left-0 group-hover:bg-slate-100">
                  {rIndex + 1}
                </td>

                {columns.map((col) => (
                  <td key={col.path} className="p-0 border-r border-slate-200">
                    <input
                      type={
                        col.inputType === 'number' || col.inputType === 'currency'
                          ? 'number'
                          : col.inputType === 'date'
                          ? 'date'
                          : 'text'
                      }
                      value={row[col.path] || ''}
                      onChange={(e) => { updateCell(rIndex, col.path, e.target.value) }}
                      readOnly={col.isReadOnly}
                      className={cn(
                        'w-full h-11 px-3 py-2 text-sm text-slate-900 bg-transparent border-none focus:ring-0 focus:outline-none focus:bg-blue-50/70 transition-colors',
                        (col.inputType === 'number' || col.inputType === 'currency') && 'text-right font-mono',
                        col.isReadOnly && 'text-slate-400 cursor-default'
                      )}
                      placeholder={col.inputType === 'select' ? col.options?.join(' / ') : ''}
                    />
                  </td>
                ))}

                <td className="p-0 border-l border-slate-200 sticky right-0 bg-white group-hover:bg-slate-50">
                  <div className="flex h-11 items-center justify-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { duplicateRow(rIndex) }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Nhân bản dòng"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
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

      <div className="h-12 bg-slate-50 border-t border-slate-200 flex items-center px-4 shrink-0">
        <button
          onClick={addManualRow}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm dòng (Add Row)</span>
        </button>
        <div className="ml-auto text-xs text-slate-400">
          Tổng cộng: {rows.length} dòng
        </div>
      </div>
    </div>
  )
}
