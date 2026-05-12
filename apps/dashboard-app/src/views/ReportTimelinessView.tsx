import { ArrowLeft, Clock3, RefreshCw } from 'lucide-react'
import useSWR from 'swr'
import { fetchSubmissionsByPeriodWithDebug, listPcs } from '@repo/supabase/queries'
import {
  buildReportTimelinessRows,
  DEFAULT_REPORT_TIMELINESS_CONFIG,
  type ReportPeriod,
  type ReportTimelinessStatus,
} from '@repo/shared/domain'

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function statusLabel(status: ReportTimelinessStatus): string {
  if (status === 'ON_TIME') return 'Đúng hạn'
  if (status === 'LATE') return 'Trễ hạn'
  return 'Chưa nộp'
}

function statusClass(status: ReportTimelinessStatus): string {
  if (status === 'ON_TIME') return 'bg-emerald-100 text-emerald-700'
  if (status === 'LATE') return 'bg-red-100 text-red-700'
  return 'bg-slate-200 text-slate-600'
}

async function fetcher(period: ReportPeriod) {
  const [submissionResult, pcs] = await Promise.all([
    fetchSubmissionsByPeriodWithDebug(period.year, period.month),
    listPcs(),
  ])

  return buildReportTimelinessRows(
    period,
    pcs.map((pc) => ({ pcCode: pc.pc_code, pcName: pc.pc_name })),
    submissionResult.entries,
  )
}

export function ReportTimelinessView({
  period,
  onBack,
}: {
  period: ReportPeriod
  onBack: () => void
}) {
  const { data: rows = [], isLoading, isValidating, mutate } = useSWR(
    ['report-timeliness', period.year, period.month],
    () => fetcher(period),
    { keepPreviousData: true },
  )

  const deadline = rows[0]?.deadlineAt ?? null

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-amber-600" /> Tiến Độ Nộp Báo Cáo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tháng {period.month}/{period.year}; hạn nộp ngày {DEFAULT_REPORT_TIMELINESS_CONFIG.deadlineDay}, lệch tháng {DEFAULT_REPORT_TIMELINESS_CONFIG.deadlineMonthOffset}.
            </p>
          </div>
        </div>

        <button
          onClick={() => { void mutate() }}
          className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors text-slate-700 inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm text-sm text-slate-600">
            Deadline đang áp dụng: <span className="font-mono text-slate-900">{deadline ? formatDateTime(deadline) : '-'}</span>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200">PC</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200">Đơn vị</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200">Ngày nộp</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200 text-center">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200 text-right">Số ngày trễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Đang tải...</td></tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Chưa có danh sách PC.</td></tr>
                )}
                {rows.map((row) => (
                  <tr key={row.pcCode} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-slate-800">{row.pcCode}</td>
                    <td className="px-5 py-4 text-slate-700">{row.pcName}</td>
                    <td className="px-5 py-4 font-mono text-slate-500">{formatDateTime(row.submittedAt)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${statusClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-slate-800">{row.daysLate.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
