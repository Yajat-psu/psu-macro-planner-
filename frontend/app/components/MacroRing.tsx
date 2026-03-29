'use client'

import { motion } from 'framer-motion'

interface Props {
  current: number
  target: number
  color: string
  label: string
  unit?: string
  size?: number
}

export default function MacroRing({ current, target, color, label, unit = 'g', size = 120 }: Props) {
  const strokeWidth = size < 100 ? 8 : 10
  const r = size * 0.415
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const ratio = target > 0 ? Math.min(current / target, 1) : 0
  const valueFontSize = size < 100 ? 12 : 16
  const unitFontSize = size < 100 ? 9 : 11
  const labelFontSize = size < 100 ? 9 : 11
  const metaFontSize = size < 100 ? 9 : 12

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A3A6B" strokeWidth={strokeWidth} strokeLinecap="round" />
          <motion.circle
            cx={cx} cy={cy} r={r} fill="none" stroke={color}
            strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - ratio) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-syne font-bold" style={{ color, fontSize: valueFontSize, lineHeight: 1 }}>
            {Math.round(current)}
          </span>
          <span className="text-muted" style={{ fontSize: unitFontSize }}>{unit}</span>
        </div>
      </div>
      <div className="font-syne text-center">
        <div className="text-cream" style={{ fontSize: metaFontSize }}>
          {Math.round(current)}{unit} / {Math.round(target)}{unit}
        </div>
        <div className="text-muted" style={{ fontSize: labelFontSize }}>{label}</div>
      </div>
    </div>
  )
}
