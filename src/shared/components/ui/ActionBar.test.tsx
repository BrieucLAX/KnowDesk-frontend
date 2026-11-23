import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ActionBarContent, ActionBarHost } from './ActionBar';

const bar = () => document.querySelector('.actionbar') as HTMLElement;

describe('ActionBar', () => {
  it('sans contenu de l\'écran : la barre montre le repli (« Continuer : … »)', () => {
    render(<ActionBarHost fallback={{ children: <button type="button">Continuer : Analyse</button> }}><p>Écran</p></ActionBarHost>);
    expect(bar()).toBeVisible();
    expect(within(bar()).getByRole('button', { name: 'Continuer : Analyse' })).toBeInTheDocument();
  });

  it('l\'écran place son action et sa note dans la barre, à la place du repli', () => {
    render(
      <ActionBarHost fallback={{ children: <button type="button">Continuer</button> }}>
        <section aria-label="Écran">
          <ActionBarContent note="Ce qui va se passer."><button type="button" disabled>Lancer</button></ActionBarContent>
        </section>
      </ActionBarHost>,
    );
    expect(within(bar()).getByRole('button', { name: 'Lancer' })).toBeDisabled();
    expect(within(bar()).getByText('Ce qui va se passer.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuer' })).not.toBeInTheDocument();
    // Rien n'est resté dans l'écran.
    expect(within(screen.getByRole('region', { name: 'Écran' })).queryByRole('button')).not.toBeInTheDocument();
  });

  it('« hidden » : pas de barre, pas même le repli ; sans repli ni contenu, pas de barre', () => {
    const { unmount } = render(
      <ActionBarHost fallback={{ children: <button type="button">Continuer</button> }}><ActionBarContent hidden /></ActionBarHost>,
    );
    expect(bar()).not.toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continuer' })).not.toBeInTheDocument();
    unmount();
    render(<ActionBarHost><p>Dernière étape</p></ActionBarHost>);
    expect(bar()).not.toBeVisible();
  });

  it('le contenu retiré rend la barre au repli', () => {
    function Screen() {
      const [on, setOn] = useState(true);
      return (
        <ActionBarHost fallback={{ children: <button type="button">Continuer</button> }}>
          <button type="button" onClick={() => setOn(false)}>Retirer</button>
          {on && <ActionBarContent><button type="button">Valider</button></ActionBarContent>}
        </ActionBarHost>
      );
    }
    render(<Screen />);
    expect(screen.getByRole('button', { name: 'Valider' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument();
    expect(within(bar()).getByRole('button', { name: 'Continuer' })).toBeInTheDocument();
  });

  it('hors d\'une page : l\'action s\'affiche sur place, dans sa propre barre', () => {
    const { container } = render(<ActionBarContent note="Note"><button type="button">Valider</button></ActionBarContent>);
    expect(container.querySelector('.actionbar')).toContainElement(screen.getByRole('button', { name: 'Valider' }));
  });
});
