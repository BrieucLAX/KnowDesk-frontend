import React, { useEffect, useRef, useState } from 'react';
import { Modal }   from '../../../shared/components/ui/Modal';
import { Button }  from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/lib/useToast';
import { importsApi, type ImportItem, type ImportSplitMode } from '../api/importsApi';
import '../imports.css';
import { CircleCheck, FileText, TriangleAlert, Upload } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  /** Appelé une fois l'import completed (pour rafraîchir la liste articles). */
  onCompleted?: (item: ImportItem) => void;
}

const ACCEPTED_TYPES = [
  '.pdf', 'application/pdf',
  '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',');
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.pptx'];
const MAX_SIZE_MB = 50;

export function ImportModal({ onClose, onCompleted }: ImportModalProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file,      setFile]      = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<ImportSplitMode>('one_article');
  const [item,      setItem]      = useState<ImportItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);

  // Polling : tant que l'import est pending/processing, on re-check toutes les 2s
  useEffect(() => {
    if (!item) return;
    if (item.status === 'completed' || item.status === 'failed') return;
    const t = window.setInterval(async () => {
      try {
        const fresh = await importsApi.get(item.id);
        setItem(fresh);
        if (fresh.status === 'completed') {
          toast.success(`Import terminé : ${fresh.articles_created} article${fresh.articles_created > 1 ? 's' : ''} créé${fresh.articles_created > 1 ? 's' : ''} en brouillon.`);
          onCompleted?.(fresh);
        } else if (fresh.status === 'failed') {
          toast.error(fresh.error_message ?? 'L\'import a échoué. Vérifiez le fichier, puis réessayez.');
        }
      } catch { /* silencieux : on re-tentera au prochain tick */ }
    }, 2000);
    return () => window.clearInterval(t);
  }, [item, toast, onCompleted]);

  const handleFile = (f: File) => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ce fichier pèse ${(f.size / 1024 / 1024).toFixed(1)} Mo, au-delà de la limite de ${MAX_SIZE_MB} Mo. Choisissez un fichier plus léger.`);
      return;
    }
    const lname = f.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some(ext => lname.endsWith(ext))) {
      toast.error('Ce format n\'est pas pris en charge. Choisissez un fichier PDF, DOCX ou PPTX.');
      return;
    }
    setFile(f);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const created = await importsApi.upload(file, splitMode);
      setItem(created);
    } catch (err) {
      toast.error((err as Error).message ?? 'Envoi du fichier impossible. Vérifiez votre connexion, puis réessayez.');
    } finally {
      setUploading(false);
    }
  };

  const isProcessing = item && (item.status === 'pending' || item.status === 'processing');
  const isDone       = item?.status === 'completed';
  const isFailed     = item?.status === 'failed';

  return (
    <Modal
      title="Importer un document"
      size="md"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            {isDone ? 'Fermer' : 'Annuler'}
          </Button>
          {!item && (
            <Button type="button" variant="primary" size="md" onClick={submit} loading={uploading} disabled={!file}>
              Importer le document
            </Button>
          )}
        </div>
      }
    >
      <div className="import-modal">
        {!item && (
          <>
            <p className="import-modal__intro">
              Convertissez un document existant (<strong>PDF</strong>, <strong>DOCX</strong> ou <strong>PPTX</strong>)
              en articles brouillons dans votre base. Les articles seront créés
              dans une catégorie temporaire <strong>« Imports »</strong>,
              prêts à être relus et publiés.
            </p>

            <div
              className={`import-modal__dropzone${dragOver ? ' is-drag-over' : ''}${file ? ' has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={onPick}
                style={{ display: 'none' }}
              />
              {!file ? (
                <>
                  <div className="import-modal__dropzone-icon" aria-hidden="true"><Upload size={24} /></div>
                  <p className="import-modal__dropzone-title">Déposez un fichier PDF, DOCX ou PPTX ici</p>
                  <p className="import-modal__dropzone-hint">ou cliquez pour le choisir ({MAX_SIZE_MB} Mo maximum)</p>
                </>
              ) : (
                <>
                  <div className="import-modal__file-icon" aria-hidden="true"><FileText size={24} /></div>
                  <p className="import-modal__file-name">{file.name}</p>
                  <p className="import-modal__file-meta">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                  <button
                    type="button"
                    className="import-modal__file-clear"
                    onClick={e => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}
                  >
                    Choisir un autre fichier
                  </button>
                </>
              )}
            </div>

            <div className="import-modal__split">
              <p className="import-modal__split-label">Comment découper le document ?</p>
              <label className="import-modal__split-option">
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === 'one_article'}
                  onChange={() => setSplitMode('one_article')}
                />
                <span>
                  <strong>1 fichier = 1 article</strong>
                  <small>Le document devient un seul article dont le titre sera celui du fichier.</small>
                </span>
              </label>
              <label className="import-modal__split-option">
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === 'split_by_section'}
                  onChange={() => setSplitMode('split_by_section')}
                />
                <span>
                  <strong>Découper en plusieurs articles (recommandé pour les longs documents)</strong>
                  <small>
                    KnowDesk analyse les pages du document avec un modèle d'IA pour repérer les
                    articles distincts, même quand un titre et son contenu sont sur deux pages.
                    S'il ne trouve qu'un article, le document devient un seul article.
                    <em> Pour un PPTX, chaque diapositive devient un article ; pour un DOCX,
                    les titres Word servent au découpage.</em>
                  </small>
                </span>
              </label>
            </div>
          </>
        )}

        {item && (
          <div className="import-modal__status">
            <p className="import-modal__status-file">
              <strong>{item.filename}</strong>
              <span className="import-modal__status-mode">
                {item.split_mode === 'split_by_section' ? '· découpé par section' : '· 1 article'}
              </span>
            </p>

            {isProcessing && (
              <>
                <div className="import-modal__spinner" aria-hidden="true" />
                <p className="import-modal__status-text">
                  {item.status === 'pending'
                    ? 'En attente de traitement…'
                    : 'Analyse du document en cours… Cela peut prendre quelques secondes.'}
                </p>
                <p className="import-modal__status-hint">
                  Vous pouvez fermer cette fenêtre : l'import continue en arrière-plan.
                </p>
              </>
            )}

            {isDone && (
              <>
                <div className="import-modal__status-icon import-modal__status-icon--ok" aria-hidden="true"><CircleCheck size={24} /></div>
                <p className="import-modal__status-text">
                  Import terminé : <strong>{item.articles_created} article{item.articles_created > 1 ? 's' : ''}</strong> créé{item.articles_created > 1 ? 's' : ''} en brouillon
                  {item.category_name && <> dans <strong>{item.category_name}</strong></>}.
                </p>
                <p className="import-modal__status-hint">
                  Les articles sont en <strong>brouillon</strong>. Relisez-les, ajustez les titres et fusionnez les doublons, puis publiez-les.
                </p>
              </>
            )}

            {isFailed && (
              <>
                <div className="import-modal__status-icon import-modal__status-icon--ko" aria-hidden="true"><TriangleAlert size={24} /></div>
                <p className="import-modal__status-text">
                  L'import a échoué.
                </p>
                <p className="import-modal__status-error">{item.error_message ?? 'Aucun détail n\'a été transmis. Réessayez, ou importez un autre fichier.'}</p>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
