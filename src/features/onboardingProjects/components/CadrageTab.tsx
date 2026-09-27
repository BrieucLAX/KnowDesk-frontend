import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button }   from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ApiError } from '../../../shared/lib/apiClient';
import { useToast } from '../../../shared/lib/useToast';
import { formatFull } from '../../../shared/lib/formatDate';
import { onboardingApi } from '../api/onboardingApi';
import {
  cleanCadrageForm, normalizeCadrageForm, emptyCadrageForm, missingDocuments, parseBackendError, validateCadrageForm,
  type CadrageErrors,
} from '../lib/cadrageForm';
import { CadrageSections } from './CadrageSections';
import { CadrageHistory } from './CadrageHistory';
import type { Cadrage, CadrageForm, OnboardingDocument, OnboardingProject } from '../types';

interface CadrageTabProps {
  project:       OnboardingProject;
  /** Une nouvelle version a été enregistrée : le projet relit sa version courante. */
  onSaved:       () => void;
  /** Modifications non enregistrées : la page demande confirmation avant de quitter l'onglet. */
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Fiche de cadrage : formulaire en six sections, enregistré en versions
 * immuables (chaque enregistrement crée une version), et leur historique.
 */
export function CadrageTab({ project, onSaved, onDirtyChange }: CadrageTabProps) {
  const toast = useToast();
  const [documents, setDocuments] = useState<OnboardingDocument[] | null>(null);
  const [form,      setForm]      = useState<CadrageForm | null>(null);
  const [version,   setVersion]   = useState<{ number: number; createdAt: string } | null>(null);
  const [errors,    setErrors]    = useState<CadrageErrors>({});
  const [formError, setFormError] = useState('');
  const [dirty,     setDirty]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  /** Version dont le formulaire est reparti, tant qu'il n'est pas enregistré. */
  const [restoredFrom, setRestoredFrom] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const current = onboardingApi.getCadrage(project.id).catch(err => {
      // Aucune version encore : formulaire vide.
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    });
    Promise.all([current, onboardingApi.listDocuments(project.id)])
      .then(([cadrage, docs]) => {
        if (!alive) return;
        setDocuments(docs);
        setForm(normalizeCadrageForm(cadrage?.form));
        setVersion(cadrage ? { number: cadrage.version, createdAt: cadrage.createdAt } : null);
      })
      .catch(err => {
        if (!alive) return;
        setDocuments([]);
        setForm(emptyCadrageForm());
        toast.error(err instanceof Error ? err.message : 'Impossible de charger la fiche de cadrage.');
      });
    return () => { alive = false; };
  }, [project.id, toast]);

  const markDirty = useCallback((value: boolean) => {
    setDirty(value);
    onDirtyChange(value);
  }, [onDirtyChange]);

  // Fermeture ou rechargement de l'onglet du navigateur avec des modifications.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const edit = useCallback((mutate: (draft: CadrageForm) => void) => {
    setForm(prev => {
      if (!prev) return prev;
      const draft: CadrageForm = JSON.parse(JSON.stringify(prev));
      mutate(draft);
      return draft;
    });
    markDirty(true);
  }, [markDirty]);

  const restore = useCallback((cadrage: Cadrage) => {
    setForm(normalizeCadrageForm(cadrage.form));
    setErrors({});
    setFormError('');
    setRestoredFrom(cadrage.version);
    markDirty(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [markDirty]);

  const projectFilenames = useMemo(() => new Set((documents ?? []).map(d => d.filename)), [documents]);
  const absent = useMemo(() => (form ? missingDocuments(form, projectFilenames) : []), [form, projectFilenames]);

  const save = async () => {
    if (!form) return;
    const found = validateCadrageForm(form);
    setErrors(found);
    setFormError('');
    const count = Object.keys(found).length;
    if (count > 0) {
      toast.error(count > 1 ? `La fiche contient ${count} erreurs.` : 'La fiche contient une erreur.');
      return;
    }
    setSaving(true);
    try {
      const saved = await onboardingApi.saveCadrage(project.id, cleanCadrageForm(form));
      setForm(normalizeCadrageForm(saved.form));
      setVersion({ number: saved.version, createdAt: saved.createdAt });
      setRestoredFrom(null);
      markDirty(false);
      toast.success(`Version ${saved.version} enregistrée.`);
      if (saved.missingDocuments.length > 0) {
        toast.warning(`Documents cités mais absents du projet : ${saved.missingDocuments.join(', ')}.`);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        // « chemin : message » → sous le champ concerné ; sinon en tête du formulaire.
        const parsed = parseBackendError(err.message);
        if (parsed) setErrors({ [parsed.path]: parsed.message });
        else setFormError(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : 'Enregistrement impossible.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!form || !documents) return <Skeleton className="obp-skeleton-block" />;

  return (
    <>
    <form className="obp-cadrage" onSubmit={e => { e.preventDefault(); void save(); }} noValidate>
      <div className="obp-cadrage__bar">
        <p className="obp-muted" aria-live="polite">
          {version
            ? `Version ${version.number}, enregistrée le ${formatFull(version.createdAt)}.`
            : 'Aucune version enregistrée.'}
          {restoredFrom !== null && dirty && ` Formulaire repris de la version ${restoredFrom}.`}
          {dirty && <strong className="obp-dirty"> Modifications non enregistrées.</strong>}
        </p>
        <Button type="submit" variant="primary" size="md" loading={saving} disabled={!dirty}>
          Enregistrer une nouvelle version
        </Button>
      </div>
      <p className="obp-muted">
        Décrivez votre métier en quelques lignes : l'analyse s'en sert pour comprendre vos documents.
        Toute section peut rester vide.
      </p>
      {formError && <p className="obp-alert" role="alert">{formError}</p>}
      {absent.length > 0 && (
        <p className="obp-warning" role="status">
          {absent.length > 1 ? 'Documents cités mais absents du projet' : 'Document cité mais absent du projet'} :{' '}
          {absent.join(', ')}. L'enregistrement reste possible ; réimportez un document sous le même nom pour qu'il reprenne sa place.
        </p>
      )}

      <CadrageSections form={form} errors={errors} documents={documents} edit={edit} />

      <div className="obp-cadrage__bar obp-cadrage__bar--end">
        <Button type="submit" variant="primary" size="md" loading={saving} disabled={!dirty}>
          Enregistrer une nouvelle version
        </Button>
      </div>
    </form>

    {/* Hors du formulaire : ses boutons (et sa modale) ne doivent pas l'envoyer. */}
    <CadrageHistory projectId={project.id} latest={version?.number ?? null} dirty={dirty} onRestore={restore} />
    </>
  );
}
