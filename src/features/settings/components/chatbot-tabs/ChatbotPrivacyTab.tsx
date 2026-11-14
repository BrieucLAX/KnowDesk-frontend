import React from 'react';
import { Input } from '../../../../shared/components/ui/Input';
import type { ChatbotTabContext } from './types';

/**
 * Tab "Confidentialité (RGPD)" — disclaimer affiché au 1ᵉʳ ouverture
 * du widget + lien optionnel vers la politique de confidentialité.
 */
export function ChatbotPrivacyTab({ ctx }: { ctx: ChatbotTabContext }) {
  const { form, setForm } = ctx;
  return (
    <>
      <p className="settings-section__desc">
        À la première ouverture du chatbot, KnowDesk affiche au visiteur un écran d'information
        qui rappelle que la conversation est enregistrée. Le visiteur clique sur « J'ai compris » avant
        de commencer. <strong>Cet écran est toujours actif</strong> : c'est une obligation
        de transparence du RGPD, que vous ne pouvez pas désactiver.
      </p>

      <div className="field">
        <label htmlFor="privacy-notice" className="field-label">Texte d'information (facultatif)</label>
        <textarea
          id="privacy-notice"
          className="field-input chatbot-settings__privacy-textarea"
          value={form.chat_privacy_notice ?? ''}
          maxLength={500}
          rows={3}
          placeholder={
            'Pour améliorer notre service, votre conversation est enregistrée et peut être consultée par notre équipe. '
          + 'Vous pouvez supprimer la conversation à tout moment via le bouton ↺.'
          }
          onChange={e => setForm(f => ({ ...f, chat_privacy_notice: e.target.value }))}
        />
        <p className="field-helper">
          Laissez vide pour afficher le texte standard, visible en exemple dans le champ. 500 caractères maximum.
        </p>
      </div>

      <Input
        id="privacy-policy-url"
        label="Lien vers votre politique de confidentialité (facultatif)"
        type="url"
        value={form.chat_privacy_policy_url ?? ''}
        maxLength={500}
        placeholder="https://votre-entreprise.fr/confidentialite"
        onChange={e => setForm(f => ({ ...f, chat_privacy_policy_url: e.target.value }))}
        helperText="Si vous le renseignez, un lien « En savoir plus » s'affiche sous le texte d'information et s'ouvre dans un nouvel onglet. Laissez vide pour ne pas afficher de lien."
      />
    </>
  );
}
