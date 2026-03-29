'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Profile } from '../types'
import SidebarNav from '../components/SidebarNav'
import BottomNav from '../components/BottomNav'

const API_BASE = 'http://localhost:8000'

interface Exercise {
  id: string
  name: string
  bodyPart: string
  equipment: string
  gifUrl?: string
  target: string
  secondaryMuscles: string[]
  instructions: string[]
}

// ── Splits by goal ────────────────────────────────────────────────────────────
const GOAL_SPLITS: Record<string, { name: string; emoji: string; targets: string[] }[]> = {
  cutting: [
    { name: 'Full Body',  emoji: '⚡', targets: ['pectorals', 'quads', 'lats', 'abs'] },
    { name: 'Upper',      emoji: '💪', targets: ['pectorals', 'delts', 'biceps', 'triceps'] },
    { name: 'Lower',      emoji: '🦵', targets: ['quads', 'hamstrings', 'glutes', 'calves'] },
    { name: 'Core',       emoji: '🔥', targets: ['abs'] },
  ],
  maintaining: [
    { name: 'Push',  emoji: '🏋️', targets: ['pectorals', 'triceps', 'delts'] },
    { name: 'Pull',  emoji: '💪', targets: ['lats', 'biceps', 'upper back'] },
    { name: 'Legs',  emoji: '🦵', targets: ['quads', 'hamstrings', 'glutes'] },
    { name: 'Core',  emoji: '🔥', targets: ['abs'] },
  ],
  bulking: [
    { name: 'Push',  emoji: '🏋️', targets: ['pectorals', 'triceps', 'delts'] },
    { name: 'Pull',  emoji: '💪', targets: ['lats', 'biceps', 'upper back', 'traps'] },
    { name: 'Legs',  emoji: '🦵', targets: ['quads', 'hamstrings', 'glutes', 'calves'] },
    { name: 'Arms',  emoji: '💥', targets: ['biceps', 'triceps', 'forearms'] },
  ],
}

// ── Sets / reps prescription by goal ─────────────────────────────────────────
const PRESCRIPTION: Record<string, { sets: number; reps: string; rest: string; note: string }> = {
  cutting:    { sets: 3, reps: '12–15', rest: '45 s',   note: 'Circuit style · short rest · keep heart rate up' },
  maintaining:{ sets: 3, reps: '8–12',  rest: '60 s',   note: 'Moderate weight · controlled tempo · full ROM' },
  bulking:    { sets: 4, reps: '5–8',   rest: '2 min',  note: 'Heavy compounds · progressive overload · log your lifts' },
}

// ── Target → colour chip ──────────────────────────────────────────────────────
const TARGET_COLORS: Record<string, string> = {
  pectorals:              '#009CDE',
  quads:                  '#4DAFD4',
  lats:                   '#7BA3D4',
  biceps:                 '#009CDE',
  triceps:                '#4DAFD4',
  delts:                  '#9BB8D4',
  abs:                    '#7BA3D4',
  hamstrings:             '#4DAFD4',
  glutes:                 '#009CDE',
  calves:                 '#9BB8D4',
  traps:                  '#4DAFD4',
  'upper back':           '#7BA3D4',
  forearms:               '#9BB8D4',
  'cardiovascular system':'#009CDE',
}
function targetColor(t: string) { return TARGET_COLORS[t.toLowerCase()] ?? '#6B8FAF' }

// ── Shuffle helper ────────────────────────────────────────────────────────────
function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// ── Exercise card ─────────────────────────────────────────────────────────────
function ExerciseCard({
  ex, sets, reps, index,
}: { ex: Exercise; sets: number; reps: string; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [gifLoaded, setGifLoaded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      {/* GIF / placeholder */}
      <div className="relative w-full aspect-square bg-border/40 overflow-hidden">
        {ex.id ? (
          <>
            {!gifLoaded && (
              <div className="absolute inset-0 animate-pulse bg-border rounded-none" />
            )}
            <img
              src={`http://localhost:8000/exercises/image/${ex.id}`}
              alt={ex.name}
              loading="lazy"
              onLoad={() => setGifLoaded(true)}
              onError={() => setGifLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${gifLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full psu-gradient flex items-center justify-center opacity-60">
              <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/>
              </svg>
            </div>
            <span className="text-muted text-[10px] font-dm capitalize text-center px-2">{ex.bodyPart}</span>
          </div>
        )}
        {/* Overlay badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-cream text-[10px] font-dm font-semibold">
          {sets} × {reps}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-dm font-semibold text-cream text-sm capitalize leading-tight mb-2">
          {ex.name}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-dm font-semibold capitalize"
            style={{ background: `${targetColor(ex.target)}22`, color: targetColor(ex.target) }}
          >
            {ex.target}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-dm bg-border/60 text-muted capitalize">
            {ex.equipment}
          </span>
        </div>

        {/* Instructions toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-muted text-[11px] font-dm flex items-center gap-1 hover:text-cream transition-colors"
        >
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>▾</motion.span>
          {expanded ? 'Hide' : 'How to perform'}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.ol
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
              className="mt-2 flex flex-col gap-1.5 list-none"
            >
              {ex.instructions.slice(0, 4).map((step, i) => (
                <li key={i} className="flex gap-2 text-[11px] font-dm text-muted leading-relaxed">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full psu-gradient text-white text-[9px] flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </motion.ol>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeSplit, setActiveSplit] = useState(0)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cache fetched exercises per target so regenerate doesn't re-fetch
  const cache = useRef<Record<string, Exercise[]>>({})

  useEffect(() => {
    const raw = localStorage.getItem('psu_profile')
    if (!raw) { router.replace('/onboarding'); return }
    try { setProfile(JSON.parse(raw) as Profile) }
    catch { router.replace('/onboarding') }
  }, [router])

  const goal = (profile?.goal ?? 'maintaining') as string
  const splits = GOAL_SPLITS[goal] ?? GOAL_SPLITS.maintaining
  const prescription = PRESCRIPTION[goal] ?? PRESCRIPTION.maintaining

  async function loadExercises(splitIndex: number) {
    const split = splits[splitIndex]
    setLoading(true)
    setError('')
    setExercises([])
    try {
      const perTarget = await Promise.all(
        split.targets.map(async (target) => {
          if (cache.current[target]) return cache.current[target]
          const res = await fetch(
            `${API_BASE}/exercises/target/${encodeURIComponent(target)}?limit=30&offset=0`
          )
          if (!res.ok) throw new Error(`API error ${res.status}`)
          const data: Exercise[] = await res.json()
          cache.current[target] = data
          return data
        })
      )
      // Pick 2 exercises per target (randomised), flatten
      const picked = perTarget.flatMap(arr => pickN(arr, 2))
      setExercises(picked)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load exercises.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile) loadExercises(activeSplit)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSplitChange(i: number) {
    setActiveSplit(i)
    loadExercises(i)
  }

  function regenerate() {
    // Re-shuffle from cache without re-fetching
    const split = splits[activeSplit]
    const picked = split.targets.flatMap(target => {
      const arr = cache.current[target] ?? []
      return pickN(arr, 2)
    })
    if (picked.length > 0) {
      setExercises(picked)
    } else {
      loadExercises(activeSplit)
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="bg-background min-h-screen">
      <SidebarNav active="workout" />

      <main className="md:pl-20 lg:pl-60 pb-24 md:pb-8">
        {/* PSU stripe */}
        <div className="h-0.5 psu-gradient w-full" />

        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-muted text-[10px] font-dm uppercase tracking-widest">{today}</div>
              <div className="font-syne font-bold text-cream text-lg leading-tight">Workout Planner</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-amber/15 border border-amber/40 text-amber text-xs font-dm font-semibold capitalize tracking-wide">
                {profile.goal}
              </div>
              <button
                onClick={regenerate}
                disabled={loading}
                title="Shuffle exercises"
                className="w-8 h-8 rounded-full bg-surface border border-border text-muted text-sm hover:text-cream hover:border-amber/40 transition-colors disabled:opacity-40 flex items-center justify-center"
              >
                ↺
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-5">

          {/* Split selector */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {splits.map((split, i) => (
              <motion.button
                key={split.name}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSplitChange(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-dm font-semibold text-sm whitespace-nowrap flex-shrink-0 transition-all ${
                  activeSplit === i
                    ? 'psu-gradient text-white border-transparent shadow-[0_4px_14px_rgba(0,156,222,0.35)]'
                    : 'bg-surface border-border text-muted hover:text-cream hover:border-amber/40'
                }`}
              >
                <span>{split.emoji}</span>
                <span>{split.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Prescription card */}
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl psu-gradient flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(0,156,222,0.3)]">
              <svg viewBox="0 0 20 20" fill="white" width="18" height="18">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h1a1 1 0 010 2H5v6h1a1 1 0 010 2H4a1 1 0 01-1-1V5zm11-1a1 1 0 110 2h-1v6h1a1 1 0 110 2h-1a1 1 0 01-1-1V5a1 1 0 011-1h1zM7 7a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <div className="font-syne font-bold text-cream text-base">
                {prescription.sets} sets × {prescription.reps} reps
                <span className="text-muted font-dm font-normal text-sm ml-2">· {prescription.rest} rest</span>
              </div>
              <div className="text-muted text-xs font-dm mt-0.5">{prescription.note}</div>
            </div>
          </div>

          {/* Exercise grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-border/60" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 bg-border/60 rounded w-3/4" />
                    <div className="h-2 bg-border/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div className="text-cream font-dm text-sm">{error}</div>
              <button
                onClick={() => loadExercises(activeSplit)}
                className="px-4 py-2 rounded-xl psu-gradient text-white text-sm font-dm font-semibold"
              >
                Retry
              </button>
            </div>
          ) : exercises.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeSplit}-${exercises[0]?.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-3"
              >
                {exercises.map((ex, i) => (
                  <ExerciseCard
                    key={ex.id + i}
                    ex={ex}
                    sets={prescription.sets}
                    reps={prescription.reps}
                    index={i}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="text-center py-10 text-muted text-sm">No exercises found.</div>
          )}

          {/* Regenerate button (bottom) */}
          {!loading && exercises.length > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={regenerate}
              className="w-full py-3.5 rounded-2xl border border-border bg-surface text-muted font-dm font-semibold text-sm hover:text-cream hover:border-amber/40 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-base">↺</span> Shuffle Exercises
            </motion.button>
          )}
        </div>
      </main>

      <BottomNav active="workout" />
    </div>
  )
}
