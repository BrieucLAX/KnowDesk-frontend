import './privacy.css';

/**
 * Politique de confidentialité publique de KnowDesk.
 *
 * Accessible sans authentification via `/privacy`. URL requise pour la
 * publication de l'extension Chrome sur le Chrome Web Store (Privacy
 * Practices form) et plus généralement pour le RGPD.
 */
export function PrivacyPage() {
  return (
    <div className="privacy-page">
      <header className="privacy-page__header">
        <h1 className="privacy-page__title">Politique de confidentialité</h1>
        <p className="privacy-page__subtitle">
          Dernière mise à jour : 27 septembre 2026
        </p>
      </header>

      <section className="privacy-page__section">
        <h2>1. Qui sommes-nous</h2>
        <p>
          KnowDesk est un service SaaS de base de connaissance pour équipes
          service client, édité par Brieuc Langlois. L'application est
          accessible sur <strong>app.knowdesk.fr</strong> ainsi que via
          l'extension Chrome « KnowDesk Search ».
        </p>
        <p>
          Pour toute question concernant cette politique, contactez-nous à
          {' '}<a href="mailto:contact@knowdesk.fr">contact@knowdesk.fr</a>.
        </p>
      </section>

      <section className="privacy-page__section">
        <h2>2. Données collectées via l'application web</h2>
        <p>Lors de votre utilisation d'<strong>app.knowdesk.fr</strong>, nous collectons :</p>
        <ul>
          <li><strong>Données de compte</strong> : e-mail, prénom, nom, organisation, rôle.</li>
          <li><strong>Contenu que vous créez</strong> : articles, FAQ, processus guidés, catégories, tags.</li>
          <li><strong>Données d'usage</strong> : recherches effectuées, articles consultés, votes positifs ou négatifs sur les FAQ, ouvertures de l'application. Ces données alimentent les indicateurs internes (Santé de la base, écran Analyse).</li>
          <li><strong>Données techniques</strong> : adresse IP, navigateur et système d'exploitation. L'adresse IP sert à la limitation du nombre de requêtes et à la sécurité ; elle est enregistrée, avec le navigateur, dans le journal d'audit des actions sensibles, conservé 365 jours.</li>
        </ul>
      </section>

      <section className="privacy-page__section">
        <h2>3. Données collectées via l'extension Chrome « KnowDesk Search »</h2>
        <p>
          L'extension Chrome est une <strong>surface de recherche</strong>{' '}
          qui réutilise votre session d'authentification posée par
          app.knowdesk.fr. Elle accède aux données suivantes :
        </p>
        <ul>
          <li>
            <strong>Cookie d'authentification</strong> (<code>access_token</code>) du
            domaine <code>.knowdesk.fr</code>, lu localement via l'API Chrome{' '}
            <code>chrome.cookies.get</code>. Ce cookie reste sur votre machine,
            il n'est ni stocké côté KnowDesk autrement que sous forme de token
            JWT temporaire, ni partagé avec des tiers.
          </li>
          <li>
            <strong>Requêtes de recherche</strong> que vous tapez dans la barre
            de recherche de l'extension, envoyées à api.knowdesk.fr pour
            interroger votre base. Identique à l'usage web.
          </li>
          <li>
            <strong>Événements d'usage</strong> de l'extension (ouverture de la
            popup, recherche, génération de réponse IA, clic sur résultat),
            enregistrés dans la table <code>events</code> de votre
            organisation. Ces événements alimentent l'écran Analyse et nous
            aident à améliorer le produit.
          </li>
        </ul>
        <p>
          L'extension <strong>ne collecte aucune donnée</strong> sur les sites
          que vous visitez, ne lit pas le contenu des pages, n'analyse ni vos
          historiques ni vos onglets. Elle n'a accès qu'aux cookies du domaine{' '}
          <code>.knowdesk.fr</code>.
        </p>
      </section>

      <section className="privacy-page__section">
        <h2>4. Données collectées via le widget chatbot embarquable</h2>
        <p>
          Si vous intégrez le widget de chat KnowDesk sur votre site, les
          conversations sont enregistrées dans votre espace KnowDesk pour audit
          et amélioration continue. Voir le bandeau de transparence affiché à
          l'ouverture du widget côté visiteur. Vous pouvez configurer la durée
          de conservation (30, 60, 90 ou 180 jours) dans les paramètres du chatbot.
        </p>
      </section>

      <section className="privacy-page__section">
        <h2>5. Finalités du traitement</h2>
        <ul>
          <li>Fourniture du service de base de connaissance (création, consultation, recherche, IA).</li>
          <li>Mesure de la santé éditoriale de la base (Santé de la base, écran Analyse), réservée aux administrateurs de l'organisation.</li>
          <li>Sécurité (limitation du nombre de requêtes, journal d'audit des actions sensibles).</li>
          <li>Communication transactionnelle (vérification de l'adresse e-mail, réinitialisation du mot de passe, notifications).</li>
        </ul>
      </section>

      <section className="privacy-page__section">
        <h2>6. Sous-traitants</h2>
        <p>Pour fournir le service, KnowDesk s'appuie sur :</p>
        <ul>
          <li><strong>Railway</strong> (hébergement de l'application, de la base PostgreSQL et de Redis) — région Union européenne.</li>
          <li><strong>Cloudflare R2</strong> (stockage des fichiers) — juridiction Union européenne.</li>
          <li><strong>Mistral AI</strong> (génération de réponses IA et de résumés thématiques) — traitement dans l'Union européenne.</li>
          <li><strong>Meilisearch</strong> (indexation de la recherche), auto-hébergé sur Railway avec l'application.</li>
          <li><strong>Vercel</strong> (hébergement de l'interface web).</li>
          <li><strong>Resend</strong> (envoi d'e-mails transactionnels).</li>
          <li><strong>Sentry</strong> (suivi des erreurs) — données personnelles masquées avant envoi (e-mails, IBAN, cartes, téléphones).</li>
        </ul>
      </section>

      <section className="privacy-page__section">
        <h2>7. Vos droits (RGPD)</h2>
        <p>Vous pouvez à tout moment :</p>
        <ul>
          <li>Accéder à vos données (page « Mon compte »).</li>
          <li>Modifier vos données (page « Mon compte »).</li>
          <li>Demander la suppression de votre compte et des données associées, par e-mail à contact@knowdesk.fr.</li>
          <li>Exporter vos données dans un format réutilisable (sur demande à contact@knowdesk.fr).</li>
          <li>Désinstaller l'extension Chrome à tout moment (les événements d'usage déjà enregistrés restent dans votre espace mais ne sont plus alimentés).</li>
        </ul>
        <p>
          Pour toute réclamation, vous pouvez également saisir la CNIL.
        </p>
      </section>

      <section className="privacy-page__section">
        <h2>8. Conservation des données</h2>
        <ul>
          <li><strong>Compte utilisateur</strong> : conservé tant que le compte est actif.</li>
          <li><strong>Événements d'usage (table events)</strong> : 90 jours, purge automatique.</li>
          <li><strong>Journal d'audit</strong> (dont l'adresse IP et le navigateur) : 365 jours, purge automatique.</li>
          <li><strong>Conversations du chatbot</strong> : 30 à 180 jours, selon le paramètre choisi par un administrateur de votre organisation.</li>
          <li><strong>Tokens d'authentification</strong> : access token 15 min, refresh token 30 jours.</li>
        </ul>
      </section>

      <section className="privacy-page__section">
        <h2>9. Modifications de cette politique</h2>
        <p>
          KnowDesk peut être amené à modifier cette politique. La date de
          dernière mise à jour est affichée en haut de la page. Les
          changements significatifs seront notifiés aux administrateurs des
          organisations par e-mail.
        </p>
      </section>
    </div>
  );
}
