import { useState, useEffect } from 'react'
import { getMonthSummary } from '@/services/calendarData'

export type SummaryMap = Record<string, { hasFood: boolean; hasWorkout: boolean; hasWeight: boolean }>

export function useCalendar(userId: string, year: number, month: number) {
  const [summaryMap, setSummaryMap] = useState<SummaryMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    setSummaryMap({})

    getMonthSummary(userId, year, month)
      .then(summaries => {
        if (cancelled) return
        const map: SummaryMap = {}
        for (const s of summaries) {
          map[s.date] = { hasFood: s.hasFood, hasWorkout: s.hasWorkout, hasWeight: s.hasWeight }
        }
        setSummaryMap(map)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [userId, year, month])

  return { summaryMap, loading }
}
