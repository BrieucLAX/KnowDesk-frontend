import React, { useState } from 'react';
import type { Endpoint, Lang } from '../utils/types';
import { CodeBlock } from './CodeBlock';

// Méthodes HTTP : lecture = succès, création = info, modification = avertissement,
// suppression = danger. Texte du badge en --on-primary (apidocs.css).
const METHOD_COLORS: Record<string, string> = {
  GET:    'var(--success)',
  POST:   'var(--info)',
  PUT:    'var(--warning)',
  PATCH:  'var(--warning)',
  DELETE: 'var(--danger)',
};

const LANG_LABELS: Record<Lang, string> = {
  curl:   'cURL',
  js:     'JavaScript',
  python: 'Python',
};

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [lang, setLang] = useState<Lang>('curl');
  const [open, setOpen] = useState(false);

  return (
    <div className={`apidoc-endpoint ${open ? 'apidoc-endpoint--open' : ''}`}>
      <button
        type="button"
        className="apidoc-endpoint__header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span
          className="apidoc-endpoint__method"
          style={{ background: METHOD_COLORS[endpoint.method] }}
        >
          {endpoint.method}
        </span>
        <code className="apidoc-endpoint__path">{endpoint.path}</code>
        <span className="apidoc-endpoint__title">{endpoint.title}</span>
        <span className="apidoc-endpoint__chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="apidoc-endpoint__body">
          <p className="apidoc-endpoint__desc">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div className="apidoc-params">
              <h4 className="apidoc-params__title">Paramètres</h4>
              <table className="apidoc-params__table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Requis</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.params.map(p => (
                    <tr key={p.name}>
                      <td><code>{p.name}</code></td>
                      <td><span className="apidoc-type">{p.type}</span></td>
                      <td>{p.required ? '✓' : '—'}</td>
                      <td>{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="apidoc-examples">
            <div className="apidoc-examples__tabs" role="tablist">
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={lang === l}
                  className={`apidoc-examples__tab ${lang === l ? 'apidoc-examples__tab--active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            <CodeBlock code={endpoint.examples[lang]} />
          </div>

          <div className="apidoc-response">
            <h4 className="apidoc-response__title">Exemple de réponse</h4>
            <CodeBlock code={endpoint.response} variant="response" />
          </div>
        </div>
      )}
    </div>
  );
}
