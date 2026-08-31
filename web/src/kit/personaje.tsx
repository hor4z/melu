// El personaje de melu. Son dos clips que calzan cuadro a cuadro: entra caminando y saluda, y de
// ahí se queda respirando en bucle.
//
// El empalme es la parte delicada. Tres decisiones, cada una porque la alternativa parpadea:
//
//  1. Nada de fundido entre los dos clips. Durante un fundido los dos quedan semitransparentes
//     sobre el blanco de la página y la figura se lava: se ve como un parpadeo. El cambio es seco.
//  2. Los dos <video> están apilados y montados todo el tiempo, con el idle abajo. Si al idle le
//     falta un cuadro para arrancar, lo que se ve debajo es su póster, que es exactamente su
//     primer cuadro y es igual al último de la entrada. No hay hueco posible.
//  3. El idle se "calienta" al montar (play + pause en el cuadro 0) para que el decodificador ya
//     tenga la imagen lista cuando le toque.
//
// El bucle del idle es de ida y vuelta (se codificó así): el último cuadro empalma con el primero.
// Y el fondo de los clips se llevó a blanco puro, así que no hay caja: la figura se apoya sobre
// el lienzo de la app.
import { useEffect, useRef, useState } from 'react'
import { cn } from './lib'

type Props = {
  /** Saltear la entrada y arrancar quieta. Útil si el personaje ya apareció antes. */
  soloIdle?: boolean
  className?: string
  alt?: string
}

export function Personaje({ soloIdle = false, className, alt = 'La guía de melu, saludando' }: Props) {
  const [quieta, setQuieta] = useState(soloIdle)
  const [sinMovimiento, setSinMovimiento] = useState(false)
  const idle = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const leer = () => setSinMovimiento(mq.matches)
    leer()
    mq.addEventListener('change', leer)
    return () => mq.removeEventListener('change', leer)
  }, [])

  // Calentar el idle: que el primer cuadro esté decodificado antes de que haga falta.
  useEffect(() => {
    const v = idle.current
    if (!v || soloIdle) return
    v.play().then(() => { v.pause(); v.currentTime = 0 }).catch(() => {})
  }, [soloIdle])

  function alTerminar() {
    idle.current?.play().catch(() => {})
    setQuieta(true)
  }

  // Quien pidió menos movimiento se queda con la foto: es la misma imagen, sin nada moviéndose.
  if (sinMovimiento) {
    return <img src="/personaje/quieta.png" alt={alt} className={cn('h-full w-auto select-none', className)} draggable={false} />
  }

  return (
    <div className={cn('relative h-full', className)}>
      {/* invisible pero ocupando lugar: le da el alto y el ancho a la caja */}
      <img src="/personaje/quieta.png" alt="" aria-hidden="true" className="h-full w-auto opacity-0" draggable={false} />
      <video
        ref={idle} src="/personaje/idle.mp4" poster="/personaje/quieta.png"
        muted playsInline loop preload="auto" autoPlay={soloIdle}
        aria-label={alt}
        className="absolute inset-0 h-full w-full select-none object-contain"
      />
      {!soloIdle && (
        <video
          src="/personaje/entra.mp4" poster="/personaje/quieta.png"
          autoPlay muted playsInline preload="auto"
          aria-hidden="true"
          onEnded={alTerminar} onError={alTerminar}
          className={cn('absolute inset-0 h-full w-full select-none object-contain', quieta && 'invisible')}
        />
      )}
    </div>
  )
}
