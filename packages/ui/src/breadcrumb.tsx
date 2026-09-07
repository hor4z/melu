import { Children, Fragment, cloneElement, isValidElement, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, focusRing, Slot, Slottable } from './lib'
import { Icon } from './icon'

export interface BreadcrumbProps extends ComponentPropsWithoutRef<'nav'> {
  /** The accessible name of the trail. */
  label?: string
}

/**
 * Where you are, and the way back out. The trail of a deep screen: each step is a link and the
 * last one is the page itself.
 *
 * It writes its own separators. A trail is the one place where a hand-written separator between
 * items goes wrong sooner or later (one missing, one left over, one at the end), and it is not a
 * decision worth taking twice.
 *
 * On a phone it stops being a trail and becomes the way back to the parent, with the arrow that
 * says so. Two hundred pixels do not fit four steps, and of the four the only one that gets
 * touched is the one that goes back. Both shapes are rendered and the width picks which: nothing
 * here waits for javascript to learn how wide the screen is.
 */
export function Breadcrumb({ label = 'Dónde estás', className, children, ...props }: BreadcrumbProps) {
  const steps = Children.toArray(children).filter(isValidElement)
  // El penúltimo es el padre: el último es la página en la que ya estás.
  const parent = steps.length > 1 ? (steps[steps.length - 2] as ReactElement<{ back?: boolean }>) : null
  return (
    <nav aria-label={label} className={cn('text-sm', className)} {...props}>
      <ol className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 sm:flex">
        {steps.map((step, i) => (
          <Fragment key={i}>
            {i > 0 && <li aria-hidden="true" className="text-ink-subtle"><Icon icon={ChevronRight} size="xs" /></li>}
            {step}
          </Fragment>
        ))}
      </ol>
      {parent && <ol className="flex sm:hidden">{cloneElement(parent, { back: true })}</ol>}
    </nav>
  )
}

export interface BreadcrumbItemProps extends Omit<ComponentPropsWithoutRef<'a'>, 'children'> {
  /** Lends the styles to a router link, which is what a step almost always is. */
  asChild?: boolean
  /**
   * Draws the back arrow. `Breadcrumb` sets it on the parent for the phone row: passing it by
   * hand puts an arrow in the middle of a trail, pointing at nothing.
   */
  back?: boolean
  children?: ReactNode
}

/** One step of the trail: a link to somewhere above. */
export function BreadcrumbItem({ asChild, back, className, children, ...props }: BreadcrumbItemProps) {
  const Cmp = asChild ? Slot : 'a'
  return (
    <li className="flex items-center">
      <Cmp
        className={cn(
          `flex items-center gap-1 rounded-xs text-ink-muted transition-colors hover:text-ink ${focusRing}`,
          className,
        )}
        {...props}
      >
        {back && <Icon icon={ChevronLeft} size="sm" />}
        {asChild ? <Slottable>{children}</Slottable> : children}
      </Cmp>
    </li>
  )
}

/**
 * The last step: where you are. It is not a link, because a link to the page you are already on
 * is a link that does nothing, and it carries `aria-current` so that is said out loud too.
 */
export function BreadcrumbPage({ className, ...props }: ComponentPropsWithoutRef<'li'>) {
  return <li aria-current="page" className={cn('flex items-center font-medium text-ink', className)} {...props} />
}
