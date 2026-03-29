'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Props {
  active: 'today' | 'search' | 'workout' | 'profile'
}

const tabs = [
  { key: 'today', label: 'Today', href: '/dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z"/>
      </svg>
    ),
  },
  { key: 'search', label: 'Search', href: '/search',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
      </svg>
    ),
  },
  { key: 'workout', label: 'Workout', href: '/workout',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h1a1 1 0 010 2H5v6h1a1 1 0 010 2H4a1 1 0 01-1-1V5zm11-1a1 1 0 110 2h-1v6h1a1 1 0 110 2h-1a1 1 0 01-1-1V5a1 1 0 011-1h1zM7 7a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
      </svg>
    ),
  },
  { key: 'profile', label: 'Profile', href: '/profile',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
      </svg>
    ),
  },
] as const

export default function BottomNav({ active }: Props) {
  const [showWorkout, setShowWorkout] = useState(false)
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('psu_profile') ?? '{}')
      setShowWorkout(p.showWorkout === true)
    } catch {}
  }, [])

  const visibleTabs = tabs.filter(t => t.key !== 'workout' || showWorkout)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 border-t border-border backdrop-blur-md z-50">
      <div className="flex items-center justify-around px-1 py-2">
        {visibleTabs.map((tab) => {
          const isActive = active === tab.key
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-amber' : 'text-muted'
              }`}
            >
              <span className={`leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className="text-[10px] font-dm font-medium">{tab.label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-amber" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
