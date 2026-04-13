import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetchSubmissionsByPeriodWithDebug } from '@repo/supabase/queries'
import { mergeMonthlySubmissions, applyFilters, buildStatsModel, getInitialFilterState, sanitizeFilterState, type FilterState } from '@repo/shared/domain'

import { DashboardTable } from './components/DashboardTable'
import { FilterModal } from './modals/FilterModal'
import { StatsOverviewModal } from './modals/StatsOverviewModal'
import { CompareView } from './views/CompareView'
import { KeyManagerView } from './views/KeyManagerView'

import { LayoutDashboard, Filter, BarChart3, Scale, KeyRound, RefreshCw } from 'lucide-react'

const fetcher = async ({ y, m }: { y: number, m: number }) => {
  const { entries, debug } = await fetchSubmissionsByPeriodWithDebug(y, m, { includeDebugPayloads: import.meta.env.DEV })
  const merged = mergeMonthlySubmissions({ year: y, month: m }, entries)
  return { merged, debug }
}
type PipelineData = Awaited<ReturnType<typeof fetcher>>

export default function App() {
  const [period, setPeriod] = useState({ year: 2026, month: 4 })
  const [activeView, setActiveView] = useState<'table' | 'compare' | 'keys'>('table')
  
  const [filterState, setFilterState] = useState<FilterState>({})
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)

  // Automatic SWR deduplication and revalidation on focus
  const { data: pipelineData, error, isLoading, isValidating, mutate } = useSWR<PipelineData, Error>({ y: period.year, m: period.month }, fetcher, {
    keepPreviousData: true 
  })

  // Derive filtered dataset synchronously
  const filteredDataset = useMemo(() => {
    if (!pipelineData?.merged) return null
    return applyFilters(pipelineData.merged, filterState)
  }, [pipelineData, filterState])

  const filterOptions = useMemo(() => {
    const entries = pipelineData?.merged.entries ?? []
    const pcOptions = Array.from(new Set(entries.map((entry) => entry.meta.pcCode))).sort()
    const partnerOptions = Array.from(new Set(entries.map((entry) => entry.data.general.doi_tac))).sort()
    return { pcOptions, partnerOptions }
  }, [pipelineData])

  // Derive statistics from filtered dataset synchronously
  const stats = useMemo(() => {
    if (!filteredDataset) return null
    return buildStatsModel(filteredDataset)
  }, [filteredDataset])

  const isFiltered = Object.keys(sanitizeFilterState(filterState)).length > 0
  const debugSummary = useMemo(() => {
    const fetchedCount = pipelineData?.debug.fetchedCount ?? 0
    const latestPerPcCount = pipelineData?.debug.latestPerPcCount ?? 0
    const parsedCount = pipelineData?.debug.parsedCount ?? 0
    const mergedRowCount = pipelineData?.merged.entries.length ?? 0
    const tableRowCount = filteredDataset?.entries.length ?? 0

    return {
      fetchedCount,
      latestPerPcCount,
      parsedCount,
      mergedRowCount,
      tableRowCount,
      sampleRaw: pipelineData?.debug.sampleRaw ?? null,
      sampleParsed: pipelineData?.debug.sampleParsed ?? null,
      skipReasons: pipelineData?.debug.skipReasons ?? [],
    }
  }, [pipelineData, filteredDataset])

  if (activeView === 'compare') {
    return <CompareView onBack={() => { setActiveView('table'); }} />
  }

  if (activeView === 'keys') {
    return <KeyManagerView onBack={() => { setActiveView('table'); }} />
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 px-6 py-3 flex items-center justify-between shrink-0 text-white shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="w-5 h-5"/></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cổng Quản Trị & Thông Kê</h1>
            <p className="text-xs text-slate-400 font-medium">EVNSPC Tổng Công Ty</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveView('keys'); }} className="px-4 py-2 rounded font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors text-slate-300">
            <KeyRound className="w-4 h-4"/> Token / Khóa
          </button>
          <div className="w-px h-6 bg-slate-700 mx-2"></div>
          
          <select 
            value={period.month} 
            onChange={e => { setPeriod({...period, month: Number(e.target.value)}); }}
            className="bg-slate-800 border border-slate-700 text-white text-sm h-9 rounded px-3 font-medium outline-none focus:border-blue-500 transition-colors"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>

          <select 
            value={period.year} 
            onChange={e => { setPeriod({...period, year: Number(e.target.value)}); }}
            className="bg-slate-800 border border-slate-700 text-white text-sm h-9 rounded px-3 font-medium outline-none focus:border-blue-500 transition-colors"
          >
            {[2024,2025,2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>
      </header>
      
      {/* Sub Ribbon */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setShowFilterModal(true); }} 
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border transition-colors ${isFiltered ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" /> 
            {isFiltered ? 'Đang lọc dữ liệu...' : 'Bộ Lọc'}
          </button>
          {isFiltered && (
            <button
              onClick={() => {
                setFilterState(getInitialFilterState())
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Xóa lọc
            </button>
          )}
          
          <button onClick={() => { setShowStatsModal(true); }} disabled={!stats} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50">
            <BarChart3 className="w-4 h-4 text-emerald-600" /> Báo Cáo Thông Kê
          </button>
          
          <button onClick={() => { setActiveView('compare'); }} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            <Scale className="w-4 h-4 text-blue-600" /> Công Cụ So Sánh
          </button>
        </div>

        <button onClick={() => { void mutate() }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors ${isValidating ? 'opacity-50 pointer-events-none' : ''}`}>
           <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} /> Tải Lại
        </button>
      </div>

      <main className="flex-1 overflow-hidden p-6 relative">
        {import.meta.env.DEV && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
            <div className="font-semibold">Dev Pipeline Debug</div>
            <div>Fetched submissions: {debugSummary.fetchedCount}</div>
            <div>Latest-per-PC submissions: {debugSummary.latestPerPcCount}</div>
            <div>Parsed submissions: {debugSummary.parsedCount}</div>
            <div>Merged dataset rows: {debugSummary.mergedRowCount}</div>
            <div>Final table rows: {debugSummary.tableRowCount}</div>
            {debugSummary.skipReasons.length > 0 && (
              <div>Skipped invalid payloads: {debugSummary.skipReasons.length}</div>
            )}
            {debugSummary.sampleRaw && (
              <div className="break-all">
                Sample raw payload: {JSON.stringify(debugSummary.sampleRaw)}
              </div>
            )}
            {debugSummary.sampleParsed && (
              <div className="break-all">
                Sample parsed row: {JSON.stringify(debugSummary.sampleParsed.data)}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Không tải được dữ liệu dashboard: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {isLoading && !filteredDataset ? (
           <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-[1px] z-10">
             <div className="flex flex-col items-center gap-2">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
               <p className="text-sm text-slate-500">Đang tải dữ liệu tháng...</p>
             </div>
           </div>
        ) : filteredDataset ? (
          <DashboardTable dataset={filteredDataset} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 shadow-sm max-w-md">
              Chưa có dữ liệu để hiển thị cho kỳ đã chọn.
            </div>
          </div>
        )}
      </main>

      {showFilterModal && (
        <FilterModal 
          initialState={filterState} 
          pcOptions={filterOptions.pcOptions}
          partnerOptions={filterOptions.partnerOptions}
          onApply={f => { setFilterState(sanitizeFilterState(f)); setShowFilterModal(false); }} 
          onClose={() => { setShowFilterModal(false); }}
        />
      )}

      {showStatsModal && stats && (
        <StatsOverviewModal stats={stats} onClose={() => { setShowStatsModal(false); }} />
      )}
    </div>
  )
}
