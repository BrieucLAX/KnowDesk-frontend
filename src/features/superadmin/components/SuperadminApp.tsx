import React, { useState } from 'react';
import { useSuperadmin }   from '../hooks/useSuperadmin';
import '../superadmin.css';
import { Button }          from '../../../shared/components/ui/Button';
import { ConfirmDialog }   from '../../../shared/components/ui/ConfirmDialog';
import { formatRelative }  from '../../../shared/lib/formatDate';
import { CreateTestOrgModal } from './CreateTestOrgModal';
import { TestDataModal }     from './TestDataModal';
import { formatDay, orgStatus, scheduledPurgeDate } from '../lib/testOrgStatus';

/** Organisation de test : créée par la route superadmin, module onboarding seul. */
const isTestOrg = (org: { enabled_modules?: string[] }) => org.enabled_modules?.includes('onboarding') ?? false;

export function SuperadminApp() {
  const {
    session, orgs, loading, error, loginErr,
    login, logout, disableOrg, enableOrg, impersonate, reindexSearch, recomputeResolutions,
    createTestOrg, endTest, listOnboardingProjects, purgeTestData,
  } = useSuperadmin();

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
      setEndTestError(err instanceof Error ? err.message : 'Impossible de terminer le test.');
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
      setReindexInfo(`✓ Meilisearch réindexé : ${r.articles} article${r.articles !== 1 ? 's' : ''}, ${r.trees} processus, ${r.faqs} FAQ${r.faqs !== 1 ? 's' : ''} (${total} documents au total).`);
      setTimeout(() => setReindexState('idle'), 8000);
    } catch (err) {
      setReindexState('error');
      setReindexInfo(err instanceof Error ? err.message : 'Réindexation impossible.');
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
    setRecomputeInfo('Recalcul en cours… cela peut prendre quelques minutes pour des historiques importants.');
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
      setRecomputeInfo(`✓ Statuts recalculés : ${totalProcessed} conversation${totalProcessed !== 1 ? 's' : ''} traitée${totalProcessed !== 1 ? 's' : ''}${totalFailed > 0 ? `, ${totalFailed} échec${totalFailed !== 1 ? 's' : ''}` : ''}.`);
      setTimeout(() => setRecomputeState('idle'), 12000);
    } catch (err) {
      setRecomputeState('error');
      setRecomputeInfo(err instanceof Error ? err.message : 'Recalcul impossible.');
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
              <label htmlFor="sa-email" className="field-label">Email</label>
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
            title="Réindexer Meilisearch (toutes les orgs)"
          >
            🔄 Réindexer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={recomputeState === 'running'}
            disabled={recomputeState === 'running'}
            onClick={() => setRecomputeConfirm(true)}
            title="Phase D — rejoue resolveStatus + LLM judge sur les conversations sans resolution_reason"
          >
            🧮 Recalculer les statuts
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>Déconnexion</Button>
        </div>
        {reindexInfo && (
          <div
            className="sa-reindex-banner"
            role="status"
            style={{
              position:   'absolute',
              top:        56,
              left:       0,
              right:      0,
              padding:    '8px 16px',
              background: reindexState === 'error' ? 'oklch(0.95 0.05 25)' : 'oklch(0.94 0.08 155)',
              color:      reindexState === 'error' ? 'oklch(0.45 0.18 25)' : 'oklch(0.30 0.14 155)',
              fontSize:   13,
              borderBottom: '1px solid var(--neutral-200)',
              textAlign:  'center',
            }}
          >
            {reindexInfo}
          </div>
        )}
        {recomputeInfo && (
          <div
            role="status"
            style={{
              position:   'absolute',
              top:        56,
              left:       0,
              right:      0,
              padding:    '8px 16px',
              background: recomputeState === 'error'   ? 'oklch(0.95 0.05 25)'
                        : recomputeState === 'running' ? 'oklch(0.96 0.04 250)'
                        :                                'oklch(0.94 0.08 155)',
              color:      recomputeState === 'error'   ? 'oklch(0.45 0.18 25)'
                        : recomputeState === 'running' ? 'oklch(0.40 0.10 250)'
                        :                                'oklch(0.30 0.14 155)',
              fontSize:   13,
              borderBottom: '1px solid var(--neutral-200)',
              textAlign:  'center',
            }}
          >
            {recomputeInfo}
          </div>
        )}
      </header>

      <main className="sa-main">
        {/* Métriques globales */}
        <div className="sa-metrics">
          {[
            { label: 'Espaces actifs',   value: activeOrgs },
            { label: 'Espaces total',    value: totalOrgs },
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
                    <th>Créé</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(org => (
                    <tr key={org.id} className={org.disabled_at ? 'sa-table__row--disabled' : ''}>
                      <td>
                        <div className="sa-org-name">
                          {org.name}
                          {isTestOrg(org) && <span className="sa-badge-test">Test</span>}
                        </div>
                        <div className="sa-org-slug">{org.slug}</div>
                      </td>
                      <td><span className={`sa-plan sa-plan--${org.plan}`}>{org.plan}</span></td>
                      <td>{org.stats.membersActive}</td>
                      <td>{org.stats.membersDisabled}</td>
                      <td>{org.stats.articlesCount}</td>
                      <td>{formatRelative(org.created_at)}</td>
                      <td>
                        {(() => {
                          const status = orgStatus(org);
                          return <span className={`sa-status sa-status--${status.tone}`} title={status.title}>{status.label}</span>;
                        })()}
                      </td>
                      <td>
  <div className="sa-org__actions">
    {/* Test terminé : réactivation refusée par le back (TEST_ENDED). */}
    {org.test_ended_at ? null : org.disabled_at ? (
      <Button variant="ghost" size="sm"
        onClick={() => setConfirm({ orgId: org.id, action: 'enable' })}>
        Réactiver
      </Button>
    ) : (
      <>
        <Button variant="ghost" size="sm"
          onClick={() => setConfirm({ orgId: org.id, action: 'disable' })}>
          Désactiver
        </Button>
        <Button variant="primary" size="sm"
          onClick={() => impersonate(org.id, org.name)}>
          Accéder
        </Button>
      </>
    )}
    {isTestOrg(org) && !org.test_ended_at && (
      <Button variant="danger" size="sm"
        onClick={() => { setEndTestError(''); setEndTestTarget({ id: org.id, name: org.name }); }}>
        Terminer le test
      </Button>
    )}
    {/* Avant comme après la fin du test : suppression immédiate sur demande. */}
    {isTestOrg(org) && (
      <Button variant="ghost" size="sm"
        onClick={() => setTestDataOrg({ id: org.id, name: org.name })}>
        Données de test
      </Button>
    )}
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
          title={confirm.action === 'disable' ? 'Désactiver l\'espace' : 'Réactiver l\'espace'}
          description={
            confirm.action === 'disable'
              ? 'Les utilisateurs de cet espace ne pourront plus se connecter.'
              : 'Les utilisateurs de cet espace pourront à nouveau se connecter.'
          }
          confirmLabel={confirm.action === 'disable' ? 'Désactiver' : 'Réactiver'}
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
          title={`Terminer le test de « ${endTestTarget.name} »`}
          description={
            'L\'espace est désactivé immédiatement : ses utilisateurs ne peuvent plus se connecter. '
          + 'Ses données de test (documents, fiches, analyses, audits, décisions) seront supprimées '
          + `automatiquement 30 jours après, le ${formatDay(scheduledPurgeDate(new Date().toISOString()))}. `
          + 'Pour les supprimer tout de suite, utilisez « Données de test ». '
          + 'C\'est définitif : l\'espace ne pourra pas être réactivé.'
          }
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
          title="Recalculer tous les statuts conversation"
          description={
            'Pour chaque conversation close sans resolution_reason, KnowDesk va '
          + 'rejouer resolveStatus + un appel Mistral (LLM judge) afin d\'aligner '
          + 'les statuts sur les nouvelles règles métier (Phase D). '
          + 'Coût estimé : ~80 tokens par conversation. '
          + 'Le traitement est itératif (batch de 200) et peut prendre quelques minutes.'
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
