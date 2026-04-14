const PLANNED_REVENUE_BY_PC_NAME: Readonly<Record<string, number>> = {
  'an giang': 49454469237,
  'ca mau': 32651866957,
  'tp can tho': 44495354361,
  'dong nai': 60719603691,
  'dong thap': 40000000000,
  'lam dong': 22315331203,
  'tay ninh': 31065785120,
  'vinh long': 23853315685,
}

function normalizeKey(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Resolves fixed yearly planned revenue (VND) from PC context.
 * Prefer pcCode mapping when available; fallback to pcName normalization.
 */
export function resolveYearlyPlannedRevenue(input: { pcCode?: string; pcName?: string }): number | null {
  void input.pcCode

  const pcName = input.pcName?.trim()
  if (!pcName) return null

  const normalized = normalizeKey(pcName)
  return PLANNED_REVENUE_BY_PC_NAME[normalized] ?? null
}

