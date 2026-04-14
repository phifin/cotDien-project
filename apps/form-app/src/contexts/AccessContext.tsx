import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AccessContext, type AccessContextData } from './accessContext'

type LoadingState = { status: 'loading' }
type ErrorState = { status: 'error'; error: string }
type SuccessState = { status: 'success'; access: AccessContextData }
type AccessState = LoadingState | ErrorState | SuccessState

interface FormKeyRecord {
  pc_code: string
  report_year: number
  report_month: number
  is_active: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function toFormKeyRecord(value: unknown): FormKeyRecord | null {
  const record = asRecord(value)
  if (!record) return null
  if (typeof record.pc_code !== 'string') return null
  if (typeof record.report_year !== 'number') return null
  if (typeof record.report_month !== 'number') return null
  if (typeof record.is_active !== 'boolean') return null

  return {
    pc_code: record.pc_code,
    report_year: record.report_year,
    report_month: record.report_month,
    is_active: record.is_active,
  }
}

function getPcName(value: unknown): string | null {
  const record = asRecord(value)
  if (!record) return null
  return typeof record.pc_name === 'string' ? record.pc_name : null
}

/**
 * Resolves access by querying the `form_keys` table in Supabase.
 * Keys are plain text (e.g. "demo-vl-032026") — NO Base64 decoding.
 */
async function resolveAccessKey(key: string): Promise<AccessContextData> {
  // 1. Look up the key in form_keys
  const { data: formKey, error: keyError } = await supabase
    .from('form_keys')
    .select('*')
    .eq('access_key', key)
    .maybeSingle()

  if (keyError) throw new Error('Invalid access key')
  const resolvedKey = toFormKeyRecord(formKey)
  if (!resolvedKey) throw new Error('Invalid access key')
  if (!resolvedKey.is_active) throw new Error('Inactive access key')

  // 2. Fetch matching PC from pcs table
  const { data: pc, error: pcError } = await supabase
    .from('pcs')
    .select('*')
    .eq('pc_code', resolvedKey.pc_code)
    .maybeSingle()
  void pcError

  return {
    pcCode: resolvedKey.pc_code,
    pcName: getPcName(pc) ?? resolvedKey.pc_code,
    period: {
      year: resolvedKey.report_year,
      month: resolvedKey.report_month,
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
      .then((access) => { setState({ status: 'success', access }) })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Invalid access key'
        setState({ status: 'error', error: message })
      })
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
