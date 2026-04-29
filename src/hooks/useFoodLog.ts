import { useState, useEffect, useCallback } from 'react'
import { getFoodLogsForDate, addFoodLog, deleteFoodLog, buildDailyLog } from '@/services/foodLogs'
import type { FoodLog, DailyLog } from '@/types'

export function useFoodLog(userId: string, date: string) {
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const logs = await getFoodLogsForDate(userId, date)
      setDailyLog(buildDailyLog(date, logs))
    } catch (e) {
      setError('Failed to load food logs')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [userId, date])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const addEntry = useCallback(async (log: Omit<FoodLog, 'id' | 'created_at'>) => {
    await addFoodLog(log)
    await fetchLogs()  // refresh after adding
  }, [fetchLogs])

  const removeEntry = useCallback(async (id: string) => {
    await deleteFoodLog(id)
    await fetchLogs()
  }, [fetchLogs])

  return { dailyLog, loading, error, addEntry, removeEntry, refetch: fetchLogs }
}
