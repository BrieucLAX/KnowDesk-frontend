import { useEffect, useState, useCallback } from 'react';
import { brandMonitoringApi } from '../api/brandMonitoringApi';
import { useToast } from '../../../shared/lib/useToast';
import { Button } from '../../../shared/components/ui/Button';
import { Input }  from '../../../shared/components/ui/Input';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { Modal } from '../../../shared/components/ui/Modal';
import type { MonitoringPrompt, SuggestPromptsPayload } from '../types';
import { Sparkles, Upload } from 'lucide-react';

interface PromptsViewProps {
  projectId:       string;
  onReloadProject: () => void;
}

export function PromptsView({ projectId, onReloadProject }: PromptsViewProps) {
  const toast = useToast();
  const [prompts, setPrompts] = useState<MonitoringPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MonitoringPrompt | null>(null);

  // Sprint 4 — Suggesteur curated
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestData, setSuggestData] = useState<SuggestPromptsPayload | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectedSugs, setSelectedSugs] = useState<Set<number>>(new Set());
  const [importingSugs, setImportingSugs] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandMonitoringApi.listPrompts(projectId);
      setPrompts(data);
    } catch (err) {
      toast.error((err as Error).message ?? "Les prompts n'ont pas pu être chargés. Rechargez la page.");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { void reload(); }, [reload]);

  const handleCreate = async () => {
    const text = newText.trim();
    if (text.length < 5) { toast.error("Saisissez un prompt d'au moins 5 caractères."); return; }
    setSaving(true);
    try {
      await brandMonitoringApi.createPrompt(projectId, {
        text,
        topicHint: newTopic.trim() || undefined,
      });
      setNewText('');
      setNewTopic('');
      await reload();
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? "Le prompt n'a pas pu être ajouté. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length >= 5);
    if (lines.length === 0) { toast.error('Aucune ligne valide : chaque prompt doit faire au moins 5 caractères.'); return; }
    if (lines.length > 200) { toast.error('Importez 200 prompts au maximum à la fois.'); return; }
    setBulkSaving(true);
    try {
      const r = await brandMonitoringApi.bulkPrompts(projectId, lines.map(l => ({ text: l })));
      toast.success(`${r.inserted} prompts importés.`);
      setBulkText('');
      setBulkOpen(false);
      await reload();
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? "L'import n'a pas pu aboutir. Réessayez.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleToggle = async (prompt: MonitoringPrompt) => {
    try {
      await brandMonitoringApi.updatePrompt(prompt.id, { active: !prompt.active });
      await reload();
    } catch (err) {
      toast.error((err as Error).message ?? "Le prompt n'a pas pu être modifié. Réessayez.");
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await brandMonitoringApi.deletePrompt(pendingDelete.id);
      setPendingDelete(null);
      await reload();
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? "Le prompt n'a pas pu être supprimé. Réessayez.");
    }
  };

  const openSuggestions = async () => {
    setSuggestLoading(true);
    setSuggestOpen(true);
    try {
      const data = await brandMonitoringApi.suggestPrompts(projectId);
      setSuggestData(data);
      // Coche tout par défaut — l'admin décoche ce qu'il ne veut pas.
      setSelectedSugs(new Set(data.prompts.map((_, i) => i)));
    } catch (err) {
      const msg = (err as Error).message ?? 'Les suggestions ne sont pas disponibles. Réessayez plus tard.';
      if (msg.includes('Secteur')) {
        toast.error("Choisissez d'abord un secteur dans l'onglet Paramètres.");
        setSuggestOpen(false);
      } else {
        toast.error(msg);
      }
    } finally {
      setSuggestLoading(false);
    }
  };

  const toggleSug = (idx: number) => {
    setSelectedSugs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleImportSuggestions = async () => {
    if (!suggestData) return;
    const toImport = suggestData.prompts
      .filter((_, i) => selectedSugs.has(i))
      .map(p => ({ text: p.text, topicHint: p.topicHint }));
    if (toImport.length === 0) { toast.error('Sélectionnez au moins un prompt.'); return; }
    setImportingSugs(true);
    try {
      const r = await brandMonitoringApi.bulkPrompts(projectId, toImport);
      toast.success(`${r.inserted} prompts importés depuis la bibliothèque ${suggestData.industryLabel}.`);
      setSuggestOpen(false);
      setSuggestData(null);
      setSelectedSugs(new Set());
      await reload();
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? "L'import n'a pas pu aboutir. Réessayez.");
    } finally {
      setImportingSugs(false);
    }
  };

  if (loading) return <Skeleton className="bm-skeleton-card" />;

  return (
    <div className="bm-prompts">
      <section className="bm-card">
        <h3 className="bm-card__title">Ajouter un prompt</h3>
        <p className="bm-card__sub">
          Une question qu'un particulier pourrait poser, envoyée à Mistral. Préférez une formulation
          naturelle (« Quel hypermarché choisir pour les courses ? ») à une requête de recherche
          (« meilleur hypermarché »).
        </p>
        <div className="bm-form">
          <Input
            id="bm-new-prompt-text"
            label="Prompt"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Quel hypermarché choisir pour les courses ?"
          />
          <Input
            id="bm-new-prompt-topic"
            label="Thème (facultatif, l'IA le recalculera)"
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            placeholder="courses-quotidien"
          />
          <div className="bm-form__actions">
            <Button variant="primary" size="md" onClick={handleCreate} loading={saving} disabled={newText.trim().length < 5}>
              Ajouter le prompt
            </Button>
            <Button variant="secondary" size="md" onClick={openSuggestions}>
              <Sparkles size={20} />Suggestions de prompts
            </Button>
            <Button variant="ghost" size="md" onClick={() => setBulkOpen(o => !o)}>
              {bulkOpen ? "Annuler l'import en masse" : <><Upload size={16} />Importer en masse (CSV)</>}
            </Button>
          </div>
        </div>
        {bulkOpen && (
          <div className="bm-bulk">
            <p className="bm-bulk__hint">Un prompt par ligne, 200 au maximum.</p>
            <textarea
              className="bm-bulk__textarea"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={'Quel hypermarché choisir pour les courses ?\nQuelle enseigne propose le plus grand choix de produits bio ?\n…'}
              rows={8}
            />
            <Button variant="primary" size="sm" onClick={handleBulk} loading={bulkSaving}>
              Importer les prompts
            </Button>
          </div>
        )}
      </section>

      <section className="bm-card">
        <h3 className="bm-card__title">
          Prompts <span className="bm-card__count">({prompts.length})</span>
        </h3>
        {prompts.length === 0 ? (
          <p className="bm-empty-data">Aucun prompt pour l'instant.</p>
        ) : (
          <ul className="bm-prompts-list">
            {prompts.map(p => (
              <li key={p.id} className={`bm-prompt-row ${!p.active ? 'is-inactive' : ''}`}>
                <div className="bm-prompt-row__text">
                  {p.text}
                  {p.topic_cluster && (
                    <span className="bm-prompt-row__topic">· thème : {p.topic_cluster}</span>
                  )}
                </div>
                <div className="bm-prompt-row__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggle(p)}
                    aria-label={p.active ? 'Désactiver le prompt' : 'Activer le prompt'}
                  >
                    {p.active ? 'Actif' : 'Inactif'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPendingDelete(p)}
                    aria-label="Supprimer le prompt"
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer ce prompt ?"
          description={`« ${pendingDelete.text} » ne sera plus envoyé aux IA lors des prochaines analyses. Les réponses passées restent dans l'historique. Cette action est définitive.`}
          confirmLabel="Supprimer le prompt"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {suggestOpen && (
        <Modal
          title={suggestData ? `Suggestions — ${suggestData.industryLabel}` : 'Suggestions de prompts'}
          size="lg"
          onClose={() => { setSuggestOpen(false); setSuggestData(null); }}
        >
          {suggestLoading && <Skeleton className="bm-skeleton-card" />}
          {!suggestLoading && suggestData && (
            <div className="bm-suggest">
              <p className="bm-suggest__intro">
                Sélectionnez les prompts à ajouter à votre projet ({selectedSugs.size}/{suggestData.prompts.length} cochés).
                Tout est coché par défaut : décochez celles qui ne vous conviennent pas. Vous pourrez
                en ajouter ou en supprimer plus tard.
              </p>
              <div className="bm-suggest__actions">
                <button type="button" className="bm-suggest__toggle-all" onClick={() => setSelectedSugs(new Set(suggestData.prompts.map((_, i) => i)))}>
                  Tout cocher
                </button>
                <button type="button" className="bm-suggest__toggle-all" onClick={() => setSelectedSugs(new Set())}>
                  Tout décocher
                </button>
              </div>
              <ul className="bm-suggest__list">
                {suggestData.prompts.map((p, i) => (
                  <li key={i} className="bm-suggest__item">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedSugs.has(i)}
                        onChange={() => toggleSug(i)}
                      />
                      <span className="bm-suggest__text">{p.text}</span>
                      <span className="bm-suggest__topic">{p.topicHint}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="bm-suggest__footer">
                <Button variant="ghost" size="md" onClick={() => { setSuggestOpen(false); setSuggestData(null); }}>
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleImportSuggestions}
                  loading={importingSugs}
                  disabled={selectedSugs.size === 0}
                >
                  Importer les prompts {selectedSugs.size > 0 ? `(${selectedSugs.size})` : ''}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
