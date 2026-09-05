// melu's character. Three clips that meet in the same standing pose:
//
//   enter ──▶ idle ──(every so often)──▶ work ──▶ idle ──▶ …
//
// `enter` walks in and waves. `idle` breathes on a loop. `work` is an occasional interlude: she
// puts on the helmet, measures, points, takes it off and returns to the standing pose. It is encoded
// round-trip exactly for that: it ends where it started, so returning to the loop does not jump.
//
// The splice is the delicate part. Four decisions, each because the alternative flickers:
//
//  1. No cross-fades. During a fade the clips go semi-transparent over the page's white and the
//     figure washes out: it reads as a flicker. Switches are hard cuts (`visibility`), and opacity
//     never stops being 1.
//  2. All three <video> elements stay mounted and stacked, with `still` at the bottom. If the top
//     one is a frame short of starting, what shows underneath is the same pose. No gap.
//  3. Coming back from an interlude, `still` rewinds to zero instead of resuming: its frame zero
//     is the same pose `work` ends on.
//  4. `still` is paused while the interlude runs. It is not visible, no reason to decode it.
//
// And the clips' background was taken to pure white, so there is no box: the figure sits on
// the app's canvas.
import { useEffect, useRef, useState } from 'react'
import { cn } from '@melu/ui'

type CharacterState = 'entering' | 'idle' | 'working'

type Props = {
  /** How often the helmet interlude shows up, in seconds [min, max]. `false` turns it off. */
  interlude?: [number, number] | false
  /** Skip the entrance and start still. Useful if the character already appeared before. */
  idleOnly?: boolean
  className?: string
  alt?: string
}

export function Character({ interlude = [20, 60], idleOnly = false, className, alt = 'La guía de melu, saludando' }: Props) {
  const [status, setStatus] = useState<CharacterState>(idleOnly ? 'idle' : 'entering')
  const [noMotion, setNoMotion] = useState(false)
  const still = useRef<HTMLVideoElement>(null)
  const working = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setNoMotion(mq.matches)
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [])

  // A single place decides what plays in each state, and what gets scheduled next.
  //
  // No "warming up" the clips with play()+pause() on mount: that promise resolves whenever it wants,
  // and if it resolves after this effect started a clip, it pauses and rewinds it. The character
  // freezes with nothing having failed. The poster already covers any missing frame.
  useEffect(() => {
    if (noMotion) return
    const q = still.current, t = working.current
    if (status === 'working') {
      q?.pause()
      if (!t) { setStatus('idle'); return }
      t.currentTime = 0
      t.play().catch(() => setStatus('idle'))
      return
    }
    if (status === 'idle' && q) {
      t?.pause()
      q.currentTime = 0
      q.play().catch(() => {})
    }
    if (status !== 'idle' || !interlude) return
    const [min, max] = interlude
    const waiting = (min + Math.random() * Math.max(0, max - min)) * 1000
    // With the tab in the background the browser throttles timers and playback: the interlude
    // does not start there, it waits until the screen is visible again.
    const id = window.setTimeout(() => {
      if (document.hidden) { document.addEventListener('visibilitychange', function goBack() {
        document.removeEventListener('visibilitychange', goBack)
        setStatus('working')
      }) } else setStatus('working')
    }, waiting)
    return () => window.clearTimeout(id)
  }, [status, interlude, noMotion])

  // Whoever asked for less motion gets the photo: same image, with nothing moving.
  if (noMotion) {
    return <img src="/character/still.png" alt={alt} className={cn('h-full w-auto select-none', className)} draggable={false} />
  }

  return (
    <div className={cn('relative h-full', className)}>
      {/* invisible but taking up room: it gives the box its height and width */}
      <img src="/character/still.png" alt="" aria-hidden="true" className="h-full w-auto opacity-0" draggable={false} />

      <video ref={still} src="/character/idle.mp4" poster="/character/still.png"
        muted playsInline loop preload="auto" aria-label={alt}
        className="absolute inset-0 h-full w-full select-none object-contain" />

      <video ref={working} src="/character/work.mp4" poster="/character/still.png"
        muted playsInline preload="auto" aria-hidden="true"
        onEnded={() => setStatus('idle')} onError={() => setStatus('idle')}
        className={cn('absolute inset-0 h-full w-full select-none object-contain', status !== 'working' && 'invisible')} />

      {!idleOnly && (
        <video src="/character/enter.mp4" poster="/character/still.png"
          autoPlay muted playsInline preload="auto" aria-hidden="true"
          onEnded={() => setStatus('idle')} onError={() => setStatus('idle')}
          className={cn('absolute inset-0 h-full w-full select-none object-contain', status !== 'entering' && 'invisible')} />
      )}
    </div>
  )
}
