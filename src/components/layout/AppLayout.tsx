import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Utensils, Dumbbell, Scale, CalendarDays } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useActiveWorkoutStore } from '@/store/activeWorkoutStore'
import ActiveWorkoutModal from '@/components/workout/ActiveWorkoutModal'
import ActiveWorkoutDock from '@/components/workout/ActiveWorkoutDock'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/food', icon: Utensils, label: 'Food' },
  { to: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { to: '/weight', icon: Scale, label: 'Weight' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
]

export default function AppLayout() {
  const { profile, user } = useAuthStore()
  const navigate = useNavigate()
  const { sessionId, isMinimised } = useActiveWorkoutStore()

  const displayName = profile?.name || user?.email?.split('@')[0] || 'You'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto bg-zinc-950 relative overflow-hidden">
      {/* Top nav bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span className="text-lg font-bold text-brand">FitTrack</span>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-sm text-zinc-400">{displayName}</span>
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-zinc-900">
            {initials}
          </div>
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Minimised workout dock — sits above the bottom nav */}
      {isMinimised && <ActiveWorkoutDock />}

      {/* Bottom navigation */}
      <nav className="shrink-0 bg-zinc-900 border-t border-zinc-800 safe-bottom">
        <div className="flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                  isActive ? 'text-brand' : 'text-zinc-500 hover:text-zinc-300'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Global workout modal — always in DOM when session active, slides up/down */}
      {sessionId && <ActiveWorkoutModal />}
    </div>
  )
}
