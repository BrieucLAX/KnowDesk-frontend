import { useEffect, useState, useCallback } from 'react';
import { brandMonitoringApi } from '../api/brandMonitoringApi';
import { useToast } from '../../../shared/lib/useToast';
import { Button } from '../../../shared/components/ui/Button';
import { Input }  from '../../../shared/components/ui/Input';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import type { MonitoredBrand, IndustryMeta, IndustryKey, BrandProject, LlmMode, ProviderMeta, BrandMonitoringProvider, MonitoredBrandKind } from '../types';
import { Star } from 'lucide-react';

interface SettingsViewProps {
  projectId:       string;
  onReloadProject: () => void;
}

export function SettingsView({ projectId, onReloadProject }: SettingsViewProps) {
  const toast = useToast();
  const [project, setProject] = useState<BrandProject | null>(null);
  const [brands,  setBrands]  = useState<MonitoredBrand[]>([]);
  const [industries, setIndustries] = useState<IndustryMeta[]>([]);
  const [providers,  setProviders]  = useState<ProviderMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIndustry, setSavingIndustry] = useState(false);

  // formulaire création brand/product
  const [newName,    setNewName]    = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [newOwner,   setNewOwner]   = useState(false);
  const [newKind,    setNewKind]    = useState<MonitoredBrandKind>('brand');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MonitoredBrand | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p, inds, prs] = await Promise.all([
        brandMonitoringApi.listBrands(projectId),
        brandMonitoringApi.getProject(projectId),
        brandMonitoringApi.listIndustries(),
        brandMonitoringApi.listProviders(),
      ]);
      setBrands(b);
      setProject(p);
      setIndustries(inds);
      setProviders(prs);
    } catch (err) {
      toast.error((err as Error).message ?? "Les paramètres n'ont pas pu être chargés. Rechargez la page.");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const handleIndustryChange = async (value: string) => {
    const industry = value === '' ? null : value as IndustryKey;
    setSavingIndustry(true);
    try {
      await brandMonitoringApi.updateProject(projectId, { industry });
      setProject(prev => prev ? { ...prev, industry } : prev);
      onReloadProject();
      if (industry) {
        toast.success("Secteur enregistré. Vous pouvez maintenant utiliser le bouton « Suggestions de prompts » dans l'onglet Prompts.");
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Le secteur n'a pas pu être enregistré. Réessayez.");
    } finally {
      setSavingIndustry(false);
    }
  };

  const handleProviderToggle = async (provider: BrandMonitoringProvider, enabled: boolean) => {
    if (!project) return;
    const current = project.enabled_providers ?? [];
    const next = enabled
      ? Array.from(new Set([...current, provider]))
      : current.filter(p => p !== provider);
    if (next.length === 0) {
      toast.error("Au moins un modèle d'IA doit rester actif.");
      return;
    }
    try {
      await brandMonitoringApi.updateProject(projectId, { enabledProviders: next });
      setProject(prev => prev ? { ...prev, enabled_providers: next } : prev);
      const labels = providers.filter(p => next.includes(p.key)).map(p => p.label).join(', ');
      toast.success(`Modèles d'IA actifs : ${labels}. Chaque prompt sera envoyé à chacun d'eux (quota ×${next.length}).`);
    } catch (err) {
      toast.error((err as Error).message ?? "La modification n'a pas pu être enregistrée. Réessayez.");
    }
  };

  // legacy V1 — conservé pour rétrocompat mais plus exposé en UI (R-S3
  // remplace par les checkbox providers).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleLlmModeChange = async (mode: LlmMode) => {
    await brandMonitoringApi.updateProject(projectId, { llmMode: mode });
  };

  // R-S7 — saisie textarea libre, parsée en array de strings au save
  const [attrsDraft, setAttrsDraft] = useState('');
  const [savingAlign, setSavingAlign] = useState(false);

  // Initialise le draft quand le projet arrive
  useEffect(() => {
    if (project) setAttrsDraft((project.desired_attributes ?? []).join(', '));
  }, [project]);

  const handleAlignmentToggle = async (enabled: boolean) => {
    try {
      await brandMonitoringApi.updateProject(projectId, { alignmentEnabled: enabled });
      setProject(prev => prev ? { ...prev, alignment_enabled: enabled } : prev);
      toast.success(enabled
        ? 'Alignement narratif activé. Mistral extraira les attributs associés à chaque marque mentionnée (1 quota supplémentaire par réponse).'
        : 'Alignement narratif désactivé.');
    } catch (err) {
      toast.error((err as Error).message ?? "La modification n'a pas pu être enregistrée. Réessayez.");
    }
  };

  const handleSaveAttributes = async () => {
    const attrs = attrsDraft.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length >= 2);
    if (attrs.length > 8) { toast.error('Saisissez 8 attributs prioritaires au maximum.'); return; }
    setSavingAlign(true);
    try {
      await brandMonitoringApi.updateProject(projectId, { desiredAttributes: attrs });
      setProject(prev => prev ? { ...prev, desired_attributes: attrs } : prev);
      toast.success(`${attrs.length} attribut${attrs.length > 1 ? 's' : ''} prioritaire${attrs.length > 1 ? 's' : ''} enregistré${attrs.length > 1 ? 's' : ''}.`);
    } catch (err) {
      toast.error((err as Error).message ?? "Les attributs n'ont pas pu être enregistrés. Réessayez.");
    } finally {
      setSavingAlign(false);
    }
  };

  const handleSentimentToggle = async (enabled: boolean) => {
    try {
      await brandMonitoringApi.updateProject(projectId, { sentimentEnabled: enabled });
      setProject(prev => prev ? { ...prev, sentiment_enabled: enabled } : prev);
      toast.success(enabled
        ? "Analyse de sentiment activée. Elle s'appliquera à partir de la prochaine analyse (1 quota supplémentaire par réponse)."
        : 'Analyse de sentiment désactivée.');
    } catch (err) {
      toast.error((err as Error).message ?? "La modification n'a pas pu être enregistrée. Réessayez.");
    }
  };

  useEffect(() => { void reload(); }, [reload]);

  const parseAliases = (raw: string): string[] =>
    raw.split(',').map(a => a.trim()).filter(a => a.length > 0).slice(0, 20);

  const handleCreate = async () => {
    const name = newName.trim();
    const aliases = parseAliases(newAliases);
    if (name.length < 1) { toast.error('Saisissez le nom de la marque ou du produit.'); return; }
    if (aliases.length === 0) { toast.error('Ajoutez au moins un alias (le nom lui-même convient).'); return; }
    // La contrainte UNIQUE owner ne s'applique qu'aux marques 'brand' (pour
    // les produits, on peut avoir N produits MDD owner). Le backend a la
    // même règle via l'index unique partiel.
    if (newOwner && newKind === 'brand' && brands.some(b => b.is_owner && b.kind === 'brand')) {
      toast.error('Votre marque est déjà définie pour ce projet. Décochez la case pour ajouter une marque concurrente.');
      return;
    }
    setSaving(true);
    try {
      await brandMonitoringApi.createBrand(projectId, { name, aliases, isOwner: newOwner, kind: newKind });
      setNewName(''); setNewAliases(''); setNewOwner(false); setNewKind('brand');
      await reload();
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? "La marque n'a pas pu être ajoutée. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await brandMonitoringApi.deleteBrand(pendingDelete.id);
      setPendingDelete(null);
      await reload();
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? "La marque n'a pas pu être supprimée. Réessayez.");
    }
  };

  if (loading) return <Skeleton className="bm-skeleton-card" />;

  return (
    <div className="bm-settings">
      <section className="bm-card">
        <h3 className="bm-card__title">Secteur d'activité du projet</h3>
        <p className="bm-card__sub">
          Choisissez le secteur pour accéder à la bibliothèque de prompts suggérés
          (25 prompts adaptés à votre marché, dans l'onglet Prompts).
        </p>
        <div className="bm-form">
          <label className="bm-select-wrap" htmlFor="bm-industry">
            <span className="bm-select-label">Secteur</span>
            <select
              id="bm-industry"
              className="bm-select"
              value={project?.industry ?? ''}
              onChange={e => handleIndustryChange(e.target.value)}
              disabled={savingIndustry}
            >
              <option value="">— Non défini —</option>
              {industries.map(ind => (
                <option key={ind.key} value={ind.key}>{ind.label} ({ind.promptCount} prompts)</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="bm-card">
        <h3 className="bm-card__title">Modèles d'IA</h3>
        <p className="bm-card__sub">
          Choisissez les IA auxquelles envoyer chaque prompt. <strong>Plus vous en activez, plus votre couverture du marché est large</strong>,
          mais chaque IA activée consomme 1 unité de quota par prompt (le coût mensuel est multiplié d'autant).
          Les IA grisées demandent une clé API dans Railway (variables d'environnement) avant de pouvoir être activées.
        </p>
        <div className="bm-providers">
          {providers.map(p => {
            const active = project?.enabled_providers?.includes(p.key) ?? false;
            return (
              <label
                key={p.key}
                className={`bm-provider ${active ? 'is-active' : ''} ${!p.configured ? 'is-disabled' : ''}`}
                title={!p.configured ? `Clé API non configurée pour ${p.label}` : undefined}
              >
                <input
                  type="checkbox"
                  checked={active}
                  disabled={!p.configured}
                  onChange={e => handleProviderToggle(p.key, e.target.checked)}
                />
                <div className="bm-provider__body">
                  <div className="bm-provider__head">
                    <strong>{p.label}</strong>
                    {p.exposesSources && <span className="bm-chip bm-chip--sources">Sources</span>}
                    {!p.configured && <span className="bm-chip bm-chip--disabled">Clé API requise</span>}
                  </div>
                  <p className="bm-provider__desc">{p.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="bm-card">
        <h3 className="bm-card__title">Analyse de sentiment (optionnelle)</h3>
        <p className="bm-card__sub">
          Une fois activée, chaque réponse de Mistral est analysée à nouveau pour évaluer le sentiment
          (positif, neutre ou négatif) envers chaque marque mentionnée. Vous savez ainsi si une
          marque est citée pour être recommandée ou critiquée. Coût : <strong>1 unité de quota
          supplémentaire par réponse</strong>. Pensez à augmenter
          BRAND_MONITORING_MONTHLY_CALL_QUOTA si vous l'activez sur tous les projets.
        </p>
        <label className="bm-checkbox">
          <input
            type="checkbox"
            checked={project?.sentiment_enabled ?? false}
            onChange={e => handleSentimentToggle(e.target.checked)}
          />
          Activer l'analyse de sentiment pour les prochaines analyses
        </label>
      </section>

      <section className="bm-card">
        <h3 className="bm-card__title">Alignement narratif (optionnel)</h3>
        <p className="bm-card__sub">
          Définissez le <strong>positionnement souhaité</strong> de votre marque (3 à 8 attributs prioritaires),
          puis activez l'analyse. Pour chaque réponse, Mistral extrait les attributs réellement
          associés à chaque marque : vous voyez si les IA vous décrivent conformément à votre
          positionnement ou autrement. Coût : <strong>1 unité de quota supplémentaire par réponse</strong>.
        </p>
        <div className="bm-form" style={{ marginBottom: 8 }}>
          <label htmlFor="bm-desired-attrs" className="bm-select-label">
            Attributs prioritaires (séparés par des virgules, 8 au maximum)
          </label>
          <textarea
            id="bm-desired-attrs"
            className="bm-bulk__textarea"
            rows={2}
            value={attrsDraft}
            onChange={e => setAttrsDraft(e.target.value)}
            placeholder="prix bas, drive, bio, famille, frais"
          />
          <div className="bm-form__actions">
            <Button variant="primary" size="sm" onClick={handleSaveAttributes} loading={savingAlign}>
              Enregistrer les attributs
            </Button>
          </div>
        </div>
        <label className="bm-checkbox">
          <input
            type="checkbox"
            checked={project?.alignment_enabled ?? false}
            onChange={e => handleAlignmentToggle(e.target.checked)}
          />
          Activer l'extraction d'attributs pour les prochaines analyses
        </label>
      </section>

      <section className="bm-card">
        <h3 className="bm-card__title">Ajouter une marque ou un produit</h3>
        <p className="bm-card__sub">
          <strong>Marque</strong> : enseigne ou acteur du marché (Auchan, Carrefour, Leclerc).
          <strong> Produit</strong> : référence grand public ou marque de distributeur (Auchan Bio,
          Carrefour Sélection, Mmm!), utile quand l'IA répond à des questions comme
          « Quel yaourt bio acheter ? ».
          Les <strong>alias</strong> sont les variantes du nom recherchées dans les réponses des IA.
        </p>
        <div className="bm-form">
          <fieldset className="bm-radio-group" style={{ marginBottom: 8 }}>
            {(['brand', 'product'] as MonitoredBrandKind[]).map(k => (
              <label key={k} className={`bm-radio ${newKind === k ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="new-kind"
                  value={k}
                  checked={newKind === k}
                  onChange={() => setNewKind(k)}
                />
                <span>{k === 'brand' ? 'Marque' : 'Produit'}</span>
              </label>
            ))}
          </fieldset>
          <Input
            id="bm-new-brand-name"
            label={newKind === 'product' ? 'Nom du produit' : 'Nom de la marque'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={newKind === 'product' ? 'Auchan Bio Yaourts' : 'Auchan'}
          />
          <Input
            id="bm-new-brand-aliases"
            label="Alias (séparés par des virgules, 20 au maximum)"
            value={newAliases}
            onChange={e => setNewAliases(e.target.value)}
            placeholder={newKind === 'product' ? 'Auchan Bio, Mmm!, Cuir & Compagnie' : 'Auchan, Auchan Drive, auchan.fr'}
          />
          <label className="bm-checkbox">
            <input type="checkbox" checked={newOwner} onChange={e => setNewOwner(e.target.checked)} />
            {newKind === 'product'
              ? 'Ce produit appartient à votre marque (marque de distributeur). Vous pouvez cocher plusieurs produits.'
              : "C'est votre marque. Il ne peut y en avoir qu'une par projet."}
          </label>
          <div className="bm-form__actions">
            <Button variant="primary" size="md" onClick={handleCreate} loading={saving}>
              {newKind === 'product' ? 'Ajouter le produit' : 'Ajouter la marque'}
            </Button>
          </div>
        </div>
      </section>

      {(['brand', 'product'] as MonitoredBrandKind[]).map(kind => {
        const list = brands.filter(b => (b.kind ?? 'brand') === kind);
        const title = kind === 'brand' ? 'Marques suivies' : 'Produits suivis';
        const empty = kind === 'brand'
          ? "Aucune marque pour l'instant. Ajoutez au moins votre marque."
          : "Aucun produit suivi. Ajoutez des références grand public pour mesurer ce que les IA recommandent à l'achat.";
        // Section "Produits" masquée tant que rien n'a été créé (UX propre
        // pour les projets qui ne monitorent que des enseignes).
        if (kind === 'product' && list.length === 0) return null;
        return (
          <section key={kind} className="bm-card">
            <h3 className="bm-card__title">
              {title} <span className="bm-card__count">({list.length})</span>
            </h3>
            {list.length === 0 ? (
              <p className="bm-empty-data">{empty}</p>
            ) : (
              <ul className="bm-brands-list">
                {list.map(b => (
                  <li key={b.id} className={`bm-brand-row ${b.is_owner ? 'is-owner' : ''}`}>
                    <div className="bm-brand-row__head">
                      {b.is_owner && <span className="bm-brand-row__star" aria-hidden="true"><Star size={16} /></span>}
                      <strong>{b.name}</strong>
                    </div>
                    <div className="bm-brand-row__aliases">
                      {b.aliases.map(a => <span key={a} className="bm-chip">{a}</span>)}
                    </div>
                    <div className="bm-brand-row__actions">
                      <Button variant="secondary" size="sm" onClick={() => setPendingDelete(b)}>
                        Supprimer
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer cette marque ?"
          description={`« ${pendingDelete.name} » sera retirée du suivi. Ses mentions passées restent dans l'historique, mais ne seront plus comptées dans les prochaines analyses. Cette action est définitive.`}
          confirmLabel="Supprimer la marque"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
