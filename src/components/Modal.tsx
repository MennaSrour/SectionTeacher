import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose, sheet }: {
  title: string
  children: ReactNode
  onClose: () => void
  sheet?: boolean
}) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])

  return (
    <dialog ref={dialog} className={sheet ? 'modal-sheet' : undefined} aria-labelledby={titleId} onCancel={(event) => {
      event.preventDefault()
      onClose()
    }}>
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="إغلاق" onClick={onClose}><X size={20} /></button>
      </div>
      {children}
    </dialog>
  )
}
