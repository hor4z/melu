import { useEffect, useState } from 'react'

/** Los tres tamaños que las pantallas distinguen: abajo de 640, hasta 1024, y el resto. */
export type Device = 'phone' | 'tablet' | 'desktop'

function read(): Device {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia('(max-width: 639px)').matches) return 'phone'
  if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet'
  return 'desktop'
}

/** En qué tamaño de pantalla estamos, para lo que no se puede resolver con una media query. */
export function useDevice(): Device {
  const [device, setDevice] = useState(read)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const angosto = window.matchMedia('(max-width: 639px)')
    const update = () => setDevice(read())
    mq.addEventListener('change', update)
    angosto.addEventListener('change', update)
    return () => { mq.removeEventListener('change', update); angosto.removeEventListener('change', update) }
  }, [])
  return device
}
