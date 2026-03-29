'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Profile } from '../types'
import MacroRing from '../components/MacroRing'
import BottomNav from '../components/BottomNav'
import SidebarNav from '../components/SidebarNav'

import API from '../config'

interface TrackerEntry {
  date: string
  calories: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg p-2 text-cream text-xs font-dm">
      <div className="text-muted">{label}</div>
      <div className="font-syne font-bold text-amber text-sm">{payload[0].value} kcal</div>
    </div>
  )
}

function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer bg-surface border border-border rounded-xl px-4 pt-6 pb-2 w-full text-cream font-dm focus:outline-none focus:border-amber transition-colors"
      />
      <label className="absolute left-4 top-4 text-muted text-sm transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-amber peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-amber">
        {label}
      </label>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)

  // Edit state
  const [editHeight, setEditHeight] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editSex, setEditSex] = useState<'male' | 'female'>('male')
  const [editName, setEditName] = useState('')

  const [weekEntries, setWeekEntries] = useState<TrackerEntry[]>([])
  const [todayConsumedKcal, setTodayConsumedKcal] = useState(0)
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('psu_profile')
    if (!raw) {
      router.replace('/onboarding')
      return
    }
    try {
      const p = JSON.parse(raw) as Profile
      setProfile(p)
      setEditHeight(String(p.height))
      setEditWeight(String(p.weight))
      setEditAge(String(p.age))
      setEditSex(p.sex)
      setEditName(p.name ?? '')
    } catch {
      router.replace('/onboarding')
    }
  }, [router])

  useEffect(() => {
    let token: string | null = null
    try {
      const session = JSON.parse(localStorage.getItem('psu_session') ?? '{}')
      token = session.token ?? null
    } catch {}
    if (!token) {
      setHistoryError(true)
      return
    }
    fetch(`${API}/tracker/week`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.entries) {
          // Sum calories per day
          const byDate: Record<string, number> = {}
          for (const e of j.entries) {
            byDate[e.date] = (byDate[e.date] ?? 0) + (e.calories ?? 0)
          }
          // Today's consumed
          const todayKey = new Date().toISOString().split('T')[0]
          setTodayConsumedKcal(byDate[todayKey] ?? 0)
          // Chart entries with friendly date labels
          setWeekEntries(
            Object.entries(byDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, calories]) => ({
                date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
                calories,
              }))
          )
        } else {
          setHistoryError(true)
        }
      })
      .catch(() => setHistoryError(true))
  }, [])

  function saveProfile() {
    if (!profile) return
    const updated: Profile = {
      ...profile,
      height: parseFloat(editHeight) || profile.height,
      weight: parseFloat(editWeight) || profile.weight,
      age: parseFloat(editAge) || profile.age,
      sex: editSex,
      name: editName || profile.name,
    }
    localStorage.setItem('psu_profile', JSON.stringify(updated))
    setProfile(updated)
    setEditing(false)
  }

  function signOut() {
    localStorage.clear()
    router.replace('/onboarding')
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    )
  }

  const initials = (profile.name ?? 'ME')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Prefer live localStorage value (updated by dashboard "+"), fall back to tracker total
  const todayConsumed = (() => {
    try {
      const raw = localStorage.getItem('psu_today')
      if (!raw) return todayConsumedKcal
      const { date, calories } = JSON.parse(raw)
      const today = new Date().toISOString().split('T')[0]
      return date === today ? (calories as number) : todayConsumedKcal
    } catch {
      return todayConsumedKcal
    }
  })()

  return (
    <div className="bg-background min-h-screen">
      <SidebarNav active="profile" />

      <main className="md:pl-20 lg:pl-60 pb-24 md:pb-8">
        <div className="h-0.5 psu-gradient w-full" />
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full psu-gradient text-white font-syne font-bold text-xl flex items-center justify-center flex-shrink-0 shadow-[0_4px_16px_rgba(0,156,222,0.4)]">
              {initials}
            </div>
            <div>
              <div className="font-syne font-bold text-cream text-xl">
                {profile.name ?? 'Athlete'}
              </div>
              <div className="text-muted text-sm capitalize">{profile.goal} · {profile.calories} kcal/day</div>
            </div>
          </div>

          {/* Today's ring */}
          <div className="bg-surface border border-border rounded-3xl p-6 flex flex-col items-center gap-3">
            <div className="text-muted text-sm font-dm">Today&apos;s progress</div>
            <MacroRing
              current={todayConsumed}
              target={profile.calories}
              color="#009CDE"
              label="Calories"
              unit="kcal"
            />
            <div className="text-muted text-xs">
              {todayConsumed} / {profile.calories} kcal consumed
            </div>
          </div>

          {/* Stats */}
          <div className="bg-surface border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-syne font-bold text-cream text-lg">Stats</h2>
              <button
                onClick={() => setEditing((e) => !e)}
                className="text-amber text-sm font-dm font-medium"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <div className="flex flex-col gap-3">
                <FloatingInput label="Name" value={editName} onChange={setEditName} />
                <FloatingInput
                  label="Height (cm)"
                  value={editHeight}
                  onChange={setEditHeight}
                  type="number"
                />
                <FloatingInput
                  label="Weight (kg)"
                  value={editWeight}
                  onChange={setEditWeight}
                  type="number"
                />
                <FloatingInput
                  label="Age"
                  value={editAge}
                  onChange={setEditAge}
                  type="number"
                />
                <div className="relative">
                  <select
                    value={editSex}
                    onChange={(e) => setEditSex(e.target.value as 'male' | 'female')}
                    className="bg-surface border border-border rounded-xl px-4 pt-6 pb-2 w-full text-cream font-dm focus:outline-none focus:border-amber transition-colors appearance-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <label className="absolute left-4 top-2 text-amber text-xs pointer-events-none">
                    Sex
                  </label>
                </div>
                <button
                  onClick={saveProfile}
                  className="mt-2 w-full py-3 rounded-2xl bg-amber text-background font-syne font-bold"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm font-dm">
                {[
                  { label: 'Height', value: `${profile.height} cm` },
                  { label: 'Weight', value: `${profile.weight} kg` },
                  { label: 'Age', value: String(profile.age) },
                  { label: 'Sex', value: profile.sex },
                  { label: 'Goal', value: profile.goal },
                  { label: 'Daily Target', value: `${profile.calories} kcal` },
                ].map((s) => (
                  <div key={s.label} className="bg-border/40 rounded-xl p-3">
                    <div className="text-muted text-xs mb-1">{s.label}</div>
                    <div className="text-cream font-medium capitalize">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History chart */}
          <div className="bg-surface border border-border rounded-3xl p-6">
            <h2 className="font-syne font-bold text-cream text-lg mb-4">Weekly History</h2>
            {historyError ? (
              <div className="text-muted text-sm text-center py-6">
                Log in to see your history
              </div>
            ) : weekEntries.length === 0 ? (
              <div className="text-muted text-sm text-center py-6">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={weekEntries} barCategoryGap="30%">
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8A8070', fontSize: 10, fontFamily: 'var(--font-dm)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,156,222,0.06)' }} />
                  <Bar dataKey="calories" fill="#009CDE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="w-full py-4 rounded-2xl border border-border text-muted font-dm font-medium hover:text-cream hover:border-coral transition-colors"
          >
            Sign out
          </button>
        </div>
      </main>

      <BottomNav active="profile" />
    </div>
  )
}
