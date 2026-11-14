import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton }   from '../../../shared/components/ui/Skeleton';
import { Modal }      from '../../../shared/components/ui/Modal';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Pager }      from '../../../shared/components/ui/Pager';
import { PageHeader }  from '../../../shared/components/layout/PageHeader';
import { PageToolbar } from '../../../shared/components/layout/PageToolbar';
import { useToast } from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import { auditApi, type AuditAction, type AuditLogItem } from '../api/auditApi';
import '../audit.css';
import { ChevronDown, ChevronRight } from 'lucide-react';

const PER_PAGE = 30;

// Labels lisibles pour les actions, regroupés par domaine.
const ACTION_LABEL: Record<AuditAction, string> = {
  'article.published':        'Article — publié',
  'article.deleted':          'Article — supprimé',
  'article.restored':         'Article — restauré',
  'article.archived':         'Article — archivé',
  'member.invited':           'Membre — invité',
  'member.role_changed':      'Membre — rôle modifié',
  'member.disabled':          'Membre — désactivé',
  'member.reactivated':       'Membre — réactivé',
  'org.settings_updated':     'Organisation — paramètres modifiés',
  'org.general_updated':      'Organisation — informations modifiées',
  'org.chat_settings_updated':'Organisation — chatbot modifié',
  'org.chat_model.changed':   'Organisation — modèle du chatbot modifié',
  'org.ai_settings_updated':  'Organisation — réglages de l\'IA modifiés',
  'account.password_changed': 'Compte — mot de passe modifié',
  'account.email_change_requested': 'Compte — changement d\'e-mail demandé',
  'account.email_change_confirmed': 'Compte — changement d\'e-mail confirmé',
  'apikey.created':           'Clé API — créée',
  'apikey.revoked':           'Clé API — révoquée',
  'tag.deleted':              'Tag — supprimé',
  'synonym.deleted':          'Synonyme — supprimé',
  'faq.created':              'FAQ — créée',
  'faq.updated':              'FAQ — modifiée',
  'faq.deleted':              'FAQ — supprimée',
  'tree.created':             'Processus — créé',
  'tree.deleted':              'Processus — supprimé',
  'tree.archived':             'Processus — archivé',
  'category.created':         'Catégorie — créée',
  'category.deleted':         'Catégorie — supprimée',
  'category.moved':           'Catégorie — modifiée',
  'learning.path.created':    'Parcours — créé',
  'learning.path.updated':    'Parcours — modifié',
  'learning.path.deleted':    'Parcours — supprimé',
  'learning.module.created':  'Module — créé',
  'learning.module.updated':  'Module — modifié',
  'learning.module.deleted':  'Module — supprimé',
  'learning.assigned':        'Parcours — assigné à un conseiller',
  'learning.unassigned':      'Parcours — retiré à un conseiller',
  'superadmin.impersonate.start': 'Superadmin — accès à l\'organisation',
  'superadmin.impersonate.stop':  'Superadmin — fin de l\'accès à l\'organisation',
};

const ACTION_OPTIONS: AuditAction[] = Object.keys(ACTION_LABEL) as AuditAction[];

function userLabel(item: AuditLogItem): string {
  // Impersonation : action exécutée par un superadmin en peau d'un admin.
  // user_id = admin (cohérent DB), metadata.impersonatedByEmail = superadmin.
  const meta = (item.metadata ?? {}) as {
    superadminEmail?:    string;
    impersonatedByEmail?: string;
  };

  if (!item.user) {
    // user_id NULL → action superadmin pure (ex: impersonate.start).
    const email = meta.superadminEmail;
    if (email) return `${email} (superadmin)`;
    return '—';
  }
  const { firstName, lastName, email } = item.user;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const base = fullName.length > 0 ? `${fullName} (${email})` : email;

  if (meta.impersonatedByEmail) {
    return `${base} — via ${meta.impersonatedByEmail} (superadmin)`;
  }
  return base;
}

interface AuditPageProps {
  /** Si true, on omet le PageHeader (utilisé quand AuditPage est rendu
   *  comme section embarquée dans /settings, qui pose déjà son propre
   *  header en haut). */
  embed?: boolean;
}

export function AuditPage({ embed = false }: AuditPageProps = {}) {
  const toast = useToast();
  const [items,    setItems]    = useState<AuditLogItem[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [action,   setAction]   = useState<AuditAction | ''>('');
  const [since,    setSince]    = useState('');
  const [until,    setUntil]    = useState('');
  const [page,     setPage]     = useState(1);
  const [detail,   setDetail]   = useState<AuditLogItem | null>(null);

  useEffect(() => {
    setLoading(true);
    auditApi.list({
      action:  action || undefined,
      since:   since  || undefined,
      until:   until  || undefined,
      page,
      perPage: PER_PAGE,
    })
      .then(res => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(err => toast.error(err?.message ?? 'Impossible de charger le journal d\'activité. Rechargez la page.'))
      .finally(() => setLoading(false));
  }, [action, since, until, page, toast]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);

  const resetFilters = () => {
    setAction('');
    setSince('');
    setUntil('');
    setPage(1);
  };

  return (
    <section className="audit-page">
      {!embed && (
        <PageHeader
          title="Journal d'activité"
          subtitle={`Trace des actions sensibles effectuées dans votre organisation : modifications de paramètres, gestion des membres, suppressions, accès du superadmin. Le journal est conservé 1 an.`}
        />
      )}

      <PageToolbar
        left={(
          <>
            <select
              className="audit-page__filter-select"
              value={action}
              onChange={e => { setAction(e.target.value as AuditAction | ''); setPage(1); }}
              aria-label="Filtrer par action"
            >
              <option value="">Toutes les actions</option>
              {ACTION_OPTIONS.map(a => (
                <option key={a} value={a}>{ACTION_LABEL[a]}</option>
              ))}
            </select>

            <label className="audit-page__filter-date">
              <span>Depuis</span>
              <input
                type="date"
                value={since}
                onChange={e => { setSince(e.target.value); setPage(1); }}
              />
            </label>
            <label className="audit-page__filter-date">
              <span>Jusqu'à</span>
              <input
                type="date"
                value={until}
                onChange={e => { setUntil(e.target.value); setPage(1); }}
              />
            </label>

            {(action || since || until) && (
              <button
                type="button"
                className="audit-page__filter-reset"
                onClick={resetFilters}
              >
                Réinitialiser les filtres
              </button>
            )}
          </>
        )}
        right={<span className="audit-page__count">{total} entrée{total > 1 ? 's' : ''}</span>}
      />

      {loading ? (
        <div className="audit-page__skeletons">
          <Skeleton className="audit-page__skeleton-row" />
          <Skeleton className="audit-page__skeleton-row" />
          <Skeleton className="audit-page__skeleton-row" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune entrée pour ces filtres"
          description={(action || since || until)
            ? 'Élargissez la période ou réinitialisez les filtres.'
            : 'Les actions sensibles apparaîtront ici dès qu\'elles auront été effectuées.'}
        />
      ) : (
        <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Quand</th>
              <th>Qui</th>
              <th>Action</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td title={item.createdAt}>{formatRelative(item.createdAt)}</td>
                <td>{userLabel(item)}</td>
                <td><span className="audit-table__action">{ACTION_LABEL[item.action] ?? item.action}</span></td>
                <td>
                  <button
                    type="button"
                    className="audit-table__detail-btn"
                    onClick={() => setDetail(item)}
                  >
                    Voir le détail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {detail && (
        <Modal
          title={ACTION_LABEL[detail.action] ?? detail.action}
          size="md"
          onClose={() => setDetail(null)}
        >
          <dl className="audit-detail">
            <div>
              <dt>Quand</dt>
              <dd>{new Date(detail.createdAt).toLocaleString('fr-FR')}</dd>
            </div>
            <div>
              <dt>Qui</dt>
              <dd>{userLabel(detail)}</dd>
            </div>
            {detail.resourceId && (
              <div>
                <dt>Ressource</dt>
                <dd>
                  {(() => {
                    const t = (detail.metadata as { resourceTitle?: unknown } | null)?.resourceTitle;
                    if (typeof t === 'string' && t.trim()) {
                      return (
                        <>
                          <div className="audit-detail__resource-title">{t}</div>
                          <code className="audit-detail__resource-id">{detail.resourceId}</code>
                        </>
                      );
                    }
                    return <code>{detail.resourceId}</code>;
                  })()}
                </dd>
              </div>
            )}
            {detail.metadata && Object.keys(detail.metadata).length > 0 && (
              <MetadataView meta={detail.metadata as Record<string, unknown>} />
            )}
          </dl>
        </Modal>
      )}
    </section>
  );
}

// ── Vue lisible du metadata d'un audit log ────────────────────────
// Remplace le JSON.stringify brut par une liste clés-valeurs avec labels
// FR. Les champs techniques (IP, userAgent) sont regroupés derrière un
// disclosure, et l'on garde un fallback « JSON brut » pour debug.

const META_LABELS: Record<string, string> = {
  to:                   'Nouvelle valeur',
  from:                 'Ancienne valeur',
  field:                'Champ modifié',
  fields:               'Champs modifiés',
  email:                'E-mail',
  role:                 'Rôle',
  name:                 'Nom',
  title:                'Titre',
  visibility:           'Visibilité',
  status:               'Statut',
  reason:               'Motif',
  count:                'Nombre',
  // resourceTitle est intercepté en amont et remonté dans la section
  // « Ressource » (cf MetadataView). Pas affiché en double dans metadata.
  resourceTitle:        '',
  impersonatedByEmail:  'Superadmin',
};

// Clés techniques rangées derrière un disclosure. `impersonatedBy` (UUID)
// rejoint ce groupe car redondant avec impersonatedByEmail affiché en clair.
const META_TECHNICAL_KEYS = new Set(['ip', 'userAgent', 'orgId', 'sessionId', 'impersonatedBy']);

// Labels FR pour les noms de champs internes (utilisés dans metadata.fields
// pour les actions org.*_settings_updated). Le bloc « Champs modifiés »
// renvoie des noms anglais issus du backend ; on les rend lisibles ici.
const FIELD_LABELS: Record<string, string> = {
  // Chatbot
  enabled:                'Activation',
  welcomeMessage:         'Message d\'accueil',
  fallbackMessage:        'Message de repli',
  primaryColor:           'Couleur principale',
  logoUrl:                'Logo',
  allowedDomains:         'Domaines autorisés',
  handoffMode:            'Mode de transmission',
  handoffWebhookUrl:      'Webhook de transfert',
  handoffEmail:           'E-mail de transfert',
  systemPrompt:           'Consigne système',
  privacyNotice:          'Mention RGPD',
  privacyPolicyUrl:       'URL de la politique de confidentialité',
  retentionDays:          'Durée de conservation des conversations',
  // Org général
  name:                   'Nom de l\'organisation',
  logoUrl_org:            'Logo',
  timezone:               'Fuseau horaire',
  // IA
  industry:               'Secteur d\'activité',
  ai_tone:                'Tonalité IA',
  ai_address_form:        'Forme d\'adresse',
  ai_glossary:            'Glossaire IA',
  ai_answer_enabled:      'Réponse IA activée',
  // Modèle chatbot
  chat_model:             'Modèle du chatbot',
};

function renderFieldName(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function MetadataView({ meta }: { meta: Record<string, unknown> }) {
  const [showTech, setShowTech] = React.useState(false);
  const [showRaw,  setShowRaw]  = React.useState(false);

  // resourceTitle est déjà affiché dans la section « Ressource » au-dessus
  // (cf bloc detail.resourceId) — on ne le re-affiche pas en doublon ici.
  const entries = Object.entries(meta).filter(([k]) => k !== 'resourceTitle');
  const business  = entries.filter(([k]) => !META_TECHNICAL_KEYS.has(k));
  const technical = entries.filter(([k]) =>  META_TECHNICAL_KEYS.has(k));

  return (
    <>
      {business.length > 0 && (
        <>
          {business.map(([key, value]) => (
            <div key={key}>
              <dt>{META_LABELS[key] ?? key}</dt>
              <dd>{renderMetaValue(value, key)}</dd>
            </div>
          ))}
        </>
      )}

      {technical.length > 0 && (
        <div>
          <dt>
            <button
              type="button"
              className="audit-detail__tech-toggle icon-label"
              onClick={() => setShowTech(s => !s)}
              aria-expanded={showTech}
            >
              {showTech ? <ChevronDown size={16} /> : <ChevronRight size={16} />}Détails techniques ({technical.length})
            </button>
          </dt>
          {showTech && (
            <dd>
              <dl className="audit-detail__tech">
                {technical.map(([key, value]) => (
                  <div key={key}>
                    <dt>{META_LABELS[key] ?? key}</dt>
                    <dd>{renderMetaValue(value, key)}</dd>
                  </div>
                ))}
              </dl>
            </dd>
          )}
        </div>
      )}

      <div>
        <dt>
          <button
            type="button"
            className="audit-detail__tech-toggle icon-label"
            onClick={() => setShowRaw(s => !s)}
            aria-expanded={showRaw}
          >
            {showRaw ? <ChevronDown size={16} /> : <ChevronRight size={16} />}JSON brut
          </button>
        </dt>
        {showRaw && (
          <dd>
            <pre className="audit-detail__json">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </dd>
        )}
      </div>
    </>
  );
}

function renderMetaValue(v: unknown, key?: string): React.ReactNode {
  if (v === null || v === undefined) return <em>—</em>;
  if (typeof v === 'string') {
    // Tronque les longues chaînes (userAgent etc.) avec preview + title
    if (v.length > 120) {
      return <span title={v}>{v.slice(0, 117)}…</span>;
    }
    return v;
  }
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (typeof v === 'number')  return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return <em>(vide)</em>;
    // Si la liste correspond à des noms de champs (clé "fields" / "field"),
    // on remplace chaque nom interne par son libellé FR.
    if ((key === 'fields' || key === 'field') && v.every(x => typeof x === 'string')) {
      return (v as string[]).map(renderFieldName).join(', ');
    }
    return v.map(x => String(x)).join(', ');
  }
  // Objet imbriqué : fallback JSON compact
  return <code>{JSON.stringify(v)}</code>;
}
