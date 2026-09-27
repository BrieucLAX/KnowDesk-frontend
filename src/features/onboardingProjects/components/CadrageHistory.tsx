import React, { useEffect, useState } from 'react';
import { Button }  from '../../../shared/components/ui/Button';
import { Modal }   from '../../../shared/components/ui/Modal';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { MarkdownContent } from '../../../shared/components/ui/MarkdownContent';
import { useToast } from '../../../shared/lib/useToast';
import { formatFull } from '../../../shared/lib/formatDate';
import { useAuthStore, selectUser } from '../../../store/authStore';
import { onboardingApi } from '../api/onboardingApi';
import type { Cadrage, CadrageVersionSummary } from '../types';

interface CadrageHistoryProps {
  projectId:  string;
  /** Change à chaque enregistrement : la liste est relue. */
  latest:     number | null;
  /** Des modifications non enregistrées seraient remplacées. */
  dirty:      boolean;
  /** Charge une ancienne version dans le formulaire ; l'enregistrer en crée une nouvelle. */
  onRestore:  (cadrage: Cadrage) => void;
}

/**
 * Historique des versions de la fiche de cadrage. Les versions sont
 * immuables : on consulte une version (son rendu Markdown, celui qui part à
 * l'analyse) et on peut repartir d'elle, ce qui crée une nouvelle version à
 * l'enregistrement.
 */
export function CadrageHistory({ projectId, latest, dirty, onRestore }: CadrageHistoryProps) {
  const toast  = useToast();
  const userId = useAuthStore(selectUser)?.id;
  const [versions, setVersions] = useState<CadrageVersionSummary[] | null>(null);
  const [opened,   setOpened]   = useState<Cadrage | null>(null);
  const [loading,  setLoading]  = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    onboardingApi.listCadrages(projectId)
      .then(data => { if (alive) setVersions(data); })
      .catch(err => {
        if (!alive) return;
        setVersions([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger l\'historique.');
      });
    return () => { alive = false; };
  }, [projectId, latest, toast]);

  const open = async (version: number) => {
    setLoading(version);
    try {
      setOpened(await onboardingApi.getCadrage(projectId, version));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d\'ouvrir cette version.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="obp-history" aria-labelledby="obp-history-title">
      <h2 id="obp-history-title" className="obp-section-title">
        Historique des versions {versions && versions.length > 0 && <span className="obp-count">{versions.length}</span>}
      </h2>
      {versions === null ? (
        <Skeleton className="obp-skeleton-card" />
      ) : versions.length === 0 ? (
        <p className="obp-muted">Chaque enregistrement crée une version, conservée ici.</p>
      ) : (
        <ul className="obp-docs" role="list">
          {versions.map(v => (
            <li key={v.version} className="obp-doc">
              <span className="obp-doc__name">
                Version {v.version}{v.version === latest && <span className="obp-muted"> (actuelle)</span>}
              </span>
              <span className="obp-doc__meta">
                {formatFull(v.createdAt)}{v.createdBy === userId && ' · par vous'}
              </span>
              <Button variant="ghost" size="sm" loading={loading === v.version} onClick={() => open(v.version)}
                aria-label={`Consulter la version ${v.version}`}>
                Consulter
              </Button>
            </li>
          ))}
        </ul>
      )}

      {opened && (
        <Modal
          title={`Version ${opened.version} — ${formatFull(opened.createdAt)}`}
          size="lg"
          onClose={() => setOpened(null)}
          footer={
            <>
              <Button variant="ghost" size="md" onClick={() => setOpened(null)}>Fermer</Button>
              {opened.version !== latest && (
                <Button variant="primary" size="md" onClick={() => { onRestore(opened); setOpened(null); }}>
                  Repartir de cette version
                </Button>
              )}
            </>
          }
        >
          {opened.version !== latest && (
            <p className="obp-muted obp-history__note">
              Repartir de cette version la charge dans le formulaire ; l'enregistrer crée une nouvelle version.
              {dirty && ' Vos modifications non enregistrées seront remplacées.'}
            </p>
          )}
          <div className="obp-history__render">
            <MarkdownContent text={opened.markdown} />
          </div>
        </Modal>
      )}
    </section>
  );
}
