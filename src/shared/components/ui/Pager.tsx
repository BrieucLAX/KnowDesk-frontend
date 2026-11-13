import React from 'react';
import { Button } from './Button';
import './Pager.css';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PagerProps {
  page:       number;
  totalPages: number;
  onChange:   (page: number) => void;
  /** Masquer si une seule page (par défaut true). */
  hideWhenSingle?: boolean;
  className?: string;
}

/**
 * Pagination « ← Précédent · Page X / Y · Suivant → ». Utilisée par les
 * pages liste paginées côté serveur (Audit, Conversations…).
 */
export function Pager({ page, totalPages, onChange, hideWhenSingle = true, className }: PagerProps) {
  if (hideWhenSingle && totalPages <= 1) return null;
  return (
    <div className={`pager${className ? ' ' + className : ''}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        <ArrowLeft size={16} />Précédent
      </Button>
      <span className="pager__info" aria-live="polite">
        Page {page} / {totalPages}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      >
        Suivant<ArrowRight size={16} />
      </Button>
    </div>
  );
}
