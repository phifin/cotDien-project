import type { MonthlyReportPayload } from '@repo/shared/domain'

/**
 * Manually crafted strict typings reflecting your DB migration state
 * for the submissions table.
 */
export interface Database {
  public: {
    Tables: {
      submissions: {
        Row: {
          id: string
          created_at: string
          report_year: number
          report_month: number
          pc_code: string
          pc_name: string
          payload: MonthlyReportPayload | Record<string, unknown>
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
        }
        Insert: {
          id?: string
          created_at?: string
          report_year: number
          report_month: number
          pc_code: string
          pc_name: string
          payload: MonthlyReportPayload | Record<string, unknown>
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
        }
        Update: {
          report_year?: number
          report_month?: number
          pc_code?: string
          pc_name?: string
          payload?: MonthlyReportPayload | Record<string, unknown>
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
        }
      }
      form_keys: {
        Row: {
          id: string
          access_key: string
          pc_code: string
          report_month: number
          report_year: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          access_key: string
          pc_code: string
          report_month: number
          report_year: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          access_key?: string
          pc_code?: string
          report_month?: number
          report_year?: number
          is_active?: boolean
        }
      }
      pcs: {
        Row: {
          pc_code: string
          pc_name: string
        }
        Insert: {
          pc_code: string
          pc_name: string
        }
        Update: {
          pc_name?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
