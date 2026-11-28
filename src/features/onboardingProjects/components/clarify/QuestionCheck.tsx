import React from 'react';
import { CircleCheck } from 'lucide-react';

/**
 * Picto « cercle coché » vert d'une question à laquelle vous avez répondu (US 3.1), à droite du
 * libellé ; rien pour une question en attente. Celui d'une question réglée par KnowDesk, en prune,
 * est `KnowDeskCheck` (Origin).
 */
export function AnsweredCheck() {
  return <CircleCheck size={16} className="obp-q-check" role="img" aria-label="Répondu" />;
}
