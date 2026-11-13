import React from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import type { ChatbotTabContext } from './types';
import { EyeOff, RotateCw } from 'lucide-react';
import { Alert } from '../../../../shared/components/ui/Alert';

/**
 * Tab "Test & intégrer" — test live du widget sur cette page +
 * snippet d'intégration copiable. Toujours active (pas de fieldset
 * disabled), même si chat_enabled=false (pour pouvoir préparer
 * l'intégration avant l'activation).
 */
export function ChatbotIntegrationTab({ ctx }: { ctx: ChatbotTabContext }) {
  const { form, widgetMounted, mountWidget, unmountWidget, embedSnippet, toast } = ctx;

  return (
    <>
      <h3 className="settings-section__title chatbot-settings__subsection-title">Tester le chatbot sur cette page</h3>
      <p className="settings-section__desc">
        Le widget se charge automatiquement en bas à droite de cette page dès que vous arrivez
        sur la section Chatbot, pour vérifier l'apparence et les réponses sans installer le
        code sur votre site.
      </p>

      <Alert tone="info" role="note" className="chatbot-settings__test-prerequisite">
        <strong>Prérequis :</strong> ajoutez le domaine <code>{typeof window !== 'undefined' ? window.location.host : 'app.knowdesk.fr'}</code> aux domaines autorisés (onglet Apparence). Sans cela, le serveur refuse le chargement et le widget ne s'affiche pas.
      </Alert>
      <div className="chatbot-settings__test-actions">
        <Button
          type="button"
          variant={widgetMounted ? 'ghost' : 'primary'}
          size="sm"
          onClick={widgetMounted ? unmountWidget : () => mountWidget()}
          disabled={!form.chat_enabled}
          title={form.chat_enabled ? '' : 'Activez d\'abord le chatbot dans l\'onglet Activation et messages.'}
        >
          {widgetMounted ? <><EyeOff size={20} />Masquer le widget</> : <><RotateCw size={20} />Recharger le widget</>}
        </Button>
      </div>

      <div className="settings-section__header chatbot-settings__subsection">
        <div>
          <h3 className="settings-section__title chatbot-settings__subsection-title">Intégrer le widget sur votre site</h3>
          <p className="settings-section__desc">
            Copiez le code ci-dessous et collez-le juste avant la balise de fermeture <code>&lt;/body&gt;</code>{' '}
            de votre site. Le widget se charge automatiquement et tient compte de tous les paramètres définis ici.
          </p>
        </div>
      </div>
      <pre className="chatbot-settings__embed-snippet">
        <code>{embedSnippet}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="chatbot-settings__embed-copy"
        onClick={() => {
          navigator.clipboard?.writeText(embedSnippet).then(
            () => toast.success('Code copié.'),
            () => toast.error('Le code n\'a pas pu être copié. Sélectionnez-le et copiez-le manuellement.'),
          );
        }}
      >
        Copier le code
      </Button>
    </>
  );
}
