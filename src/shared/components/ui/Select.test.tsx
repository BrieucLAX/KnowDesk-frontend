import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from './Select';

/** Fiche Select du design system CX : enveloppe cx-select, tailles, flèche décorative, nom accessible. */
describe('Select', () => {
  it('par défaut : cx-select (36 px), un <select> natif et la flèche chevron-down cachée aux lecteurs d\'écran', () => {
    render(<label>Analyse <Select defaultValue="b"><option value="a">A</option><option value="b">B</option></Select></label>);
    const select = screen.getByRole('combobox', { name: 'Analyse' });
    expect(select).toHaveValue('b');
    const wrapper = select.parentElement!;
    expect(wrapper).toHaveClass('cx-select');
    expect(wrapper).not.toHaveClass('cx-select--lg');
    expect(wrapper).not.toHaveClass('cx-select--block');
    const icon = wrapper.querySelector('svg.cx-icon')!;
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon.previousElementSibling).toBe(select);
  });

  it('cx-select--lg (48 px) et cx-select--block ; l\'aria-label quand le libellé est implicite', () => {
    render(<Select size="lg" block aria-label="Catégorie" wrapperClassName="extra"><option>Une</option></Select>);
    const wrapper = screen.getByRole('combobox', { name: 'Catégorie' }).parentElement!;
    expect(wrapper).toHaveClass('cx-select', 'cx-select--lg', 'cx-select--block', 'extra');
  });
});

/** Parcours d'onboarding : tous ses sélecteurs passent par Select (valeurs et libellés inchangés). */
describe('Parcours d\'onboarding : aucun <select> nu', () => {
  const files = import.meta.glob(['/src/features/onboardingProjects/**/*.tsx', '!/src/features/onboardingProjects/**/*.test.tsx'],
    { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

  it('chaque sélecteur est un <Select>, avec un libellé visible ou un aria-label', () => {
    expect(Object.keys(files).length).toBeGreaterThan(20);
    const bare = Object.entries(files).filter(([, code]) => /<select[\s>]/.test(code)).map(([path]) => path);
    expect(bare).toEqual([]);
    const used = Object.entries(files).filter(([, code]) => /<Select[\s>]/.test(code)).map(([path]) => path.split('/').pop());
    expect(used.sort()).toEqual(['AuditTab.tsx', 'BaseTab.tsx', 'CadrageSections.tsx', 'PlanEditing.tsx', 'PlanTab.tsx']);
  });
});
