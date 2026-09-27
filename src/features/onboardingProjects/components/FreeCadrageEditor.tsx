import React, { useRef, useState } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { cn } from '../../../shared/lib/cn';
import type { OnboardingDocument } from '../types';

/** Plafond du back (FREE_CADRAGE_MAX_CHARS). La fiche du pilote fait environ 7 000 caractères. */
export const FREE_CADRAGE_MAX_CHARS = 50_000;
/** Taille d'un fichier importé : largement au-dessus du plafond de caractères, pour lire puis signaler. */
const MAX_IMPORT_BYTES = 1024 * 1024;
const ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';

/** Lecture UTF-8 d'un fichier texte (FileReader : disponible partout, y compris jsdom). */
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Lecture impossible.'));
    reader.readAsText(file, 'utf-8');
  });
}

interface FreeCadrageEditorProps {
  text:           string;
  sourceFilename: string | null;
  documents:      OnboardingDocument[];
  error?:         string;
  /** Saisie au clavier. */
  onChange:       (text: string, sourceFilename: string | null) => void;
  /** Texte importé d'un fichier : le parent confirme s'il remplace un texte existant. */
  onReplace:      (text: string, sourceFilename: string) => void;
  /** Absent s'il n'existe aucune version structurée à reprendre. */
  onStartFromStructured?: () => void;
  startingFromStructured?: boolean;
}

/**
 * Fiche de cadrage en texte libre : le prospect colle sa fiche ou importe un
 * fichier .md ou .txt. Ce texte part tel quel au pipeline, qui lit la fiche
 * comme du texte. Les documents se citent par leur nom de fichier.
 */
export function FreeCadrageEditor({
  text, sourceFilename, documents, error, onChange, onReplace, onStartFromStructured, startingFromStructured,
}: FreeCadrageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  const importFile = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      setImportNote(`« ${file.name} » : fichier .md ou .txt attendu.`);
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setImportNote(`« ${file.name} » dépasse 1 Mo.`);
      return;
    }
    // Lecture en UTF-8 ; un BOM éventuel est retiré, le reste est gardé tel quel.
    let content: string;
    try {
      content = (await readAsText(file)).replace(/^\uFEFF/, '');
    } catch {
      setImportNote(`« ${file.name} » n'a pas pu être lu.`);
      return;
    }
    // Signalements sur le contenu du fichier ; le texte reste modifiable avant l'enregistrement.
    if (content.includes('\uFFFD')) {
      setImportNote(`« ${file.name} » : certains caractères n'ont pas pu être lus. Enregistrez le fichier en UTF-8, puis importez-le de nouveau.`);
    } else if (content.length > FREE_CADRAGE_MAX_CHARS) {
      setImportNote(`« ${file.name} » dépasse ${FREE_CADRAGE_MAX_CHARS.toLocaleString('fr-FR')} caractères : raccourcissez-le avant d'enregistrer.`);
    } else {
      setImportNote(null);
    }
    onReplace(content, file.name);
  };

  const tooLong = text.length > FREE_CADRAGE_MAX_CHARS;

  return (
    <section className="obp-free" aria-labelledby="obp-free-title">
      <h2 id="obp-free-title" className="obp-section-title">Fiche en texte libre</h2>
      <p className="obp-muted">
        Collez votre fiche telle que vous l'avez rédigée, ou importez un fichier .md ou .txt. Ce texte part tel quel à
        l'analyse. Citez vos documents par leur nom de fichier.
      </p>

      <div className="obp-free__actions">
        <input ref={inputRef} type="file" accept={ACCEPT} className="obp-dropzone__input" tabIndex={-1} aria-hidden="true"
          onChange={e => void importFile(e.target.files?.[0])} />
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Importer un fichier .md ou .txt
        </Button>
        {onStartFromStructured && (
          <Button type="button" variant="ghost" size="sm" loading={startingFromStructured} onClick={onStartFromStructured}>
            Partir du rendu de la fiche structurée
          </Button>
        )}
      </div>
      {importNote && <p className="obp-warning" role="status">{importNote}</p>}

      <div className="field">
        <label htmlFor="obp-free-text" className="field-label">
          Texte de la fiche{sourceFilename && <span className="obp-muted"> — importé de « {sourceFilename} »</span>}
        </label>
        <textarea
          id="obp-free-text"
          className={cn('field-input', 'obp-textarea', 'obp-free__text', (error || tooLong) && 'field-input--error')}
          value={text}
          rows={20}
          spellCheck
          aria-invalid={!!error || tooLong}
          aria-describedby="obp-free-count"
          onChange={e => onChange(e.target.value, sourceFilename)}
        />
        <p id="obp-free-count" className={tooLong ? 'field-error' : 'field-helper'}>
          {text.length.toLocaleString('fr-FR')} / {FREE_CADRAGE_MAX_CHARS.toLocaleString('fr-FR')} caractères
        </p>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>

      {documents.length > 0 && (
        <div className="obp-free__docs">
          <span className="field-label">Documents du projet</span>
          <ul className="obp-free__doc-list" role="list">
            {documents.map(d => <li key={d.id}><code>{d.filename}</code></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
