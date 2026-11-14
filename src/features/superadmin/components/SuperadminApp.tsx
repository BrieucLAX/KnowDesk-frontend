import React, { useState } from 'react';
import { useSuperadmin }   from '../hooks/useSuperadmin';
import '../superadmin.css';
import { Button }          from '../../../shared/components/ui/Button';
import { ConfirmDialog }   from '../../../shared/components/ui/ConfirmDialog';
import { formatRelative }  from '../../../shared/lib/formatDate';
import { CreateTestOrgModal } from './CreateTestOrgModal';
import { TestDataModal }     from './TestDataModal';
import { endTestDescription, orgStatus } from '../lib/testOrgStatus';
import { RotateCw } from 'lucide-react';
import { StatusIcon } from '../../../shared/components/ui/StatusIcon';
import { Badge } from '../../../shared/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable';
import { ActionMenu } from '../../../shared/components/ui/ActionMenu';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';

/** Organisation de test : créée par la route superadmin, module onboarding seul. */
const isTestOrg = (org: { enabled_modules?: string[] }) => org.enabled_modules?.includes('onboarding') ?? false;

const SA_TONE = { active: 'success', disabled: 'danger', purged: 'neutral' } as const;

export function SuperadminApp() {
  const {
    session, orgs, loading, error, loginErr,
    login, logout, disableOrg, enableOrg, impersonate, reindexSearch, recomputeResolutions,
    createTestOrg, endTest, listOnboardingProjects, purgeTestData,
  } = useSuperadmin();
  // Sous 1024 px, le tableau des organisations (8 colonnes) ne tient plus :
  // une carte par organisation, actions dans l'ActionMenu (lot 6b).
  const compactList = useMediaQuery('(max-width: 1023.98px)');

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [confirm,      setConfirm]      = useState<{ orgId: string; action: 'disable' | 'enable' } | null>(null);
  const [reindexState, setReindexState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [reindexInfo,  setReindexInfo]  = useState<string>('');
  // Phase D — recalcul rétroactif des statuts conversation
  const [recomputeState, setRecomputeState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [recomputeInfo,  setRecomputeInfo]  = useState<string>('');
  const [recomputeConfirm, setRecomputeConfirm] = useState(false);
  // Organisations de test (prérequis 17, « Terminer le test »)
  const [creatingTestOrg, setCreatingTestOrg] = useState(false);
  const [endTestTarget,   setEndTestTarget]   = useState<{ id: string; name: string } | null>(null);
  const [endTestLoading,  setEndTestLoading]  = useState(false);
  const [endTestError,    setEndTestError]    = useState('');
  // Étape D — données de test d'une organisation, et leur purge
  const [testDataOrg,     setTestDataOrg]     = useState<{ id: string; name: string } | null>(null);

  const confirmEndTest = async () => {
    if (!endTestTarget) return;
    setEndTestLoading(true);
    setEndTestError('');
    try {
      await endTest(endTestTarget.id);
    } catch (err) {
      setEndTestError(err instanceof Error ? err.message : 'Le test n\'a pas pu être terminé. Réessayez.');
    } finally {
      setEndTestLoading(false);
      setEndTestTarget(null);
    }
  };

  const runReindex = async () => {
    setReindexState('running');
    setReindexInfo('');
    try {
      const r = await reindexSearch();
      const total = r.articles + r.trees + r.faqs;
      setReindexState('done');
      setReindexInfo(`Meilisearch réindexé : ${r.articles} article${r.articles !== 1 ? 's' : ''}, ${r.trees} processus, ${r.faqs} FAQ (${total} documents au total).`);
      setTimeout(() => setReindexState('idle'), 8000);
    } catch (err) {
      setReindexState('error');
      setReindexInfo(err instanceof Error ? err.message : 'La réindexation a échoué. Réessayez dans quelques instants.');
    }
  };

  /**
   * Phase D — rejoue le calcul de statut sur l'historique. Le backend
   * traite par batch de 200 (limite côté Zod). Si plus de 200 conversations
   * sont à recalculer, on relance jusqu'à épuisement (ce qui peut arriver
   * sur de grosses orgs). Mistral est appelé ~80 tokens/conv.
   */
  const runRecompute = async () => {
    setRecomputeConfirm(false);
    setRecomputeState('running');
    setRecomputeInfo('Recalcul en cours. Cela peut prendre quelques minutes pour un historique important.');
    try {
      let totalProcessed = 0;
      let totalFailed    = 0;
      let pass           = 0;
      // Boucle jusqu'à ce qu'un batch retourne 0 conv à traiter, max 20 passes
      // (= 4000 conversations) pour éviter une boucle infinie en cas d'anomalie.
      while (pass < 20) {
        pass++;
        const r = await recomputeResolutions();
        totalProcessed += r.processed;
        totalFailed    += r.failed;
        if (r.total === 0) break;     // plus rien à recalculer
      }
      setRecomputeState('done');
      setRecomputeInfo(`Statuts recalculés : ${totalProcessed} conversation${totalProcessed !== 1 ? 's' : ''} traitée${totalProcessed !== 1 ? 's' : ''}${totalFailed > 0 ? `, ${totalFailed} échec${totalFailed !== 1 ? 's' : ''}` : ''}.`);
      setTimeout(() => setRecomputeState('idle'), 12000);
    } catch (err) {
      setRecomputeState('error');
      setRecomputeInfo(err instanceof Error ? err.message : 'Le recalcul a échoué. Relancez-le pour traiter les conversations restantes.');
    }
  };

  // ── Login ─────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="sa-login">
        <div className="sa-login__box">
          <div className="sa-login__logo">
            <span className="login-page__logo-mark">K</span>
          </div>
          <h1 className="sa-login__title">Super Admin</h1>
          <p className="sa-login__subtitle">Accès réservé à l'équipe KnowDesk.</p>
          {loginErr && <div className="sa-login__error" role="alert">{loginErr}</div>}
          <form className="sa-login__form" onSubmit={e => { e.preventDefault(); login(email, password); }}>
            <div className="field">
              <label htmlFor="sa-email" className="field-label">Adresse e-mail</label>
              <input
                id="sa-email" type="email" className="field-input"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="sa-password" className="field-label">Mot de passe</label>
              <input
                id="sa-password" type="password" className="field-input"
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────

  type Org = typeof orgs[number];
  /** Actions d'une organisation : boutons sur bureau, ActionMenu dans les cartes mobiles. */
  const orgActions = (org: Org): { label: string; variant: 'ghost' | 'primary' | 'danger'; onClick: () => void }[] => {
    const actions: { label: string; variant: 'ghost' | 'primary' | 'danger'; onClick: () => void }[] = [];
    // Test terminé : réactivation refusée par le back (TEST_ENDED).
    if (!org.test_ended_at) {
      if (org.disabled_at) {
        actions.push({ label: 'Réactiver', variant: 'ghost', onClick: () => setConfirm({ orgId: org.id, action: 'enable' }) });
      } else {
        actions.push({ label: 'Désactiver', variant: 'ghost', onClick: () => setConfirm({ orgId: org.id, action: 'disable' }) });
        actions.push({ label: 'Accéder', variant: 'primary', onClick: () => impersonate(org.id, org.name) });
      }
    }
    if (isTestOrg(org) && !org.test_ended_at) {
      actions.push({ label: 'Terminer le test', variant: 'danger', onClick: () => { setEndTestError(''); setEndTestTarget({ id: org.id, name: org.name }); } });
    }
    // Avant comme après la fin du test : suppression immédiate sur demande.
    if (isTestOrg(org)) {
      actions.push({ label: 'Données de test', variant: 'ghost', onClick: () => setTestDataOrg({ id: org.id, name: org.name }) });
    }
    return actions;
  };

  const renderOrgName = (org: Org) => (
    <>
      <div className="sa-org-name">
        {org.name}
        {isTestOrg(org) && <span className="sa-badge-test">Test</span>}
      </div>
      <div className="sa-org-slug">{org.slug}</div>
    </>
  );
  const renderStatus = (org: Org) => {
    const status = orgStatus(org);
    return <Badge tone={SA_TONE[status.tone]} title={status.title}>{status.label}</Badge>;
  };

  /** Sous 1024 px : une carte par organisation (DataTable), actions dans l'ActionMenu. */
  const mobileColumns: DataTableColumn<Org>[] = [
    { key: 'name',     label: 'Organisation', render: renderOrgName },
    { key: 'plan',     label: 'Plan', render: org => <span className={`sa-plan sa-plan--${org.plan}`}>{org.plan}</span> },
    { key: 'active',   label: 'Membres actifs', render: org => org.stats.membersActive },
    { key: 'disabled', label: 'Membres désactivés', render: org => org.stats.membersDisabled },
    { key: 'articles', label: 'Articles', render: org => org.stats.articlesCount },
    { key: 'created',  label: 'Créée', render: org => formatRelative(org.created_at) },
    { key: 'status',   label: 'Statut', render: renderStatus },
  ];

  const totalOrgs     = orgs.length;
  const activeOrgs    = orgs.filter(o => !o.disabled_at).length;
  const totalMembers  = orgs.reduce((sum, o) => sum + o.stats.membersActive, 0);
  const totalArticles = orgs.reduce((sum, o) => sum + o.stats.articlesCount, 0);

  return (
    <div className="sa-app">
      {/* Header */}
      <header className="sa-header">
        <div className="sa-header__brand">
          <span className="login-page__logo-mark sa-header__logo">K</span>
          <span className="sa-header__title">KnowDesk Admin</span>
        </div>
        <div className="sa-header__user">
          <span className="sa-header__email">{session.superadmin.email}</span>
          <Button
            variant="ghost"
            size="sm"
            loading={reindexState === 'running'}
            disabled={reindexState === 'running'}
            onClick={runReindex}
            title="Réindexer Meilisearch (toutes les organisations)"
          >
            <RotateCw size={16} />Réindexer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={recomputeState === 'running'}
            disabled={recomputeState === 'running'}
            onClick={() => setRecomputeConfirm(true)}
            title="Rejoue resolveStatus et le juge LLM sur les conversations sans resolution_reason"
          >
            <RotateCw size={16} />Recalculer les statuts
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>Déconnexion</Button>
        </div>
        {reindexInfo && (
          <div className={`sa-banner sa-banner--${reindexState === 'error' ? 'danger' : 'success'}`} role="status">
            <StatusIcon tone={reindexState === 'error' ? 'danger' : 'success'} className="sa-banner__icon" />
            {reindexInfo}
          </div>
        )}
        {recomputeInfo && (
          <div
            className={`sa-banner sa-banner--${recomputeState === 'error' ? 'danger' : recomputeState === 'running' ? 'info' : 'success'}`}
            role="status"
          >
            <StatusIcon
              tone={recomputeState === 'error' ? 'danger' : recomputeState === 'running' ? 'info' : 'success'}
              className="sa-banner__icon"
            />
            {recomputeInfo}
          </div>
        )}
      </header>

      <main className="sa-main">
        {/* Métriques globales */}
        <div className="sa-metrics">
          {[
            { label: 'Organisations actives', value: activeOrgs },
            { label: 'Organisations au total', value: totalOrgs },
            { label: 'Membres actifs',   value: totalMembers },
            { label: 'Articles publiés', value: totalArticles },
          ].map(m => (
            <div key={m.label} className="sa-metric">
              <span className="sa-metric__value">{m.value}</span>
              <span className="sa-metric__label">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Table des organisations */}
        <div className="sa-section">
          <div className="sa-section__header">
            <h2 className="sa-section__title">Organisations</h2>
            <Button variant="primary" size="sm" onClick={() => setCreatingTestOrg(true)}>
              Nouvelle organisation de test
            </Button>
          </div>

          {error && <div className="sa-error" role="alert">{error}</div>}
          {endTestError && <div className="sa-error" role="alert">{endTestError}</div>}

          {loading ? (
            <p className="sa-loading">Chargement…</p>
          ) : compactList ? (
            <div className="sa-cards">
              <DataTable<Org>
                columns={mobileColumns}
                data={orgs}
                rowKey={org => org.id}
                mobile={{ primary: 'name', always: true }}
                rowClassName={org => org.disabled_at ? 'sa-card--disabled' : undefined}
                rowActions={org => {
                  const actions = orgActions(org);
                  return actions.length === 0 ? null : (
                    <ActionMenu
                      ariaLabel={`Actions pour ${org.name}`}
                      items={actions.map(a => ({ label: a.label, onClick: a.onClick, variant: a.variant === 'danger' ? 'danger' : 'default' }))}
                    />
                  );
                }}
              />
            </div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Plan</th>
                    <th>Membres actifs</th>
                    <th>Membres désactivés</th>
                    <th>Articles</th>
                    <th>Créée</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(org => (
                    <tr key={org.id} className={org.disabled_at ? 'sa-table__row--disabled' : ''}>
                      <td>{renderOrgName(org)}</td>
                      <td><span className={`sa-plan sa-plan--${org.plan}`}>{org.plan}</span></td>
                      <td>{org.stats.membersActive}</td>
                      <td>{org.stats.membersDisabled}</td>
                      <td>{org.stats.articlesCount}</td>
                      <td>{formatRelative(org.created_at)}</td>
                      <td>{renderStatus(org)}</td>
                      <td>
                        <div className="sa-org__actions">
                          {orgActions(org).map(a => (
                            <Button key={a.label} variant={a.variant} size="sm" onClick={a.onClick}>
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de confirmation */}
      {confirm && (
        <ConfirmDialog
          title={confirm.action === 'disable' ? 'Désactiver cette organisation ?' : 'Réactiver cette organisation ?'}
          description={
            confirm.action === 'disable'
              ? 'Ses membres ne pourront plus se connecter. Vous pourrez la réactiver ensuite.'
              : 'Ses membres pourront de nouveau se connecter.'
          }
          confirmLabel={confirm.action === 'disable' ? 'Désactiver l\'organisation' : 'Réactiver l\'organisation'}
          variant={confirm.action === 'disable' ? 'danger' : 'primary'}
          onConfirm={async () => {
            if (confirm.action === 'disable') await disableOrg(confirm.orgId);
            else await enableOrg(confirm.orgId);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {creatingTestOrg && (
        <CreateTestOrgModal onCreate={createTestOrg} onClose={() => setCreatingTestOrg(false)} />
      )}

      {endTestTarget && (
        <ConfirmDialog
          title={`Terminer le test de « ${endTestTarget.name} » ?`}
          description={endTestDescription(new Date())}
          confirmLabel="Terminer le test"
          variant="danger"
          loading={endTestLoading}
          onConfirm={confirmEndTest}
          onCancel={() => setEndTestTarget(null)}
        />
      )}

      {testDataOrg && (
        <TestDataModal
          org={testDataOrg}
          listProjects={listOnboardingProjects}
          purge={purgeTestData}
          onClose={() => setTestDataOrg(null)}
        />
      )}

      {/* Phase D — confirmation recalcul rétroactif */}
      {recomputeConfirm && (
        <ConfirmDialog
          title="Recalculer les statuts des conversations ?"
          description={
            'Pour chaque conversation close sans resolution_reason, KnowDesk '
          + 'rejoue resolveStatus et un appel Mistral (juge LLM) pour aligner '
          + 'les statuts sur les règles métier actuelles. '
          + 'Coût estimé : environ 80 tokens par conversation. '
          + 'Le traitement se fait par lots de 200 et peut prendre quelques minutes.'
          }
          confirmLabel="Lancer le recalcul"
          variant="primary"
          onConfirm={runRecompute}
          onCancel={() => setRecomputeConfirm(false)}
        />
      )}
    </div>
  );
}
