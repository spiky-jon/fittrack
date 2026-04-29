import { useState, useEffect, useCallback } from 'react'
import {
  getDailyGoal,
  upsertDailyGoal,
  resetDailyGoal,
  getEffectiveGoals,
} from '@/services/dailyGoals'
import type { DailyGoals } from '@/services/dailyGoals'
import type { Profile } from '@/types'

export function useDailyGoals(userId: string, date: string, profile: Profile | null) {
  const [goals, setGoals] = useState<DailyGoals>(() => getEffectiveGoals(null, profile))
  const [isOverride, setIsOverride] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setGoals(getEffectiveGoals(null, profile))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const daily = await getDailyGoal(userId, date)
      setGoals(getEffectiveGoals(daily, profile))
      setIsOverride(daily !== null)
    } catch (e) {
      console.error('Failed to load daily goals', e)
    } finally {
      setLoading(false)
    }
  }, [userId, date, profile])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  /** Save custom goals for this day, marking it as an override. */
  const saveGoals = useCallback(async (next: DailyGoals) => {
    await upsertDailyGoal(userId, date, next)
    setGoals(next)
    setIsOverride(true)
  }, [userId, date])

  /** Delete the day override and revert to profile defaults. */
  const resetGoals = useCallback(async () => {
    await resetDailyGoal(userId, date)
    setGoals(getEffectiveGoals(null, profile))
    setIsOverride(false)
  }, [userId, date, profile])

  return { goals, isOverride, loading, saveGoals, resetGoals }
}
