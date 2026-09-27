import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button }        from '../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { FilterTabs }    from '../../../shared/components/ui/FilterTabs';
import { Skeleton }      from '../../../shared/components/ui/Skeleton';
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
import { FreeCadrageEditor, FREE_CADRAGE_MAX_CHARS } from './FreeCadrageEditor';
import type { Cadrage, CadrageForm, CadrageKind, CadrageVersionSummary, OnboardingDocument, OnboardingProject } from '../types';

interface CadrageTabProps {
  project:       OnboardingProject;
  /** Une nouvelle version a été enregistrée : le projet relit sa version courante. */
  onSaved:       () => void;
  /** Modifications non enregistrées : la page demande confirmation avant de quitter l'onglet. */
  onDirtyChange: (dirty: boolean) => void;
}

const MODES = [
  { id: 'free',       label: 'Texte libre' },
  { id: 'structured', label: 'Formulaire structuré (facultatif)' },
] as const;

const KIND_LABEL: Record<CadrageKind, string> = { free: 'libre', structured: 'structurée' };

interface PendingConfirm {
  title:        string;
  description:  string;
  confirmLabel: string;
  action:       () => void;
}

/**
 * Fiche de cadrage. Une version est soit libre (texte collé ou importé, envoyé
 * tel quel à l'analyse), soit structurée (formulaire en six sections,
 * facultatif). Chaque enregistrement crée une version immuable ; l'historique
 * les montre toutes.
 */
export function CadrageTab({ project, onSaved, onDirtyChange }: CadrageTabProps) {
  const toast = useToast();
  const [documents, setDocuments] = useState<OnboardingDocument[] | null>(null);
  const [versions,  setVersions]  = useState<CadrageVersionSummary[] | null>(null);
  /** Dernière version enregistrée (null s'il n'y en a pas). */
  const [current,   setCurrent]   = useState<Cadrage | null>(null);
  const [mode,      setMode]      = useState<CadrageKind>('free');
  const [form,      setForm]      = useState<CadrageForm>(emptyCadrageForm());
  const [freeText,  setFreeText]  = useState('');
  const [freeSource, setFreeSource] = useState<string | null>(null);
  const [errors,    setErrors]    = useState<CadrageErrors>({});
  const [freeError, setFreeError] = useState('');
  const [formError, setFormError] = useState('');
  const [dirty,     setDirty]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [startingFromStructured, setStartingFromStructured] = useState(false);
  const [pending,   setPending]   = useState<PendingConfirm | null>(null);
  /** Version dont le formulaire ou le texte est reparti, tant qu'il n'est pas enregistré. */
  const [restoredFrom, setRestoredFrom] = useState<number | null>(null);

  /** Remet les brouillons sur la dernière version enregistrée. */
  const applySaved = useCallback((cadrage: Cadrage | null) => {
    setCurrent(cadrage);
    setMode(cadrage?.kind ?? 'free');
    setForm(cadrage?.kind === 'structured' ? normalizeCadrageForm(cadrage.form) : emptyCadrageForm());
    setFreeText(cadrage?.kind === 'free' ? cadrage.markdown : '');
    setFreeSource(cadrage?.kind === 'free' ? cadrage.sourceFilename : null);
    setErrors({});
    setFreeError('');
    setFormError('');
    setRestoredFrom(null);
  }, []);

  const loadVersions = useCallback(() => {
    onboardingApi.listCadrages(project.id)
      .then(setVersions)
      .catch(err => {
        setVersions([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger l\'historique.');
      });
  }, [project.id, toast]);

  useEffect(() => {
    let alive = true;
    const latest = onboardingApi.getCadrage(project.id).catch(err => {
      // Aucune version encore : fiche libre vide.
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    });
    Promise.all([latest, onboardingApi.listDocuments(project.id)])
      .then(([cadrage, docs]) => {
        if (!alive) return;
        setDocuments(docs);
        applySaved(cadrage);
      })
      .catch(err => {
        if (!alive) return;
        setDocuments([]);
        applySaved(null);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger la fiche de cadrage.');
      })
      .finally(() => { if (alive) setLoaded(true); });
    loadVersions();
    return () => { alive = false; };
  }, [project.id, toast, applySaved, loadVersions]);

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
      const draft: CadrageForm = JSON.parse(JSON.stringify(prev));
      mutate(draft);
      return draft;
    });
    markDirty(true);
  }, [markDirty]);

  /** Remplace le texte libre, après confirmation s'il y a déjà du texte différent. */
  const replaceFreeText = useCallback((text: string, source: string | null, title: string) => {
    const apply = () => {
      setFreeText(text);
      setFreeSource(source);
      setFreeError('');
      markDirty(true);
    };
    if (freeText.trim() && freeText !== text) {
      setPending({
        title,
        description: 'Le texte actuel de la fiche sera remplacé. Il reste disponible dans l\'historique s\'il a été enregistré.',
        confirmLabel: 'Remplacer',
        action: apply,
      });
    } else {
      apply();
    }
  }, [freeText, markDirty]);

  const changeMode = (next: CadrageKind) => {
    if (next === mode) return;
    const go = () => {
      // Les modifications non enregistrées sont abandonnées : on repart de la dernière version.
      applySaved(current);
      setMode(next);
      markDirty(false);
    };
    if (dirty) {
      setPending({
        title:        'Changer de type de fiche ?',
        description:  'Vos modifications non enregistrées seront perdues.',
        confirmLabel: 'Changer sans enregistrer',
        action:       go,
      });
    } else {
      go();
    }
  };

  const latestStructured = useMemo(
    () => (versions ?? []).find(v => v.kind === 'structured')?.version ?? null,
    [versions],
  );

  const startFromStructured = async () => {
    if (latestStructured === null) return;
    setStartingFromStructured(true);
    try {
      const cadrage = await onboardingApi.getCadrage(project.id, latestStructured);
      replaceFreeText(cadrage.markdown, null, 'Partir du rendu de la fiche structurée ?');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de charger la fiche structurée.');
    } finally {
      setStartingFromStructured(false);
    }
  };

  const restore = useCallback((cadrage: Cadrage) => {
    if (cadrage.kind === 'free') {
      setFreeText(cadrage.markdown);
      setFreeSource(cadrage.sourceFilename);
    } else {
      setForm(normalizeCadrageForm(cadrage.form));
    }
    setMode(cadrage.kind);
    setErrors({});
    setFreeError('');
    setFormError('');
    setRestoredFrom(cadrage.version);
    markDirty(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [markDirty]);

  const projectFilenames = useMemo(() => new Set((documents ?? []).map(d => d.filename)), [documents]);
  const absent = useMemo(
    () => (mode === 'structured' ? missingDocuments(form, projectFilenames) : []),
    [mode, form, projectFilenames],
  );

  const afterSave = (saved: Cadrage & { missingDocuments: string[] }) => {
    applySaved(saved);
    markDirty(false);
    toast.success(`Version ${saved.version} enregistrée.`);
    if (saved.missingDocuments.length > 0) {
      toast.warning(`Documents cités mais absents du projet : ${saved.missingDocuments.join(', ')}.`);
    }
    loadVersions();
    onSaved();
  };

  const saveFree = async () => {
    setFreeError('');
    if (!freeText.trim()) { setFreeError('Le texte de la fiche est vide.'); return; }
    if (freeText.length > FREE_CADRAGE_MAX_CHARS) {
      setFreeError(`${FREE_CADRAGE_MAX_CHARS.toLocaleString('fr-FR')} caractères au plus.`);
      return;
    }
    setSaving(true);
    try {
      afterSave(await onboardingApi.saveFreeCadrage(project.id, freeText, freeSource));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setFreeError(parseBackendError(err.message)?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : 'Enregistrement impossible.');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveStructured = async () => {
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
      afterSave(await onboardingApi.saveCadrage(project.id, cleanCadrageForm(form)));
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

  if (!loaded || !documents) return <Skeleton className="obp-skeleton-block" />;

  const saveButton = (
    <Button type="submit" variant="primary" size="md" loading={saving} disabled={!dirty}>
      Enregistrer une nouvelle version
    </Button>
  );

  return (
    <>
    <form
      className="obp-cadrage"
      onSubmit={e => { e.preventDefault(); void (mode === 'free' ? saveFree() : saveStructured()); }}
      noValidate
    >
      <div className="obp-cadrage__bar">
        <p className="obp-muted" aria-live="polite">
          {current
            ? `Version ${current.version} (${KIND_LABEL[current.kind]}), enregistrée le ${formatFull(current.createdAt)}.`
            : 'Aucune version enregistrée.'}
          {restoredFrom !== null && dirty && ` Repris de la version ${restoredFrom}.`}
          {dirty && <strong className="obp-dirty"> Modifications non enregistrées.</strong>}
        </p>
        {saveButton}
      </div>

      <FilterTabs options={MODES} value={mode} onChange={changeMode} ariaLabel="Type de fiche" />

      {mode === 'free' ? (
        <FreeCadrageEditor
          text={freeText}
          sourceFilename={freeSource}
          documents={documents}
          error={freeError || undefined}
          onChange={(text, source) => { setFreeText(text); setFreeSource(source); setFreeError(''); markDirty(true); }}
          onReplace={(text, source) => replaceFreeText(text, source, `Importer « ${source} » ?`)}
          onStartFromStructured={latestStructured !== null ? startFromStructured : undefined}
          startingFromStructured={startingFromStructured}
        />
      ) : (
        <>
          <p className="obp-muted">
            Facultatif : décrivez votre métier section par section. Toute section peut rester vide.
          </p>
          {formError && <p className="obp-alert" role="alert">{formError}</p>}
          {absent.length > 0 && (
            <p className="obp-warning" role="status">
              {absent.length > 1 ? 'Documents cités mais absents du projet' : 'Document cité mais absent du projet'} :{' '}
              {absent.join(', ')}. L'enregistrement reste possible ; réimportez un document sous le même nom pour qu'il reprenne sa place.
            </p>
          )}
          <CadrageSections form={form} errors={errors} documents={documents} edit={edit} />
        </>
      )}

      <div className="obp-cadrage__bar obp-cadrage__bar--end">{saveButton}</div>
    </form>

    {/* Hors du formulaire : ses boutons (et sa modale) ne doivent pas l'envoyer. */}
    <CadrageHistory
      projectId={project.id}
      versions={versions}
      latest={current?.version ?? null}
      dirty={dirty}
      onRestore={restore}
    />

    {pending && (
      <ConfirmDialog
        title={pending.title}
        description={pending.description}
        confirmLabel={pending.confirmLabel}
        variant="danger"
        onConfirm={() => { const run = pending.action; setPending(null); run(); }}
        onCancel={() => setPending(null)}
      />
    )}
    </>
  );
}
