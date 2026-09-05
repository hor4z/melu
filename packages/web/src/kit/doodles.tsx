// Line doodles: round characters, ink stroke, a touch of teal. No libraries.
import type { SVGProps } from 'react'

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
type P = SVGProps<SVGSVGElement> & { size?: number }

export function DoodleWave({ size = 120, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...base} {...p}>
      <circle cx="60" cy="52" r="26" />
      <path d="M50 46l4 8M70 44l-4 10M50 62c6 6 14 6 20 0" />
      <path d="M40 78c-2 14 0 22 4 30M80 78c2 14 0 22-4 30" />
      <path d="M86 70l14-16M100 54l-6 1M100 54l1 6" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleGroup({ size = 160, ...p }: P) {
  return (
    <svg viewBox="0 0 200 120" width={size} height={size * 0.6} {...base} {...p}>
      <circle cx="50" cy="70" r="20" /><circle cx="100" cy="60" r="24" /><circle cx="152" cy="72" r="20" />
      <path d="M42 66l3 6M56 66l-3 6M44 78c4 4 10 4 14 0M92 54l4 8M108 52l-4 10M90 70c6 6 14 6 20 0M144 68l3 6M158 68l-3 6M146 80c4 4 10 4 14 0" />
      <path d="M30 96c0 10 3 18 8 24M70 96c0 10-3 18-8 24M76 96l8 24M124 96l-8 24M132 100c0 8 3 14 8 20M172 100c0 8-3 14-8 20" />
      <path d="M28 40l-6-12M36 36l0-14M44 40l6-12" stroke="var(--color-teal-500)" />
      <path d="M170 40l6-12M162 36l0-14M154 40l-6-12" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleBulb({ size = 120, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...base} {...p}>
      <path d="M60 18c-18 0-30 13-30 28 0 11 6 17 12 24 3 4 4 8 4 12h28c0-4 1-8 4-12 6-7 12-13 12-24 0-15-12-28-30-28z" />
      <path d="M48 92h24M50 100h20" /><path d="M54 50l6 10 6-10" stroke="var(--color-teal-500)" />
      <path d="M20 40l-8-4M100 40l8-4M60 6v-4" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleBridge({ size = 160, ...p }: P) {
  return (
    <svg viewBox="0 0 200 100" width={size} height={size / 2} {...base} {...p}>
      <path d="M10 80h180M30 80V56h140v24" /><path d="M30 56l30-30 30 30 30-30 30 30 30-30" /><path d="M60 26v30M120 26v30M180 26v30" />
      <path d="M92 40h16v16" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleMap({ size = 140, ...p }: P) {
  return (
    <svg viewBox="0 0 140 120" width={size} height={size * 0.86} {...base} {...p}>
      <path d="M14 30l36-14 40 14 36-14v76l-36 14-40-14-36 14z" /><path d="M50 16v76M90 30v76" />
      <path d="M30 70c10-8 20 4 30-4s20 4 30-4" stroke="var(--color-teal-500)" /><circle cx="104" cy="52" r="5" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleRobot({ size = 120, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...base} {...p}>
      <rect x="28" y="36" width="64" height="52" rx="10" /><path d="M60 36V20M52 20h16" /><circle cx="48" cy="58" r="5" /><circle cx="72" cy="58" r="5" />
      <path d="M46 74h28" /><path d="M28 60H14M92 60h14M40 88v14M80 88v14" /><path d="M60 8v4" stroke="var(--color-teal-500)" /><circle cx="60" cy="14" r="4" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleKitchen({ size = 120, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...base} {...p}>
      <path d="M20 60h80v10c0 20-18 34-40 34S20 90 20 70z" /><path d="M14 60h92" /><path d="M40 44c-4-8 4-10 0-18M60 44c-4-8 4-10 0-18M80 44c-4-8 4-10 0-18" stroke="var(--color-teal-500)" />
      <path d="M100 66h10c6 0 6 14 0 14h-10" />
    </svg>
  )
}
export function DoodleLock({ size = 120, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...base} {...p}>
      <rect x="30" y="52" width="60" height="48" rx="8" /><path d="M42 52V38a18 18 0 0136 0v14" /><circle cx="60" cy="74" r="6" stroke="var(--color-teal-500)" /><path d="M60 80v10" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleBook({ size = 120, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...base} {...p}>
      <path d="M16 30c14-6 30-6 44 4 14-10 30-10 44-4v60c-14-6-30-6-44 4-14-10-30-10-44-4z" /><path d="M60 34v60" />
      <path d="M28 50c8-2 16-2 24 2M28 64c8-2 16-2 24 2" stroke="var(--color-teal-500)" />
    </svg>
  )
}
export function DoodleSprout({ size = 120, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...base} {...p}>
      <path d="M36 100h48M44 100V80c0-10-10-14-20-12 2 12 8 18 20 20M60 100V60" /><path d="M60 62c0-16 12-26 30-24-2 18-12 26-30 26" stroke="var(--color-teal-500)" />
      <path d="M60 60c0-12-8-20-22-20 2 14 10 20 22 20" />
    </svg>
  )
}
export const DOODLES = { wave: DoodleWave, group: DoodleGroup, bulb: DoodleBulb, bridge: DoodleBridge, map: DoodleMap, robot: DoodleRobot, kitchen: DoodleKitchen, lock: DoodleLock, book: DoodleBook, sprout: DoodleSprout }
export type DoodleName = keyof typeof DOODLES
