/** Raw storage: digits only (integer) or optional single decimal point (rate fields). No commas. */

export function isDecimalNumericPath(path: string): boolean {
  return path === 'revenue_result.ti_le_thuc_hien'
}

export function sanitizeIntegerDigitsInput(raw: string): { digits: string; hadInvalid: boolean } {
  const noSeparators = raw.replace(/[\s,]/g, '')
  const digitsOnly = noSeparators.replace(/\D/g, '')
  const hadInvalid = noSeparators.length > 0 && noSeparators !== digitsOnly
  return { digits: digitsOnly, hadInvalid }
}

export function sanitizeDecimalInput(raw: string): { value: string; hadInvalid: boolean } {
  const noSeparators = raw.replace(/[\s,]/g, '')
  let out = ''
  let dot = false
  let hadInvalid = false
  for (const ch of noSeparators) {
    if (ch >= '0' && ch <= '9') {
      out += ch
      continue
    }
    if (ch === '.') {
      if (!dot) {
        out += ch
        dot = true
      } else {
        hadInvalid = true
      }
      continue
    }
    hadInvalid = true
  }
  return { value: out, hadInvalid }
}

export function formatThousandsFromRaw(rawDigits: string): string {
  if (!rawDigits) return ''
  const isNeg = rawDigits.startsWith('-')
  const core = isNeg ? rawDigits.slice(1) : rawDigits
  if (!core) return isNeg ? '-' : ''
  const withGroups = core.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return isNeg ? `-${withGroups}` : withGroups
}

export function formatDecimalDisplay(raw: string): string {
  if (!raw) return ''
  const dot = raw.indexOf('.')
  if (dot === -1) return formatThousandsFromRaw(raw)
  const intPart = raw.slice(0, dot)
  const frac = raw.slice(dot + 1)
  const intFmt = formatThousandsFromRaw(intPart)
  return frac.length > 0 ? `${intFmt}.${frac}` : `${intFmt}.`
}
