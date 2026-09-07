import { describe, expect, test } from 'vitest'
import { renderHook } from '@testing-library/react'
import { BREAKPOINTS, useDevice, useMediaQuery } from '@melu/ui'
import { respondeMedia } from './setup'

/** Una pantalla de `ancho` píxeles: contesta que sí a toda consulta que le entre. */
function pantalla(ancho: number) {
  respondeMedia((query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1])
    return Number.isNaN(min) ? false : ancho >= min
  })
}

describe('useMediaQuery', () => {
  test('lee el valor de verdad en el primer render, no en un efecto', () => {
    pantalla(1000)
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(true)
  })

  test('contesta que no cuando la consulta no da', () => {
    pantalla(500)
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(false)
  })
})

describe('useDevice', () => {
  test('abajo del corte `md` es un teléfono', () => {
    pantalla(BREAKPOINTS.md - 1)
    expect(renderHook(() => useDevice()).result.current).toBe('phone')
  })

  test('justo en `md` ya es una tablet: el corte entra, no se saltea', () => {
    pantalla(BREAKPOINTS.md)
    expect(renderHook(() => useDevice()).result.current).toBe('tablet')
  })

  test('entre `md` y `lg` sigue siendo tablet', () => {
    pantalla(BREAKPOINTS.lg - 1)
    expect(renderHook(() => useDevice()).result.current).toBe('tablet')
  })

  test('desde `lg` es escritorio', () => {
    pantalla(BREAKPOINTS.lg)
    expect(renderHook(() => useDevice()).result.current).toBe('desktop')
  })

  test('los cortes son los mismos que usa el CSS', () => {
    expect(BREAKPOINTS).toEqual({ sm: 640, md: 768, lg: 1024, xl: 1280 })
  })
})
