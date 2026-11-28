import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../shared/components/ui/Modal';
import { InfoTooltip } from '../shared/components/ui/Tooltip';
import { HelpPopover } from '../shared/components/ui/HelpPopover';
import { isAppCode, isStylesheet, readSources } from '../test/readSources';

/**
 * Superposition (fiche Modal du design system CX, 28/11) : le fond d'une modale est à
 * `--z-modal` (50) et passe au-dessus de tout ; aucune couche ne dépasse cette valeur.
 * Les valeurs viennent des tokens de `tokens.css` (`--z-*`).
 */

const CSS = readSources(isStylesheet);
const CODE = readSources(isAppCode);
const TOKENS = CSS['/src/styles/tokens.css'];

const tokenValue = (name: string): number => {
  const m = TOKENS.match(new RegExp(`--${name}:\\s*(\\d+)`));
  if (!m) throw new Error(`token --${name} absent`);
  return Number(m[1]);
};

describe('z-index : le fond de modale passe au-dessus de tout', () => {
  it('les tokens de superposition sont rangés, --z-modal vaut 50 et est le plus haut', () => {
    const scale = ['z-raised', 'z-sticky', 'z-dropdown', 'z-floating', 'z-modal'].map(tokenValue);
    expect(scale).toEqual([...scale].sort((a, b) => a - b));
    expect(tokenValue('z-modal')).toBe(50);
  });

  it('le fond de la modale de l\'app prend --z-modal', () => {
    const modal = CSS['/src/shared/components/ui/Modal.css'];
    expect(modal).toMatch(/\.modal-overlay\s*\{[^}]*z-index:\s*var\(--z-modal\)/);
  });

  it('aucune feuille de style ni aucun style posé en code ne dépasse 50', () => {
    const over: string[] = [];
    for (const [file, text] of Object.entries(CSS)) {
      for (const m of text.matchAll(/z-index:\s*(-?\d+)/g)) if (Number(m[1]) > 50) over.push(`${file} : ${m[0]}`);
    }
    for (const [file, text] of Object.entries(CODE)) {
      for (const m of text.matchAll(/zIndex\s*[:=]\s*['"]?(-?\d+)/g)) if (Number(m[1]) > 50) over.push(`${file} : ${m[0]}`);
    }
    expect(over).toEqual([]);
  });
});

/**
 * Une infobulle, une aide ou un menu ouvert depuis une modale passe au-dessus du fond et n'est pas
 * rogné par la carte (`.modal` en overflow hidden, corps en overflow auto) : rendu dans <body> par
 * un portail, en position fixe, à --z-modal (lot étape A, mesuré dans Chromium avant et après).
 */
describe('Couches ouvertes depuis une modale', () => {
  const rule = (path: string, selector: string): string => {
    const css = CSS[path];
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`${selector} absent de ${path}`);
    return css.slice(start, css.indexOf('}', start));
  };

  it.each([
    ['/src/shared/components/ui/Tooltip.css', '.info-tooltip__bubble'],
    ['/src/shared/components/ui/HelpPopover.css', '.help-popover__content'],
    ['/src/shared/components/ui/ActionMenu.css', '.action-menu__popover'],
  ])('%s : %s en position fixe, à --z-modal', (path, selector) => {
    const body = rule(path, selector);
    expect(body).toMatch(/position:\s*fixed/);
    expect(body).toMatch(/z-index:\s*var\(--z-modal\)/);
  });

  it('l\'infobulle ouverte dans une modale est rendue dans <body>, hors de la carte', () => {
    render(<Modal title="Renommer" onClose={() => {}}><InfoTooltip title="Nom du projet" ariaLabel="À propos du nom" /></Modal>);
    fireEvent.focus(screen.getByRole('button', { name: 'À propos du nom' }));
    const bubble = screen.getByRole('tooltip');
    expect(bubble).toHaveTextContent('Nom du projet');
    expect(bubble.parentElement).toBe(document.body);
    expect(bubble.closest('.modal-overlay')).toBeNull();
  });

  it('l\'aide ouverte dans une modale est rendue dans <body>, et un clic dedans ne la ferme pas', () => {
    render(<Modal title="Renommer" onClose={() => {}}><HelpPopover content="Le nom se voit dans la liste." ariaLabel="Aide sur le nom" /></Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'Aide sur le nom' }));
    const content = screen.getByRole('tooltip');
    expect(content.parentElement).toBe(document.body);
    expect(content.closest('.modal-overlay')).toBeNull();
    fireEvent.click(content);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(document.body);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

