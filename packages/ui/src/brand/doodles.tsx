// Placeholders, on purpose.
//
// These used to be hand-drawn SVG figures. They did not hold up: at the sizes the app uses
// them —110 to 220 px— the strokes read as crude rather than as a style. Until there are real
// assets, each one renders a lucide icon with a hairline stroke: neutral, clean, and obviously
// a placeholder instead of a drawing pretending to be finished.
//
// The API does not change. Every call site keeps passing `size` and `className`, so swapping
// in the real artwork means rewriting `Doodle` below and nothing else.
import type { SVGProps } from 'react'
import {
  BookOpen, Bot, ChefHat, Hand, Lightbulb, Lock, Map, Route, Sprout, Users,
  type LucideIcon,
} from 'lucide-react'

type P = SVGProps<SVGSVGElement> & { size?: number }

/**
 * A lucide icon drawn large. The stroke is computed so it looks the same weight at any size:
 * lucide's viewBox is 24, so a fixed `strokeWidth` would turn into a fat marker at 200 px.
 */
function Doodle({ icon: Icon, size = 120, ...p }: P & { icon: LucideIcon }) {
  const stroke = Math.min(2.5, Math.max(0.6, (2.4 * 24) / size))
  return <Icon width={size} height={size} strokeWidth={stroke} absoluteStrokeWidth={false} aria-hidden="true" {...p} />
}

export function DoodleWave(p: P) { return <Doodle icon={Hand} {...p} /> }
export function DoodleGroup({ size = 160, ...p }: P) { return <Doodle icon={Users} size={size} {...p} /> }
export function DoodleBulb(p: P) { return <Doodle icon={Lightbulb} {...p} /> }
export function DoodleBridge({ size = 160, ...p }: P) { return <Doodle icon={Route} size={size} {...p} /> }
export function DoodleMap({ size = 140, ...p }: P) { return <Doodle icon={Map} size={size} {...p} /> }
export function DoodleRobot(p: P) { return <Doodle icon={Bot} {...p} /> }
export function DoodleKitchen(p: P) { return <Doodle icon={ChefHat} {...p} /> }
export function DoodleLock(p: P) { return <Doodle icon={Lock} {...p} /> }
export function DoodleBook(p: P) { return <Doodle icon={BookOpen} {...p} /> }
export function DoodleSprout(p: P) { return <Doodle icon={Sprout} {...p} /> }

export const DOODLES = { wave: DoodleWave, group: DoodleGroup, bulb: DoodleBulb, bridge: DoodleBridge, map: DoodleMap, robot: DoodleRobot, kitchen: DoodleKitchen, lock: DoodleLock, book: DoodleBook, sprout: DoodleSprout }
export type DoodleName = keyof typeof DOODLES
