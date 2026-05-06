import { useEffect, useState } from 'react'
import { ChevronUp, Dumbbell } from 'lucide-react'
import { useActiveWorkoutStore } from '@/store/activeWorkoutStore'

function DockTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  )
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return (
    <span className="font-mono font-bold text-zinc-100 tabular-nums text-base">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

export default function ActiveWorkoutDock() {
  const { isMinimised, sessionName, startedAt, expand } = useActiveWorkoutStore()

  if (!isMinimised || !startedAt) return null

  return (
    <div
      className="mx-3 mb-2 bg-zinc-800 rounded-2xl flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-zinc-700 transition-colors"
      onClick={expand}
      role="button"
      aria-label="Expand workout"
    >
      <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
        <Dumbbell size={16} className="text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-100 truncate">{sessionName ?? 'Workout'}</p>
        <p className="text-xs text-zinc-500">In progress</p>
      </div>
      <DockTimer startedAt={startedAt} />
      <div className="w-8 h-8 flex items-center justify-center text-zinc-400 shrink-0">
        <ChevronUp size={18} />
      </div>
    </div>
  )
}
