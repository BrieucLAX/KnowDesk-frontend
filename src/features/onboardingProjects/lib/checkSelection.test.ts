import { describe, it, expect } from 'vitest';
import { checkSelection } from './checkSelection';

const MB = 1024 * 1024;
const limits = { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 };
const empty  = { documentsCount: 0, totalBytes: 0 };

function file(name: string, size = 1000): File {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('checkSelection', () => {
  it('accepte une sélection valide', () => {
    expect(checkSelection([file('a.pdf'), file('b.DOCX'), file('c.pptx')], limits, empty)).toBeNull();
  });

  it('accepte un fichier Markdown et une archive .zip', () => {
    expect(checkSelection([file('faq.md'), file('Export-Notion.ZIP')], limits, empty)).toBeNull();
  });

  it('refuse plus de 10 fichiers, sans rien envoyer', () => {
    const files = Array.from({ length: 11 }, (_, i) => file(`f${i}.pdf`));
    expect(checkSelection(files, limits, empty)).toBe('Vous avez sélectionné 11 fichiers : 10 au plus par envoi. Rien n\'a été envoyé.');
  });

  it('nomme les fichiers refusés', () => {
    expect(checkSelection([file('a.pdf'), file('base.csv')], limits, empty)).toBe(
      'Format non pris en charge : « base.csv ». Formats acceptés : PDF, Word (.docx), PowerPoint (.pptx), Markdown (.md) ou archive .zip (un export Notion, par exemple).',
    );
    expect(checkSelection([file('vide.pdf', 0)], limits, empty)).toContain('« vide.pdf »');
    expect(checkSelection([file('gros.pdf', 51 * MB)], limits, empty)).toBe('Un fichier pèse 50 Mo au plus : « gros.pdf ».');
    expect(checkSelection([file('a.pdf'), file('a.pdf')], limits, empty)).toContain('deux fois');
  });

  it('respecte les plafonds du projet', () => {
    expect(checkSelection([file('a.pdf'), file('b.pdf')], limits, { documentsCount: 49, totalBytes: 0 }))
      .toBe('Un projet compte 50 documents au plus (49 déjà importés).');
    expect(checkSelection([file('a.pdf', 20 * MB)], limits, { documentsCount: 1, totalBytes: 290 * MB }))
      .toBe('Un projet pèse 300 Mo au plus (290 Mo déjà importés).');
  });
});
