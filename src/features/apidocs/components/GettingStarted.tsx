import React from 'react';
import { CodeBlock } from './CodeBlock';
import { BASE_URL } from '../utils/makeExamples';
import { Alert } from '../../../shared/components/ui/Alert';

const AUTH_EXAMPLE = `curl ${BASE_URL}/articles \\
  -H "X-API-Key: kd_live_votre_cle_api"`;

const PAGINATION_EXAMPLE = `GET /articles?page=2&perPage=50`;

interface ErrorRow {
  code:        number;
  meaning:     string;
}

const ERROR_TABLE: ErrorRow[] = [
  { code: 200, meaning: 'Succès' },
  { code: 401, meaning: 'Clé API manquante ou invalide' },
  { code: 403, meaning: 'Organisation désactivée' },
  { code: 404, meaning: 'Ressource introuvable' },
  { code: 409, meaning: 'Conflit (par exemple, ressource déjà existante)' },
  { code: 422, meaning: 'Données invalides (validation)' },
  { code: 429, meaning: 'Trop de requêtes (limite de débit atteinte)' },
  { code: 500, meaning: 'Erreur serveur' },
];

export function GettingStarted() {
  return (
    <>
      {/* Authentification */}
      <section id="auth" className="apidoc-section">
        <h2 className="apidoc-section__title">Authentification</h2>
        <p className="apidoc-section__text">
          Toutes les requêtes doivent inclure votre clé API dans le header <code>X-API-Key</code>.
          Vous pouvez générer une clé dans KnowDesk, rubrique <strong>API</strong> des paramètres.
        </p>
        <CodeBlock code={AUTH_EXAMPLE} />
        <Alert tone="warning" role="note" className="apidoc-callout">
          Ne partagez jamais votre clé API. Si elle est compromise, révoquez-la immédiatement
          dans la rubrique API des paramètres.
        </Alert>
      </section>

      {/* Erreurs */}
      <section id="errors" className="apidoc-section">
        <h2 className="apidoc-section__title">Erreurs</h2>
        <p className="apidoc-section__text">
          L'API retourne toujours un objet JSON avec les champs <code>data</code> et <code>error</code>.
          En cas d'erreur, <code>data</code> est <code>null</code> et <code>error</code> contient le message.
        </p>
        <table className="apidoc-params__table">
          <thead><tr><th>Code HTTP</th><th>Signification</th></tr></thead>
          <tbody>
            {ERROR_TABLE.map(row => (
              <tr key={row.code}>
                <td><code>{row.code}</code></td>
                <td>{row.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      <section id="pagination" className="apidoc-section">
        <h2 className="apidoc-section__title">Pagination</h2>
        <p className="apidoc-section__text">
          Les endpoints de liste acceptent les paramètres <code>page</code> et <code>perPage</code>.
          La valeur maximale de <code>perPage</code> est <code>100</code>.
        </p>
        <CodeBlock code={PAGINATION_EXAMPLE} hideCopy />
      </section>

      {/* Scope de l'API publique */}
      <section id="scope" className="apidoc-section">
        <h2 className="apidoc-section__title">Ce que l'API publique permet (et ne permet pas)</h2>
        <p className="apidoc-section__text">
          Cette API est <strong>en lecture seule</strong>. Elle expose le contenu publié de votre
          base (catégories, articles, FAQ, processus guidés) pour vous permettre de l'intégrer
          dans vos propres outils : site public, FAQ intégrée, chatbot maison, etc.
        </p>
        <ul className="apidoc-section__text" style={{ paddingLeft: 20 }}>
          <li><strong>Création et modification</strong> du contenu : elles passent par l'interface KnowDesk
            (ou par l'API d'administration interne, réservée aux membres connectés).</li>
          <li><strong>Réponse IA (Mistral)</strong> : disponible uniquement <em>dans</em> KnowDesk,{' '}
            pour les conseillers connectés. Elle n'est pas exposée par l'API publique, pour des
            raisons de coût et de sécurité (chaque requête consomme des tokens facturés par le modèle d'IA).</li>
          <li><strong>Chatbot à intégrer à votre site</strong> : pour offrir une expérience IA à
            vos clients directement sur votre site web, KnowDesk fournit un widget JS
            embarquable (vanilla JS et Web Component, environ 12 Ko, isolé par un Shadow DOM).
            Vous l'activez et le configurez dans KnowDesk, rubrique <strong>Chatbot public</strong> des paramètres ;
            l'intégration se fait avec une simple balise{' '}
            <code>&lt;script src="/chat.js" data-org="…"&gt;</code>{' '}
            à coller sur votre site. Le chatbot fonctionne sur un canal séparé
            (<code>/public/v1/chat/*</code>) avec son propre système d'authentification (liste
            de domaines autorisés via CORS dynamique, sans clé API à manipuler).
            Capacités : <strong>RAG multi-tour</strong> sur le contenu marqué Public,{' '}
            <strong>conservation côté serveur</strong> des conversations,{' '}
            <strong>questions de clarification</strong> automatiques,{' '}
            <strong>réponses rapides</strong> contextuelles,{' '}
            <strong>votes positifs ou négatifs</strong> sur chaque réponse,{' '}
            <strong>passage structuré à un humain</strong> vers votre
            équipe (webhook JSON ou e-mail avec la conversation). Endpoints internes du widget :{' '}
            <code>POST /message</code> (streaming SSE), <code>GET /conversation/:id</code>,{' '}
            <code>POST /conversation/:id/feedback</code>, <code>POST /conversation/:id/handoff</code>,{' '}
            <code>DELETE /conversation/:id</code> (RGPD). Le guide complet se trouve dans le centre
            d'aide, articles <em>Chatbot à intégrer à votre site web</em> et <em>Passage à un humain</em>.</li>
          <li><strong>Hiérarchie des catégories</strong> : la liste retournée par <code>GET /categories</code>{' '}
            est plate ; chaque catégorie indique son <code>parent_id</code> pour vous permettre
            de reconstruire l'arborescence côté client.</li>
        </ul>
      </section>
    </>
  );
}
