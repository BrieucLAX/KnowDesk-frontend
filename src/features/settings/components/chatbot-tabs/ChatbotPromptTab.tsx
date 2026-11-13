import React from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { PromptVariablesPanel } from '../PromptVariablesPanel';
import type { ChatbotTabContext } from './types';
import { Pencil, RotateCcw } from 'lucide-react';
import { Alert } from '../../../../shared/components/ui/Alert';

/**
 * Tab "Prompt système" — éditeur du template Mustache + panneau
 * variables cliquables. Lecture seule par défaut, déverrouillable
 * via le bouton « Modifier ».
 */
export function ChatbotPromptTab({ ctx }: { ctx: ChatbotTabContext }) {
  const {
    promptDraft, setPromptDraft, promptTextareaRef,
    hasCustomPrompt, setHasCustomPrompt,
    editPrompt, setEditPrompt,
    promptBackup, setPromptBackup,
    defaultPrompt,
    insertVariableAtCursor, restorePromptDefault,
  } = ctx;

  return (
    <>
      <p className="settings-section__desc">
        Instructions complètes envoyées à Mistral à chaque message du chatbot.
        La consigne contient des <strong>variables</strong> (par exemple <code className="km-mono">{`{{industry}}`}</code>),
        remplacées par leur valeur au moment de l'envoi. Vous pouvez réorganiser
        ou réécrire la consigne en gardant ces variables : elles suivront vos
        paramètres (tonalité, glossaire…) sans que vous ayez à tout réécrire à chaque
        changement. Pour repartir de la consigne par défaut, cliquez sur « Restaurer la consigne par défaut ».
        {hasCustomPrompt && (
          <span className="chatbot-settings__prompt-active">
            Consigne personnalisée active.
          </span>
        )}
      </p>

      <div className="field">
        <label htmlFor="chat-system-prompt" className="field-label">
          Consigne utilisée par le chatbot
          {!editPrompt && (
            <span className="chatbot-settings__prompt-readonly">
              · lecture seule
            </span>
          )}
        </label>

        {editPrompt && !promptDraft.includes('{{response_modes}}') && (
          <Alert tone="warning" role="alert" className="chatbot-settings__prompt-warning">
            La variable <code className="km-mono">{`{{response_modes}}`}</code> n'est pas dans
            votre consigne. Sans elle, les protections contre le détournement du chatbot et le
            message de repli sont désactivés. Réinsérez-la si vous l'avez supprimée par erreur.
          </Alert>
        )}

        <div className="prompt-editor-grid">
          <textarea
            id="chat-system-prompt"
            ref={promptTextareaRef}
            className={`field-input prompt-editor-grid__textarea chatbot-settings__prompt-textarea ${editPrompt ? 'chatbot-settings__prompt-textarea--editable' : 'chatbot-settings__prompt-textarea--readonly'}`}
            value={promptDraft}
            onChange={e => { setPromptDraft(e.target.value); setHasCustomPrompt(true); }}
            rows={22}
            readOnly={!editPrompt}
            spellCheck={false}
          />
          {editPrompt && (
            <PromptVariablesPanel onInsert={insertVariableAtCursor} />
          )}
        </div>
        <div className="chatbot-settings__prompt-footer">
          <p className="field-helper chatbot-settings__prompt-footer-helper">
            {editPrompt
              ? <>50 caractères minimum. {promptDraft.length} / 8 000.</>
              : <>La consigne est verrouillée pour éviter les modifications par erreur. Cliquez sur « Modifier la consigne » pour la déverrouiller.</>
            }
          </p>
          {!editPrompt ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setPromptBackup({ draft: promptDraft, hadCustom: hasCustomPrompt });
                setEditPrompt(true);
              }}
            >
              <Pencil size={16} />Modifier la consigne
            </Button>
          ) : (
            <div className="chatbot-settings__prompt-actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPromptDraft(promptBackup.draft);
                  setHasCustomPrompt(promptBackup.hadCustom);
                  setEditPrompt(false);
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={restorePromptDefault}
                disabled={promptDraft.trim() === defaultPrompt.trim() && !hasCustomPrompt}
              >
                <RotateCcw size={16} />Restaurer la consigne par défaut
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
