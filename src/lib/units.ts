// ============================================
// Unit conversion utilities
// Always store in kg/cm in the DB.
// Use these functions for display only.
// ============================================

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 100) / 100
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { ft, inches }
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54)
}

export function kcalToKj(kcal: number): number {
  return Math.round(kcal * 4.184)
}

// Format weight for display based on user preference
export function formatWeight(kg: number, unit: 'kg' | 'lbs'): string {
  if (unit === 'lbs') return `${kgToLbs(kg)} lbs`
  return `${kg} kg`
}

// Parse weight input back to kg for storage
export function parseWeightToKg(value: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'lbs') return lbsToKg(value)
  return value
}

// Format height for display
export function formatHeight(cm: number, unit: 'cm' | 'ft_in'): string {
  if (unit === 'ft_in') {
    const { ft, inches } = cmToFtIn(cm)
    return `${ft}'${inches}"`
  }
  return `${cm} cm`
}
