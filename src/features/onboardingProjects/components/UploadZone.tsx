import React, { useRef, useState } from 'react';
import { cn } from '../../../shared/lib/cn';
import { ApiError } from '../../../shared/lib/apiClient';
import { useToast } from '../../../shared/lib/useToast';
import { onboardingApi } from '../api/onboardingApi';
import { ACCEPT_ATTRIBUTE, ACCEPTED_FORMATS_TEXT, checkSelection } from '../lib/checkSelection';
import { formatBytes } from '../lib/format';
import { corpusVolume } from '../lib/volume';
import type { OnboardingDocument, OnboardingProject } from '../types';

interface UploadZoneProps {
  project:          OnboardingProject;
  onUploaded:       (documents: OnboardingDocument[]) => void;
  /** Le back exige le texte d'information (NOTICE_NOT_ACCEPTED) : il faut le réafficher. */
  onNoticeRequired: () => void;
}

/**
 * Import de plusieurs fichiers (glisser-déposer ou sélection). Tout ou rien,
 * comme le back : un fichier refusé et rien n'est importé ; le message du
 * back, qui nomme le fichier en cause, reste affiché jusqu'au prochain envoi.
 */
export function UploadZone({ project, onUploaded, onNoticeRequired }: UploadZoneProps) {
  const toast    = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const send = async (files: File[]) => {
    if (files.length === 0 || uploading) return;
    const problem = checkSelection(files, project.limits, project);
    if (problem) { setError(problem); return; }

    setError('');
    setUploading(true);
    try {
      const created = await onboardingApi.uploadDocuments(project.id, files);
      toast.success(created.length > 1 ? `${created.length} documents importés.` : 'Document importé.');
      onUploaded(created);
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
  const volume = corpusVolume(project);

  return (
    <section aria-labelledby="obp-upload-title" className="obp-upload">
      <h2 id="obp-upload-title" className="obp-section-title">Importer des documents</h2>
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
            <span className="obp-dropzone__main">Déposez vos fichiers ici, ou cliquez pour les choisir</span>
            <span className="obp-dropzone__hint">{ACCEPTED_FORMATS_TEXT}</span>
          </>
        )}
      </div>
      <p id="obp-upload-limits" className="obp-muted">
        {limits.maxFilesPerUpload} fichiers au plus par envoi, {formatBytes(limits.maxFileBytes)} par fichier.
        {' '}Projet : {project.documentsCount} / {limits.maxDocumentsPerProject} documents,
        {' '}{formatBytes(project.totalBytes)} / {formatBytes(limits.maxProjectBytes)}.
      </p>
      {volume && (
        <div className={cn('obp-volume', `obp-volume--${volume.tone}`)}>
          <div
            className="obp-volume__bar"
            role="meter"
            aria-label="Volume de texte du projet"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(volume.share, 100)}
            aria-valuetext={`${volume.share} %`}
          >
            <span className="obp-volume__fill" style={{ width: `${Math.min(volume.share, 100)}%` }} />
          </div>
          <p className="obp-volume__label">{volume.label}</p>
          {volume.note && <p className="obp-muted">{volume.note}</p>}
        </div>
      )}
      {error && <p className="obp-alert" role="alert">{error}</p>}
    </section>
  );
}
