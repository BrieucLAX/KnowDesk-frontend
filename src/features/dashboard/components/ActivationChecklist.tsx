import React from 'react';
import type { ChecklistItem } from '../types';
import { Check } from 'lucide-react';

interface ActivationChecklistProps {
  items: ChecklistItem[];
}

/**
 * Shown to admins until all onboarding tasks are complete.
 * Disappears once every item is checked.
 */
export function ActivationChecklist({ items }: ActivationChecklistProps) {
  const completedCount = items.filter(i => i.completed).length;
  const allDone        = completedCount === items.length;

  if (allDone) return null;

  const pct = Math.round((completedCount / items.length) * 100);

  return (
    <section className="checklist" aria-label="Étapes de démarrage">
      <div className="checklist__header">
        <div>
          <h2 className="checklist__title">Démarrer avec KnowDesk</h2>
          <p className="checklist__sub">{completedCount} étapes terminées sur {items.length}</p>
        </div>
        <span className="checklist__pct">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="checklist__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct} % terminé`}>
        <div className="checklist__progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <ul className="checklist__list">
        {items.map(item => (
          <li key={item.id} className="checklist__item">
            <span className={`checklist__dot ${item.completed ? 'checklist__dot--done' : ''}`} aria-hidden="true">
              {item.completed && <Check size={14} />}
            </span>
            {item.completed ? (
              <span className="checklist__label checklist__label--done">{item.label}</span>
            ) : (
              <a href={item.href} className="checklist__label checklist__label--todo">
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
