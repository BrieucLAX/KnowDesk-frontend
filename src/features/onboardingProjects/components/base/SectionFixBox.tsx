import React, { useEffect, useId, useRef, useState } from 'react';
import type { SectionFix } from '../../lib/correction';
import type { SaveState } from '../../hooks/useBaseReview';
import { Button } from '../../../../shared/components/ui/Button';
import { SaveStatus } from './ReviewCard';

interface SectionFixBoxProps {
  title:    string;
  /** Le texte proposé de la section : point de départ quand l'expert n'a encore rien écrit. */
  proposed: string;
  /**
   * Le texte d'origine d'une section que la préparation a changée (plan v6, D3) : la section se
   * décide alors par trois gestes, Accepter, « Corriger cette section » ou Refuser. Absent : une
   * section inchangée, qui ne se corrige que par « Corriger cette section ».
   */
  original?: string;
  current:  SectionFix | undefined;
  editable: boolean;
  save:     SaveState | undefined;
  /** Le texte de la section ; null : revenir au texte de la base proposée. */
  onSave:   (text: string | null) => void;
  /**
   * « Modifier aussi le texte autour » (plan v6, D4) : chaque nouvelle valeur ouvre l'éditeur,
   * prérempli, sur la section, dépliée si elle est repliée ; 0 : aucune demande.
   */
  openSignal?: number;
}

/** Le back refuse un texte de section vide : une section vide à l'origine ne se refuse pas (Q6a). */
export const EMPTY_ORIGINAL_REASON = 'Le texte d\'origine de cette section est vide : refusez la modification.';

/** Refuser la section : son texte d'origine, à l'identique, enregistré comme texte de section. */
export const keepsOriginal = (fix: SectionFix | undefined, original: string | undefined): boolean =>
  fix !== undefined && original !== undefined && fix.correctedText === original;

/**
 * « Corriger cette section » (migration 57), sur n'importe quelle section, modifiée ou non : le
 * texte de l'expert remplace la section entière dans la version propre, et prime sur les avis des
 * modifications qui la touchent (« Base de co 2026 v3 » : 45,80 € à corriger en 35,80 € dans une
 * section qu'aucune modification ne touchait). Un texte long : il s'enregistre par un bouton.
 *
 * Une section changée se décide à part de ses modifications (plan v6, D3, « Base de co 2026 v5 » :
 * refuser M10 retirait aussi le glossaire) : Accepter, par défaut, garde le texte proposé ; Refuser
 * enregistre le texte d'origine, à l'identique, par la même route.
 */
export function SectionFixBox({ title, proposed, original, current, editable, save, onSave, openSignal = 0 }: SectionFixBoxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current?.correctedText ?? proposed);
  useEffect(() => { if (!open) setText(current?.correctedText ?? proposed); }, [current, proposed, open]);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (openSignal > 0) setOpen(true); }, [openSignal]);
  useEffect(() => {
    if (!open || openSignal === 0 || !field.current) return;
    const folded = field.current.closest('details');
    if (folded) folded.open = true;
    field.current.scrollIntoView?.({ block: 'center' });
    field.current.focus();
  }, [open, openSignal]);

  // Le texte enregistré s'affiche à la place de la section (« Texte corrigé par … ») : ici, l'action seule.
  if (!editable) return null;
  if (!open && original !== undefined) {
    const refused = keepsOriginal(current, original);
    const emptyOriginal = !original.trim();
    return (
      <div className="obp-base-section-fix">
        <div className="obp-base-verdicts" role="group" aria-label={`Votre choix pour la section « ${title} »`}>
          <button type="button" aria-pressed={!current} className="obp-base-verdict obp-base-verdict--accept"
            onClick={() => { if (current) onSave(null); }}>
            Accepter
          </button>
          <button type="button" aria-pressed={Boolean(current) && !refused} className="obp-base-verdict obp-base-verdict--fix"
            onClick={() => { if (refused) setText(proposed); setOpen(true); }}>
            Corriger cette section
          </button>
          <button type="button" aria-pressed={refused} className="obp-base-verdict obp-base-verdict--refuse"
            disabled={emptyOriginal} onClick={() => { if (!refused) onSave(original); }}>
            Refuser
          </button>
        </div>
        {emptyOriginal && <p className="obp-muted">{EMPTY_ORIGINAL_REASON}</p>}
        <SaveStatus state={save} />
      </div>
    );
  }
  if (!open) {
    return (
      <div className="obp-base-section-fix">
        {current && <p className="obp-muted">Ce texte remplace la section dans la version propre.</p>}
        <div className="obp-decision__actions">
          {/* Un bouton, visible sur chaque section (plan v4, point 9 : le lien gris passait inaperçu). */}
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            {current ? 'Modifier le texte corrigé' : 'Corriger cette section'}
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
      <textarea ref={field} id={id} className="obp-base-textarea" rows={10} value={text} onChange={e => setText(e.target.value)} />
      <div className="obp-decision__actions">
        <Button variant="primary" size="sm" disabled={!text.trim()} onClick={() => { onSave(text); setOpen(false); }}>
          Enregistrer ce texte
        </Button>
        {current && original === undefined && (
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
