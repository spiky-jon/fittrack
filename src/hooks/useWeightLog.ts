import { useState, useEffect, useCallback } from 'react'
import { getWeightLogs, upsertWeightLog, deleteWeightLog } from '@/services/weightLogs'
import { parseWeightToKg, kgToLbs } from '@/lib/units'
import type { WeightLog, UnitWeight } from '@/types'

export interface WeightLogEntry extends WeightLog {
  /** Weight converted to the user's display unit */
  displayWeight: number
}

export function useWeightLog(userId: string, unitWeight: UnitWeight) {
  const [logs, setLogs] = useState<WeightLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const toDisplay = useCallback(
    (kg: number) => unitWeight === 'lbs' ? kgToLbs(kg) : kg,
    [unitWeight],
  )

  const fetchLogs = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const raw = await getWeightLogs(userId, 30)
      setLogs(raw.map(l => ({ ...l, displayWeight: toDisplay(l.weight_kg) })))
    } catch (e) {
      console.error(e)
      setError('Failed to load weight logs')
    } finally {
      setLoading(false)
    }
  }, [userId, toDisplay])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  /**
   * Save or update an entry. `weightInDisplayUnit` is in kg or lbs depending on
   * the user's preference — we convert to kg before storing.
   */
  const addEntry = useCallback(async (
    date: string,
    weightInDisplayUnit: number,
    notes?: string,
  ) => {
    const weightKg = parseWeightToKg(weightInDisplayUnit, unitWeight)
    await upsertWeightLog(userId, date, weightKg, notes)
    await fetchLogs()
  }, [userId, unitWeight, fetchLogs])

  const removeEntry = useCallback(async (id: string) => {
    await deleteWeightLog(id)
    await fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, addEntry, removeEntry, refetch: fetchLogs }
}
