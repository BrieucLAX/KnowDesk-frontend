import { describe, it, expect } from 'vitest';
import { checkSelection } from './checkSelection';

const MB = 1024 * 1024;
const limits = { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 };

function file(name: string, size = 1000): File {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('checkSelection', () => {
  it('accepte une sélection valide', () => {
    expect(checkSelection([file('a.pdf'), file('b.DOCX'), file('c.pptx')], limits)).toBeNull();
  });

  it('accepte un fichier Markdown et une archive .zip', () => {
    expect(checkSelection([file('faq.md'), file('Export-Notion.ZIP')], limits)).toBeNull();
  });

  it('US 1.1 : accepte un fichier Excel (.xlsx)', () => {
    expect(checkSelection([file('Tableau_comparatif_gamme_2026.xlsx'), file('b.XLSX')], limits)).toBeNull();
  });

  it('US 1.1 : refuse un .exe avec un message qui liste les formats acceptés', () => {
    expect(checkSelection([file('setup.exe')], limits)).toBe(
      'Format non pris en charge : « setup.exe ». Formats acceptés : PDF, Word, PowerPoint, Excel, Markdown ou archive .zip.',
    );
  });

  it('lot 2a : un même nom sélectionné deux fois part au back, qui écarte le doublon', () => {
    expect(checkSelection([file('a.pdf'), file('a.pdf')], limits)).toBeNull();
  });

  it('refuse plus de 10 fichiers, sans rien envoyer', () => {
    const files = Array.from({ length: 11 }, (_, i) => file(`f${i}.pdf`));
    expect(checkSelection(files, limits)).toBe('Vous avez sélectionné 11 fichiers : 10 au plus par envoi. Rien n\'a été envoyé.');
  });

  it('nomme les fichiers refusés', () => {
    expect(checkSelection([file('a.pdf'), file('base.csv')], limits)).toBe(
      'Format non pris en charge : « base.csv ». Formats acceptés : PDF, Word, PowerPoint, Excel, Markdown ou archive .zip.',
    );
    expect(checkSelection([file('vide.pdf', 0)], limits)).toContain('« vide.pdf »');
    expect(checkSelection([file('gros.pdf', 51 * MB)], limits)).toBe('Un fichier pèse 50 Mo au plus : « gros.pdf ».');
  });

  it('lot 2a (Q1 a) : les plafonds du projet sont comptés par le back seul, après développement et doublons', () => {
    expect(checkSelection([file('a.pdf'), file('b.pdf')], limits)).toBeNull();
  });
});
