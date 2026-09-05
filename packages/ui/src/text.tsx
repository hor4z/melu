import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib'

const textVariantes = cva('', {
  variants: {
    // `sm` y `md` eran los dos `text-sm`: el mismo defecto que tenían los radios. Y `md`, que
    // es el default, quedaba un escalón por debajo del cuerpo de la página, así que un <Text>
    // se veía más chico que el texto suelto que tenía al lado. Ahora cada nombre es su token.
    size: { '2xs': 'text-2xs', xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-md', xl: 'text-lg' },
    variant: { default: 'text-ink', muted: 'text-ink-muted', subtle: 'text-ink-subtle', accent: 'text-accent', danger: 'text-danger', success: 'text-success' },
    weight: { normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold' },
    mono: { true: 'font-mono tabular-nums' },
  },
  defaultVariants: { size: 'md', variant: 'default', weight: 'normal' },
})

export interface TextProps extends Omit<ComponentPropsWithoutRef<'p'>, 'color'>, VariantProps<typeof textVariantes> {
  as?: ElementType
}

export function Text({ as: Cmp = 'p', className, size, variant, weight, mono, ...props }: TextProps) {
  return <Cmp className={cn(textVariantes({ size, variant, weight, mono }), className)} {...props} />
}

// `display` usaba `text-4xl`, el escalón por defecto de Tailwind (36px) y no el token del
// tema (40px): el título más grande del sistema era el único que no salía de la escala.
// El interlineado ya viene con el token.
const headingVariantes = cva('font-display font-semibold tracking-tight text-balance text-ink', {
  variants: { size: { sm: 'text-base', md: 'text-lg', lg: 'text-xl', xl: 'text-2xl', '2xl': 'text-3xl', display: 'text-display' } },
  defaultVariants: { size: 'lg' },
})

export interface HeadingProps extends ComponentPropsWithoutRef<'h2'>, VariantProps<typeof headingVariantes> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

export function Heading({ level = 2, size, className, ...props }: HeadingProps) {
  const Cmp = `h${level}` as ElementType
  return <Cmp className={cn(headingVariantes({ size }), className)} {...props} />
}

/** Uppercase section label: the gesture that organizes the page. */
export function Eyebrow({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-sm font-bold uppercase tracking-[0.115em] text-ink-subtle', className)} {...props} />
}

export function Kbd({ className, ...props }: ComponentPropsWithoutRef<'kbd'>) {
  return <kbd className={cn('rounded-sm border border-line bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-muted', className)} {...props} />
}
