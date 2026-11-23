import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FileText, List, Scale } from 'lucide-react';
import { mockViewportWidth } from '../../../test/matchMedia';
import { Stepper } from './Stepper';

const items = [
  { id: 'a', label: 'Documents', icon: FileText, done: true },
  { id: 'b', label: 'À clarifier', icon: Scale },
  { id: 'c', label: 'Nouvelle base', icon: List },
] as const;

let restore: () => void = () => {};
afterEach(() => restore());

describe('Stepper', () => {
  it('une liste ordonnée dans une navigation nommée, un bouton par étape, aria-current sur l\'étape affichée', () => {
    restore = mockViewportWidth(1440);
    render(<Stepper items={items} value="b" onSelect={() => {}} ariaLabel="Étapes du projet" />);
    const nav = screen.getByRole('navigation', { name: 'Étapes du projet' });
    const list = within(nav).getByRole('list');
    expect(list.tagName).toBe('OL');
    const buttons = within(list).getAllByRole('button');
    expect(buttons.map(b => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Documents (terminée)', 'À clarifier', 'Nouvelle base']);
    expect(within(nav).getByRole('button', { name: 'Documents (terminée)' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'À clarifier' })).toHaveAttribute('aria-current', 'step');
    expect(buttons.filter(b => b.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('une étape terminée porte la coche et le dit en toutes lettres ; une autre reste neutre', () => {
    restore = mockViewportWidth(1440);
    const { container } = render(<Stepper items={items} value="b" onSelect={() => {}} ariaLabel="Étapes" />);
    const steps = container.querySelectorAll('li');
    expect(steps[0]).toHaveClass('parcours-stepper__step--done');
    expect(steps[0].querySelector('.lucide-check')).not.toBeNull();
    expect(steps[2]).not.toHaveClass('parcours-stepper__step--done');
    expect(steps[2]).not.toHaveClass('parcours-stepper__step--current');
  });

  it('chaque étape s\'ouvre au clic, dans n\'importe quel ordre', () => {
    restore = mockViewportWidth(1440);
    const onSelect = vi.fn();
    render(<Stepper items={items} value="a" onSelect={onSelect} ariaLabel="Étapes" />);
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle base' }));
    fireEvent.click(screen.getByRole('button', { name: 'À clarifier' }));
    expect(onSelect.mock.calls).toEqual([['c'], ['b']]);
  });

  it('sous 768 px : les ronds seuls, le nom de l\'étape affichée dessous, les noms restent lus', () => {
    restore = mockViewportWidth(390);
    const { container } = render(<Stepper items={items} value="c" onSelect={() => {}} ariaLabel="Étapes" />);
    expect(container.querySelector('nav')).toHaveClass('parcours-stepper--compact');
    // Les noms passent en texte masqué : toujours le nom accessible des boutons.
    for (const label of container.querySelectorAll('.parcours-stepper__label')) expect(label).toHaveClass('sr-only');
    expect(screen.getByRole('button', { name: 'Nouvelle base' })).toHaveAttribute('aria-current', 'step');
    const below = container.querySelector('.parcours-stepper__current');
    expect(below).toHaveTextContent('Nouvelle base');
    expect(below).toHaveAttribute('aria-hidden', 'true');
  });

  it('768 px et plus : les noms sous chaque rond, rien dessous', () => {
    restore = mockViewportWidth(768);
    const { container } = render(<Stepper items={items} value="c" onSelect={() => {}} ariaLabel="Étapes" />);
    expect(container.querySelector('nav')).not.toHaveClass('parcours-stepper--compact');
    expect(container.querySelector('.parcours-stepper__current')).toBeNull();
  });
});
