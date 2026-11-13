import React from 'react';
import { Input } from '../../../../shared/components/ui/Input';
import type { ChatbotTabContext } from './types';
import { TriangleAlert } from 'lucide-react';

// Couleur par défaut du widget chatbot, affiché sur le site du client :
// donnée de produit, hors design system de l'app. Gardée volontairement.
const DEFAULT_CHAT_COLOR = '#5B6CFF';

/**
 * Tab "Apparence" — couleur primaire, logo URL, domaines autorisés.
 * Désactivée visuellement quand chat_enabled=false (cf fieldset parent).
 */
export function ChatbotAppearanceTab({ ctx }: { ctx: ChatbotTabContext }) {
  const { form, setForm, domainsDraft, setDomainsDraft } = ctx;
  return (
    <>
      <div className="field">
        <label htmlFor="chat-color" className="field-label">Couleur primaire</label>
        <div className="chatbot-settings__color-row">
          <input
            id="chat-color"
            type="color"
            value={form.chat_primary_color || DEFAULT_CHAT_COLOR}
            onChange={e => setForm(f => ({ ...f, chat_primary_color: e.target.value }))}
            className="chatbot-settings__color-preview"
          />
          <Input
            id="chat-color-hex"
            label="Couleur primaire (code hexadécimal)"
            labelHidden
            value={form.chat_primary_color ?? ''}
            placeholder={DEFAULT_CHAT_COLOR}
            onChange={e => setForm(f => ({ ...f, chat_primary_color: e.target.value }))}
            helperText=""
          />
        </div>
        <p className="field-helper">Couleur du bouton flottant et des bulles de message côté visiteur.</p>
      </div>

      <Input
        id="chat-logo"
        label="Logo (URL)"
        value={form.chat_logo_url ?? ''}
        maxLength={500}
        placeholder="https://votre-site.fr/logo.png"
        onChange={e => setForm(f => ({ ...f, chat_logo_url: e.target.value }))}
        helperText="Image carrée ≤ 64×64 px recommandée. Affichée dans le header du widget."
      />

      <div className="field">
        <label htmlFor="chat-domains" className="field-label icon-label">Domaines autorisés <TriangleAlert size={16} className="chatbot-settings__label-warning" role="img" aria-label="attention" /></label>
        <textarea
          id="chat-domains"
          className="field-input"
          value={domainsDraft}
          onChange={e => setDomainsDraft(e.target.value)}
          rows={4}
          placeholder={'acme.fr\nstaging.acme.fr\nlocalhost'}
        />
        <p className="field-helper">
          Un domaine par ligne (ou séparés par virgule). Le widget ne se charge <strong>que</strong> depuis ces
          domaines — sinon le serveur refuse la requête. Indispensable pour éviter qu'un site tiers détourne votre chatbot.
        </p>
      </div>
    </>
  );
}
