import { describe, expect, test, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Slot, Slottable, cn, composeRefs, useControllableState } from '@melu/ui'

describe('cn', () => {
  test('junta clases y deja ganar a la última cuando pelean por lo mismo', () => {
    const escondido = false
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-sm', escondido && 'hidden', 'font-medium')).toBe('text-sm font-medium')
  })
})

describe('useControllableState', () => {
  test('suelto se maneja solo', () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: 'a' }))
    act(() => result.current[1]('b'))
    expect(result.current[0]).toBe('b')
  })

  test('controlado avisa pero no se mueve solo', () => {
    const cambio = vi.fn()
    const { result } = renderHook(() => useControllableState({ value: 'a', defaultValue: 'x', onChange: cambio }))
    act(() => result.current[1]('b'))
    expect(cambio).toHaveBeenCalledWith('b')
    expect(result.current[0]).toBe('a')
  })

  test('no avisa dos veces el mismo valor', () => {
    const cambio = vi.fn()
    const { result } = renderHook(() => useControllableState({ value: 'a', defaultValue: 'x', onChange: cambio }))
    act(() => result.current[1]('a'))
    expect(cambio).not.toHaveBeenCalled()
  })

  test('acepta una función, como `setState`', () => {
    const { result } = renderHook(() => useControllableState<number>({ defaultValue: 1 }))
    act(() => result.current[1]((n) => n + 1))
    expect(result.current[0]).toBe(2)
  })
})

describe('Slot', () => {
  test('presta las props al hijo y encadena los handlers', async () => {
    const mio = vi.fn()
    const suyo = vi.fn()
    render(<Slot className="prestada" onClick={mio}><button type="button" className="propia" onClick={suyo}>Tocar</button></Slot>)
    const boton = screen.getByRole('button')
    expect(boton).toHaveClass('prestada', 'propia')
    await userEvent.click(boton)
    expect(mio).toHaveBeenCalledOnce()
    expect(suyo).toHaveBeenCalledOnce()
  })

  test('con `Slottable` el objetivo es lo marcado, y los adornos quedan alrededor', () => {
    render(
      <Slot data-probado="si">
        <span data-adorno="antes" />
        <Slottable><a href="/x">Enlace</a></Slottable>
        <span data-adorno="despues" />
      </Slot>,
    )
    const enlace = screen.getByRole('link', { name: /Enlace/ })
    expect(enlace).toHaveAttribute('data-probado', 'si')
    expect(enlace.querySelector('[data-adorno="antes"]')).toBeInTheDocument()
    expect(enlace.querySelector('[data-adorno="despues"]')).toBeInTheDocument()
  })

  test('sin ningún elemento adentro no rinde nada en vez de romper', () => {
    const { container } = render(<Slot>{null}</Slot>)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('composeRefs', () => {
  test('le da el nodo a todas las refs, sean función u objeto', () => {
    const funcion = vi.fn()
    const objeto = { current: null as HTMLDivElement | null }
    render(<div ref={composeRefs(funcion, objeto)} />)
    expect(funcion).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    expect(objeto.current).toBeInstanceOf(HTMLDivElement)
  })
})
