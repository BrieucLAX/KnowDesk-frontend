import React from 'react';
import { Hourglass } from 'lucide-react';
import { ActionBarContent } from '../../../shared/components/ui/ActionBar';

/**
 * Étape 3 pendant l'analyse (statut `analyse_en_cours`, lot 1 « Socle ») : un état d'attente
 * simple, sans chiffre technique (ni étapes du pipeline, ni appels à l'IA, ni durée). La page relit
 * le projet en attendant et montre les questions dès que l'analyse est terminée.
 */
export function AnalysisWaiting() {
  return (
    <section className="obp-waiting" role="status" aria-labelledby="obp-waiting-title">
      <ActionBarContent hidden />
      <span className="obp-waiting__icon" aria-hidden="true"><Hourglass size={24} /></span>
      <h2 id="obp-waiting-title" className="obp-section-title">L'analyse de vos documents est en cours</h2>
      <p className="obp-muted">
        Elle prend jusqu'à une heure. Vous pouvez fermer cette page : nous vous prévenons par e-mail quand
        les questions sont prêtes.
      </p>
    </section>
  );
}
