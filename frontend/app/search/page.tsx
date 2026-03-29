'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BottomNav from '../components/BottomNav'
import SidebarNav from '../components/SidebarNav'
import SkeletonCard from '../components/SkeletonCard'

import API from '../config'

const FILTER_OPTIONS = ['High Protein', 'Low Cal', 'Vegetarian'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

const MEAT_KEYWORDS = /beef|chicken|pork|steak|turkey|bacon|sausage|brisket|lamb|veal|ham|pepperoni/i

interface MenuItem {
  mid: string
  name: string
  calories: number | null
  protein_g: number | null
  allergens: string[]
  station: string
  meal_periods: string[]
  location_name: string
}

function estimateCarbs(cal: number, prot: number): number {
  return Math.round(((cal - prot * 4) * 0.58) / 4)
}

function estimateFat(cal: number, prot: number): number {
  return Math.round(((cal - prot * 4) * 0.42) / 9)
}

function applyFilters(items: MenuItem[], filters: FilterOption[], query: string): MenuItem[] {
  return items.filter((m) => {
    if (query && !m.name.toLowerCase().includes(query.toLowerCase())) return false
    if (filters.includes('High Protein') && (m.protein_g ?? 0) <= 20) return false
    if (filters.includes('Low Cal') && (m.calories ?? 9999) >= 400) return false
    if (filters.includes('Vegetarian') && MEAT_KEYWORDS.test(m.name)) return false
    return true
  })
}

function MacroBar({ cal, prot }: { cal: number; prot: number }) {
  const protKcal = prot * 4
  const carbKcal = (cal - protKcal) * 0.58
  const fatKcal = (cal - protKcal) * 0.42
  const total = protKcal + carbKcal + fatKcal || 1
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex">
      <div className="h-full bg-green-accent" style={{ width: `${(protKcal / total) * 100}%` }} />
      <div className="h-full bg-amber" style={{ width: `${(carbKcal / total) * 100}%` }} />
      <div className="h-full bg-coral" style={{ width: `${(fatKcal / total) * 100}%` }} />
    </div>
  )
}

function MenuItemCard({ item, index }: { item: MenuItem; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const cal = item.calories ?? 0
  const prot = item.protein_g ?? 0
  const carbs = estimateCarbs(cal, prot)
  const fat = estimateFat(cal, prot)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.25 }}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-4 text-left flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="font-syne font-semibold text-cream text-sm leading-snug">{item.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.calories !== null && (
              <span className="font-syne font-bold text-amber text-xs">{item.calories} kcal</span>
            )}
            {item.protein_g !== null && (
              <span className="text-green-accent text-xs font-dm">{item.protein_g}g protein</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {item.location_name && (
              <span className="text-[10px] font-dm text-muted truncate">{item.location_name}</span>
            )}
            {item.station && (
              <span className="text-[10px] font-dm text-muted">· {item.station}</span>
            )}
          </div>
        </div>
        <span className="text-muted text-xs mt-0.5 flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-dm">
                <div className="flex justify-between">
                  <span className="text-muted">Calories</span>
                  <span className="text-cream">{item.calories ?? '—'} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Protein</span>
                  <span className="text-green-accent">{item.protein_g ?? '—'}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Est. Carbs</span>
                  <span className="text-amber">{carbs}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Est. Fat</span>
                  <span className="text-coral">{fat}g</span>
                </div>
              </div>
              {cal > 0 && <MacroBar cal={cal} prot={prot} />}
              {item.allergens.length > 0 && (
                <div className="text-[11px] text-muted font-dm">
                  <span className="font-semibold text-cream">Allergens: </span>
                  {item.allergens.join(', ')}
                </div>
              )}
              {item.meal_periods.length > 0 && (
                <div className="text-[11px] text-muted font-dm">
                  <span className="font-semibold text-cream">Served: </span>
                  {item.meal_periods.join(', ')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterOption[]>([])
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/items/all`)
      .then((r) => r.json())
      .then((j) => setAllItems(j.items ?? []))
      .catch(() => setError('Could not load menu items.'))
      .finally(() => setLoading(false))
  }, [])

  function toggleFilter(f: FilterOption) {
    setFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])
  }

  const filtered = applyFilters(allItems, filters, query)

  return (
    <div className="bg-background min-h-screen">
      <SidebarNav active="search" />

      <main className="md:pl-20 lg:pl-56 pb-24 md:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-syne font-bold text-cream text-xl mb-3">Explore Today's Menu Items</h1>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-cream font-dm text-sm focus:outline-none focus:border-amber transition-colors placeholder:text-muted"
            />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-dm font-medium border transition-colors ${
                  filters.includes(f)
                    ? 'bg-amber text-background border-amber'
                    : 'bg-surface text-muted border-border hover:text-cream'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Count */}
          {!loading && !error && (
            <div className="text-muted text-xs font-dm">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} across {new Set(allItems.map(i => i.location_name)).size} dining locations
            </div>
          )}

          {/* Items */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted text-sm">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((item, i) => (
                <MenuItemCard key={item.mid} item={item} index={i} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-muted text-sm py-12">
                  No items match your filters.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav active="search" />
    </div>
  )
}
