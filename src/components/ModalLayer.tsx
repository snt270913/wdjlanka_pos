import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// The native top layer keeps dialogs above navigation and out of page stacking contexts.
let openLayers = 0;
let previousOverflow = '';
export function ModalLayer({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (openLayers++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    node?.showModal();
    return () => {
      node?.close();
      if (--openLayers === 0) document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return createPortal(<dialog ref={dialog} className="pos-modal-root" aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>, document.body);
}
