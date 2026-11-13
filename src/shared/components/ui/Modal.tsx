import React, { useEffect, useId, useRef } from 'react';
import { cn } from '../../lib/cn';
import './Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  title:            string;
  onClose:          () => void;
  size?:            ModalSize;
  className?:       string;
  footer?:          React.ReactNode;
  children:         React.ReactNode;
  closeOnEscape?:   boolean;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  /** Use a <form> for the body so Enter submits naturally */
  asForm?:          boolean;
  onSubmit?:        (e: React.FormEvent) => void;
}

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function Modal({
  title,
  onClose,
  size            = 'md',
  className,
  footer,
  children,
  closeOnEscape   = true,
  closeOnBackdrop = true,
  showCloseButton = true,
  asForm,
  onSubmit,
}: ModalProps) {
  const titleId  = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  // Stabilise onClose pour ne pas re-trigger le focus initial au moindre
  // re-render du parent (qui passe souvent une fonction inline `() => setX(false)`).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Focus initial + restore au unmount — exécuté UNE SEULE FOIS au mount.
  // (Auparavant les deps incluaient onClose, ce qui re-trigerrait le focus
  // sur le premier champ à chaque keystroke dans un autre champ → bug
  // "le curseur saute".)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    requestAnimationFrame(() => {
      if (!modalEl.contains(document.activeElement)) {
        const first = modalEl.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      }
    });

    return () => {
      previousFocus?.focus?.();
    };
  }, []);

  // Keyboard handler — peut se re-bind au changement de closeOnEscape.
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = modalEl.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length === 0) { e.preventDefault(); return; }

      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;

      if (e.shiftKey && (active === first || !modalEl.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeOnEscape]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose();
  };

  const Body = asForm ? 'form' : 'div';
  const bodyProps = asForm
    ? { onSubmit: (e: React.FormEvent) => { e.preventDefault(); onSubmit?.(e); }, noValidate: true }
    : {};

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={cn('modal', `modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">{title}</h2>
          {showCloseButton && (
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Fermer"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <Body className="modal__body" {...bodyProps}>
          {children}
          {footer && <div className="modal__actions">{footer}</div>}
        </Body>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="2"  y1="2"  x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="2"  x2="2"  y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
