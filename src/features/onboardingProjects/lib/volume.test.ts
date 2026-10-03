import { describe, it, expect } from 'vitest';
import { corpusVolume, isCorpusTooLarge } from './volume';

const MB = 1024 * 1024;
const limits = { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10, maxTextChars: 450_000 };
const project = (textChars: number | undefined, unmeasuredDocuments = 0) => ({ limits, textChars, unmeasuredDocuments });

describe('volume de texte du projet', () => {
  it('part de ce qu\'une analyse peut lire, et ton de la jauge', () => {
    expect(corpusVolume(project(90_000))).toMatchObject({ share: 20, tone: 'ok', label: 'Volume de texte : 20 % de ce qu\'une analyse peut lire.' });
    expect(corpusVolume(project(360_000))).toMatchObject({ share: 80, tone: 'warning' });
    expect(corpusVolume(project(450_000))).toMatchObject({ share: 100, tone: 'warning' });
  });

  it('au-delà de 100 % : dit quoi faire, et bloque le lancement', () => {
    const v = corpusVolume(project(495_000))!;
    expect(v).toMatchObject({ share: 110, tone: 'over' });
    expect(v.label).toContain('Retirez des documents');
    expect(isCorpusTooLarge(project(495_000))).toBe(true);
    expect(isCorpusTooLarge(project(450_000))).toBe(false);
  });

  it('dit les documents importés avant la mesure, qui ne sont pas comptés', () => {
    expect(corpusVolume(project(1000, 0))!.note).toBeNull();
    expect(corpusVolume(project(1000, 1))!.note).toBe('Un document importé avant cette mesure n\'est pas compté.');
    expect(corpusVolume(project(1000, 3))!.note).toBe('3 documents importés avant cette mesure ne sont pas comptés.');
  });

  it('rien à montrer si le back n\'expose pas le volume', () => {
    expect(corpusVolume({ limits: { ...limits, maxTextChars: undefined }, textChars: 10 })).toBeNull();
    expect(corpusVolume({ limits, textChars: undefined })).toBeNull();
  });
});
