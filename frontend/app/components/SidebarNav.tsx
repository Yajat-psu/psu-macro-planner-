'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Props {
  active: 'today' | 'search' | 'workout' | 'profile'
}

const tabs = [
  { key: 'today', label: 'Today', href: '/dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z"/>
      </svg>
    ),
  },
  { key: 'search', label: 'Search', href: '/search',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
      </svg>
    ),
  },
  { key: 'workout', label: 'Workout', href: '/workout',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h1a1 1 0 010 2H5v6h1a1 1 0 010 2H4a1 1 0 01-1-1V5zm11-1a1 1 0 110 2h-1v6h1a1 1 0 110 2h-1a1 1 0 01-1-1V5a1 1 0 011-1h1zM7 7a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
      </svg>
    ),
  },
  { key: 'profile', label: 'Profile', href: '/profile',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
      </svg>
    ),
  },
] as const

function NittanyLion({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <ellipse cx="32" cy="34" rx="22" ry="20" fill="#1E407C"/>
      <ellipse cx="32" cy="34" rx="22" ry="20" fill="url(#mane-gradient-s)"/>
      <ellipse cx="32" cy="32" rx="15" ry="15" fill="#EEF4FF"/>
      <polygon points="18,18 14,8 24,16" fill="#1E407C"/>
      <polygon points="46,18 50,8 40,16" fill="#1E407C"/>
      <polygon points="19,17 15,10 23,16" fill="#EEF4FF" opacity="0.6"/>
      <polygon points="45,17 49,10 41,16" fill="#EEF4FF" opacity="0.6"/>
      <ellipse cx="26" cy="29" rx="3" ry="3.5" fill="#009CDE"/>
      <ellipse cx="38" cy="29" rx="3" ry="3.5" fill="#009CDE"/>
      <circle cx="26.5" cy="29" r="1.8" fill="#070F1E"/>
      <circle cx="38.5" cy="29" r="1.8" fill="#070F1E"/>
      <circle cx="25.5" cy="28" r="0.7" fill="white"/>
      <circle cx="37.5" cy="28" r="0.7" fill="white"/>
      <ellipse cx="32" cy="35" rx="3" ry="2" fill="#009CDE"/>
      <path d="M29 38 Q32 41 35 38" stroke="#1A3A6B" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <line x1="18" y1="34" x2="27" y2="36" stroke="#6B8FAF" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="18" y1="37" x2="27" y2="37" stroke="#6B8FAF" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="37" y1="36" x2="46" y2="34" stroke="#6B8FAF" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="37" y1="37" x2="46" y2="37" stroke="#6B8FAF" strokeWidth="0.8" strokeLinecap="round"/>
      <defs>
        <linearGradient id="mane-gradient-s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A5FA8"/>
          <stop offset="100%" stopColor="#1E407C"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function SidebarNav({ active }: Props) {
  const [showWorkout, setShowWorkout] = useState(false)
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('psu_profile') ?? '{}')
      setShowWorkout(p.showWorkout === true)
    } catch {}
  }, [])

  const visibleTabs = tabs.filter(t => t.key !== 'workout' || showWorkout)

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-60 min-h-screen bg-surface border-r border-border p-4 fixed top-0 left-0 z-40">
      {/* Branding */}
      <div className="mb-8 mt-2 px-2 flex flex-col items-center lg:items-start gap-2">
        <div className="flex items-center gap-3">
          <NittanyLion size={36} />
          <div className="hidden lg:flex flex-col">
            <span className="font-dm text-muted text-[10px] uppercase tracking-widest leading-none">We Are</span>
            <span className="font-syne font-extrabold text-cream text-lg leading-tight psu-gradient-text">PSU Macro</span>
          </div>
        </div>
        <div className="hidden lg:block w-full h-px psu-gradient opacity-40 rounded-full" />
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {visibleTabs.map((tab) => {
          const isActive = active === tab.key
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-dm font-medium text-sm ${
                isActive
                  ? 'psu-gradient text-white shadow-[0_4px_14px_rgba(0,156,222,0.35)]'
                  : 'text-muted hover:text-cream hover:bg-border/60'
              }`}
            >
              <span className={isActive ? 'text-white' : ''}>{tab.icon}</span>
              <span className="hidden lg:block">{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="hidden lg:block mt-auto px-2 pb-2">
        <div className="text-muted text-[10px] font-dm text-center tracking-wider uppercase opacity-60">
          We Are Penn State
        </div>
      </div>
    </aside>
  )
}
