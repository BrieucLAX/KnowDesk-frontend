import React from 'react';
import { HelpPopover } from '../../../../shared/components/ui/HelpPopover';
import type { ChatRetentionDays } from '../../types';
import type { ChatbotTabContext } from './types';

/**
 * Tab "Rétention" — durée de conservation des conversations chat.
 * Un dialog de confirmation s'affiche à la baisse (cf parent).
 */
export function ChatbotRetentionTab({ ctx }: { ctx: ChatbotTabContext }) {
  const { form, setForm } = ctx;
  return (
    <div className="field">
      <label htmlFor="chat-retention-days" className="field-label">
        Durée de conservation des conversations
        <HelpPopover content={
          <>
            Plus la durée est courte, plus le risque au regard du RGPD
            diminue, mais vous perdez l'historique des conversations passées
            (écran Analyse, diagnostic). Une durée de 90 jours est un bon
            compromis dans la plupart des cas.
          </>
        } />
      </label>
      <select
        id="chat-retention-days"
        className="field-input"
        value={form.chat_retention_days ?? 90}
        onChange={e => setForm(f => ({
          ...f,
          chat_retention_days: Number(e.target.value) as ChatRetentionDays,
        }))}
      >
        <option value={30}>30 jours</option>
        <option value={60}>60 jours</option>
        <option value={90}>90 jours (par défaut)</option>
        <option value={180}>180 jours</option>
      </select>
      <p className="field-helper">
        Au-delà de cette durée, les conversations sont définitivement supprimées
        de nos serveurs. La suppression a lieu chaque jour, conformément au RGPD.
      </p>
    </div>
  );
}
