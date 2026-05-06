import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { formatWeight, formatHeight, cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from '@/lib/units'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, fetchProfile, signOut } = useAuthStore()

  const unitW = profile?.unit_weight ?? 'kg'
  const unitH = profile?.unit_height ?? 'cm'

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')

  // Height — one field for cm, two fields (ft + in) for ft_in
  const [heightCm, setHeightCm] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')

  // Goal weight — stored in display unit (kg or lbs)
  const [goalWeight, setGoalWeight] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Re-run whenever profile changes (includes unit preference changes saved in Settings)
  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setDob(profile.dob ?? '')

    if (profile.height_cm != null) {
      if (unitH === 'ft_in') {
        const { ft, inches } = cmToFtIn(profile.height_cm)
        setHeightFt(String(ft))
        setHeightIn(String(inches))
      } else {
        setHeightCm(String(profile.height_cm))
      }
    } else {
      setHeightCm('')
      setHeightFt('')
      setHeightIn('')
    }

    if (profile.goal_weight_kg != null) {
      setGoalWeight(
        unitW === 'lbs'
          ? String(kgToLbs(profile.goal_weight_kg))
          : String(profile.goal_weight_kg),
      )
    } else {
      setGoalWeight('')
    }
  }, [profile, unitH, unitW])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSaving(true)
    try {
      // Convert display values back to canonical cm / kg for storage
      let height_cm: number | null = null
      if (unitH === 'ft_in') {
        const ft = parseInt(heightFt) || 0
        const inches = parseInt(heightIn) || 0
        if (ft > 0 || inches > 0) height_cm = ftInToCm(ft, inches)
      } else {
        height_cm = heightCm ? parseFloat(heightCm) : null
      }

      const goal_weight_kg = goalWeight
        ? unitW === 'lbs'
          ? lbsToKg(parseFloat(goalWeight))
          : parseFloat(goalWeight)
        : null

      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim() || null,
          dob: dob || null,
          height_cm,
          goal_weight_kg,
        })
        .eq('id', user.id)
      if (error) throw error
      await fetchProfile(user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Profile</h1>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center text-2xl font-bold text-zinc-900 mb-2">
          {(name || user?.email || 'U').slice(0, 2).toUpperCase()}
        </div>
        <p className="text-zinc-400 text-sm">{user?.email}</p>
        {profile && (
          <div className="flex gap-4 mt-3 text-sm text-zinc-500">
            {profile.height_cm && (
              <span>{formatHeight(profile.height_cm, unitH)}</span>
            )}
            {profile.goal_weight_kg && (
              <span>Goal: {formatWeight(profile.goal_weight_kg, unitW)}</span>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-zinc-900 rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold text-zinc-100">Personal details</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors text-sm"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Date of birth</label>
          <div className="overflow-hidden rounded-lg">
            <input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              className="w-full min-w-0 appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-brand transition-colors text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Height — adapts to unit preference */}
          {unitH === 'ft_in' ? (
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Height</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={heightFt}
                    onChange={e => setHeightFt(e.target.value)}
                    min="0"
                    max="9"
                    placeholder="5"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-6 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">ft</span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={heightIn}
                    onChange={e => setHeightIn(e.target.value)}
                    min="0"
                    max="11"
                    placeholder="10"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-6 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">in</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                min="50"
                max="300"
                placeholder="e.g. 175"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors text-sm"
              />
            </div>
          )}

          {/* Goal weight — adapts to unit preference */}
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">
              Goal weight ({unitW === 'lbs' ? 'lbs' : 'kg'})
            </label>
            <input
              type="number"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              min="0"
              step={unitW === 'lbs' ? '0.5' : '0.1'}
              placeholder={unitW === 'lbs' ? 'e.g. 165' : 'e.g. 75'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 text-zinc-900 font-semibold rounded-lg py-2.5 transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </form>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-red-400 font-medium rounded-2xl py-3 transition-colors"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  )
}
