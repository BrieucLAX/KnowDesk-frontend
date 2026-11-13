import React, { useState, useRef, useEffect } from 'react';
import './ChipsInput.css';
import { X } from 'lucide-react';

export interface ChipsInputProps {
  value:        string[];
  onChange:     (next: string[]) => void;
  placeholder?: string;
  /** Suggestions filtrées sur le draft. Si fournies, affiche un menu sous l'input. */
  suggestions?: string[];
  /** Limite max de chips. Au-delà, l'ajout est ignoré. */
  max?:         number;
  /** Désactive l'édition (mode read-only). */
  disabled?:    boolean;
  /** id du champ de saisie, pour le relier à un <label htmlFor>. */
  id?:          string;
  /** Nom accessible quand aucun <label> visible n'est relié. */
  ariaLabel?:   string;
  /** id du message d'aide ou d'erreur relié au champ. */
  describedBy?: string;
}

/**
 * Input multi-valeurs en chips. Enter ou virgule valide un chip.
 * Backspace sur un input vide supprime le dernier chip.
 * Si `suggestions` est fourni, un menu d'auto-complétion s'ouvre sous l'input.
 */
export function ChipsInput({
  value, onChange, placeholder, suggestions, max, disabled, id, ariaLabel, describedBy,
}: ChipsInputProps) {
  const [draft, setDraft] = useState('');
  const [open,  setOpen]  = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions
    ? suggestions
        .filter(s => !value.some(v => v.toLowerCase() === s.toLowerCase()))
        .filter(s => s.toLowerCase().includes(draft.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  const showMenu = open && filtered.length > 0;

  useEffect(() => { setActiveIdx(0); }, [draft, open]);

  const commit = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (max && value.length >= max) return;
    if (value.some(v => v.toLowerCase() === t.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, t]);
    setDraft('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMenu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setActiveIdx(prev => {
        const n = filtered.length;
        return e.key === 'ArrowDown' ? (prev + 1) % n : (prev - 1 + n) % n;
      });
      return;
    }
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (showMenu) commit(filtered[activeIdx]);
      else          commit(draft);
      return;
    }
    if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="chips-input-wrap">
      <div className={`chips-input ${disabled ? 'chips-input--disabled' : ''}`}>
        {value.map(chip => (
          <span key={chip} className="chip">
            {chip}
            {!disabled && (
              <button
                type="button"
                className="chip__remove"
                onClick={() => onChange(value.filter(v => v !== chip))}
                aria-label={`Retirer ${chip}`}
              ><X size={16} /></button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            id={id}
            type="text"
            aria-label={ariaLabel}
            aria-describedby={describedBy}
            className="chips-input__field"
            value={draft}
            placeholder={value.length === 0 ? placeholder : ''}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Délai pour laisser un éventuel mousedown sur la suggestion s'enregistrer
              setTimeout(() => { commit(draft); setOpen(false); }, 100);
            }}
          />
        )}
      </div>
      {showMenu && (
        <ul className="chips-input__menu" role="listbox">
          {filtered.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIdx}
              className={`chips-input__menu-item ${i === activeIdx ? 'chips-input__menu-item--active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={e => { e.preventDefault(); commit(s); }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
