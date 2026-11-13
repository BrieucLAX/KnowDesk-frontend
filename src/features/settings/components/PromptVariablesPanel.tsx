import React, { useEffect, useState } from 'react';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';

export interface PromptVariable {
  name:        string;
  description: string;
  example?:    string;
}

interface PromptVariablesPanelProps {
  /** Appelé quand l'admin clique sur une variable. Le parent insère
   *  `{{name}}` à la position du curseur dans le textarea. */
  onInsert: (variableName: string) => void;
}

/**
 * Panneau latéral listant les variables Mustache disponibles dans
 * le template de prompt système. Clic sur une variable → insertion
 * au curseur du textarea (géré par le parent via `onInsert`).
 *
 * La liste vient du backend (`/settings/org/chat/prompt-variables`)
 * pour rester en cohérence avec la source de vérité côté chat.service.
 */
export function PromptVariablesPanel({ onInsert }: PromptVariablesPanelProps) {
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ variables: PromptVariable[] }>('/settings/org/chat/prompt-variables')
      .then(r => { setVariables(r.variables); setLoading(false); })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : 'Les variables n\'ont pas pu être chargées. Rechargez la page.');
        setLoading(false);
      });
  }, []);

  return (
    <aside className="prompt-vars-panel" aria-label="Variables disponibles">
      <header className="prompt-vars-panel__header">
        <h4 className="prompt-vars-panel__title">Variables disponibles</h4>
        <p className="prompt-vars-panel__hint">
          Cliquez sur une variable pour l'insérer dans la consigne. Elle sera
          remplacée par sa valeur au moment de l'envoi à Mistral.
        </p>
      </header>

      {loading && <p className="prompt-vars-panel__loading">Chargement…</p>}
      {error   && <p className="prompt-vars-panel__error">{error}</p>}

      {!loading && !error && (
        <ul className="prompt-vars-panel__list" role="list">
          {variables.map(v => (
            <li key={v.name} className="prompt-vars-panel__item">
              <button
                type="button"
                className="prompt-vars-panel__btn"
                onClick={() => onInsert(v.name)}
                title={v.description}
              >
                <code className="prompt-vars-panel__code">{`{{${v.name}}}`}</code>
              </button>
              <p className="prompt-vars-panel__desc">{v.description}</p>
              {v.example && v.example.length > 0 && v.example.length < 80 && (
                <p className="prompt-vars-panel__example">{v.example}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
