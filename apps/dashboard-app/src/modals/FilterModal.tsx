import { useState } from 'react'
import { getInitialFilterState, sanitizeFilterState, type FilterState } from '@repo/shared/domain'
import { X } from 'lucide-react'

interface FilterModalProps {
  initialState: FilterState
  pcOptions: string[]
  partnerOptions: string[]
  onApply: (f: FilterState) => void
  onClose: () => void
}

export function FilterModal({ initialState, pcOptions, partnerOptions, onApply, onClose }: FilterModalProps) {
  const [f, setF] = useState<FilterState>(sanitizeFilterState(initialState))

  const togglePc = (code: string) => {
    const list = f.pcCodes || []
    if (list.includes(code)) setF({ ...f, pcCodes: list.filter(c => c !== code) })
    else setF({ ...f, pcCodes: [...list, code] })
  }

  const togglePartner = (code: string) => {
    const list = f.partnerCodes || []
    if (list.includes(code)) setF({ ...f, partnerCodes: list.filter(c => c !== code) })
    else setF({ ...f, partnerCodes: [...list, code] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Bộ Lọc Dữ Liệu</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
          Lọc áp dụng trực tiếp lên tập dữ liệu tháng đã merge.
        </div>

        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          {/* PC Code */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Đơn vị Điện lực (PC)</h3>
            <div className="flex flex-wrap gap-2">
              {pcOptions.length === 0 && (
                <span className="text-xs text-slate-400">Không có đơn vị trong kỳ dữ liệu hiện tại.</span>
              )}
              {pcOptions.map(pc => (
                <button
                  key={pc}
                  onClick={() => togglePc(pc)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                    (f.pcCodes || []).includes(pc) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pc}
                </button>
              ))}
            </div>
          </div>

          {/* Partner Code */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Đối tác viễn thông</h3>
            <div className="flex flex-wrap gap-2">
              {partnerOptions.length === 0 && (
                <span className="text-xs text-slate-400">Không có đối tác trong kỳ dữ liệu hiện tại.</span>
              )}
              {partnerOptions.map(partner => (
                <button
                  key={partner}
                  onClick={() => togglePartner(partner)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                    (f.partnerCodes || []).includes(partner) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {partner}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
             <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Trạng thái HĐ</h3>
              <select 
                value={f.contractStatus || ""}
                onChange={(e) => setF({...f, contractStatus: e.target.value ? (e.target.value as any) : undefined})}
                className="w-full h-9 rounded border border-slate-300 text-sm px-3 bg-white"
              >
                <option value="">Tất cả</option>
                <option value="ACTIVE">Đang hiệu lực</option>
                <option value="EXPIRED">Đã hết hạn</option>
              </select>
            </div>

            {/* Debt switch */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Tình trạng Nợ</h3>
              <select 
                value={f.hasDebt === undefined ? "" : f.hasDebt ? "yes" : "no"}
                onChange={(e) => {
                  const val = e.target.value
                  setF({...f, hasDebt: val === "" ? undefined : val === "yes"})
                }}
                className="w-full h-9 rounded border border-slate-300 text-sm px-3 bg-white"
              >
                <option value="">Tất cả</option>
                <option value="yes">Có phát sinh nợ</option>
                <option value="no">Không nợ</option>
              </select>
            </div>
          </div>

          {/* Debt range */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Khoảng nợ (VND)</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={f.debtRange?.min ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  const min = raw === '' ? undefined : Number(raw)
                  setF({ ...f, debtRange: { min, max: f.debtRange?.max } })
                }}
                placeholder="Từ"
                className="w-full h-9 rounded border border-slate-300 px-3 text-sm"
              />
              <input
                type="number"
                value={f.debtRange?.max ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  const max = raw === '' ? undefined : Number(raw)
                  setF({ ...f, debtRange: { min: f.debtRange?.min, max } })
                }}
                placeholder="Đến"
                className="w-full h-9 rounded border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>

          {/* Search */}
          <div className="space-y-3">
             <h3 className="text-sm font-medium text-slate-700">Tìm kiếm tự do (HĐ / Đối tác)</h3>
             <input type="text" value={f.searchQuery || ''} onChange={e => setF({...f, searchQuery: e.target.value})} placeholder="Nhập từ khóa..." className="w-full h-9 rounded border border-slate-300 px-3 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-lg">
          <button 
            onClick={() => setF(getInitialFilterState())} 
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Xóa bộ lọc
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors text-slate-700">Hủy</button>
            <button onClick={() => onApply(sanitizeFilterState(f))} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm">Áp Dụng Lọc</button>
          </div>
        </div>
      </div>
    </div>
  )
}
