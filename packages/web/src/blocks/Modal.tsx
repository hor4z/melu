import type { ReactNode } from 'react'
import { EmptyState, Modal as MiloModal, ModalBody, ModalFooter, ModalHint, ModalTitle, type IconName } from '@milo/ui'

/** El modal de la app sobre el de milo: título, bajada y pie, que es como se usan acá. */
export function Modal({ isOpen, onClose, title, description, children, footer, boxWidth = 480 }: {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  boxWidth?: number
}) {
  return (
    <MiloModal open={isOpen} onClose={onClose} width={boxWidth} label={title}>
      <ModalTitle>{title}</ModalTitle>
      {description && <ModalHint>{description}</ModalHint>}
      <ModalBody>{children}</ModalBody>
      {footer && <ModalFooter>{footer}</ModalFooter>}
    </MiloModal>
  )
}

/** Un vacío que dice qué falta y qué se puede hacer. Sin ilustración: un icono y dos líneas. */
export function Empty({ title, text, action, icon = 'inbox' }: {
  title: string
  text?: string
  action?: ReactNode
  icon?: IconName
}) {
  return <EmptyState icon={icon} title={title} body={text ?? ''} action={action} bordered />
}
