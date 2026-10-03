import React, { useCallback, useEffect, useState } from 'react';
import { Modal }         from '../../../shared/components/ui/Modal';
import { Button }        from '../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { formatFull }    from '../../../shared/lib/formatDate';
import type { OnboardingProjectRow, PurgeReport } from '../types';

interface TestDataModalProps {
  org:          { id: string; name: string };
  listProjects: (orgId: string) => Promise<OnboardingProjectRow[]>;
  purge:        (orgId: string, projectId?: string) => Promise<PurgeReport>;
  onClose:      () => void;
}

type Pending = { kind: 'org' } | { kind: 'project'; project: OnboardingProjectRow; rank: number };

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

function summary(report: PurgeReport): string {
  const rows = Object.values(report.rows).reduce((sum, n) => sum + n, 0);
  return `${plural(report.objects, 'fichier')} et ${plural(rows, 'ligne')} supprimés.`;
}

/**
 * « Données de test » d'une organisation de test (étape D) : ses projets
 * d'onboarding, sans aucun nom (contenu du client), et la suppression
 * immédiate d'un projet ou de toutes les données de test. L'organisation et
 * ses comptes restent. Chaque suppression passe par une confirmation.
 */
export function TestDataModal({ org, listProjects, purge, onClose }: TestDataModalProps) {
  const [projects, setProjects] = useState<OnboardingProjectRow[] | null>(null);
  const [error,    setError]    = useState('');
  const [result,   setResult]   = useState('');
  const [pending,  setPending]  = useState<Pending | null>(null);
  const [purging,  setPurging]  = useState(false);

  const load = useCallback(async () => {
    try {
      setProjects(await listProjects(org.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, [listProjects, org.id]);

  useEffect(() => { void load(); }, [load]);

  const confirm = async () => {
    if (!pending) return;
    setPurging(true);
    setError('');
    setResult('');
    try {
      const report = await purge(org.id, pending.kind === 'project' ? pending.project.id : undefined);
      setResult(pending.kind === 'project'
        ? `Projet ${pending.rank} supprimé : ${summary(report)}`
        : `Données de test supprimées : ${summary(report)}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La suppression a échoué.');
    } finally {
      setPurging(false);
      setPending(null);
    }
  };

  if (pending) {
    return (
      <ConfirmDialog
        title={pending.kind === 'org'
          ? `Supprimer toutes les données de test de « ${org.name} »`
          : `Supprimer le projet ${pending.rank} de « ${org.name} »`}
        description={
          (pending.kind === 'org'
            ? 'Tous les projets, documents, fiches de cadrage, analyses, audits, images, décisions et acceptations du texte d\'information de cette organisation sont supprimés, en base et dans le stockage. '
            : `Ce projet (${plural(pending.project.documents, 'document')}), ses fiches, analyses, audits, images et décisions sont supprimés, en base et dans le stockage. `)
          + 'L\'organisation et ses comptes restent. C\'est définitif.'
        }
        confirmLabel="Supprimer"
        variant="danger"
        loading={purging}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    );
  }

  return (
    <Modal
      title={`Données de test — ${org.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>Fermer</Button>
          <Button variant="danger" size="md" onClick={() => setPending({ kind: 'org' })} disabled={projects === null}>
            Supprimer toutes les données de test
          </Button>
        </>
      }
    >
      <div className="sa-test-data">
        <p className="sa-test-data__desc">
          Les projets sont désignés par leur rang de création : leur nom est un contenu du client.
        </p>
        {result && <p className="sa-test-data__ok" role="status">{result}</p>}
        {error && <p className="sa-test-data__error" role="alert">{error}</p>}
        {projects === null && !error && <p className="sa-test-data__desc">Chargement…</p>}
        {projects !== null && projects.length === 0 && (
          <p className="sa-test-data__desc">Aucun projet : cette organisation n'a plus de données de projet.</p>
        )}
        {projects !== null && projects.length > 0 && (
          <ul className="sa-test-data__list">
            {projects.map((p, i) => (
              <li key={p.id} className="sa-test-data__item">
                <span>
                  <strong>Projet {i + 1}</strong> · créé le {formatFull(p.createdAt)} · {plural(p.documents, 'document')}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setPending({ kind: 'project', project: p, rank: i + 1 })}>
                  Supprimer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
