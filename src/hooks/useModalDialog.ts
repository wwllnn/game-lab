import { useEffect, useRef, type RefObject } from 'react'

/** Native dialogs trap focus; restore the trigger when they close or unmount. */
export function useModalDialog(open: boolean, initialFocus: RefObject<HTMLElement | null>) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!open) return
    const element = dialog.current
    const previousFocus = document.activeElement
    element?.showModal()
    initialFocus.current?.focus({ preventScroll: true })
    return () => {
      element?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open, initialFocus])

  return dialog
}
