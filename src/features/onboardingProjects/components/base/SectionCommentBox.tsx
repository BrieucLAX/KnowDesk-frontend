import React, { useEffect, useId, useState } from 'react';
import type { SectionComment } from '../../lib/correction';
import type { SaveState } from '../../hooks/useBaseReview';
import { SaveStatus } from './ReviewCard';

interface SectionCommentBoxProps {
  title:    string;
  current:  SectionComment | undefined;
  editable: boolean;
  save:     SaveState | undefined;
  onSave:   (text: string) => void;
}

/** Commentaire sur une section, modifiée ou non ; enregistré quand on quitte le champ. */
export function SectionCommentBox({ title, current, editable, save, onSave }: SectionCommentBoxProps) {
  const id = useId();
  const [text, setText] = useState(current?.comment ?? '');
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(current?.comment ?? ''); }, [current, focused]);

  if (!editable) {
    return current ? <p className="obp-base-section-comment">Commentaire sur la section : {current.comment}</p> : null;
  }
  return (
    <div className="obp-base-section-comment">
      <label htmlFor={id} className="obp-base-label">Un commentaire sur la section « {title} » ? (facultatif)</label>
      <textarea id={id} className="obp-base-textarea" rows={2} value={text}
        onFocus={() => setFocused(true)}
        onChange={e => setText(e.target.value)}
        onBlur={() => { setFocused(false); onSave(text); }} />
      <SaveStatus state={save} />
    </div>
  );
}
