import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface AccessContextData {
  pcCode: string
  pcName: string
  period: { year: number; month: number }
  rawKey: string
}

type LoadingState = { status: 'loading' }
type ErrorState = { status: 'error'; error: string }
type SuccessState = { status: 'success'; access: AccessContextData }
type AccessState = LoadingState | ErrorState | SuccessState

const AccessContext = createContext<AccessContextData | undefined>(undefined)

/**
 * Resolves access by querying the `form_keys` table in Supabase.
 * Keys are plain text (e.g. "demo-vl-032026") — NO Base64 decoding.
 */
async function resolveAccessKey(key: string): Promise<AccessContextData> {
  // 1. Look up the key in form_keys
  const { data: formKey, error: keyError } = await (supabase
    .from('form_keys' as any)
    .select('*')
    .eq('access_key', key)
    .maybeSingle() as any)

  if (keyError) throw new Error('Invalid access key')
  if (!formKey) throw new Error('Invalid access key')
  if (formKey.is_active === false) throw new Error('Inactive access key')

  // 2. Fetch matching PC from pcs table
  const { data: pc, error: pcError } = await (supabase
    .from('pcs' as any)
    .select('*')
    .eq('pc_code', formKey.pc_code)
    .maybeSingle() as any)

  if (pcError || !pc) {
    // We still allow access with fallback name to keep form usable.
  }

  return {
    pcCode: formKey.pc_code,
    pcName: pc?.pc_name ?? formKey.pc_code,
    period: {
      year: formKey.report_year,
      month: formKey.report_month,
    },
    rawKey: key,
  }
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessState>({ status: 'loading' })

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const key = searchParams.get('key')

    if (!key) {
      setState({ status: 'error', error: 'Missing access key' })
      return
    }

    resolveAccessKey(key)
      .then((access) => setState({ status: 'success', access }))
      .catch((err: Error) => setState({ status: 'error', error: err.message || 'Invalid access key' }))
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4 font-sans text-slate-800">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-red-600">Truy cập bị từ chối</h2>
          <p className="text-sm text-slate-600 mb-4">{state.error}</p>
          <div className="rounded bg-slate-100 p-3 text-xs text-slate-500 font-mono break-all">
            * Cần cung cấp mã Access Key hợp lệ trong đường dẫn. Liên hệ cấp trên để nhận mã.
          </div>
        </div>
      </div>
    )
  }

  return (
    <AccessContext.Provider value={state.access}>
      {children}
    </AccessContext.Provider>
  )
}

export function useAccess() {
  const context = useContext(AccessContext)
  if (!context) throw new Error('useAccess must be used within AccessProvider')
  return context
}
