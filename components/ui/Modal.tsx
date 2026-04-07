'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="
        bg-transparent p-0 m-auto
        backdrop:bg-black/60 backdrop:backdrop-blur-sm
        max-w-lg w-[calc(100%-2rem)]
        animate-scale-in
      "
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-surface-100 border border-white/10 rounded-2xl overflow-hidden shadow-glass">
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="btn-icon !w-8 !h-8 !min-w-[32px] !min-h-[32px]"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5 text-white/80 text-sm">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
