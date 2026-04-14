import { createContext, useContext } from 'react'

export interface AccessContextData {
  pcCode: string
  pcName: string
  period: { year: number; month: number }
  rawKey: string
}

export const AccessContext = createContext<AccessContextData | undefined>(undefined)

export function useAccess(): AccessContextData {
  const context = useContext(AccessContext)
  if (!context) throw new Error('useAccess must be used within AccessProvider')
  return context
}

