'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedNumber from '../components/AnimatedNumber'

import API from '../config'

type GoalType = 'cutting' | 'maintaining' | 'bulking'
type Phase = 'auth' | 'steps'
type AuthMode = 'login' | 'register'

interface Stats {
  height: string
  weight: string
  age: string
  sex: 'male' | 'female'
}

function computeTDEE(stats: Stats): number {
  const h = parseFloat(stats.height) || 0
  const w = parseFloat(stats.weight) || 0
  const a = parseFloat(stats.age) || 0
  const bmr = 10 * w + 6.25 * h - 5 * a + (stats.sex === 'male' ? 5 : -161)
  return Math.round(bmr * 1.55)
}

function targetCalories(tdee: number, goal: GoalType | null): number {
  if (!goal) return tdee
  if (goal === 'cutting') return tdee - 500
  if (goal === 'bulking') return tdee + 300
  return tdee
}

function nameFromEmail(email: string): string {
  return email.split('@')[0].replace(/[._\-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface FloatingInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  min?: string
}

function FloatingInput({ label, value, onChange, type = 'text', min }: FloatingInputProps) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        min={min}
        className="peer bg-surface border border-border rounded-xl px-4 pt-6 pb-2 w-full text-cream font-dm focus:outline-none focus:border-amber transition-colors"
      />
      <label className="absolute left-4 top-4 text-muted text-sm transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-amber peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-amber">
        {label}
      </label>
    </div>
  )
}

const goalData = [
  { key: 'cutting' as GoalType, icon: '🔥', title: 'Cutting', desc: 'Lose fat, preserve muscle' },
  { key: 'maintaining' as GoalType, icon: '⚖️', title: 'Maintaining', desc: 'Hold weight, improve composition' },
  { key: 'bulking' as GoalType, icon: '💪', title: 'Bulking', desc: 'Build muscle, accept surplus' },
]

export default function OnboardingPage() {
  const router = useRouter()

  // Auth phase
  const [phase, setPhase] = useState<Phase>('auth')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Onboarding steps
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [goal, setGoal] = useState<GoalType | null>(null)
  const [stats, setStats] = useState<Stats>({ height: '', weight: '', age: '', sex: 'male' })
  const [customCalories, setCustomCalories] = useState<string>('')
  const [showWorkout, setShowWorkout] = useState<boolean | null>(null)

  const tdee = computeTDEE(stats)
  const computedTarget = targetCalories(tdee, goal)
  const finalCalories = customCalories ? parseInt(customCalories) || computedTarget : computedTarget

  async function handleAuth() {
    if (!email || !password) { setAuthError('Please fill in all fields.'); return }
    if (password.length < 6) { setAuthError('Password must be at least 6 characters.'); return }
    setAuthLoading(true)
    setAuthError('')
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const j = await r.json()
      if (!j.ok) {
        setAuthError(j.error ?? 'Something went wrong.')
      } else {
        const name = j.name ?? nameFromEmail(email)
        localStorage.setItem('psu_session', JSON.stringify({ token: j.token, email, name }))
        setPhase('steps')
      }
    } catch {
      setAuthError('Could not reach server. Is the backend running?')
    } finally {
      setAuthLoading(false)
    }
  }

  function goNext() { setDirection(1); setStep((s) => s + 1) }
  function goBack() { setDirection(-1); setStep((s) => s - 1) }

  function handleStart(workout: boolean) {
    const session = JSON.parse(localStorage.getItem('psu_session') ?? '{}')
    const profile = {
      goal,
      height: parseFloat(stats.height) || 0,
      weight: parseFloat(stats.weight) || 0,
      age: parseFloat(stats.age) || 0,
      sex: stats.sex,
      calories: finalCalories,
      name: session.name ?? nameFromEmail(email),
      showWorkout: workout,
    }
    localStorage.setItem('psu_profile', JSON.stringify(profile))
    localStorage.setItem('psu_onboarding_done', 'true')
    router.push('/dashboard')
  }

  const stepVariants = {
    initial: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0 }),
  }
  const bmr = tdee > 0 ? Math.round(tdee / 1.55) : 0

  // ── Auth Screen ────────────────────────────────────────────────────────────
  if (phase === 'auth') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* PSU Hero */}
          <div className="text-center mb-10">
            {/* Lion badge */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl psu-gradient flex items-center justify-center shadow-[0_8px_32px_rgba(0,156,222,0.4)]">
                <span className="text-4xl">🦁</span>
              </div>
            </div>
            <div className="text-muted text-xs font-dm uppercase tracking-[0.2em] mb-1">We Are</div>
            <div className="font-syne font-extrabold text-3xl tracking-tight psu-gradient-text">Penn State</div>
            <div className="text-muted text-sm font-dm mt-2">Fuel like a Nittany Lion.</div>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-surface border border-border rounded-2xl p-1 mb-6">
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setAuthMode(m); setAuthError('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-dm font-medium transition-all ${
                  authMode === m ? 'bg-amber text-background' : 'text-muted'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <FloatingInput label="Email" value={email} onChange={setEmail} type="email" />

            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="peer bg-surface border border-border rounded-xl px-4 pt-6 pb-2 w-full text-cream font-dm focus:outline-none focus:border-amber transition-colors pr-12"
              />
              <label className="absolute left-4 top-4 text-muted text-sm transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-amber peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-amber">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs"
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>

            {authError && (
              <div className="text-sm font-dm px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400">
                {authError}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full py-4 rounded-2xl font-syne font-bold text-base psu-gradient text-white hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(0,156,222,0.35)]"
            >
              {authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Onboarding Steps ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: i === step ? 24 : 8, background: i <= step ? '#009CDE' : '#1A3A6B' }}
          />
        ))}
      </div>

      <div className="w-full max-w-md overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step0"
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex flex-col gap-4"
            >
              <h1 className="font-syne font-extrabold text-cream text-3xl text-center mb-2">
                What&apos;s your goal?
              </h1>
              <p className="text-muted text-sm text-center mb-4">Choose what you&apos;re optimizing for</p>

              {goalData.map((g, i) => (
                <motion.div
                  key={g.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  onClick={() => setGoal(g.key)}
                  className={`bg-surface border-2 rounded-3xl p-6 cursor-pointer flex flex-col gap-3 transition-all ${
                    goal === g.key ? 'border-amber shadow-[0_0_24px_rgba(0,156,222,0.3)]' : 'border-border'
                  }`}
                >
                  <span className="text-3xl">{g.icon}</span>
                  <div>
                    <div className="font-syne font-bold text-cream text-lg">{g.title}</div>
                    <div className="text-muted text-sm mt-1">{g.desc}</div>
                  </div>
                </motion.div>
              ))}

              <button
                onClick={goNext}
                disabled={!goal}
                className={`mt-4 w-full py-4 rounded-2xl font-syne font-bold text-base transition-all ${
                  goal ? 'bg-amber text-background hover:opacity-90' : 'bg-border text-muted cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex flex-col gap-4"
            >
              <h1 className="font-syne font-extrabold text-cream text-3xl text-center mb-2">Your stats</h1>
              <p className="text-muted text-sm text-center mb-4">We&apos;ll calculate your calorie target</p>

              <FloatingInput label="Height (cm)" value={stats.height} onChange={(v) => setStats({ ...stats, height: v })} type="number" min="100" />
              <FloatingInput label="Weight (kg)" value={stats.weight} onChange={(v) => setStats({ ...stats, weight: v })} type="number" min="30" />
              <FloatingInput label="Age" value={stats.age} onChange={(v) => setStats({ ...stats, age: v })} type="number" min="10" />

              <div className="relative">
                <select
                  value={stats.sex}
                  onChange={(e) => setStats({ ...stats, sex: e.target.value as 'male' | 'female' })}
                  className="bg-surface border border-border rounded-xl px-4 pt-6 pb-2 w-full text-cream font-dm focus:outline-none focus:border-amber transition-colors appearance-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <label className="absolute left-4 top-2 text-amber text-xs pointer-events-none">Sex</label>
              </div>

              {tdee > 0 && (
                <div className="bg-surface border border-border rounded-2xl p-4 mt-2">
                  <div className="text-muted text-xs mb-1">Live estimate</div>
                  <div className="font-syne font-bold text-amber text-lg">Estimated TDEE: {tdee} kcal</div>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button onClick={goBack} className="flex-1 py-4 rounded-2xl font-syne font-bold text-base border border-border text-muted hover:text-cream transition-colors">Back</button>
                <button
                  onClick={goNext}
                  disabled={!stats.height || !stats.weight || !stats.age}
                  className={`flex-1 py-4 rounded-2xl font-syne font-bold text-base transition-all ${
                    stats.height && stats.weight && stats.age ? 'bg-amber text-background hover:opacity-90' : 'bg-border text-muted cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex flex-col gap-4"
            >
              <h1 className="font-syne font-extrabold text-cream text-3xl text-center mb-2">Your target</h1>

              <div className="bg-surface border border-border rounded-2xl p-4">
                <div className="text-muted text-xs mb-3">Calorie calculation</div>
                <div className="flex items-center gap-2 text-sm font-dm flex-wrap">
                  <span className="text-cream">BMR</span>
                  <span className="font-syne font-bold text-cream">{bmr}</span>
                  <span className="text-muted">× 1.55 activity</span>
                  <span className="text-muted">=</span>
                  <span className="font-syne font-bold text-amber">{tdee} kcal</span>
                </div>
                {goal && (
                  <div className="mt-2 text-xs text-muted">
                    {goal === 'cutting' && `Cutting: −500 kcal → ${computedTarget} kcal`}
                    {goal === 'maintaining' && `Maintaining: no adjustment → ${computedTarget} kcal`}
                    {goal === 'bulking' && `Bulking: +300 kcal → ${computedTarget} kcal`}
                  </div>
                )}
              </div>

              <div className="text-center py-4">
                <div className="font-syne font-extrabold text-cream text-6xl">
                  <AnimatedNumber value={finalCalories} />
                </div>
                <div className="text-muted text-sm mt-1">kcal / day</div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={customCalories}
                  onChange={(e) => setCustomCalories(e.target.value)}
                  placeholder=" "
                  className="peer bg-surface border border-border rounded-xl px-4 pt-6 pb-2 w-full text-cream font-dm focus:outline-none focus:border-amber transition-colors"
                />
                <label className="absolute left-4 top-4 text-muted text-sm transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-amber peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-amber">
                  Custom calories (optional override)
                </label>
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={goBack} className="flex-1 py-4 rounded-2xl font-syne font-bold text-base border border-border text-muted hover:text-cream transition-colors">Back</button>
                <button onClick={goNext} className="flex-1 py-4 rounded-2xl font-syne font-bold text-base bg-amber text-background hover:opacity-90 transition-all">
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex flex-col gap-4"
            >
              <h1 className="font-syne font-extrabold text-cream text-3xl text-center mb-2">
                One last thing
              </h1>
              <p className="text-muted text-sm text-center mb-4">Would you like workout ideas tailored to your goal?</p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.35 }}
                onClick={() => setShowWorkout(true)}
                className={`bg-surface border-2 rounded-3xl p-6 cursor-pointer flex flex-col gap-3 transition-all ${
                  showWorkout === true ? 'border-amber shadow-[0_0_24px_rgba(0,156,222,0.3)]' : 'border-border'
                }`}
              >
                <span className="text-3xl">🏋️</span>
                <div>
                  <div className="font-syne font-bold text-cream text-lg">Yes, show me workouts</div>
                  <div className="text-muted text-sm mt-1">Get exercise plans matched to your cutting, maintaining, or bulking goal</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.35 }}
                onClick={() => setShowWorkout(false)}
                className={`bg-surface border-2 rounded-3xl p-6 cursor-pointer flex flex-col gap-3 transition-all ${
                  showWorkout === false ? 'border-amber shadow-[0_0_24px_rgba(0,156,222,0.3)]' : 'border-border'
                }`}
              >
                <span className="text-3xl">🥗</span>
                <div>
                  <div className="font-syne font-bold text-cream text-lg">No, just nutrition</div>
                  <div className="text-muted text-sm mt-1">Keep it focused on meal planning and macro tracking only</div>
                </div>
              </motion.div>

              <div className="flex gap-3 mt-2">
                <button onClick={goBack} className="flex-1 py-4 rounded-2xl font-syne font-bold text-base border border-border text-muted hover:text-cream transition-colors">Back</button>
                <button
                  onClick={() => handleStart(showWorkout ?? false)}
                  disabled={showWorkout === null}
                  className={`flex-1 py-4 rounded-2xl font-syne font-bold text-base transition-all ${
                    showWorkout !== null ? 'bg-amber text-background hover:opacity-90' : 'bg-border text-muted cursor-not-allowed'
                  }`}
                >
                  Start Tracking
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
