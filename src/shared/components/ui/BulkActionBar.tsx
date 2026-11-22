import React from 'react';
import { Button } from './Button';
import './BulkActionBar.css';
import { Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  /** Nombre d'éléments sélectionnés. La barre est masquée si 0. */
  count:        number;
  /** Texte au singulier/pluriel — typiquement « article(s) sélectionné(s) ». */
  label:        (count: number) => string;
  /** Callback de l'action principale (typiquement suppression). */
  onDelete:     () => void;
  /** Callback « Désélectionner tout ». */
  onClear:      () => void;
  /** État loading pendant l'opération bulk (désactive les boutons). */
  loading?:     boolean;
}

/**
 * Barre d'action contextuelle qui apparaît en bas d'écran dès qu'au
 * moins 1 ligne est sélectionnée. Pattern SaaS classique : affiche le
 * count + actions de masse (V1 : suppression seule ; ajout simple via
 * props si besoin futur).
 */
export function BulkActionBar({ count, label, onDelete, onClear, loading }: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div className="bulk-action-bar" role="region" aria-label="Actions sur sélection">
      <span className="bulk-action-bar__count">{label(count)}</span>
      <div className="bulk-action-bar__actions">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={loading}>
          Désélectionner
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} loading={loading}>
          <Trash2 size={16} />Supprimer ({count})
        </Button>
      </div>
    </div>
  );
}
