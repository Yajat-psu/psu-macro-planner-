'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PlanItem, PlanResult, Profile } from '../types'
import CalorieHero from '../components/CalorieHero'
import HallSelector from '../components/HallSelector'
import SkeletonCard from '../components/SkeletonCard'
import BottomNav from '../components/BottomNav'
import SidebarNav from '../components/SidebarNav'

const API = 'http://localhost:8000'

function computeCalories(profile: Profile, goal: string): number {
  const bmr = 10 * (profile.weight ?? 0) + 6.25 * (profile.height ?? 0) - 5 * (profile.age ?? 0) + (profile.sex === 'male' ? 5 : -161)
  const tdee = Math.round(bmr * 1.55)
  if (goal === 'cutting') return tdee - 500
  if (goal === 'bulking') return tdee + 300
  return tdee
}

// ── Plan variant definitions ─────────────────────────────────────────────────
interface Variant {
  name: string
  icon: string
  desc: string
  protein_priority: number
  seed: number
  extra_prefs: string[]
}

const PLAN_VARIANTS: Record<'cutting' | 'maintaining' | 'bulking', Variant[]> = {
  cutting: [
    { name: 'High Protein Cut', icon: '🥩', desc: 'Maximum protein during deficit', protein_priority: 0.90, seed: 1, extra_prefs: [] },
    { name: 'Lean Cut',         icon: '⚡', desc: 'Efficient fat loss, muscle preserved', protein_priority: 0.80, seed: 2, extra_prefs: [] },
    { name: 'Balanced Deficit', icon: '⚖️', desc: 'Sustainable cut, mixed macros',       protein_priority: 0.70, seed: 3, extra_prefs: [] },
    { name: 'Low Cal Volume',   icon: '🥗', desc: 'More food, lower calorie density',     protein_priority: 0.60, seed: 4, extra_prefs: [] },
  ],
  maintaining: [
    { name: 'Performance',  icon: '🎯', desc: 'Optimized for athletic output',        protein_priority: 0.75, seed: 1, extra_prefs: [] },
    { name: 'Balanced',     icon: '⚖️', desc: 'Even macro split for body recomp',     protein_priority: 0.70, seed: 2, extra_prefs: [] },
    { name: 'High Protein', icon: '💪', desc: 'Maximize protein, minimize fat gain',  protein_priority: 0.88, seed: 3, extra_prefs: [] },
    { name: 'High Volume',  icon: '🍽️', desc: 'More food, lighter calorie density',   protein_priority: 0.55, seed: 4, extra_prefs: [] },
  ],
  bulking: [
    { name: 'Lean Bulk',     icon: '📈', desc: 'Controlled surplus, minimal fat gain', protein_priority: 0.82, seed: 1, extra_prefs: [] },
    { name: 'Max Protein',   icon: '🥩', desc: 'Every gram of protein counts',         protein_priority: 0.95, seed: 2, extra_prefs: [] },
    { name: 'Volume Bulk',   icon: '🍽️', desc: 'High calorie, build mass fast',        protein_priority: 0.55, seed: 3, extra_prefs: [] },
    { name: 'Balanced Bulk', icon: '⚖️', desc: 'Moderate surplus, steady gains',       protein_priority: 0.70, seed: 4, extra_prefs: [] },
  ],
}

const MEAL_ICONS:  Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', extras: '⚡' }
const MEAL_COLORS: Record<string, string> = { breakfast: '#009CDE', lunch: '#4DAFD4', dinner: '#7BA3D4', extras: '#9BB8D4' }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Compact item row (no add button) ────────────────────────────────────────
function PlanItemRow({ item }: { item: PlanItem }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background/40">
      <div className="flex-1 min-w-0">
        <a
          href={item.nutrition_url}
          target="_blank"
          rel="noreferrer"
          className="text-cream text-sm font-dm font-medium truncate block hover:text-amber transition-colors"
        >
          {item.name}
        </a>
        {item.station && <div className="text-muted text-xs mt-0.5">{item.station}</div>}
      </div>
      <div className="text-right ml-3 flex-shrink-0">
        <div className="font-syne font-bold text-amber text-sm">{item.calories ?? '—'} kcal</div>
        <div className="text-muted text-xs">{item.protein_g ?? '—'}g prot</div>
      </div>
    </div>
  )
}

// ── Saved plan entry card ────────────────────────────────────────────────────
interface SavedEntry {
  id: string
  date: string
  plan_label: string
  calories: number
  protein_g: number
  goal_type: string
  meals?: Record<string, { items: PlanItem[]; totals: { calories: number; protein_g: number } }>
}

function SavedEntryCard({
  entry, onDelete, expanded, onToggle,
}: {
  entry: SavedEntry
  onDelete: (id: string) => void
  expanded: boolean
  onToggle: (id: string) => void
}) {
  const hasMeals = entry.meals && Object.values(entry.meals).some(s => s.items?.length)
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => hasMeals && onToggle(entry.id)}
          className="flex-1 min-w-0 text-left flex items-center gap-2"
        >
          {hasMeals && (
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted text-xs flex-shrink-0">▾</motion.span>
          )}
          <span className="font-dm font-medium text-cream text-sm truncate">{entry.plan_label}</span>
        </button>
        <div className="text-right flex-shrink-0 mr-1">
          <div className="font-syne font-bold text-amber text-sm">{entry.calories.toLocaleString()} kcal</div>
          <div className="text-muted text-xs">{entry.protein_g}g prot</div>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="w-7 h-7 rounded-lg bg-border/50 text-muted hover:text-coral hover:bg-coral/10 flex items-center justify-center text-sm transition-colors flex-shrink-0"
        >×</button>
      </div>

      {/* Expandable meal sections */}
      <AnimatePresence initial={false}>
        {expanded && hasMeals && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-border px-3 pb-3 pt-2 flex flex-col gap-1.5">
              {(['breakfast', 'lunch', 'dinner', 'extras'] as const).map(mealKey => {
                const section = entry.meals![mealKey]
                if (!section?.items?.length) return null
                return (
                  <div key={mealKey}>
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <span className="text-sm">{MEAL_ICONS[mealKey]}</span>
                      <span className="text-xs font-dm font-semibold uppercase tracking-wider" style={{ color: MEAL_COLORS[mealKey] }}>
                        {mealKey}
                      </span>
                      <span className="text-muted text-xs ml-auto">{section.totals.calories} kcal</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {section.items.map(item => <PlanItemRow key={item.mid} item={item} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [halls, setHalls] = useState<{ id: string; name: string }[]>([])
  const [selectedHall, setSelectedHall] = useState('')
  const [stations, setStations] = useState<string[]>([])
  const [selectedStation, setSelectedStation] = useState('')

  // 4 variant plans
  const [plans, setPlans] = useState<(PlanResult | null)[]>([null, null, null, null])
  const [activeVariant, setActiveVariant] = useState(0)
  const [planLoading, setPlanLoading] = useState(false)
  const [planVariantDir, setPlanVariantDir] = useState(1)

  // Tabs + saved entries
  const [activeTab, setActiveTab] = useState<'plans' | 'saved'>('plans')
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  // Which meal sections are open in the plan widget (reset on variant change)
  const [openMeals, setOpenMeals] = useState<Set<string>>(new Set())
  // Which saved entry cards are expanded
  const [expandedSaved, setExpandedSaved] = useState<Set<string>>(new Set())

  // Load profile
  useEffect(() => {
    const raw = localStorage.getItem('psu_profile')
    if (!raw) { router.replace('/onboarding'); return }
    try { setProfile(JSON.parse(raw) as Profile) }
    catch { router.replace('/onboarding') }
  }, [router])

  // Fetch halls
  useEffect(() => {
    fetch(`${API}/locations`)
      .then(r => r.json())
      .then(j => {
        if (j.locations) {
          setHalls(j.locations)
          if (j.locations.length > 0) setSelectedHall(j.locations[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch stations when hall changes
  useEffect(() => {
    if (!selectedHall) return
    setSelectedStation('')
    fetch(`${API}/stations?location_id=${selectedHall}`)
      .then(r => r.json())
      .then(j => { if (j.stations) setStations(j.stations) })
      .catch(() => {})
  }, [selectedHall])

  // Fetch saved entries when Saved tab opens
  useEffect(() => {
    if (activeTab !== 'saved') return
    loadSaved()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadSaved() {
    let token: string | null = null
    try { token = JSON.parse(localStorage.getItem('psu_session') ?? '{}').token } catch {}
    if (!token) return
    setSavedLoading(true)
    fetch(`${API}/tracker/week`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => { if (j.entries) setSavedEntries(j.entries) })
      .catch(() => {})
      .finally(() => setSavedLoading(false))
  }

  async function deleteEntry(id: string) {
    let token: string | null = null
    try { token = JSON.parse(localStorage.getItem('psu_session') ?? '{}').token } catch {}
    if (!token) return
    await fetch(`${API}/tracker/entry/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    setSavedEntries(prev => prev.filter(e => e.id !== id))
  }

  // Fetch all 4 variant plans
  const fetchPlans = useCallback(async () => {
    if (!profile || !selectedHall) return
    setPlanLoading(true)
    setPlans([null, null, null, null])
    const goal = (profile.goal ?? 'maintaining') as keyof typeof PLAN_VARIANTS
    const variants = PLAN_VARIANTS[goal]
    const results = await Promise.all(
      variants.map(v =>
        fetch(`${API}/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calories_target: profile.calories,
            protein_target: Math.round((profile.calories * 0.3) / 4),
            vegetarian: false,
            avoid_allergens: [],
            protein_priority: v.protein_priority,
            location_id: selectedHall,
            goal_type: 'physique',
            food_preferences: v.extra_prefs,
            plan_seed: v.seed,
            station_preference: selectedStation || null,
          }),
        })
          .then(r => r.json() as Promise<PlanResult>)
          .catch((): PlanResult => ({ error: 'Failed to reach backend.' }))
      )
    )
    setPlans(results)
    setPlanLoading(false)
  }, [profile, selectedHall, selectedStation])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  async function savePlan() {
    const plan = plans[activeVariant]
    if (!plan?.totals) return
    let token: string | null = null
    try { token = JSON.parse(localStorage.getItem('psu_session') ?? '{}').token } catch {}
    if (!token) return
    const goal = (profile?.goal ?? 'maintaining') as keyof typeof PLAN_VARIANTS
    const variant = PLAN_VARIANTS[goal][activeVariant]
    const r = await fetch(`${API}/tracker/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        plan_label: `${variant.icon} ${variant.name} — ${plan.totals.calories} kcal`,
        calories: plan.totals.calories,
        protein_g: plan.totals.protein_g,
        goal_type: 'physique',
        meals: plan.meals ?? null,
      }),
    }).catch(() => null)
    const j = await r?.json().catch(() => null)
    if (j?.ok) {
      setSavedMsg('Saved!')
      setTimeout(() => setSavedMsg(''), 2500)
      // refresh saved list if tab is open
      if (activeTab === 'saved') loadSaved()
    }
  }

  function navigateVariant(dir: 1 | -1) {
    setPlanVariantDir(dir)
    setActiveVariant(v => (v + dir + 4) % 4)
    setOpenMeals(new Set())
  }

  function toggleMeal(meal: string) {
    setOpenMeals(prev => {
      const next = new Set(prev)
      next.has(meal) ? next.delete(meal) : next.add(meal)
      return next
    })
  }

  function toggleSaved(id: string) {
    setExpandedSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function changeGoal(newGoal: string) {
    if (!profile) return
    const newCalories = computeCalories(profile, newGoal)
    const updated = { ...profile, goal: newGoal as Profile['goal'], calories: newCalories }
    setProfile(updated)
    localStorage.setItem('psu_profile', JSON.stringify(updated))
    setPlans([null, null, null, null])
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    )
  }

  const goal = (profile.goal ?? 'maintaining') as keyof typeof PLAN_VARIANTS
  const variants = PLAN_VARIANTS[goal]
  const activePlan = plans[activeVariant]

  // Hero macros from active plan
  const planCals    = activePlan?.totals?.calories ?? 0
  const planProt    = activePlan?.totals?.protein_g ?? 0
  const planCarbs   = Math.round((planCals - planProt * 4) * 0.58 / 4)
  const planFat     = Math.round((planCals - planProt * 4) * 0.42 / 9)
  const calorieGoal = profile.calories
  const protTarget  = Math.round((calorieGoal * 0.3) / 4)
  const carbTarget  = Math.round((calorieGoal * 0.5) / 4)
  const fatTarget   = Math.round((calorieGoal * 0.25) / 9)

  // Group saved entries by date
  const savedByDate = savedEntries.reduce<Record<string, SavedEntry[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e)
    return acc
  }, {})
  const savedDates = Object.keys(savedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="bg-background min-h-screen">
      <SidebarNav active="today" />

      <main className="md:pl-20 lg:pl-60 pb-24 md:pb-8">
        {/* Sticky top bar */}
        {/* PSU accent stripe */}
        <div className="h-0.5 psu-gradient w-full" />
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-muted text-[10px] font-dm uppercase tracking-widest">We Are Penn State</div>
              <div className="font-syne font-bold text-cream text-lg leading-tight">{profile.name ?? 'Athlete'}</div>
            </div>
            <div className="relative">
              <select
                value={profile.goal}
                onChange={e => changeGoal(e.target.value)}
                className="appearance-none bg-amber/15 border border-amber/40 text-amber text-xs font-dm font-semibold capitalize tracking-wide rounded-full pl-3 pr-7 py-1 cursor-pointer focus:outline-none hover:bg-amber/25 transition-colors"
              >
                <option value="cutting">Cutting</option>
                <option value="maintaining">Maintaining</option>
                <option value="bulking">Bulking</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-amber text-[9px]">▼</div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-5">
          {/* Hero */}
          <CalorieHero
            consumed={planCals}
            goal={calorieGoal}
            protein={{ current: planProt,  target: protTarget }}
            carbs={{   current: planCarbs, target: carbTarget }}
            fat={{     current: planFat,   target: fatTarget }}
          />

          {/* Hall + Preferences dropdowns + Generate */}
          {halls.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <HallSelector
                  halls={halls}
                  selected={selectedHall}
                  onSelect={id => { setSelectedHall(id); setPlans([null, null, null, null]) }}
                />
                <div className="relative w-full flex flex-col gap-1">
                  <div className="relative">
                    <select
                      value={selectedStation}
                      onChange={e => setSelectedStation(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-dm text-sm appearance-none focus:outline-none focus:border-amber transition-colors cursor-pointer text-transparent"
                    >
                      <option value="" disabled hidden></option>
                      <option value="">No preference</option>
                      {stations.map(s => (
                        <option key={s} value={s} className="bg-surface text-cream">{s}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream font-dm text-sm">Preferences</div>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs">▼</div>
                  </div>
                  {selectedStation && (
                    <p className="text-muted text-xs font-dm px-1">Favouring <span className="text-amber">{selectedStation}</span> items</p>
                  )}
                </div>
              </div>
              <button
                onClick={fetchPlans}
                disabled={planLoading}
                className="w-full py-3 rounded-xl psu-gradient text-white font-syne font-bold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {planLoading ? 'Generating…' : 'Generate'}
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-surface border border-border rounded-2xl p-1 gap-1">
            {([['plans', "Today's Plans"], ['saved', `Saved${savedEntries.length ? ` (${savedEntries.length})` : ''}`]] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-dm font-medium transition-all ${
                  activeTab === tab ? 'bg-amber text-background' : 'text-muted hover:text-cream'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Today's Plans tab ───────────────────────────────────────── */}
          {activeTab === 'plans' && (
            <div className="bg-surface border border-border rounded-3xl overflow-hidden">
              {/* Variant navigator */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigateVariant(-1)}
                  className="w-9 h-9 rounded-xl border border-border bg-background/50 text-cream text-lg flex items-center justify-center flex-shrink-0 hover:border-amber/50 transition-colors"
                >‹</motion.button>

                <div className="flex-1 text-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeVariant}
                      initial={{ opacity: 0, x: planVariantDir * 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: planVariantDir * -30 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="text-2xl mb-1">{variants[activeVariant].icon}</div>
                      <div className="font-syne font-bold text-amber text-base">{variants[activeVariant].name}</div>
                      <div className="text-muted text-xs mt-0.5">{variants[activeVariant].desc}</div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex gap-1.5 justify-center mt-3">
                    {variants.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setPlanVariantDir(i > activeVariant ? 1 : -1); setActiveVariant(i) }}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ width: i === activeVariant ? 18 : 6, background: i === activeVariant ? '#009CDE' : '#1A3A6B' }}
                      />
                    ))}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigateVariant(1)}
                  className="w-9 h-9 rounded-xl border border-border bg-background/50 text-cream text-lg flex items-center justify-center flex-shrink-0 hover:border-amber/50 transition-colors"
                >›</motion.button>
              </div>

              {/* Plan body */}
              <div className="p-4">
                {planLoading ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : activePlan?.error ? (
                  <div className="text-center py-6 text-muted text-sm">
                    {activePlan.error}
                    <button onClick={fetchPlans} className="block mx-auto mt-3 text-amber text-xs hover:underline">Try again</button>
                  </div>
                ) : activePlan?.meals ? (
                  <>
                    {/* Totals + save */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-3 items-baseline flex-wrap">
                        <span className="font-syne font-extrabold text-cream text-2xl">{activePlan.totals?.calories?.toLocaleString()}</span>
                        <span className="text-muted text-sm font-dm">kcal</span>
                        <span className="font-syne font-bold text-green-accent">{activePlan.totals?.protein_g}g</span>
                        <span className="text-muted text-sm font-dm">protein</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {savedMsg && <span className="text-green-accent text-xs">{savedMsg}</span>}
                        <button
                          onClick={savePlan}
                          className="px-3 py-1.5 rounded-xl psu-gradient text-white text-xs font-dm font-semibold hover:opacity-90 transition-all shadow-[0_2px_10px_rgba(0,156,222,0.35)]"
                        >
                          Save Plan
                        </button>
                      </div>
                    </div>

                    {/* Meals — collapsible */}
                    <div className="flex flex-col gap-1.5">
                    {(['breakfast', 'lunch', 'dinner', 'extras'] as const).map(mealKey => {
                      const section = activePlan.meals![mealKey]
                      if (!section?.items?.length) return null
                      const isOpen = openMeals.has(mealKey)
                      return (
                        <div key={mealKey} className="rounded-2xl border border-border overflow-hidden">
                          <button
                            onClick={() => toggleMeal(mealKey)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{MEAL_ICONS[mealKey]}</span>
                              <span className="text-sm font-dm font-semibold" style={{ color: MEAL_COLORS[mealKey] }}>
                                {mealKey.charAt(0).toUpperCase() + mealKey.slice(1)}
                              </span>
                              <span className="text-muted text-xs">{section.items.length} items</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-muted text-xs">{section.totals.calories} kcal · {section.totals.protein_g}g</span>
                              <motion.span
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-muted text-xs"
                              >▾</motion.span>
                            </div>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div className="flex flex-col gap-1.5 px-3 pb-3">
                                  {section.items.map(item => <PlanItemRow key={item.mid} item={item} />)}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted text-sm">Generating plans…</div>
                )}
              </div>
            </div>
          )}

          {/* ── Saved tab ───────────────────────────────────────────────── */}
          {activeTab === 'saved' && (
            <>
              {savedLoading ? (
                <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
              ) : savedEntries.length === 0 ? (
                <div className="bg-surface border border-border rounded-3xl p-10 flex flex-col items-center gap-3 text-center">
                  <div className="text-4xl">📋</div>
                  <div className="font-syne font-bold text-cream text-base">No saved plans yet</div>
                  <div className="text-muted text-sm">Hit <span className="text-amber">Save Plan</span> on any plan variant to log it here.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {savedDates.map(date => (
                    <div key={date}>
                      <div className="text-muted text-xs font-dm uppercase tracking-wider mb-2 px-1">
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex flex-col gap-2">
                        <AnimatePresence>
                          {savedByDate[date].map(entry => (
                            <SavedEntryCard key={entry.id} entry={entry} onDelete={deleteEntry} expanded={expandedSaved.has(entry.id)} onToggle={toggleSaved} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav active="today" />
    </div>
  )
}
