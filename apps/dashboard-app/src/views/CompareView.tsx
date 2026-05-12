import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetchSubmissionsForCompare } from '@repo/supabase/queries'
import { mergeMonthlySubmissions, compareMergedDatasets, PARTNER_CATEGORY_CODES, PARTNER_CATEGORY_LABELS, type NumericDiff } from '@repo/shared/domain'
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Generic period struct
type Period = { year: number, month: number }
type MetricRow = { metric: string; diff: NumericDiff; invert?: boolean; isRate?: boolean }

const fetcher = async ({ periodA, periodB }: { periodA: Period, periodB: Period }) => {
  const { monthA, monthB } = await fetchSubmissionsForCompare(periodA, periodB)

  const mergedA = mergeMonthlySubmissions(periodA, monthA)
  const mergedB = mergeMonthlySubmissions(periodB, monthB)

  return {
    mergedA,
    mergedB,
    diff: compareMergedDatasets(mergedA, mergedB),
  }
}

function DeltaBadge({ val, inverted = false }: { val: number, inverted?: boolean }) {
  if (val === 0) return <span className="text-slate-400 flex items-center gap-1 justify-end"><Minus className="w-3 h-3"/> 0</span>
  
  const isPositive = val > 0
  const isGood = inverted ? !isPositive : isPositive // E.g., more revenue=good, more debt=bad(inverted)
  
  return (
    <span className={`flex items-center gap-1 justify-end font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
      {isPositive ? '+' : ''}{val.toLocaleString()}
    </span>
  )
}

export function CompareView({ onBack }: { onBack: () => void }) {
  const [periodA, setPeriodA] = useState<Period>({ year: 2026, month: 3 })
  const [periodB, setPeriodB] = useState<Period>({ year: 2026, month: 4 })
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false)

  const { data, isLoading } = useSWR(
    { periodA, periodB },
    fetcher,
    { keepPreviousData: true },
  )

  const comparisonRows = useMemo(() => {
    if (!data?.diff) return null
    const d = data.diff
    return {
      revenue: [
        { metric: 'Tổng doanh thu kế hoạch', diff: d.revenue.totalPlanned, invert: false },
        { metric: 'Tổng thực hiện', diff: d.revenue.totalActual, invert: false },
        { metric: 'Tỷ lệ thực hiện', diff: d.revenue.completionRate, invert: false, isRate: true },
      ],
      partners: [
        { metric: 'FPT', diff: d.revenue.byMajorPartner.FPT, invert: false },
        { metric: 'VNPT', diff: d.revenue.byMajorPartner.VNPT, invert: false },
        { metric: 'MOBI', diff: d.revenue.byMajorPartner.MOBI, invert: false },
        { metric: 'VTVCAB', diff: d.revenue.byMajorPartner.VTVCAB, invert: false },
        { metric: 'SCTV', diff: d.revenue.byMajorPartner.SCTV, invert: false },
      ],
      revenueCategories: PARTNER_CATEGORY_CODES.map((category) => ({
        metric: PARTNER_CATEGORY_LABELS[category],
        diff: d.revenue.byCategory[category],
        invert: false,
      })),
      poles: [
        { metric: 'Tổng số lượng cột', diff: d.poles.total, invert: false },
        { metric: 'Dưới 8.5m', diff: d.poles.buckets.duoi_8_5m, invert: false },
        { metric: 'Từ 12.5m trở lên', diff: d.poles.buckets.tren_12_5m, invert: false },
      ],
      poleCategories: PARTNER_CATEGORY_CODES.map((category) => ({
        metric: PARTNER_CATEGORY_LABELS[category],
        diff: d.poles.byCategory[category].total,
        invert: false,
      })),
      debt: [
        { metric: 'Tổng công nợ toàn TCT', diff: d.debt.breakdown.totalDebt, invert: true },
        { metric: 'Tổng nợ tồn năm 2023 đến kỳ báo cáo', diff: d.debt.breakdown.debt2023, invert: true },
        { metric: 'Tổng nợ tồn năm 2024 đến kỳ báo cáo', diff: d.debt.breakdown.debt2024, invert: true },
        { metric: 'Tổng nợ tồn năm 2025 đến kỳ báo cáo', diff: d.debt.breakdown.debt2025, invert: true },
        { metric: 'Tổng nợ phải thu năm 2026 đến kỳ báo cáo', diff: d.debt.breakdown.debt2026, invert: true },
      ],
      debtCategories: PARTNER_CATEGORY_CODES.flatMap((category) => [
        {
          metric: `${PARTNER_CATEGORY_LABELS[category]} - Tổng công nợ`,
          diff: d.debt.byCategory[category].totalDebt,
          invert: true,
        },
        {
          metric: `${PARTNER_CATEGORY_LABELS[category]} - Nợ 2026`,
          diff: d.debt.byCategory[category].debt2026,
          invert: true,
        },
      ]),
      difficultPartners: [
        { metric: 'VTVCAB - Tổng doanh thu', diff: d.difficultPartners.VTVCAB.totalRevenue, invert: false },
        { metric: 'VTVCAB - Tổng công nợ toàn TCT', diff: d.difficultPartners.VTVCAB.debtBreakdown.totalDebt, invert: true },
        { metric: 'VTVCAB - Tổng nợ tồn năm 2023', diff: d.difficultPartners.VTVCAB.debtBreakdown.debt2023, invert: true },
        { metric: 'VTVCAB - Tổng nợ tồn năm 2024', diff: d.difficultPartners.VTVCAB.debtBreakdown.debt2024, invert: true },
        { metric: 'VTVCAB - Tổng nợ tồn năm 2025', diff: d.difficultPartners.VTVCAB.debtBreakdown.debt2025, invert: true },
        { metric: 'VTVCAB - Tổng nợ phải thu năm 2026', diff: d.difficultPartners.VTVCAB.debtBreakdown.debt2026, invert: true },
        { metric: 'SCTV - Tổng doanh thu', diff: d.difficultPartners.SCTV.totalRevenue, invert: false },
        { metric: 'SCTV - Tổng công nợ toàn TCT', diff: d.difficultPartners.SCTV.debtBreakdown.totalDebt, invert: true },
        { metric: 'SCTV - Tổng nợ tồn năm 2023', diff: d.difficultPartners.SCTV.debtBreakdown.debt2023, invert: true },
        { metric: 'SCTV - Tổng nợ tồn năm 2024', diff: d.difficultPartners.SCTV.debtBreakdown.debt2024, invert: true },
        { metric: 'SCTV - Tổng nợ tồn năm 2025', diff: d.difficultPartners.SCTV.debtBreakdown.debt2025, invert: true },
        { metric: 'SCTV - Tổng nợ phải thu năm 2026', diff: d.difficultPartners.SCTV.debtBreakdown.debt2026, invert: true },
      ],
    }
  }, [data])
  const diffSummary = data?.diff ?? null

  const formatValue = (value: number, isRate?: boolean) => (isRate ? `${(value * 100).toFixed(2)}%` : value.toLocaleString())
  const formatPercentChange = (value: number | null) => (value == null ? 'N/A' : `${(value * 100).toFixed(2)}%`)
  const shouldRenderRow = (delta: number) => !showOnlyDiffs || delta !== 0

  const renderMetricTable = (
    title: string,
    rows: MetricRow[],
  ) => (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-widest">{title}</h3>
      </div>
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50/40">
            <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200">Chỉ số</th>
            <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200 text-right">Kỳ A ({periodA.month}/{periodA.year})</th>
            <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200 text-right">Kỳ B ({periodB.month}/{periodB.year})</th>
            <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200 text-right">Delta (B - A)</th>
            <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200 text-right">% thay đổi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows
            .filter((row) => shouldRenderRow(row.diff.delta))
            .map((row) => (
              <tr key={row.metric} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-800">{row.metric}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-500">{formatValue(row.diff.valueA, row.isRate)}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-800">{formatValue(row.diff.valueB, row.isRate)}</td>
                <td className="px-5 py-3 text-right">
                  <DeltaBadge val={row.diff.delta} inverted={Boolean(row.invert)} />
                </td>
                <td className="px-5 py-3 text-right font-mono text-slate-500">{formatPercentChange(row.diff.percentChange)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
  
  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">So Sánh Tăng Trưởng</h2>
            <p className="text-xs text-slate-500 mt-0.5">Đối chiếu dữ liệu merge theo kỳ A/B</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <select value={periodA.month} onChange={e => { setPeriodA({...periodA, month: Number(e.target.value)}); }} className="bg-white border border-slate-200 text-sm h-8 rounded px-2 font-medium">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <select value={periodA.year} onChange={e => { setPeriodA({...periodA, year: Number(e.target.value)}); }} className="bg-white border border-slate-200 text-sm h-8 rounded px-2 font-medium">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
            <ArrowRight className="w-4 h-4 text-slate-400"/>
            <select value={periodB.month} onChange={e => { setPeriodB({...periodB, month: Number(e.target.value)}); }} className="bg-white border border-slate-200 text-sm h-8 rounded px-2 font-medium">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <select value={periodB.year} onChange={e => { setPeriodB({...periodB, year: Number(e.target.value)}); }} className="bg-white border border-slate-200 text-sm h-8 rounded px-2 font-medium">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showOnlyDiffs} onChange={e => { setShowOnlyDiffs(e.target.checked); }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            Chỉ hiện chênh lệch ròng
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center pt-20">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-500">Đang tổng hợp so sánh kỳ A/B...</p>
            </div>
          </div>
        ) : comparisonRows && diffSummary ? (
          <div className="space-y-6 max-w-6xl mx-auto">
            
            {/* Macro Header Diffs */}
            <div className="grid grid-cols-3 gap-6">
               <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                 <p className="text-sm font-medium text-slate-500">Biến Động Doanh Thu Gộp</p>
                 <div className="mt-2 text-2xl font-bold text-slate-800">
                   <DeltaBadge val={diffSummary.revenue.totalPlanned.delta} />
                 </div>
               </div>
               <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                 <p className="text-sm font-medium text-slate-500">Biến Động Khối Lượng Cột</p>
                 <div className="mt-2 text-2xl font-bold text-slate-800">
                   <DeltaBadge val={diffSummary.poles.total.delta} />
                 </div>
               </div>
               <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                 <p className="text-sm font-medium text-slate-500">Biến Động Nợ Tồn Khó Đòi</p>
                 <div className="mt-2 text-2xl font-bold text-slate-800">
                   <DeltaBadge val={diffSummary.debt.total.delta} inverted />
                 </div>
               </div>
            </div>

            {renderMetricTable('Doanh thu', comparisonRows.revenue)}
            {renderMetricTable('Doanh thu theo đối tác lớn', comparisonRows.partners)}
            {renderMetricTable('Doanh thu theo nhóm đối tác', comparisonRows.revenueCategories)}
            {renderMetricTable('Số lượng cột', comparisonRows.poles)}
            {renderMetricTable('Số lượng cột theo nhóm đối tác', comparisonRows.poleCategories)}
            {renderMetricTable('Công nợ', comparisonRows.debt)}
            {renderMetricTable('Công nợ theo nhóm đối tác', comparisonRows.debtCategories)}
            {renderMetricTable('Đối tác khó đòi', comparisonRows.difficultPartners)}

          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 shadow-sm max-w-md">
              Không có dữ liệu để so sánh ở một trong hai kỳ đã chọn.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
