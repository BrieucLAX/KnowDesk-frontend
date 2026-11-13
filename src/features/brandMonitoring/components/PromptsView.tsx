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
      toast.error((err as Error).message ?? 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { void reload(); }, [reload]);

  const handleCreate = async () => {
    const text = newText.trim();
    if (text.length < 5) { toast.error('Le prompt doit faire au moins 5 caractères.'); return; }
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
      toast.error((err as Error).message ?? 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length >= 5);
    if (lines.length === 0) { toast.error('Aucune ligne valide (≥ 5 caractères) dans le texte.'); return; }
    if (lines.length > 200) { toast.error('Maximum 200 prompts à la fois.'); return; }
    setBulkSaving(true);
    try {
      const r = await brandMonitoringApi.bulkPrompts(projectId, lines.map(l => ({ text: l })));
      toast.success(`${r.inserted} prompts importés.`);
      setBulkText('');
      setBulkOpen(false);
      await reload();
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? 'Import impossible.');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleToggle = async (prompt: MonitoringPrompt) => {
    try {
      await brandMonitoringApi.updatePrompt(prompt.id, { active: !prompt.active });
      await reload();
    } catch (err) {
      toast.error((err as Error).message ?? 'Mise à jour impossible.');
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
      toast.error((err as Error).message ?? 'Suppression impossible.');
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
      const msg = (err as Error).message ?? 'Suggestions indisponibles.';
      if (msg.includes('Secteur')) {
        toast.error('Configure d\'abord un secteur dans l\'onglet Paramètres.');
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
    if (toImport.length === 0) { toast.error('Aucun prompt sélectionné.'); return; }
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
      toast.error((err as Error).message ?? 'Import impossible.');
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
          Une question d'utilisateur grand public qu'on enverra à Mistral. Préfère une formulation
          naturelle (« Quel hypermarché choisir pour les courses ? ») plutôt qu'une requête de recherche
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
            label="Topic (optionnel, sera regénéré par l'IA)"
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            placeholder="courses-quotidien"
          />
          <div className="bm-form__actions">
            <Button variant="primary" size="md" onClick={handleCreate} loading={saving} disabled={newText.trim().length < 5}>
              Ajouter
            </Button>
            <Button variant="secondary" size="md" onClick={openSuggestions}>
              <Sparkles size={20} />Suggestions de prompts
            </Button>
            <Button variant="ghost" size="md" onClick={() => setBulkOpen(o => !o)}>
              {bulkOpen ? 'Annuler import bulk' : <><Upload size={16} />Import bulk (CSV)</>}
            </Button>
          </div>
        </div>
        {bulkOpen && (
          <div className="bm-bulk">
            <p className="bm-bulk__hint">Une ligne = un prompt. Max 200.</p>
            <textarea
              className="bm-bulk__textarea"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={'Quel hypermarché choisir pour les courses ?\nQuelle enseigne propose le plus grand choix de produits bio ?\n…'}
              rows={8}
            />
            <Button variant="primary" size="sm" onClick={handleBulk} loading={bulkSaving}>
              Importer
            </Button>
          </div>
        )}
      </section>

      <section className="bm-card">
        <h3 className="bm-card__title">
          Prompts existants <span className="bm-card__count">({prompts.length})</span>
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
                    <span className="bm-prompt-row__topic">· topic : {p.topic_cluster}</span>
                  )}
                </div>
                <div className="bm-prompt-row__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggle(p)}
                    aria-label={p.active ? 'Désactiver' : 'Activer'}
                  >
                    {p.active ? 'Actif' : 'Inactif'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPendingDelete(p)}
                    aria-label="Supprimer"
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
          description={`« ${pendingDelete.text} » ne sera plus envoyé aux LLM lors des prochains runs. Les anciennes réponses restent dans l'historique.`}
          confirmLabel="Supprimer"
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
                Sélectionne les prompts que tu veux ajouter à ton projet ({selectedSugs.size}/{suggestData.prompts.length} cochés).
                Tout est coché par défaut — décoche ceux qui ne te parlent pas. Tu pourras toujours
                en ajouter / supprimer plus tard.
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
                  Importer {selectedSugs.size > 0 ? `(${selectedSugs.size})` : ''}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
