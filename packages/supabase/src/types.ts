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
          period_year: number
          period_month: number
          pc_code: string
          partner_code: string
          payload: MonthlyReportPayload
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
        }
        Insert: {
          id?: string
          created_at?: string
          period_year: number
          period_month: number
          pc_code: string
          partner_code: string
          payload: MonthlyReportPayload
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
        }
        Update: {
          period_year?: number
          period_month?: number
          pc_code?: string
          partner_code?: string
          payload?: MonthlyReportPayload
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
