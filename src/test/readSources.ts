/**
 * Lecture des sources sur le disque, pour les tests qui contrôlent les feuilles de style.
 * vitest tourne avec `css: false` : un import `?raw` d'une feuille CSS y rend une chaîne vide, si
 * bien qu'un contrôle fondé sur `import.meta.glob('…css', { query: '?raw' })` ne vérifie rien.
 * Les types Node sont absents du projet : interface minimale du module `node:fs`.
 */
interface Fs {
  readFileSync(path: string, encoding: 'utf8'): string;
  readdirSync(path: string): string[];
  statSync(path: string): { isDirectory(): boolean };
}
declare const process: { cwd(): string };
const FS_MODULE = 'node:fs';
const fs = (await import(/* @vite-ignore */ FS_MODULE)) as unknown as Fs;

/** Les fichiers de `src/` dont le nom passe `test`, par chemin depuis la racine du dépôt (« /src/… »). */
export function readSources(test: (name: string) => boolean): Record<string, string> {
  const root = process.cwd();
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const path = `${dir}/${name}`;
      if (fs.statSync(path).isDirectory()) walk(path);
      else if (test(name)) out[path.slice(root.length)] = fs.readFileSync(path, 'utf8');
    }
  };
  walk(`${root}/src`);
  return out;
}

export const isStylesheet = (name: string): boolean => name.endsWith('.css');
export const isAppCode = (name: string): boolean => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name);
