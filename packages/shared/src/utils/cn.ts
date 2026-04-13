import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Standard shadcn-style tailwind primitive merger avoiding duplicate class overrides
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
