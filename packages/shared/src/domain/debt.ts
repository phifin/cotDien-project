import type { DebtAnalysis, MonthlyReportPayload } from './types.js'

export interface DebtBreakdown {
  totalDebt: number
  debt2023: number
  debt2024: number
  debt2025: number
  debt2026: number
}

export interface DebtAgingBuckets {
  trong_han: number
  duoi_6_thang: number
  tu_6_den_duoi_12_thang: number
  tu_12_den_duoi_24_thang: number
  tu_24_den_duoi_36_thang: number
  tren_36_thang: number
}

export interface DebtBalanceValidationError {
  rowNumber: number
  closingBalance: number
  classificationTotal: number
}

function numberOrZero(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0
}

function yearAmount(map: Record<string, number> | undefined, year: string): number {
  return numberOrZero(map?.[year])
}

export function createEmptyDebtBreakdown(): DebtBreakdown {
  return {
    totalDebt: 0,
    debt2023: 0,
    debt2024: 0,
    debt2025: 0,
    debt2026: 0,
  }
}

export function addDebtBreakdown(target: DebtBreakdown, source: DebtBreakdown): void {
  target.totalDebt += source.totalDebt
  target.debt2023 += source.debt2023
  target.debt2024 += source.debt2024
  target.debt2025 += source.debt2025
  target.debt2026 += source.debt2026
}

export function calculateDebtBreakdown(row: MonthlyReportPayload): DebtBreakdown {
  const execution = row.execution

  return {
    totalDebt: numberOrZero(execution.closing_balance),
    debt2023: yearAmount(execution.opening_balance_by_year, '2023') - yearAmount(execution.collected_by_year, '2023'),
    debt2024: yearAmount(execution.opening_balance_by_year, '2024') - yearAmount(execution.collected_by_year, '2024'),
    debt2025: yearAmount(execution.opening_balance_by_year, '2025') - yearAmount(execution.collected_by_year, '2025'),
    debt2026: yearAmount(execution.generated_by_year, '2026') - yearAmount(execution.collected_by_year, '2026'),
  }
}

export function createEmptyDebtAgingBuckets(): DebtAgingBuckets {
  return {
    trong_han: 0,
    duoi_6_thang: 0,
    tu_6_den_duoi_12_thang: 0,
    tu_12_den_duoi_24_thang: 0,
    tu_24_den_duoi_36_thang: 0,
    tren_36_thang: 0,
  }
}

export function addDebtAgingBuckets(
  target: DebtAgingBuckets,
  source: Partial<DebtAnalysis> | undefined,
): void {
  if (!source) return
  target.trong_han += source.trong_han ?? 0
  target.duoi_6_thang += source.duoi_6_thang ?? 0
  target.tu_6_den_duoi_12_thang += source.tu_6_den_duoi_12_thang ?? 0
  target.tu_12_den_duoi_24_thang += source.tu_12_den_duoi_24_thang ?? 0
  target.tu_24_den_duoi_36_thang += source.tu_24_den_duoi_36_thang ?? 0
  target.tren_36_thang += source.tren_36_thang ?? 0
}

export function calculateDebtClassificationTotal(debtAnalysis: Partial<DebtAnalysis>): number {
  return (debtAnalysis.trong_han ?? 0)
    + (debtAnalysis.duoi_6_thang ?? 0)
    + (debtAnalysis.tu_6_den_duoi_12_thang ?? 0)
    + (debtAnalysis.tu_12_den_duoi_24_thang ?? 0)
    + (debtAnalysis.tu_24_den_duoi_36_thang ?? 0)
    + (debtAnalysis.tren_36_thang ?? 0)
}

export function validateDebtClassificationBalances(
  rows: MonthlyReportPayload[],
): DebtBalanceValidationError[] {
  const errors: DebtBalanceValidationError[] = []

  rows.forEach((row, index) => {
    const closingBalance = numberOrZero(row.execution.closing_balance)
    const classificationTotal = calculateDebtClassificationTotal(row.debt_analysis)
    if (Math.abs(closingBalance - classificationTotal) > 0.000001) {
      errors.push({
        rowNumber: index + 1,
        closingBalance,
        classificationTotal,
      })
    }
  })

  return errors
}
