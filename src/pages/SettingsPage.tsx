import { useState, useEffect } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import type { UnitWeight, UnitHeight, UnitEnergy } from '@/types'

function RadioGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-zinc-400">{label}</p>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-brand text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, fetchProfile } = useAuthStore()

  const [unitWeight, setUnitWeight] = useState<UnitWeight>('kg')
  const [unitHeight, setUnitHeight] = useState<UnitHeight>('cm')
  const [unitEnergy, setUnitEnergy] = useState<UnitEnergy>('kcal')
  const [calorieGoal, setCalorieGoal] = useState('2000')
  const [proteinGoal, setProteinGoal] = useState('150')
  const [carbsGoal, setCarbsGoal] = useState('250')
  const [fatGoal, setFatGoal] = useState('65')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setUnitWeight(profile.unit_weight)
      setUnitHeight(profile.unit_height)
      setUnitEnergy(profile.unit_energy)
      setCalorieGoal(String(profile.calorie_goal))
      setProteinGoal(String(profile.protein_goal_g))
      setCarbsGoal(String(profile.carbs_goal_g))
      setFatGoal(String(profile.fat_goal_g))
    }
  }, [profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          unit_weight: unitWeight,
          unit_height: unitHeight,
          unit_energy: unitEnergy,
          calorie_goal: parseInt(calorieGoal) || 2000,
          protein_goal_g: parseInt(proteinGoal) || 150,
          carbs_goal_g: parseInt(carbsGoal) || 250,
          fat_goal_g: parseInt(fatGoal) || 65,
        })
        .eq('id', user.id)
      if (error) throw error
      await fetchProfile(user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-zinc-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Units */}
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-4">
          <h2 className="font-semibold text-zinc-100">Units</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <RadioGroup
            label="Weight"
            value={unitWeight}
            onChange={setUnitWeight}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lbs', label: 'lbs' },
            ]}
          />
          <RadioGroup
            label="Height"
            value={unitHeight}
            onChange={setUnitHeight}
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'ft_in', label: 'ft/in' },
            ]}
          />
          <RadioGroup
            label="Energy"
            value={unitEnergy}
            onChange={setUnitEnergy}
            options={[
              { value: 'kcal', label: 'kcal' },
              { value: 'kj', label: 'kJ' },
            ]}
          />
        </div>

        {/* Goals */}
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-4">
          <h2 className="font-semibold text-zinc-100">Daily goals</h2>

          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Calorie goal (kcal)</label>
            <input
              type="number"
              value={calorieGoal}
              onChange={e => setCalorieGoal(e.target.value)}
              min="500"
              max="10000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-brand transition-colors text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Protein (g)</label>
              <input
                type="number"
                value={proteinGoal}
                onChange={e => setProteinGoal(e.target.value)}
                min="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-brand transition-colors text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Carbs (g)</label>
              <input
                type="number"
                value={carbsGoal}
                onChange={e => setCarbsGoal(e.target.value)}
                min="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-brand transition-colors text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Fat (g)</label>
              <input
                type="number"
                value={fatGoal}
                onChange={e => setFatGoal(e.target.value)}
                min="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-brand transition-colors text-sm"
              />
            </div>
          </div>

          {/* Macro calorie note */}
          <p className="text-xs text-zinc-600">
            {(parseInt(proteinGoal) || 0) * 4 + (parseInt(carbsGoal) || 0) * 4 + (parseInt(fatGoal) || 0) * 9} kcal from macros
            {' · '}goal is {calorieGoal} kcal
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-zinc-900 font-semibold rounded-lg py-2.5 transition-colors"
        >
          <Save size={16} />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
        </button>
      </form>
    </div>
  )
}
