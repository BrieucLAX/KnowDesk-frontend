import React from 'react';
import { ENDPOINTS }     from '../data/endpoints';
import '../apidocs.css';
import { Sidebar }       from './Sidebar';
import { EndpointCard }  from './EndpointCard';
import { GettingStarted } from './GettingStarted';
import { ArrowLeft } from 'lucide-react';

interface EndpointGroup {
  id:       string;
  title:    string;
  filter:   (path: string) => boolean;
}

/** L'ordre est explicite — c'est aussi celui de la sidebar (data/sections.ts). */
const ENDPOINT_GROUPS: EndpointGroup[] = [
  { id: 'categories', title: 'Catégories',       filter: p => p.startsWith('/categories') },
  { id: 'articles',   title: 'Articles',         filter: p => p.startsWith('/articles')   },
  { id: 'trees',      title: 'Processus guidés', filter: p => p.startsWith('/trees')      },
];

export function ApiDocsApp() {
  return (
    <div className="apidoc">
      <header className="apidoc-header">
        <div className="apidoc-header__inner">
          <div className="apidoc-header__brand">
            <span className="login-page__logo-mark apidoc-header__logo">K</span>
            <div>
              <h1 className="apidoc-header__title">KnowDesk API</h1>
              <p className="apidoc-header__subtitle">Documentation de l'API publique v1</p>
            </div>
          </div>
          <a href="/" className="apidoc-header__login icon-label"><ArrowLeft size={16} />Retour à l'application</a>
        </div>
      </header>

      <div className="apidoc-layout">
        <Sidebar />

        <main className="apidoc-main">
          <GettingStarted />

          {ENDPOINT_GROUPS.map(group => (
            <section key={group.id} id={group.id} className="apidoc-section">
              <h2 className="apidoc-section__title">{group.title}</h2>
              {ENDPOINTS.filter(e => group.filter(e.path)).map(e => (
                <EndpointCard key={`${e.method}-${e.path}`} endpoint={e} />
              ))}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
