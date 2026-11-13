import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabPanel } from './Tabs';

const ITEMS = [
  { id: 'documents', label: 'Documents' },
  { id: 'cadrage',   label: 'Fiche de cadrage' },
  { id: 'audit',     label: 'À clarifier' },
] as const;
type Id = typeof ITEMS[number]['id'];

function Harness() {
  const [tab, setTab] = useState<Id>('documents');
  return (
    <>
      <Tabs<Id> id="t" items={ITEMS} value={tab} onChange={setTab} ariaLabel="Sections du projet" />
      <TabPanel id="t" value={tab}><p>Contenu {tab}</p></TabPanel>
    </>
  );
}

describe('Tabs', () => {
  it('expose une liste d’onglets nommée, un seul onglet sélectionné et tabulable', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Sections du projet' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map(t => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it('nomme le panneau par l’onglet actif', () => {
    render(<Harness />);
    expect(screen.getByRole('tabpanel', { name: 'Documents' })).toHaveTextContent('Contenu documents');
    fireEvent.click(screen.getByRole('tab', { name: 'Fiche de cadrage' }));
    expect(screen.getByRole('tabpanel', { name: 'Fiche de cadrage' })).toHaveTextContent('Contenu cadrage');
  });

  it('passe d’un onglet à l’autre avec les flèches, en boucle, et Début / Fin', () => {
    render(<Harness />);
    const first = screen.getByRole('tab', { name: 'Documents' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Fiche de cadrage' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Fiche de cadrage' }));

    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' });
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'À clarifier' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(document.activeElement as Element, { key: 'Home' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'À clarifier' })).toHaveAttribute('aria-selected', 'true');
  });
});
