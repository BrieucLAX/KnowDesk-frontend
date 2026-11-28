import { describe, it, expect } from 'vitest';

/**
 * Superposition (fiche Modal du design system CX, 28/11) : le fond d'une modale est à
 * `--z-modal` (50) et passe au-dessus de tout ; aucune couche ne dépasse cette valeur.
 * Les valeurs viennent des tokens de `tokens.css` (`--z-*`).
 */
// vitest tourne avec `css: false` : un import `?raw` d'une feuille CSS rend une chaîne vide.
// Les fichiers se lisent donc sur le disque (types Node absents du projet : interface minimale).
interface Fs {
  readFileSync(path: string, encoding: 'utf8'): string;
  readdirSync(path: string): string[];
  statSync(path: string): { isDirectory(): boolean };
}
declare const process: { cwd(): string };
const FS_MODULE = 'node:fs';
const fs = (await import(/* @vite-ignore */ FS_MODULE)) as unknown as Fs;

function read(test: (name: string) => boolean): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const path = `${dir}/${name}`;
      if (fs.statSync(path).isDirectory()) walk(path);
      else if (test(name)) out[path.slice(process.cwd().length)] = fs.readFileSync(path, 'utf8');
    }
  };
  walk(`${process.cwd()}/src`);
  return out;
}
const CSS = read(name => name.endsWith('.css'));
const CODE = read(name => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name));
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
