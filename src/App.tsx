import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from '@/hooks/useAuthInit'
import { useAuthStore } from '@/store/authStore'

// Pages (to be created)
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import FoodLogPage from '@/pages/FoodLogPage'
import WorkoutsPage from '@/pages/WorkoutsPage'
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage'
import CalendarPage from '@/pages/CalendarPage'
import WeightPage from '@/pages/WeightPage'
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import NutritionPage from '@/pages/NutritionPage'

// Layout
import AppLayout from '@/components/layout/AppLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  useAuthInit()  // initialise auth listener

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Full-screen workout logger — outside AppLayout (no nav bar) */}
        <Route
          path="/workout/active/:sessionId"
          element={<ProtectedRoute><ActiveWorkoutPage /></ProtectedRoute>}
        />

        {/* Protected routes — wrapped in AppLayout (nav etc.) */}
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
