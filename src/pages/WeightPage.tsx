import { useState, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { Trash2, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { useWeightLog } from '@/hooks/useWeightLog'
import { kgToLbs } from '@/lib/units'

const TODAY = format(new Date(), 'yyyy-MM-dd')

function formatDisplayDate(dateStr: string) {
  return format(parseISO(dateStr), 'EEE d MMM yyyy')   // "Mon 28 Apr 2026"
}

function formatChartDate(dateStr: string) {
  return format(parseISO(dateStr), 'd MMM')            // "28 Apr"
}

// Custom tooltip for the Recharts line chart
function ChartTooltip({ active, payload, unit }: {
  active?: boolean
  payload?: { value: number }[]
  unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100">
      {payload[0].value.toFixed(1)} {unit}
    </div>
  )
}

export default function WeightPage() {
  const { user, profile } = useAuthStore()
  const unitWeight = profile?.unit_weight ?? 'kg'
  const unitLabel = unitWeight === 'lbs' ? 'lbs' : 'kg'

  const { logs, loading, error, addEntry, removeEntry } = useWeightLog(
    user?.id ?? '',
    unitWeight,
  )

  // ── Log form state ──────────────────────────────────────────────────────────
  const todayLog = logs.find(l => l.date === TODAY)
  const [weightInput, setWeightInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Pre-fill when today's entry loads
  useMemo(() => {
    if (todayLog) {
      setWeightInput(String(todayLog.displayWeight))
      setNotesInput(todayLog.notes ?? '')
    } else {
      setWeightInput('')
      setNotesInput('')
    }
  }, [todayLog?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const w = parseFloat(weightInput)
    if (!w || w <= 0) { setFormError('Enter a valid weight'); return }
    setFormError(null)
    setSubmitting(true)
    try {
      await addEntry(TODAY, w, notesInput.trim() || undefined)
    } catch {
      setFormError('Failed to save — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Chart data ──────────────────────────────────────────────────────────────
  // Last 30 days window; fill only dates that have entries
  const chartData = useMemo(() => {
    const cutoff = format(subDays(new Date(), 29), 'yyyy-MM-dd')
    return [...logs]
      .filter(l => l.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(l => ({ date: formatChartDate(l.date), weight: l.displayWeight }))
  }, [logs])

  const goalDisplayWeight = profile?.goal_weight_kg != null
    ? unitWeight === 'lbs' ? kgToLbs(profile.goal_weight_kg) : profile.goal_weight_kg
    : null

  // Y axis domain: tight around the data range with a small buffer
  const weights = chartData.map(d => d.weight)
  if (goalDisplayWeight != null) weights.push(goalDisplayWeight)
  const yMin = weights.length ? Math.floor(Math.min(...weights) - 1) : 0
  const yMax = weights.length ? Math.ceil(Math.max(...weights) + 1) : 100

  return (
    <div className="pb-6 space-y-4">
      {/* ── Page header ── */}
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-zinc-100">Weight</h1>
        <p className="text-sm text-zinc-500">Track your progress over time</p>
      </div>

      {/* ── Section A: Log today ── */}
      <form onSubmit={handleSubmit} className="mx-4 bg-zinc-900 rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold text-zinc-100">
          {todayLog ? "Today's entry" : 'Log today'}
        </h2>

        {formError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              step="0.1"
              min="0"
              placeholder={unitWeight === 'lbs' ? 'e.g. 165.5' : 'e.g. 75.2'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-12 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              {unitLabel}
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-zinc-900 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors shrink-0"
          >
            {submitting
              ? <Loader2 size={16} className="animate-spin" />
              : todayLog ? 'Update' : 'Log weight'}
          </button>
        </div>

        <input
          type="text"
          value={notesInput}
          onChange={e => setNotesInput(e.target.value)}
          placeholder="Notes (optional)"
          maxLength={120}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors text-sm"
        />
      </form>

      {/* ── Error banner ── */}
      {error && (
        <p className="mx-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Section B: Chart ── */}
      <div className="mx-4 bg-zinc-900 rounded-2xl p-4">
        <h2 className="font-semibold text-zinc-100 mb-4">Last 30 days</h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-zinc-600" />
          </div>
        ) : chartData.length < 2 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-3xl mb-3">📈</p>
            <p className="text-sm text-zinc-400 font-medium">Not enough data yet</p>
            <p className="text-xs text-zinc-600 mt-1">Log a few entries to see your progress</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={v => `${v}`}
              />
              <Tooltip content={<ChartTooltip unit={unitLabel} />} />
              {goalDisplayWeight != null && (
                <ReferenceLine
                  y={goalDisplayWeight}
                  stroke="#22c55e"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{ value: `Goal`, fill: '#22c55e', fontSize: 10, position: 'insideTopRight' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#22c55e', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section C: History list ── */}
      <div className="mx-4 bg-zinc-900 rounded-2xl overflow-hidden">
        <h2 className="font-semibold text-zinc-100 px-4 py-3 border-b border-zinc-800">
          History
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-zinc-600" />
          </div>
        ) : logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600 italic text-center">No entries yet</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {logs.map((log, i) => {
              const prev = logs[i + 1]
              const delta = prev ? log.displayWeight - prev.displayWeight : null
              const isGain = delta !== null && delta > 0

              return (
                <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-zinc-100">
                        {log.displayWeight.toFixed(1)} {unitLabel}
                      </span>
                      {delta !== null && Math.abs(delta) >= 0.05 && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${isGain ? 'text-red-400' : 'text-brand'}`}>
                          {isGain
                            ? <TrendingUp size={11} />
                            : <TrendingDown size={11} />}
                          {isGain ? '+' : ''}{delta.toFixed(1)}{unitLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatDisplayDate(log.date)}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-zinc-600 mt-0.5 truncate">{log.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeEntry(log.id)}
                    className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
