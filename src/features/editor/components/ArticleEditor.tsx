import React, { useState, useCallback, useEffect, useId, useRef } from 'react';
import { RichTextEditor } from './RichTextEditor';
import '../editor.css';
import { SaveIndicator }  from './SaveIndicator';
import { useAutoSave }    from '../hooks/useAutoSave';
import { Input }          from '../../../shared/components/ui/Input';
import { Button }         from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/lib/useToast';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import type { EditorFormState, EditorErrors } from '../types';
import { useArticleVersions } from '../hooks/useArticleVersions';
import { VersionsPanel }      from './VersionsPanel';
import { TagsInput } from '../../articles/components/TagsInput';
import { tagsApi }   from '../../articles/api/tagsApi';
import { ArticleQualityPanel } from '../../articleQuality/components/ArticleQualityPanel';
import { useAuthStore, selectUserRole } from '../../../store/authStore';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { archiveApi }    from '../../articles/api/archiveApi';

interface ArticleEditorProps {
  articleId?: string;
  onSaved:    (articleId: string) => void;
  onCancel:   () => void;
}

interface Category {
  id:       string;
  name:     string;
  children: Category[];
}

function validateForm(form: EditorFormState): EditorErrors {
  const errors: EditorErrors = {};
  if (!form.title.trim())                        errors.title      = 'Le titre est requis pour publier.';
  if (!form.categoryId)                          errors.categoryId = 'Sélectionnez une catégorie.';
  if (!form.content.trim() || form.content === '<br>') errors.content = 'Le contenu ne peut pas être vide.';
  return errors;
}

function flattenCategories(cats: Category[], depth = 0): { id: string; name: string; depth: number }[] {
  return cats.flatMap(c => [
    { id: c.id, name: c.name, depth },
    ...flattenCategories(c.children, depth + 1),
  ]);
}

export function ArticleEditor({ articleId, onSaved, onCancel }: ArticleEditorProps) {
  const isEdit  = !!articleId;
  const role    = useAuthStore(selectUserRole);
  const canSeeQuality = role === 'admin' || role === 'manager';
  const canArchive    = role === 'admin' || role === 'manager';
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [isArchiving,    setIsArchiving]    = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string | undefined>(articleId);
  const titleId = useId();

  const [form, setForm] = useState<EditorFormState>({
    title: '', categoryId: '', content: '', status: 'draft', visibility: 'internal', tags: [],
  });
  // Snapshot des tags présents en DB après le dernier save réussi.
  // Sert à n'envoyer PUT /tags que si la liste a vraiment changé.
  const lastSavedTagsRef = useRef<string[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [errors,       setErrors]       = useState<EditorErrors>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const toast = useToast();
  const ensureArticleExists = useCallback(async (): Promise<string | null> => {
  if (currentArticleId) return currentArticleId;
  try {
    const article = await apiClient.post<any>('/articles', {
      title:   form.title || 'Sans titre',
      content: { html: form.content },
      categoryId: form.categoryId || undefined,
    });
    setCurrentArticleId(article.id);
    return article.id;
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Impossible de créer l\'article.');
    return null;
  }
}, [currentArticleId, form, toast]);
  const versions = articleId ? useArticleVersions(articleId) : null;

  // Charger les catégories
  useEffect(() => {
    apiClient.get<Category[]>('/categories')
      .then(setCategories)
      .catch(err => toast.error(err instanceof ApiError ? err.message : 'Impossible de charger les catégories.'));
  }, [toast]);

  // Charger l'article existant en mode édition
  useEffect(() => {
    if (!articleId) return;
    apiClient.get<any>(`/articles/${articleId}`)
      .then(article => {
        const tags = Array.isArray(article.tags) ? article.tags : [];
        lastSavedTagsRef.current = tags;
        setForm({
          title:      article.title ?? '',
          categoryId: article.category_id ?? '',
          content:    typeof article.content === 'string' ? article.content : (article.content?.html ?? article.content?.text ?? ''),
          status:     article.status,
          visibility: article.visibility === 'public' ? 'public' : 'internal',
          tags,
        });
      })
      .catch(err => toast.error(err instanceof ApiError ? err.message : 'Impossible de charger l\'article.'));
  }, [articleId, toast]);

  /** Persiste les tags si — et seulement si — ils ont changé depuis le dernier save. */
  const syncTagsIfChanged = useCallback(async (id: string, tags: string[]): Promise<void> => {
    const sortedNext = [...tags].map(t => t.trim()).filter(Boolean).sort();
    const sortedPrev = [...lastSavedTagsRef.current].sort();
    if (sortedNext.length === sortedPrev.length && sortedNext.every((t, i) => t === sortedPrev[i])) return;
    try {
      const res = await tagsApi.setForArticle(id, tags);
      lastSavedTagsRef.current = res.tags;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sauvegarde des tags impossible.');
    }
  }, [toast]);

  // Autosave — uniquement en mode édition
  const { saveStatus, lastSavedAt, saveNow } = useAutoSave({
    data:    form,
    enabled: isEdit,
    saveFn:  async (data) => {
      if (!articleId) return;
      await apiClient.patch(`/articles/${articleId}`, {
        title:      data.title,
        content:    { html: data.content },
        categoryId: data.categoryId || undefined,
        visibility: data.visibility,
      });
      await syncTagsIfChanged(articleId, data.tags);
    },
  });

  // Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [saveNow]);

  const updateField = useCallback(<K extends keyof EditorFormState>(
    field: K, value: EditorFormState[K],
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if ((errors as any)[field]) {
      setErrors(prev => { const n = { ...prev }; delete (n as any)[field]; return n; });
    }
  }, [errors]);

  const handleSaveDraft = useCallback(async () => {
    setIsSavingDraft(true);
    try {
      if (isEdit) {
        await apiClient.patch(`/articles/${articleId}`, {
          title:      form.title,
          content:    { html: form.content },
          categoryId: form.categoryId || undefined,
          visibility: form.visibility,
        });
        await syncTagsIfChanged(articleId!, form.tags);
        toast.success("Brouillon sauvegardé."); onSaved(articleId!);
      } else {
        const article = await apiClient.post<any>('/articles', {
          title:      form.title || 'Sans titre',
          content:    { html: form.content },
          categoryId: form.categoryId || undefined,
          visibility: form.visibility,
        });
        await syncTagsIfChanged(article.id, form.tags);
        toast.success("Brouillon sauvegardé."); onSaved(article.id);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sauvegarde du brouillon impossible.');
    } finally {
      setIsSavingDraft(false);
    }
  }, [form, isEdit, articleId, onSaved, syncTagsIfChanged, toast]);

  const handlePublish = useCallback(async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsPublishing(true);
    try {
      let id = articleId;

      // Créer d'abord si nouvel article
if (!isEdit) {
  const article = await apiClient.post<any>('/articles', {
    title:      form.title,
    content:    { html: form.content },
    categoryId: form.categoryId || undefined,
    status:     'published',
    visibility: form.visibility,
  });
  await syncTagsIfChanged(article.id, form.tags);
  toast.success('Article publié avec succès !');
  onSaved(article.id);
  return;
} else {
        await apiClient.patch(`/articles/${articleId}`, {
          title:      form.title,
          content:    { html: form.content },
          categoryId: form.categoryId || undefined,
          visibility: form.visibility,
        });
        await syncTagsIfChanged(articleId!, form.tags);
      }

      await apiClient.put(`/articles/${id}/publish`, { summary: 'Publication' });
      toast.success("Article publié avec succès !"); onSaved(id!);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Publication impossible.');
    } finally {
      setIsPublishing(false);
    }
  }, [form, isEdit, articleId, onSaved, syncTagsIfChanged, toast]);

  // Archiver retire l'article des publiés et de la recherche ; désarchiver le remet en brouillon.
  const handleArchive = async () => {
    if (!currentArticleId) return;
    setIsArchiving(true);
    try {
      const updated = await archiveApi.archive(currentArticleId);
      setForm(f => ({ ...f, status: updated.status }));
      setConfirmArchive(false);
      toast.success('Article archivé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Archivage impossible.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    if (!currentArticleId) return;
    setIsArchiving(true);
    try {
      const updated = await archiveApi.unarchive(currentArticleId);
      setForm(f => ({ ...f, status: updated.status }));
      toast.success('Article désarchivé : il est de nouveau en brouillon.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Désarchivage impossible.');
    } finally {
      setIsArchiving(false);
    }
  };

  const flatCats = flattenCategories(categories);

  return (
    <div className="article-editor">
      {confirmArchive && (
        <ConfirmDialog
          title="Archiver cet article ?"
          description={`« ${form.title} » ne sera plus visible des conseillers ni du chatbot. Vous pourrez le désarchiver ; il reviendra en brouillon.`}
          confirmLabel="Archiver"
          loading={isArchiving}
          onConfirm={handleArchive}
          onCancel={() => setConfirmArchive(false)}
        />
      )}
      <div className="article-editor__topbar">
        <button type="button" className="article-editor__back" onClick={onCancel}>
          ← Annuler
        </button>
        <div className="article-editor__topbar-center">
          <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
        </div>
        {isEdit && versions && (
          <Button variant="ghost" size="sm" onClick={versions.toggle}>
            Historique
          </Button>
        )}
        <div className="article-editor__topbar-actions">
          {isEdit && canArchive && form.status !== 'archived' && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(true)}>
              Archiver
            </Button>
          )}
          {isEdit && canArchive && form.status === 'archived' && (
            <Button variant="ghost" size="sm" onClick={handleUnarchive} loading={isArchiving}>
              Désarchiver
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleSaveDraft} loading={isSavingDraft}>
            Garder en brouillon
          </Button>
          <Button variant="primary" size="sm" loading={isPublishing} onClick={handlePublish}>
            {form.status === 'published' ? 'Mettre à jour' : 'Publier'}
          </Button>
        </div>
      </div>

      <div className="article-editor__body">
        {isEdit && currentArticleId && (
          <ArticleQualityPanel articleId={currentArticleId} visible={canSeeQuality} />
        )}
        <div className="article-editor__meta">
          <div className="field">
            <label htmlFor="cat-select" className="field-label">
              Catégorie <span className="field-required" aria-hidden="true">*</span>
            </label>
            <select
              id="cat-select"
              className={`field-input ${errors.categoryId ? 'field-input--error' : ''}`}
              value={form.categoryId}
              onChange={e => updateField('categoryId', e.target.value)}
            >
              <option value="">Sélectionner une catégorie…</option>
              {flatCats.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {'  '.repeat(cat.depth)}{cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
          </div>
          <div className="field">
            <label className="field-label">Tags</label>
            <TagsInput
              value={form.tags}
              onChange={tags => updateField('tags', tags)}
            />
            <p className="field-hint">10 tags max. Entrée ou virgule pour valider chaque tag.</p>
          </div>
          <div className="field">
            <label htmlFor="visibility-select" className="field-label">Visibilité</label>
            <select
              id="visibility-select"
              className="field-input"
              value={form.visibility}
              onChange={e => updateField('visibility', e.target.value as 'internal' | 'public')}
            >
              <option value="internal">🔒 Interne — réservé aux conseillers</option>
              <option value="public">🌐 Public — exposé au chatbot client</option>
            </select>
            <p className="field-hint">
              Les articles « Public » sont consultables par le chatbot embarqué sur le site web client (s'il est activé).
            </p>
          </div>
        </div>

        <input
          id={titleId}
          type="text"
          className={`article-editor__title-input ${errors.title ? 'article-editor__title-input--error' : ''}`}
          placeholder="Titre de l'article…"
          value={form.title}
          onChange={e => updateField('title', e.target.value)}
          aria-label="Titre de l'article"
        />
        {errors.title && <p className="field-error article-editor__title-error">{errors.title}</p>}

        <RichTextEditor
          value={form.content}
          onChange={v => updateField('content', v)}
          placeholder="Commencez à rédiger…"
          labelledBy={titleId}
          articleId={currentArticleId}
          onBeforeImageUpload={ensureArticleExists}
        />
        {errors.content && <p className="field-error">{errors.content}</p>}
      </div>
      {isEdit && versions?.open && (
  <VersionsPanel
    versions={versions.versions}
    loading={versions.loading}
    onClose={versions.toggle}
    onRestore={async (version) => {
      const content = await versions.restore(version);
      if (content) updateField('content', content.html ?? '');
    }}
  />
)}
    </div>
  );
}
