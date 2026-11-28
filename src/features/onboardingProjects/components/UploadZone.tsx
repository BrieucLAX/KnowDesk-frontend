import React, { useRef, useState } from 'react';
import { cn } from '../../../shared/lib/cn';
import { ApiError } from '../../../shared/lib/apiClient';
import { useToast } from '../../../shared/lib/useToast';
import { onboardingApi } from '../api/onboardingApi';
import { ACCEPT_ATTRIBUTE, ACCEPTED_FORMATS_TEXT, checkSelection } from '../lib/checkSelection';
import { formatBytes } from '../lib/format';
import { isCorpusTooLarge } from '../lib/volume';
import { Upload } from 'lucide-react';
import type { ImportSummary, OnboardingDocument, OnboardingProject } from '../types';

interface UploadZoneProps {
  project:          OnboardingProject;
  /** Documents créés (illisibles compris) et synthèse de l'import ; null : back sans synthèse. */
  onUploaded:       (documents: OnboardingDocument[], summary: ImportSummary | null) => void;
  /** Le back exige le texte d'information (NOTICE_NOT_ACCEPTED) : il faut le réafficher. */
  onNoticeRequired: () => void;
}

/**
 * Import de plusieurs fichiers (glisser-déposer ou sélection ; US 1.1). Les doublons sont écartés
 * et les illisibles créés par le back, qui en rend la synthèse ; un format non accepté ou un
 * plafond dépassé fait refuser l'envoi : le message du back reste affiché jusqu'au prochain envoi.
 */
export function UploadZone({ project, onUploaded, onNoticeRequired }: UploadZoneProps) {
  const toast    = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const send = async (files: File[]) => {
    if (files.length === 0 || uploading) return;
    const problem = checkSelection(files, project.limits);
    if (problem) { setError(problem); return; }

    setError('');
    setUploading(true);
    try {
      const { data: created, meta } = await onboardingApi.uploadDocuments(project.id, files);
      if (created.length > 0) toast.success(created.length > 1 ? `${created.length} documents importés.` : 'Document importé.');
      else toast.info('Aucun nouveau document importé.');
      onUploaded(created, meta?.summary ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOTICE_NOT_ACCEPTED') {
        toast.error(err.message);
        onNoticeRequired();
      } else {
        setError(`Aucun fichier n'a été importé : ${err instanceof Error ? err.message : 'l\'envoi a échoué.'}`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const { limits } = project;

  return (
    <section aria-label="Importer des documents" className="obp-upload">
      <div
        className={cn('obp-dropzone', dragOver && 'is-drag-over', uploading && 'is-busy')}
        onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); void send([...e.dataTransfer.files]); }}
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); inputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        aria-disabled={uploading}
        aria-describedby="obp-upload-limits"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="obp-dropzone__input"
          onChange={e => void send([...(e.target.files ?? [])])}
          tabIndex={-1}
          aria-hidden="true"
        />
        {uploading ? (
          <span className="obp-dropzone__main" aria-live="polite">Envoi en cours…</span>
        ) : (
          <>
            <Upload size={24} className="obp-dropzone__icon" aria-hidden="true" />
            <span className="obp-dropzone__main">Déposez vos fichiers ici ou cliquez pour les choisir</span>
            <span className="obp-dropzone__hint">{ACCEPTED_FORMATS_TEXT}</span>
          </>
        )}
      </div>
      {/* Lot 1 « Socle », règle transverse 4 : ni compteurs du projet ni jauge de volume ; la règle
          d'envoi reste dite, et le dépassement du volume qu'une analyse peut lire reste signalé. */}
      <p id="obp-upload-limits" className="obp-muted">
        {limits.maxFilesPerUpload} fichiers au plus par envoi, {formatBytes(limits.maxFileBytes)} par fichier.
      </p>
      {isCorpusTooLarge(project) && (
        <p className="obp-alert" role="alert">
          Vos documents dépassent ce qu'une analyse peut lire : retirez-en avant de lancer l'analyse.
        </p>
      )}
      {error && <p className="obp-alert" role="alert">{error}</p>}
    </section>
  );
}
