import { describe, it, expect } from 'vitest';
import { AUDIENCE_LABEL, audienceOf, hasAudiences, matchesAudience } from './audience';

describe('public d\'un article (retours de l\'experte, 2026-11-18)', () => {
  it('lit la liste fermée du pipeline, jamais une valeur libre', () => {
    expect(audienceOf('particuliers')).toBe('particuliers');
    expect(audienceOf('professionnels')).toBe('professionnels');
    expect(audienceOf('tous')).toBe('tous');
    expect(audienceOf('Particuliers')).toBeNull();
    expect(audienceOf('conseillers')).toBeNull();
    expect(audienceOf(null)).toBeNull();
    expect(AUDIENCE_LABEL.tous).toBe('Particuliers et professionnels');
  });

  it('filtre : un article « tous » concerne les deux publics ; une valeur libre ne passe que sans filtre', () => {
    expect(matchesAudience('tous', 'particuliers')).toBe(true);
    expect(matchesAudience('tous', 'professionnels')).toBe(true);
    expect(matchesAudience('particuliers', 'professionnels')).toBe(false);
    expect(matchesAudience('conseillers', 'particuliers')).toBe(false);
    expect(matchesAudience(null, 'all')).toBe(true);
  });

  it('le filtre n\'apparaît que si un article porte un public de la liste fermée', () => {
    expect(hasAudiences([null, 'conseillers', 'Particuliers'])).toBe(false);
    expect(hasAudiences([null, 'tous'])).toBe(true);
  });
});
