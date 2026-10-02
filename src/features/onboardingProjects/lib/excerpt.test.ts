import { describe, it, expect } from 'vitest';
import { parseExcerpt, stripMarkup } from './excerpt';

describe('excerpt', () => {
  it('tableau complet : en-tête suivi de tirets, puis les lignes', () => {
    expect(parseExcerpt('| Âge | CONFORT |\n|---|---|\n| 18-29 ans | 45,80 € |\n| 30-39 ans | 54,90 € |')).toEqual([
      { kind: 'table', header: ['Âge', 'CONFORT'], rows: [['18-29 ans', '45,80 €'], ['30-39 ans', '54,90 €']] },
    ]);
  });

  it('une ligne seule, avec du gras et sans barre finale : pas d\'en-tête', () => {
    expect(parseExcerpt('| **Délai cible** | 5 jours ouvrés |')).toEqual([
      { kind: 'table', header: null, rows: [['Délai cible', '5 jours ouvrés']] },
    ]);
    expect(parseExcerpt('| TNS | Contrat **non résiliable** — contrairement aux particuliers.')).toEqual([
      { kind: 'table', header: null, rows: [['TNS', 'Contrat non résiliable — contrairement aux particuliers.']] },
    ]);
  });

  it('extrait coupé « [...] » : les cellules gardent le texte, les lignes courtes sont complétées', () => {
    expect(parseExcerpt('| Poste | Délai | Continuité | [...] | Optique | 3 mois | Aucun |\n| Dentaire | 6 mois |')).toEqual([
      { kind: 'table', header: null, rows: [
        ['Poste', 'Délai', 'Continuité', '[...]', 'Optique', '3 mois', 'Aucun'],
        ['Dentaire', '6 mois', '', '', '', '', ''],
      ] },
    ]);
  });

  it('texte autour d\'un tableau, sans gras', () => {
    expect(parseExcerpt('Grille :\n| a | b |\n|:--|--:|\n| 1 | 2 |\nFin **ici**.')).toEqual([
      { kind: 'text', text: 'Grille :' },
      { kind: 'table', header: ['a', 'b'], rows: [['1', '2']] },
      { kind: 'text', text: 'Fin ici.' },
    ]);
  });

  it('texte simple : inchangé hors gras', () => {
    expect(parseExcerpt('- **Téléconsultation** — en préparation')).toEqual([{ kind: 'text', text: '- Téléconsultation — en préparation' }]);
    expect(stripMarkup('a ** b')).toBe('a  b');
  });
});
