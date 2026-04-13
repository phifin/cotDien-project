import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Copy, Plus, KeyRound, RefreshCw } from 'lucide-react'
import { createFormKey, listFormKeys, listPcs, setFormKeyActive, type FormKeyRow, type PcRow } from '@repo/supabase/queries'

export function KeyManagerView({ onBack }: { onBack: () => void }) {
  const [pcCode, setPcCode] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR('key-manager-data', async () => {
    const [keys, pcs] = await Promise.all([listFormKeys(), listPcs()])
    return { keys, pcs }
  })

  const keys = data?.keys ?? []
  const pcs = data?.pcs ?? []

  const selectedPcName = useMemo(() => {
    const match = pcs.find((pc) => pc.pc_code === pcCode)
    return match?.pc_name ?? pcCode
  }, [pcs, pcCode])

  const generateAccessKey = (code: string, reportYear: number, reportMonth: number): string => {
    const random = Math.random().toString(36).slice(2, 8)
    return `${code.toLowerCase()}-${reportMonth}${reportYear}-${random}`
  }

  const handleCreate = async () => {
    if (!pcCode) {
      setErrorMsg('Vui lòng chọn đơn vị PC.')
      return
    }
    setCreating(true)
    setErrorMsg(null)
    try {
      await createFormKey({
        accessKey: generateAccessKey(pcCode, year, month),
        pcCode,
        reportMonth: month,
        reportYear: year,
        isActive: true,
      })
      await mutate()
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể tạo key mới.')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (key: FormKeyRow) => {
    setUpdatingId(key.id)
    setErrorMsg(null)
    try {
      await setFormKeyActive(key.id, !key.is_active)
      await mutate()
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái key.')
    } finally {
      setUpdatingId(null)
    }
  }

  const copyRef = (token: string) => {
    const url = `${window.location.origin.replace('5174', '5173')}/?key=${encodeURIComponent(token)}`
    navigator.clipboard.writeText(url)
    alert('Đã copy đường dẫn Form App!')
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" /> Quản Lý Access Key
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors text-slate-700 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Làm mới
          </button>
          <button onClick={onBack} className="px-4 py-2 text-sm font-medium bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 transition-colors text-slate-700">
            Đóng
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Tạo Access Key Mới</h3>
            
            <div className="flex gap-4 items-center">
               <select value={pcCode} onChange={(e) => setPcCode(e.target.value)} className="h-10 rounded border border-slate-300 text-sm px-3 bg-white w-64">
                 <option value="">Chọn PC...</option>
                 {pcs.map((pc: PcRow) => <option key={pc.pc_code} value={pc.pc_code}>{pc.pc_code} - {pc.pc_name}</option>)}
               </select>
               
               <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 rounded border border-slate-300 text-sm px-3 bg-white w-32">
                 {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
               </select>

               <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded border border-slate-300 text-sm px-3 bg-white w-32">
                 {[2024,2025,2026,2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
               </select>

               <button 
                  onClick={handleCreate}
                 disabled={creating || !pcCode}
                 className="h-10 px-4 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors ml-auto shadow-sm"
               >
                 <Plus className="w-4 h-4"/> Phát Hành Token
               </button>
            </div>
            {pcCode && (
              <p className="mt-3 text-xs text-slate-500">
                Đơn vị: <span className="font-medium text-slate-700">{selectedPcName}</span>
              </p>
            )}
            {errorMsg && (
              <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200">Đơn vị / Kỳ</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200">Access Key</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 border-b border-slate-200 text-center">Trạng thái</th>
                    <th className="w-48 px-5 py-3 text-center border-b border-slate-200">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isLoading || keys.length === 0) && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">{isLoading ? 'Đang tải...' : 'Chưa có access key nào.'}</td></tr>
                  )}
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-800">{k.pc_code} <span className="mx-2 text-slate-300">|</span> <span className="font-mono text-slate-500">{k.report_month}/{k.report_year}</span></td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 max-w-xs truncate">{k.access_key}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded font-medium ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                          {k.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => copyRef(k.access_key)} className="p-2 text-blue-600 hover:bg-blue-50 rounded bg-white border border-blue-200 transition-colors" title="Copy URL">
                            <Copy className="w-4 h-4"/>
                          </button>
                          <button
                            onClick={() => handleToggleActive(k)}
                            disabled={updatingId === k.id}
                            className="px-3 py-2 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                          >
                            {k.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>

          <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded p-3">
            Utility nội bộ: tạo key theo PC + tháng/năm báo cáo, theo dõi trạng thái active, copy nhanh link vào Form App.
          </div>

        </div>
      </div>
    </div>
  )
}
