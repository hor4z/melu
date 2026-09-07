import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardMedia, CardTitle } from '@melu/ui'

describe('Card', () => {
  test('arma sus partes', () => {
    render(
      <Card>
        <CardMedia>portada</CardMedia>
        <CardHeader><CardTitle>Puente de espagueti</CardTitle><CardDescription>Un reto de una hora.</CardDescription></CardHeader>
        <CardContent>cuerpo</CardContent>
        <CardFooter>pie</CardFooter>
      </Card>,
    )
    expect(screen.getByRole('heading', { name: 'Puente de espagueti' })).toBeInTheDocument()
    expect(screen.getByText('Un reto de una hora.')).toBeInTheDocument()
  })

  test('con `asChild` la tarjeta presta el estilo y el elemento sigue siendo el otro', async () => {
    const clic = vi.fn()
    render(<Card asChild interactive><button type="button" onClick={clic}>Elegir</button></Card>)
    await userEvent.click(screen.getByRole('button', { name: 'Elegir' }))
    expect(clic).toHaveBeenCalledOnce()
  })
})
