import type { DashboardStats } from '@repo/shared/domain'
import { X } from 'lucide-react'

function money(value: number): string {
  return `${value.toLocaleString()} VND`
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function YearDebtRow({ yearlyDebts }: { yearlyDebts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {['2023', '2024', '2025', '2026'].map((year) => (
        <div key={year} className="bg-slate-50 border border-slate-200 rounded p-3">
          <div className="text-xs font-semibold text-slate-500">Nợ {year}</div>
          <div className="text-sm font-mono text-slate-800 mt-1">{money(yearlyDebts[year] ?? 0)}</div>
        </div>
      ))}
    </div>
  )
}

function AgingBucketRows({
  buckets,
}: {
  buckets: {
    below6Months: number
    from6To12Months: number
    from12To24Months: number
    from24To36Months: number
    above36Months: number
  }
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
      <div className="flex items-center justify-between border border-slate-200 rounded p-2 bg-white">
        <span className="text-slate-600">Dưới 6 tháng</span>
        <span className="font-mono">{money(buckets.below6Months)}</span>
      </div>
      <div className="flex items-center justify-between border border-slate-200 rounded p-2 bg-white">
        <span className="text-slate-600">6 đến dưới 12 tháng</span>
        <span className="font-mono">{money(buckets.from6To12Months)}</span>
      </div>
      <div className="flex items-center justify-between border border-slate-200 rounded p-2 bg-white">
        <span className="text-slate-600">12 đến dưới 24 tháng</span>
        <span className="font-mono">{money(buckets.from12To24Months)}</span>
      </div>
      <div className="flex items-center justify-between border border-slate-200 rounded p-2 bg-white">
        <span className="text-slate-600">24 đến dưới 36 tháng</span>
        <span className="font-mono">{money(buckets.from24To36Months)}</span>
      </div>
      <div className="flex items-center justify-between border border-slate-200 rounded p-2 bg-white md:col-span-2">
        <span className="text-slate-600">Trên 36 tháng</span>
        <span className="font-mono">{money(buckets.above36Months)}</span>
      </div>
    </div>
  )
}

export function StatsOverviewModal({ stats, onClose }: { stats: DashboardStats, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
      <div className="bg-slate-50 rounded-xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[92vh] overflow-hidden">
        <div className="bg-white flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Báo Cáo Thống Kê</h2>
            <p className="text-sm text-slate-500">Số liệu được tính từ tập dữ liệu tháng sau khi lọc.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded p-2 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(92vh-72px)]">
          <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded px-3 py-2">
            Ghi chú: toàn bộ chỉ số trong modal được tính từ dữ liệu sau khi áp dụng bộ lọc hiện tại.
          </div>
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">1. Tổng doanh thu cho thuê cột EVNSPC</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded p-3">
                <div className="text-sm text-slate-600">Tổng doanh thu</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">{money(stats.revenue.totalExpected)}</div>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <div className="text-sm text-slate-600">Tổng thu trong kỳ</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">{money(stats.revenue.totalActualCollected)}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">Doanh thu theo đối tác lớn</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {(['FPT', 'VNPT', 'MOBI', 'VTVCAB', 'SCTV'] as const).map((partner) => (
                  <div key={partner} className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-xs font-semibold text-slate-500">{partner}</div>
                    <div className="text-sm font-mono text-slate-900 mt-1">{money(stats.revenue.byMajorPartner[partner])}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded p-3">
                <div className="text-sm text-slate-600">Tỷ lệ thực hiện (thực tế / kế hoạch)</div>
                <div className="text-lg font-semibold font-mono mt-1">{pct(stats.revenue.executionRate)}</div>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <div className="text-sm text-slate-600">Tỷ lệ thu (đã thu / phát sinh trong kỳ)</div>
                <div className="text-lg font-semibold font-mono mt-1">{pct(stats.revenue.collectionRate)}</div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">2. Tổng số lượng cột</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="border border-slate-200 rounded p-3">
                <div className="text-xs text-slate-500">Dưới 8.5m</div>
                <div className="text-base font-mono mt-1">{stats.poles.buckets.below8_5m.toLocaleString()}</div>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <div className="text-xs text-slate-500">Từ 8.5m đến dưới 10.5m</div>
                <div className="text-base font-mono mt-1">{stats.poles.buckets.from8_5mTo10_5m.toLocaleString()}</div>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <div className="text-xs text-slate-500">Từ 10.5m đến dưới 12.5m</div>
                <div className="text-base font-mono mt-1">{stats.poles.buckets.from10_5mTo12_5m.toLocaleString()}</div>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <div className="text-xs text-slate-500">Trên 12.5m</div>
                <div className="text-base font-mono mt-1">{stats.poles.buckets.above12_5m.toLocaleString()}</div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">3. Tổng công nợ EVNSPC</h3>
            <div className="border border-slate-200 rounded p-3">
              <div className="text-sm text-slate-600">Tổng công nợ</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{money(stats.debt.total)}</div>
            </div>

            <YearDebtRow yearlyDebts={stats.debt.yearlyDebts} />

            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">Cơ cấu tuổi nợ</div>
              <AgingBucketRows buckets={stats.debt.agingBuckets} />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">4. Đối tác nợ khó đòi</h3>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
              <h4 className="text-base font-semibold text-slate-800">4.1 VTVCAB</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded p-3 bg-white">
                  <div className="text-sm text-slate-600">Tổng doanh thu</div>
                  <div className="text-base font-mono mt-1">{money(stats.difficultPartners.VTVCAB.totalRevenue)}</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-white">
                  <div className="text-sm text-slate-600">Tổng nợ</div>
                  <div className="text-base font-mono mt-1">{money(stats.difficultPartners.VTVCAB.totalDebt)}</div>
                </div>
              </div>
              <YearDebtRow yearlyDebts={stats.difficultPartners.VTVCAB.yearlyDebts} />
              <AgingBucketRows buckets={stats.difficultPartners.VTVCAB.agingBuckets} />
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
              <h4 className="text-base font-semibold text-slate-800">4.2 SCTV</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded p-3 bg-white">
                  <div className="text-sm text-slate-600">Tổng doanh thu</div>
                  <div className="text-base font-mono mt-1">{money(stats.difficultPartners.SCTV.totalRevenue)}</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-white">
                  <div className="text-sm text-slate-600">Tổng nợ</div>
                  <div className="text-base font-mono mt-1">{money(stats.difficultPartners.SCTV.totalDebt)}</div>
                </div>
              </div>
              <YearDebtRow yearlyDebts={stats.difficultPartners.SCTV.yearlyDebts} />
              <AgingBucketRows buckets={stats.difficultPartners.SCTV.agingBuckets} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
