import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { learningApi } from '../api/learningApi';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { fetchAllPages } from '../../../shared/lib/fetchAllPages';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Button }     from '../../../shared/components/ui/Button';
import { Input }      from '../../../shared/components/ui/Input';
import { Modal }      from '../../../shared/components/ui/Modal';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { Skeleton }   from '../../../shared/components/ui/Skeleton';
import { useToast }   from '../../../shared/lib/useToast';
import type {
  LearningPathDetail, LearningModule, LearningModuleResource,
  LearningQuiz, LearningQuizQuestion, LearningResourceType, LearningPathRenewal,
  LearningPathCompletions, LearningCompletionStatus,
} from '../types';
import '../learning.css';

interface LearningPathEditorProps {
  pathId: string;
  onBack: () => void;
}

interface ArticleLite { id: string; title: string }
interface FaqLite     { id: string; question: string }
interface TreeLite    { id: string; title: string }

export function LearningPathEditor({ pathId, onBack }: LearningPathEditorProps) {
  const toast = useToast();
  const [path,    setPath]    = useState<LearningPathDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edition header
  const [headerName, setHeaderName] = useState('');
  const [headerDesc, setHeaderDesc] = useState('');
  const [headerMandatory, setHeaderMandatory] = useState(false);
  const [headerRenewal,   setHeaderRenewal]   = useState<LearningPathRenewal>(null);
  const [savingHeader, setSavingHeader] = useState(false);

  // Module en cours d'édition (modal expanded)
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null);

  // Modale ajout module
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  // Modale assignations
  const [showAssign, setShowAssign] = useState(false);

  // Modale dashboard suivi
  const [showCompletions, setShowCompletions] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    learningApi.getPath(pathId)
      .then(p => {
        setPath(p);
        setHeaderName(p.name);
        setHeaderDesc(p.description ?? '');
        setHeaderMandatory(p.mandatory);
        setHeaderRenewal(p.renewal_months);
      })
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [pathId, toast]);

  useEffect(() => { reload(); }, [reload]);

  const saveHeader = useCallback(async () => {
    if (!path) return;
    setSavingHeader(true);
    try {
      const updated = await learningApi.updatePath(path.id, {
        name:           headerName.trim(),
        description:    headerDesc.trim() || null,
        mandatory:      headerMandatory,
        renewal_months: headerRenewal,
      });
      setPath(p => p ? { ...p, ...updated } : p);
      toast.success('Parcours mis à jour.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sauvegarde impossible.');
    } finally {
      setSavingHeader(false);
    }
  }, [path, headerName, headerDesc, headerMandatory, headerRenewal, toast]);

  const handleAddModule = useCallback(async () => {
    if (!path || !newModuleName.trim()) return;
    try {
      const mod = await learningApi.createModule(path.id, {
        name:     newModuleName.trim(),
        position: path.modules.length,
      });
      setPath(p => p ? { ...p, modules: [...p.modules, mod] } : p);
      setNewModuleName('');
      setShowAddModule(false);
      toast.success('Module ajouté.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ajout impossible.');
    }
  }, [path, newModuleName, toast]);

  const handleDeleteModule = useCallback(async (moduleId: string) => {
    if (!path) return;
    try {
      await learningApi.deleteModule(moduleId);
      setPath(p => p ? { ...p, modules: p.modules.filter(m => m.id !== moduleId) } : p);
      toast.success('Module supprimé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  }, [path, toast]);

  if (loading || !path) {
    return (
      <div className="learning-page">
        <PageHeader title="Chargement…" subtitle="" />
        <Skeleton className="sk-card" />
      </div>
    );
  }

  return (
    <>
      {showAddModule && (
        <Modal
          title="Ajouter un module"
          onClose={() => setShowAddModule(false)}
          asForm
          onSubmit={handleAddModule}
          footer={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setShowAddModule(false)}>Annuler</Button>
              <Button type="submit" variant="primary" size="md" disabled={!newModuleName.trim()}>Ajouter</Button>
            </>
          }
        >
          <Input
            id="module-name"
            type="text"
            label="Nom du module"
            placeholder="ex. Module 1 — Présentation de l'entreprise"
            value={newModuleName}
            onChange={e => setNewModuleName(e.target.value)}
            autoFocus
            required
          />
        </Modal>
      )}

      {editingModule && (
        <ModuleEditorModal
          module={editingModule}
          pathId={path.id}
          onClose={() => setEditingModule(null)}
          onRename={(name) => {
            setPath(p => p ? { ...p, modules: p.modules.map(m => m.id === editingModule.id ? { ...m, name } : m) } : p);
          }}
        />
      )}

      {showAssign && (
        <AssignUsersModal
          pathId={path.id}
          onClose={() => setShowAssign(false)}
        />
      )}

      {showCompletions && (
        <CompletionsModal
          pathId={path.id}
          onClose={() => setShowCompletions(false)}
        />
      )}

      <div className="learning-page">
        <PageHeader
          title={path.name}
          subtitle="Édition d'un parcours de formation"
          actions={(
            <>
              <Button variant="ghost" size="md" onClick={onBack}>← Retour</Button>
              <Button variant="ghost" size="md" onClick={() => setShowCompletions(true)}>Suivi</Button>
              <Button variant="ghost" size="md" onClick={() => setShowAssign(true)}>Assigner</Button>
            </>
          )}
        />

        {/* Header édition */}
        <section className="learning-section">
          <h2 className="learning-section__title">Informations</h2>
          <div className="learning-form">
            <Input
              id="header-name"
              type="text"
              label="Nom"
              value={headerName}
              onChange={e => setHeaderName(e.target.value)}
            />
            <label className="learning-form__field">
              <span className="learning-form__label">Description</span>
              <textarea
                className="learning-form__textarea"
                rows={2}
                value={headerDesc}
                onChange={e => setHeaderDesc(e.target.value)}
              />
            </label>
            <div className="learning-form__row">
              <label className="learning-form__checkbox">
                <input
                  type="checkbox"
                  checked={headerMandatory}
                  onChange={e => setHeaderMandatory(e.target.checked)}
                />
                <span>Obligatoire</span>
              </label>
              <label className="learning-form__field">
                <span className="learning-form__label">Renouvellement</span>
                <select
                  className="learning-form__select"
                  value={headerRenewal === null ? '' : String(headerRenewal)}
                  onChange={e => setHeaderRenewal(e.target.value === '' ? null : Number(e.target.value) as LearningPathRenewal)}
                >
                  <option value="">Jamais</option>
                  <option value="3">Tous les 3 mois</option>
                  <option value="6">Tous les 6 mois</option>
                  <option value="12">Tous les 12 mois</option>
                </select>
              </label>
            </div>
            <div className="learning-form__actions">
              <Button variant="primary" size="sm" onClick={saveHeader} loading={savingHeader}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="learning-section">
          <div className="learning-section__header">
            <h2 className="learning-section__title">Modules ({path.modules.length})</h2>
            <Button variant="primary" size="sm" onClick={() => setShowAddModule(true)}>
              + Ajouter un module
            </Button>
          </div>
          {path.modules.length === 0 ? (
            <p className="learning-empty">Aucun module. Ajoutez votre premier module pour commencer.</p>
          ) : (
            <ul className="learning-modules">
              {path.modules.sort((a, b) => a.position - b.position).map((m, idx) => (
                <li key={m.id} className="learning-module">
                  <div className="learning-module__head">
                    <span className="learning-module__num">{idx + 1}.</span>
                    <span className="learning-module__name">{m.name}</span>
                  </div>
                  <div className="learning-module__actions">
                    <Button variant="ghost" size="sm" onClick={() => setEditingModule(m)}>Éditer</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteModule(m.id)}>Supprimer</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

// ── Modal édition d'un module : nom + ressources + quiz ──────

function ModuleEditorModal({ module, pathId, onClose, onRename }: {
  module: LearningModule;
  pathId: string;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(module.name);
  const [savingName, setSavingName] = useState(false);

  const [resources, setResources] = useState<LearningModuleResource[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);

  const [articles, setArticles] = useState<ArticleLite[]>([]);
  const [faqs,     setFaqs]     = useState<FaqLite[]>([]);
  const [trees,    setTrees]    = useState<TreeLite[]>([]);

  const [quiz, setQuiz] = useState<LearningQuiz | null>(null);
  const [generating, setGenerating] = useState(false);

  // Charge ressources actuelles + listes pour le sélecteur
  useEffect(() => {
    let alive = true;
    setLoadingRes(true);
    Promise.all([
      learningApi.listResources(module.id),
      // Toutes les ressources publiées, page après page : le sélecteur filtre localement.
      fetchAllPages<ArticleLite>('/articles', new URLSearchParams({ status: 'published' }), 200),
      fetchAllPages<{ id: string; question: string }>('/faqs', new URLSearchParams({ status: 'published' }), 100),
      apiClient.get<any[]>('/trees?status=published'),
      learningApi.getQuiz(module.id),
    ])
      .then(([res, arts, fs, ts, q]) => {
        if (!alive) return;
        setResources(res);
        setArticles(arts.map(a => ({ id: a.id, title: a.title })));
        setFaqs(fs.map(f => ({ id: f.id, question: f.question })));
        setTrees(ts.map(t => ({ id: t.id, title: t.title })));
        setQuiz(q);
      })
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Erreur de chargement.'))
      .finally(() => { if (alive) setLoadingRes(false); });
    return () => { alive = false; };
  }, [module.id, toast]);

  const saveName = useCallback(async () => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      await learningApi.updateModule(module.id, { name: name.trim() });
      onRename(name.trim());
      toast.success('Module renommé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur.');
    } finally {
      setSavingName(false);
    }
  }, [module.id, name, onRename, toast]);

  const addResource = useCallback((type: LearningResourceType, id: string) => {
    if (resources.some(r => r.resource_type === type && r.resource_id === id)) return;
    const next = [
      ...resources,
      { id: `tmp-${Date.now()}`, module_id: module.id, resource_type: type, resource_id: id, position: resources.length },
    ];
    setResources(next);
    learningApi.setResources(module.id, next.map(r => ({
      resource_type: r.resource_type, resource_id: r.resource_id, position: r.position,
    })))
      .then(setResources)
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Erreur.'));
  }, [resources, module.id, toast]);

  const removeResource = useCallback((id: string) => {
    const next = resources.filter(r => r.id !== id);
    setResources(next);
    learningApi.setResources(module.id, next.map(r => ({
      resource_type: r.resource_type, resource_id: r.resource_id, position: r.position,
    })))
      .then(setResources)
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Erreur.'));
  }, [resources, module.id, toast]);

  const generateQuiz = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await learningApi.generateQuiz(module.id, 5);
      // Sauvegarde directement le quiz généré (l'admin peut le ré-éditer après)
      const saved = await learningApi.saveQuiz(module.id, {
        questions:    result.questions,
        passing_score: 80,
        generated_by: 'ai',
      });
      setQuiz(saved);
      toast.success('Quiz généré par l\'IA.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Génération IA indisponible.');
    } finally {
      setGenerating(false);
    }
  }, [module.id, toast]);

  const deleteQuiz = useCallback(async () => {
    // Pas d'endpoint DELETE explicite : on peut juste laisser le quiz, ou
    // sauver un tableau vide → mais notre validation impose ≥ 1 question.
    // Pour V1 : on garde le quiz, possibilité d'éditer manuellement plus tard.
    toast.error('Pour supprimer un quiz, regénérez-le ou éditez-le manuellement.');
  }, [toast]);

  // Titre lookup helpers
  const resourceTitle = (r: LearningModuleResource): string => {
    if (r.resource_type === 'article') return articles.find(a => a.id === r.resource_id)?.title ?? '(article introuvable)';
    if (r.resource_type === 'faq')     return faqs.find(f => f.id === r.resource_id)?.question ?? '(FAQ introuvable)';
    return trees.find(t => t.id === r.resource_id)?.title ?? '(processus introuvable)';
  };

  return (
    <Modal
      title={`Module : ${module.name}`}
      onClose={onClose}
      size="lg"
      footer={
        <Button type="button" variant="primary" size="md" onClick={onClose}>Fermer</Button>
      }
    >
      <div className="module-editor">
        <label className="learning-form__field">
          <span className="learning-form__label">Nom du module</span>
          <div className="module-editor__name-row">
            <Input
              id="mod-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Button variant="ghost" size="sm" onClick={saveName} loading={savingName} disabled={name === module.name}>
              Renommer
            </Button>
          </div>
        </label>

        <h3 className="module-editor__heading">Ressources ({resources.length})</h3>
        {loadingRes ? <Skeleton className="sk-card" /> : (
          <>
            {resources.length === 0 && (
              <p className="learning-empty">Aucune ressource. Sélectionnez du contenu ci-dessous.</p>
            )}
            <ul className="module-editor__resources">
              {resources.map(r => (
                <li key={r.id} className="module-editor__resource">
                  <span className={`chip chip--xs module-editor__type module-editor__type--${r.resource_type}`}>
                    {r.resource_type === 'article' ? 'Article' : r.resource_type === 'faq' ? 'FAQ' : 'Processus'}
                  </span>
                  <span className="module-editor__title">{resourceTitle(r)}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeResource(r.id)}>×</Button>
                </li>
              ))}
            </ul>

            <ResourcePicker
              articles={articles}
              faqs={faqs}
              trees={trees}
              alreadyAdded={resources}
              onPick={addResource}
            />
            <p className="module-editor__picker-hint">
              Tapez pour filtrer articles, FAQs et processus.
            </p>
          </>
        )}

        <h3 className="module-editor__heading">Quiz</h3>
        {quiz && quiz.questions.length > 0 ? (
          <>
            <p className="module-editor__quiz-meta">
              {quiz.questions.length} questions · seuil de réussite : {quiz.passing_score}% ·{' '}
              {quiz.generated_by === 'ai' ? 'Généré par IA' : 'Saisi manuellement'}
            </p>
            <ul className="module-editor__quiz-list">
              {quiz.questions.map((q, i) => (
                <li key={i} className="module-editor__quiz-item">
                  <strong>{i + 1}. {q.q}</strong>
                  <ul className="module-editor__quiz-choices">
                    {q.choices.map((c, j) => (
                      <li key={j} className={j === q.correct_idx ? 'module-editor__quiz-correct' : ''}>
                        {j === q.correct_idx ? '✓ ' : ''}{c}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" onClick={generateQuiz} loading={generating}>
              Régénérer avec l'IA
            </Button>
          </>
        ) : (
          <>
            <p className="learning-empty">
              Aucun quiz. Générez-en un automatiquement depuis le contenu des ressources.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={generateQuiz}
              loading={generating}
              disabled={resources.length === 0}
            >
              ✨ Générer le quiz avec l'IA
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Picker unifié : 1 input qui filtre articles + FAQs + processus ──

interface ResourcePickerItem {
  type:  LearningResourceType;
  id:    string;
  label: string;
}

function ResourcePicker({ articles, faqs, trees, alreadyAdded, onPick }: {
  articles:     ArticleLite[];
  faqs:         FaqLite[];
  trees:        TreeLite[];
  alreadyAdded: LearningModuleResource[];
  onPick:       (type: LearningResourceType, id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Items déjà ajoutés → filtrés pour ne pas pourrir le dropdown.
  const addedKey = useMemo(
    () => new Set(alreadyAdded.map(r => `${r.resource_type}:${r.resource_id}`)),
    [alreadyAdded],
  );

  const allItems: ResourcePickerItem[] = useMemo(() => [
    ...articles.map(a => ({ type: 'article' as const, id: a.id, label: a.title })),
    ...faqs    .map(f => ({ type: 'faq'     as const, id: f.id, label: f.question })),
    ...trees   .map(t => ({ type: 'tree'    as const, id: t.id, label: t.title })),
  ], [articles, faqs, trees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems
      .filter(it => !addedKey.has(`${it.type}:${it.id}`))
      .filter(it => q === '' || it.label.toLowerCase().includes(q));
  }, [allItems, addedKey, query]);

  // Groupage par type pour les sections du dropdown.
  const groups = useMemo(() => ({
    article: filtered.filter(i => i.type === 'article').slice(0, 20),
    faq:     filtered.filter(i => i.type === 'faq')    .slice(0, 20),
    tree:    filtered.filter(i => i.type === 'tree')   .slice(0, 20),
  }), [filtered]);

  // Click outside ferme.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (type: LearningResourceType, id: string) => {
    onPick(type, id);
    setQuery('');
    // Garde le focus sur l'input pour enchaîner les ajouts.
    setOpen(true);
  };

  const totalShown = groups.article.length + groups.faq.length + groups.tree.length;

  return (
    <div ref={wrapRef} className="resource-picker">
      <Input
        id="resource-picker-input"
        type="text"
        placeholder="+ Ajouter une ressource — article, FAQ ou processus…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="resource-picker__dropdown" role="listbox">
          {totalShown === 0 ? (
            <div className="resource-picker__empty">
              {alreadyAdded.length === 0 && allItems.length === 0
                ? 'Aucun contenu publié dans cette organisation.'
                : query.trim() !== ''
                  ? `Aucun résultat pour « ${query} ».`
                  : 'Tous les contenus disponibles sont déjà ajoutés.'}
            </div>
          ) : (
            <>
              {groups.article.length > 0 && (
                <ResourcePickerSection
                  type="article"
                  label="Articles"
                  items={groups.article}
                  onPick={pick}
                />
              )}
              {groups.faq.length > 0 && (
                <ResourcePickerSection
                  type="faq"
                  label="FAQs"
                  items={groups.faq}
                  onPick={pick}
                />
              )}
              {groups.tree.length > 0 && (
                <ResourcePickerSection
                  type="tree"
                  label="Processus"
                  items={groups.tree}
                  onPick={pick}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResourcePickerSection({ type, label, items, onPick }: {
  type:  LearningResourceType;
  label: string;
  items: ResourcePickerItem[];
  onPick: (type: LearningResourceType, id: string) => void;
}) {
  return (
    <div className="resource-picker__section">
      <div className="resource-picker__section-title">{label}</div>
      <ul className="resource-picker__list">
        {items.map(it => (
          <li key={`${it.type}:${it.id}`}>
            <button
              type="button"
              className="resource-picker__option"
              onClick={() => onPick(type, it.id)}
            >
              <span className={`chip chip--xs module-editor__type module-editor__type--${type}`}>
                {type === 'article' ? 'Article' : type === 'faq' ? 'FAQ' : 'Processus'}
              </span>
              <span className="resource-picker__option-label">{it.label}</span>
              <span className="resource-picker__option-add" aria-hidden="true">+</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Modal assignations : sélectionne des users de l'org ──────

function AssignUsersModal({ pathId, onClose }: { pathId: string; onClose: () => void }) {
  const toast = useToast();
  const [members,   setMembers]   = useState<Array<{ id: string; email: string; firstName: string | null; lastName: string | null; role: string }>>([]);
  const [assigned,  setAssigned]  = useState<Set<string>>(new Set());
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiClient.get<any[]>('/members'),
      learningApi.listAssignments(pathId),
    ])
      .then(([m, a]) => {
        if (!alive) return;
        setMembers(m.map(x => ({
          id: x.id, email: x.email,
          firstName: x.firstName ?? x.first_name ?? null,
          lastName:  x.lastName  ?? x.last_name  ?? null,
          role: x.role,
        })));
        setAssigned(new Set(a.map(x => x.user_id)));
      })
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Erreur de chargement.'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pathId, toast]);

  const toggleUser = useCallback(async (userId: string) => {
    setSaving(true);
    try {
      if (assigned.has(userId)) {
        await learningApi.unassignUser(pathId, userId);
        setAssigned(prev => { const n = new Set(prev); n.delete(userId); return n; });
      } else {
        await learningApi.assignUsers(pathId, [userId]);
        setAssigned(prev => new Set(prev).add(userId));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }, [assigned, pathId, toast]);

  return (
    <Modal
      title="Assigner ce parcours"
      onClose={onClose}
      size="lg"
      footer={<Button type="button" variant="primary" size="md" onClick={onClose}>Fermer</Button>}
    >
      {loading ? <Skeleton className="sk-card" /> : (
        <ul className="assign-list">
          {members.map(m => (
            <li key={m.id} className="assign-list__item">
              <label>
                <input
                  type="checkbox"
                  checked={assigned.has(m.id)}
                  disabled={saving}
                  onChange={() => toggleUser(m.id)}
                />
                <span className="assign-list__name">
                  {m.firstName || m.lastName ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : m.email}
                </span>
                <span className="assign-list__email">{m.email}</span>
                <span className="assign-list__role">{m.role}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ── Modal suivi : grille users × modules avec status par cellule ─────

function CompletionsModal({ pathId, onClose }: { pathId: string; onClose: () => void }) {
  const toast = useToast();
  const [data,    setData]    = useState<LearningPathCompletions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    learningApi.pathCompletions(pathId)
      .then(d => { if (alive) setData(d); })
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Erreur de chargement.'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pathId, toast]);

  // Stats agrégées en haut de la modale (donne un sens d'un coup d'œil
  // avant de plonger dans la grille).
  const stats = useMemo(() => {
    if (!data) return null;
    const flat = data.assignments.flatMap(a => a.modules);
    return {
      assignees:   data.assignments.length,
      completed:   flat.filter(m => m.status === 'completed').length,
      inProgress:  flat.filter(m => m.status === 'in_progress').length,
      outdated:    flat.filter(m => m.status === 'outdated').length,
      total:       flat.length,
    };
  }, [data]);

  return (
    <Modal
      title="Suivi des conseillers"
      onClose={onClose}
      size="lg"
      footer={<Button type="button" variant="primary" size="md" onClick={onClose}>Fermer</Button>}
    >
      {loading ? <Skeleton className="sk-card" /> : !data ? null : data.assignments.length === 0 ? (
        <p className="learning-empty">
          Aucun conseiller n'est encore assigné à ce parcours. Cliquez sur « Assigner » pour en ajouter.
        </p>
      ) : (
        <>
          {stats && stats.total > 0 && (
            <div className="completions-summary">
              <span><strong>{stats.assignees}</strong> conseiller{stats.assignees > 1 ? 's' : ''}</span>
              <span className="completions-summary__sep" aria-hidden="true">·</span>
              <span><strong>{stats.completed}</strong>/{stats.total} modules complétés</span>
              {stats.inProgress > 0 && (
                <>
                  <span className="completions-summary__sep" aria-hidden="true">·</span>
                  <span>{stats.inProgress} en cours</span>
                </>
              )}
              {stats.outdated > 0 && (
                <>
                  <span className="completions-summary__sep" aria-hidden="true">·</span>
                  <span className="completions-summary__warn">{stats.outdated} à renouveler</span>
                </>
              )}
            </div>
          )}

          <div className="completions-grid-wrap">
            <table className="completions-grid">
              <thead>
                <tr>
                  <th className="completions-grid__user-th" scope="col">Conseiller</th>
                  {data.modules.map(m => (
                    <th key={m.id} scope="col" className="completions-grid__mod-th" title={m.name}>
                      <span className="completions-grid__mod-num">{m.position + 1}</span>
                      <span className="completions-grid__mod-name">{m.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.assignments.map(a => (
                  <tr key={a.user_id}>
                    <th scope="row" className="completions-grid__user">
                      <span className="completions-grid__user-name">{a.user_name || a.user_email}</span>
                      {a.user_name && a.user_email && (
                        <span className="completions-grid__user-email">{a.user_email}</span>
                      )}
                    </th>
                    {data.modules.map(m => {
                      const cell = a.modules.find(x => x.module_id === m.id);
                      const status = cell?.status ?? 'pending';
                      return (
                        <td key={m.id} className={`completions-grid__cell completions-grid__cell--${status}`}>
                          <StatusBadgeCell status={status} score={cell?.score ?? null} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

function StatusBadgeCell({ status, score }: { status: LearningCompletionStatus; score: number | null }) {
  const icon  = status === 'completed' ? '✓'
              : status === 'in_progress' ? '◐'
              : status === 'outdated' ? '↻'
              : '○';
  const label = status === 'completed' ? 'Complété'
              : status === 'in_progress' ? 'En cours'
              : status === 'outdated' ? 'À renouveler'
              : 'À faire';
  return (
    <span className="completions-grid__badge" title={score !== null ? `${label} — ${score}%` : label}>
      <span className="completions-grid__icon" aria-hidden="true">{icon}</span>
      {score !== null && <span className="completions-grid__score">{score}%</span>}
    </span>
  );
}
