import type { MergedMonthlyDataset } from '@repo/shared/domain'
import { buildDashboardTableModel } from '@repo/shared/domain'
import { cn } from '@repo/shared/utils'

export function DashboardTable({ dataset }: { dataset: MergedMonthlyDataset }) {
  const targetYears = [2024, 2025, 2026]
  const tableModel = buildDashboardTableModel(dataset, targetYears)

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
            <tr className="bg-slate-50 z-10 sticky top-0 shadow-[0_1px_0_0_#e2e8f0]">
              <th className="w-12 p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-200">
                #
              </th>
              
              {/* Aggregated Dashboard columns not present in Form-App metadata dynamically */}
              <th className="w-32 p-3 text-left text-xs font-semibold text-slate-700 bg-blue-50/50 uppercase tracking-wide border-r border-blue-100">
                Mã Đơn Vị (PC)
              </th>
              <th className="w-48 p-3 text-left text-xs font-semibold text-slate-700 bg-blue-50/50 uppercase tracking-wide border-r border-blue-100">
                Trạng Thái
              </th>

              {tableModel.columns.map((col) => (
                <th
                  key={col.path}
                  className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200 bg-slate-50"
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
              return (
                <tr key={row.id || rIndex} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="p-3 border-r border-slate-200 bg-slate-50/30 text-center text-xs text-slate-400 font-mono w-12 group-hover:bg-slate-100">
                    {rIndex + 1}
                  </td>
                  
                  {/* Dashboard specifically injects PC metadata */}
                  <td className="p-3 border-r border-slate-200 font-mono text-sm font-medium text-slate-700">
                    {row.pcCode}
                  </td>
                  <td className="p-3 border-r border-slate-200 text-sm">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      row.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                      row.status === 'SUBMITTED' ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {row.status}
                    </span>
                  </td>

                  {tableModel.columns.map((col) => {
                    const raw = row.values[col.path]
                    const val = col.inputType === 'number' || col.inputType === 'currency' ? Number(raw) : raw

                    return (
                      <td key={col.path} className={cn(
                        "p-3 border-r border-slate-200 text-sm text-slate-700",
                        (col.inputType === 'number' || col.inputType === 'currency') && "text-right font-mono"
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
