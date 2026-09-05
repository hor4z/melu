// El personaje de melu. Tres clips que calzan en la misma pose de pie:
//
//   entra ──▶ quieta ──(cada tanto)──▶ trabaja ──▶ quieta ──▶ …
//
// `entra` camina y saluda. `quieta` respira en bucle. `trabaja` es un interludio esporádico: se
// pone el casco, mide, señala, se lo saca y vuelve a la pose de pie. Está codificado de ida y
// vuelta justamente para eso: termina donde empezó, así que volver al bucle no salta.
//
// El empalme es la parte delicada. Cuatro decisiones, cada una porque la alternativa parpadea:
//
//  1. Nada de fundidos. Durante un fundido los clips quedan semitransparentes sobre el blanco de
//     la página y la figura se lava: se ve como un parpadeo. Los cambios son secos (`visibility`),
//     y la opacidad nunca deja de ser 1.
//  2. Los tres <video> están montados y apilados todo el tiempo, con `quieta` abajo. Si al de
//     arriba le falta un cuadro para arrancar, lo que se ve debajo es la misma pose. No hay hueco.
//  3. Al volver de un interludio, `quieta` se rebobina a cero en vez de seguir donde estaba: su
//     cuadro cero es la misma pose con la que termina `trabaja`.
//  4. `quieta` se pausa mientras corre el interludio. No se ve, no hay razón para decodificarla.
//
// Y el fondo de los clips se llevó a blanco puro, así que no hay caja: la figura se apoya sobre
// el lienzo de la app.
import { useEffect, useRef, useState } from 'react'
import { cn } from './lib'

type Estado = 'entrando' | 'quieta' | 'trabajando'

type Props = {
  /** Cada cuánto asoma el interludio del casco, en segundos [mínimo, máximo]. `false` lo apaga. */
  interludio?: [number, number] | false
  /** Saltear la entrada y arrancar quieta. Útil si el personaje ya apareció antes. */
  soloIdle?: boolean
  className?: string
  alt?: string
}

export function Personaje({ interludio = [20, 60], soloIdle = false, className, alt = 'La guía de melu, saludando' }: Props) {
  const [estado, setEstado] = useState<Estado>(soloIdle ? 'quieta' : 'entrando')
  const [sinMovimiento, setSinMovimiento] = useState(false)
  const quieta = useRef<HTMLVideoElement>(null)
  const trabaja = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const leer = () => setSinMovimiento(mq.matches)
    leer()
    mq.addEventListener('change', leer)
    return () => mq.removeEventListener('change', leer)
  }, [])

  // Un solo lugar decide qué se reproduce en cada estado, y qué se agenda después.
  //
  // Nada de "calentar" los clips con play()+pause() al montar: esa promesa resuelve cuando quiere,
  // y si resuelve después de que este efecto arrancó un clip, lo pausa y lo rebobina. El personaje
  // se queda congelado sin que nada falle. El póster ya cubre el cuadro que falte.
  useEffect(() => {
    if (sinMovimiento) return
    const q = quieta.current, t = trabaja.current
    if (estado === 'trabajando') {
      q?.pause()
      if (!t) { setEstado('quieta'); return }
      t.currentTime = 0
      t.play().catch(() => setEstado('quieta'))
      return
    }
    if (estado === 'quieta' && q) {
      t?.pause()
      q.currentTime = 0
      q.play().catch(() => {})
    }
    if (estado !== 'quieta' || !interludio) return
    const [min, max] = interludio
    const espera = (min + Math.random() * Math.max(0, max - min)) * 1000
    // Con la pestaña de fondo el navegador estrangula temporizadores y reproducción: el interludio
    // no arranca ahí, se espera a que la pantalla vuelva a estar a la vista.
    const id = window.setTimeout(() => {
      if (document.hidden) { document.addEventListener('visibilitychange', function volver() {
        document.removeEventListener('visibilitychange', volver)
        setEstado('trabajando')
      }) } else setEstado('trabajando')
    }, espera)
    return () => window.clearTimeout(id)
  }, [estado, interludio, sinMovimiento])

  // Quien pidió menos movimiento se queda con la foto: es la misma imagen, sin nada moviéndose.
  if (sinMovimiento) {
    return <img src="/personaje/quieta.png" alt={alt} className={cn('h-full w-auto select-none', className)} draggable={false} />
  }

  return (
    <div className={cn('relative h-full', className)}>
      {/* invisible pero ocupando lugar: le da el alto y el ancho a la caja */}
      <img src="/personaje/quieta.png" alt="" aria-hidden="true" className="h-full w-auto opacity-0" draggable={false} />

      <video ref={quieta} src="/personaje/idle.mp4" poster="/personaje/quieta.png"
        muted playsInline loop preload="auto" aria-label={alt}
        className="absolute inset-0 h-full w-full select-none object-contain" />

      <video ref={trabaja} src="/personaje/trabaja.mp4" poster="/personaje/quieta.png"
        muted playsInline preload="auto" aria-hidden="true"
        onEnded={() => setEstado('quieta')} onError={() => setEstado('quieta')}
        className={cn('absolute inset-0 h-full w-full select-none object-contain', estado !== 'trabajando' && 'invisible')} />

      {!soloIdle && (
        <video src="/personaje/entra.mp4" poster="/personaje/quieta.png"
          autoPlay muted playsInline preload="auto" aria-hidden="true"
          onEnded={() => setEstado('quieta')} onError={() => setEstado('quieta')}
          className={cn('absolute inset-0 h-full w-full select-none object-contain', estado !== 'entrando' && 'invisible')} />
      )}
    </div>
  )
}
