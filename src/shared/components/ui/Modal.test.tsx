import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

/** Le focus initial est posé dans un requestAnimationFrame. */
async function flushFrame() {
  await act(async () => { await new Promise(r => requestAnimationFrame(() => r(null))); });
}

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Ouvrir</button>
      {open && (
        <Modal
          title="Supprimer cet article ?"
          onClose={() => { onClose?.(); setOpen(false); }}
          footer={<button type="button">Supprimer l'article</button>}
        >
          <input aria-label="Motif" />
        </Modal>
      )}
    </>
  );
}

describe('Modal', () => {
  it('expose une boîte de dialogue modale nommée par son titre', () => {
    render(<Modal title="Supprimer cet article ?" onClose={() => {}}><p>Texte</p></Modal>);
    const dialog = screen.getByRole('dialog', { name: 'Supprimer cet article ?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('place le focus dans la modale à l’ouverture', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await flushFrame();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  it('piège le focus : Tab sur le dernier élément revient au premier, Maj+Tab sur le premier va au dernier', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await flushFrame();

    const close = screen.getByRole('button', { name: 'Fermer' });
    const last  = screen.getByRole('button', { name: "Supprimer l'article" });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('se ferme avec Échap et rend le focus au déclencheur', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Ouvrir' });
    trigger.focus();
    fireEvent.click(trigger);
    await flushFrame();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('ignore Échap quand closeOnEscape est désactivé', () => {
    const onClose = vi.fn();
    render(<Modal title="Envoi en cours" onClose={onClose} closeOnEscape={false}><p>…</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog', () => {
  it('place l’annulation à gauche et l’action à droite', () => {
    render(
      <ConfirmDialog
        title="Supprimer cet article ?"
        confirmLabel="Supprimer l'article"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map(b => b.textContent)).toEqual(['Annuler', "Supprimer l'article"]);
    expect(buttons[0]).toHaveClass('btn-secondary');
    expect(buttons[1]).toHaveClass('btn-danger');
  });
});
