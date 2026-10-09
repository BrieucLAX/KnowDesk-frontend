import React, { useEffect, useId, useState } from 'react';
import type { SectionFix } from '../../lib/correction';
import type { SaveState } from '../../hooks/useBaseReview';
import { Button } from '../../../../shared/components/ui/Button';
import { SaveStatus } from './ReviewCard';

interface SectionFixBoxProps {
  title:    string;
  /** Le texte proposé de la section : point de départ quand l'expert n'a encore rien écrit. */
  proposed: string;
  current:  SectionFix | undefined;
  editable: boolean;
  save:     SaveState | undefined;
  /** Le texte de la section ; null : revenir au texte de la base proposée. */
  onSave:   (text: string | null) => void;
}

/**
 * « Corriger cette section » (migration 57), sur n'importe quelle section, modifiée ou non : le
 * texte de l'expert remplace la section entière dans la version propre, et prime sur les avis des
 * modifications qui la touchent (« Base de co 2026 v3 » : 45,80 € à corriger en 35,80 € dans une
 * section qu'aucune modification ne touchait). Un texte long : il s'enregistre par un bouton.
 */
export function SectionFixBox({ title, proposed, current, editable, save, onSave }: SectionFixBoxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current?.correctedText ?? proposed);
  useEffect(() => { if (!open) setText(current?.correctedText ?? proposed); }, [current, proposed, open]);

  if (!editable) {
    return current ? (
      <div className="obp-base-section-fix">
        <p className="obp-base-label">Texte de la section écrit par vous, repris dans la version propre :</p>
        <pre className="obp-base-section-fix__text">{current.correctedText}</pre>
      </div>
    ) : null;
  }
  if (!open) {
    return (
      <div className="obp-base-section-fix">
        {current && <p className="obp-muted">Vous avez écrit le texte de cette section : il la remplace dans la version propre.</p>}
        <div className="obp-decision__actions">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            {current ? 'Modifier votre texte de la section' : 'Corriger cette section'}
          </Button>
        </div>
        <SaveStatus state={save} />
      </div>
    );
  }
  return (
    <div className="obp-base-section-fix">
      <label htmlFor={id} className="obp-base-label">« {title} » : le texte de la section tel que vous l'écririez</label>
      <p className="obp-muted">
        Il remplacera la section entière dans la version propre, à la place des modifications proposées pour elle.
      </p>
      <textarea id={id} className="obp-base-textarea" rows={10} value={text} onChange={e => setText(e.target.value)} />
      <div className="obp-decision__actions">
        <Button variant="primary" size="sm" disabled={!text.trim()} onClick={() => { onSave(text); setOpen(false); }}>
          Enregistrer ce texte
        </Button>
        {current && (
          <Button variant="ghost" size="sm" onClick={() => { onSave(null); setOpen(false); }}>
            Revenir au texte de la base
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Fermer sans enregistrer</Button>
      </div>
      <SaveStatus state={save} />
    </div>
  );
}
