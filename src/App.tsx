import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from '@/hooks/useAuthInit'
import { useAuthStore } from '@/store/authStore'
import { useActiveWorkoutStore } from '@/store/activeWorkoutStore'
import { getIncompleteSessions } from '@/services/workoutSessions'

import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import FoodLogPage from '@/pages/FoodLogPage'
import WorkoutsPage from '@/pages/WorkoutsPage'
import CalendarPage from '@/pages/CalendarPage'
import WeightPage from '@/pages/WeightPage'
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import NutritionPage from '@/pages/NutritionPage'

import AppLayout from '@/components/layout/AppLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Restores any in-progress workout on app load / after auth resolves
function WorkoutRestorer() {
  const { user } = useAuthStore()
  const { sessionId, openWorkout } = useActiveWorkoutStore()

  useEffect(() => {
    if (!user || sessionId) return
    getIncompleteSessions(user.id)
      .then(sessions => {
        const s = sessions[0]
        if (s) openWorkout(s.id, s.name ?? 'Workout', s.started_at ?? new Date().toISOString())
      })
      .catch(() => {})
  }, [user?.id])

  return null
}

export default function App() {
  useAuthInit()

  return (
    <BrowserRouter>
      <WorkoutRestorer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="food" element={<FoodLogPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="weight" element={<WeightPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="nutrition" element={<NutritionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
