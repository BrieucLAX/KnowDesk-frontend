import React from 'react';
import { Input } from '../../../../shared/components/ui/Input';
import { Switch } from '../../../../shared/components/ui/Switch';
import type { ChatbotTabContext } from './types';

const DEFAULT_WELCOME  = 'Bonjour, comment puis-je vous aider ?';
const DEFAULT_FALLBACK = 'Désolé, je n\'ai pas la réponse précise à cette question. Vous pouvez nous joindre par e-mail à contact@example.com ou par téléphone au 09 99 99 99 99.';

/**
 * Tab "Activation & messages" — toujours active (pas de fieldset disabled),
 * car contient le toggle d'activation lui-même. Les messages welcome /
 * fallback sont visibles + éditables même quand le bot est désactivé.
 */
export function ChatbotMessagesTab({ ctx }: { ctx: ChatbotTabContext }) {
  const { form, setForm } = ctx;
  return (
    <>
      <Switch
        id="chat-enabled-toggle"
        label="Chatbot activé"
        description="Activé, le chatbot peut se charger sur les domaines autorisés. Désactivé, il reste invisible sur votre site."
        checked={form.chat_enabled}
        onChange={v => setForm(f => ({ ...f, chat_enabled: v }))}
      />

      <Input
        id="chat-welcome"
        label="Message d'accueil"
        value={form.chat_welcome_message ?? ''}
        maxLength={200}
        placeholder={DEFAULT_WELCOME}
        onChange={e => setForm(f => ({ ...f, chat_welcome_message: e.target.value }))}
        helperText="Premier message que le visiteur voit en ouvrant le chatbot. Laissez vide pour afficher un message générique."
      />

      <div className="field">
        <label htmlFor="chat-fallback" className="field-label">Message de repli</label>
        <textarea
          id="chat-fallback"
          className="field-input"
          value={form.chat_fallback_message ?? ''}
          maxLength={500}
          rows={3}
          placeholder={DEFAULT_FALLBACK}
          onChange={e => setForm(f => ({ ...f, chat_fallback_message: e.target.value }))}
        />
        <p className="field-helper">
          Affiché quand le chatbot ne sait pas répondre. Indiquez vos canaux de contact (e-mail, téléphone, formulaire).
        </p>
      </div>
    </>
  );
}
