import type { MergedMonthlyDataset } from '@repo/shared/domain'
import { buildDashboardTableModel } from '@repo/shared/domain'
import { cn } from '@repo/shared/utils'
import { useMemo } from 'react'

const DASHBOARD_TARGET_YEARS = [2024, 2025, 2026]

function buildGroupedColumns<T extends { section: string }>(columns: T[]): Array<{ label: string; cols: T[] }> {
  const groups: Array<{ label: string; cols: T[] }> = []

  for (const col of columns) {
    const last = groups[groups.length - 1]
    if (!last || last.label !== col.section) {
      groups.push({ label: col.section, cols: [col] })
    } else {
      last.cols.push(col)
    }
  }

  return groups
}

function buildPcRowSpans(rows: Array<{ pcCode: string }>): Map<number, number> {
  const spans = new Map<number, number>()
  let start = 0

  while (start < rows.length) {
    const pcCode = rows[start]?.pcCode
    let end = start + 1
    while (end < rows.length && rows[end]?.pcCode === pcCode) {
      end += 1
    }
    spans.set(start, end - start)
    start = end
  }

  return spans
}

export function DashboardTable({ dataset }: { dataset: MergedMonthlyDataset }) {
  const tableModel = useMemo(() => buildDashboardTableModel(dataset, DASHBOARD_TARGET_YEARS), [dataset])
  const groupedColumns = useMemo(() => buildGroupedColumns(tableModel.columns), [tableModel.columns])
  const pcRowSpans = useMemo(() => buildPcRowSpans(tableModel.rows), [tableModel.rows])
  const sectionBoundaryColumns = useMemo(() => {
    const starts = new Set<number>()
    let prev = ''
    tableModel.columns.forEach((col, i) => {
      if (i === 0 || col.section !== prev) starts.add(i)
      prev = col.section
    })
    return starts
  }, [tableModel.columns])

  if (tableModel.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-500 h-64">
        <p>Không có dữ liệu trong kỳ báo cáo này / bộ lọc hiện tại.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-100 z-20 sticky top-0 shadow-[0_1px_0_0_#e2e8f0]">
              <th
                rowSpan={2}
                className="w-12 p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-200 bg-slate-100 align-middle z-20"
              >
                #
              </th>
              <th
                colSpan={2}
                className="h-9 px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap border-r border-slate-200 bg-slate-100"
              >
                Thông tin báo cáo
              </th>
              {groupedColumns.map((group, groupIndex) => (
                <th
                  key={`${group.label}-${String(groupIndex)}`}
                  colSpan={group.cols.length}
                  className={cn(
                    'h-9 px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap border-r border-slate-200 bg-slate-100',
                    groupIndex > 0 && 'border-l border-l-slate-300',
                  )}
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 z-10 sticky top-9 shadow-[0_1px_0_0_#e2e8f0]">
              <th className="w-32 p-3 text-left text-xs font-semibold text-slate-700 bg-blue-50/50 uppercase tracking-wide border-r border-blue-100">
                Mã Đơn Vị (PC)
              </th>
              <th className="w-48 p-3 text-left text-xs font-semibold text-slate-700 bg-blue-50/50 uppercase tracking-wide border-r border-blue-100">
                Trạng Thái
              </th>
              {tableModel.columns.map((col, colIndex) => (
                <th
                  key={col.path}
                  className={cn(
                    'p-3 text-xs font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200 bg-slate-50 align-bottom',
                    sectionBoundaryColumns.has(colIndex) && 'border-l border-l-slate-300',
                  )}
                  style={col.widthHint ? { minWidth: col.widthHint, maxWidth: col.widthHint } : undefined}
                >
                  <div className="flex flex-col">
                    <span>{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {tableModel.rows.map((row, rIndex) => {
              const pcRowSpan = pcRowSpans.get(rIndex)
              return (
                <tr key={row.id || rIndex} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="p-3 border-r border-slate-200 bg-slate-50/30 text-center text-xs text-slate-400 font-mono w-12 group-hover:bg-slate-100">
                    {rIndex + 1}
                  </td>

                  {pcRowSpan && (
                    <>
                      <td
                        rowSpan={pcRowSpan}
                        className="p-3 border-r border-slate-200 bg-white align-middle font-mono text-sm font-medium text-slate-700"
                      >
                        {row.pcCode}
                      </td>
                      <td
                        rowSpan={pcRowSpan}
                        className="p-3 border-r border-slate-200 bg-white align-middle text-sm"
                      >
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          row.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                          row.status === 'SUBMITTED' ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {row.status}
                        </span>
                      </td>
                    </>
                  )}

                  {tableModel.columns.map((col, colIndex) => {
                    const raw = row.values[col.path]
                    const val = col.inputType === 'number' || col.inputType === 'currency' ? Number(raw) : raw

                    return (
                      <td key={col.path} className={cn(
                        "p-3 border-r border-slate-200 text-sm text-slate-700",
                        (col.inputType === 'number' || col.inputType === 'currency') && "text-right font-mono",
                        sectionBoundaryColumns.has(colIndex) && 'border-l border-l-slate-200',
                      )}>
                        {col.inputType === 'currency' ? Number(val).toLocaleString() : val}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      <div className="h-12 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-4 shrink-0 text-sm text-slate-600">
        <div>Hiển thị <span className="font-medium text-slate-900">{tableModel.rows.length}</span> dòng</div>
        <div>
          Tổng doanh thu tháng: <span className="font-medium font-mono text-slate-900 ml-1">
            {dataset.summary.totalRevenuePlan.toLocaleString()} VND
          </span>
        </div>
      </div>
    </div>
  )
}
