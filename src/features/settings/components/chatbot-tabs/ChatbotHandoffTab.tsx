import React from 'react';
import { Input } from '../../../../shared/components/ui/Input';
import type { ChatHandoffMode } from '../../types';
import type { ChatbotTabContext } from './types';

/**
 * Tab "Handoff humain" — comment KnowDesk transmet les conversations
 * à votre équipe quand le visiteur demande à parler à un humain.
 */
export function ChatbotHandoffTab({ ctx }: { ctx: ChatbotTabContext }) {
  const { form, setForm } = ctx;
  return (
    <>
      <p className="settings-section__desc">
        Quand un visiteur clique sur « Parler à un humain » ou indique que le chatbot ne l'a pas aidé,
        KnowDesk peut transmettre la conversation à votre équipe.
      </p>

      <div className="field">
        <label htmlFor="handoff-mode" className="field-label">Mode de transmission</label>
        <select
          id="handoff-mode"
          className="field-input"
          value={form.chat_handoff_mode}
          onChange={e => setForm(f => ({ ...f, chat_handoff_mode: e.target.value as ChatHandoffMode }))}
        >
          <option value="none">Aucun : le visiteur voit seulement le message de repli</option>
          <option value="email">E-mail : la conversation est envoyée à une adresse</option>
          <option value="webhook">Webhook : la conversation est envoyée en JSON à votre URL (CRM, Zendesk, Slack…)</option>
        </select>
        <p className="field-helper">
          « Aucun » ne transmet rien à votre équipe. « E-mail » est le plus simple à mettre en place. « Webhook »
          permet de créer automatiquement un ticket dans votre outil de support.
        </p>
      </div>

      {form.chat_handoff_mode === 'email' && (
        <Input
          id="handoff-email"
          label="Adresse e-mail du destinataire"
          type="email"
          value={form.chat_handoff_email ?? ''}
          maxLength={120}
          placeholder="support@votre-entreprise.fr"
          onChange={e => setForm(f => ({ ...f, chat_handoff_email: e.target.value }))}
          helperText="Reçoit la conversation au format HTML à chaque demande de passage à un humain. Utilisez une adresse partagée (support@…) plutôt qu'une adresse personnelle."
        />
      )}

      {form.chat_handoff_mode === 'webhook' && (
        <Input
          id="handoff-webhook"
          label="URL du webhook"
          type="url"
          value={form.chat_handoff_webhook_url ?? ''}
          maxLength={500}
          placeholder="https://api.votre-crm.fr/webhooks/knowdesk-chat"
          onChange={e => setForm(f => ({ ...f, chat_handoff_webhook_url: e.target.value }))}
          helperText="Reçoit une requête POST en JSON { conversationId, transcript, visitorEmail, … }. Délai de réponse maximal : 8 secondes. Le format exact est décrit dans le centre d'aide, article « Passage à un humain »."
        />
      )}
    </>
  );
}
