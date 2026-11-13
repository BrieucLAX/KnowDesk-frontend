import React, { useCallback, useEffect, useState } from 'react';
import { Button }            from '../../../shared/components/ui/Button';
import { Input }             from '../../../shared/components/ui/Input';
import { Skeleton }          from '../../../shared/components/ui/Skeleton';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { useToast }          from '../../../shared/lib/useToast';
import { useTrackDirty }     from '../lib/dirtyContext';
import { LastModifiedBadge } from './LastModifiedBadge';
import type {
  AiOrgSettings, AiTone, AiAddressForm, AiGlossaryEntry,
} from '../types';
import { ArrowRight, Plus, Sparkles, X } from 'lucide-react';

const TONE_OPTIONS: Array<{ value: AiTone; label: string; hint: string }> = [
  { value: 'professional', label: 'Professionnelle', hint: 'Neutre, factuelle — défaut institutionnel' },
  { value: 'warm',         label: 'Chaleureuse',     hint: 'Accueillante, humaine — service haut de gamme' },
  { value: 'direct',       label: 'Directe',         hint: 'Droit au but — gain de temps conseiller' },
  { value: 'empathetic',   label: 'Empathique',      hint: 'Sensible aux situations délicates (banque, santé)' },
  { value: 'casual',       label: 'Décontractée',    hint: 'Accessible, moderne — marques B2C jeunes' },
];

const MAX_GLOSSARY = 30;

export function AiSettingsSection() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const initialFormDefault: AiOrgSettings = {
    ai_answer_enabled: true,
    industry:          '',
    ai_tone:           null,
    ai_address_form:   null,
    ai_glossary:       [],
  };
  const [form,        setForm]        = useState<AiOrgSettings>(initialFormDefault);
  const [initialForm, setInitialForm] = useState<AiOrgSettings>(initialFormDefault);
  useTrackDirty(form, initialForm);

  useEffect(() => {
    apiClient.get<AiOrgSettings>('/settings/org')
      .then(o => {
        const next: AiOrgSettings = {
          ai_answer_enabled: o.ai_answer_enabled ?? true,
          industry:          o.industry ?? '',
          ai_tone:           o.ai_tone,
          ai_address_form:   o.ai_address_form,
          ai_glossary:       Array.isArray(o.ai_glossary) ? o.ai_glossary : [],
        };
        setForm(next);
        setInitialForm(next);
      })
      .catch(() => { /* on garde les defaults */ })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch('/settings/org/ai', {
        enabled:     form.ai_answer_enabled,
        industry:    (form.industry ?? '').trim() || null,
        tone:        form.ai_tone,
        addressForm: form.ai_address_form,
        glossary:    form.ai_glossary.filter(g => g.from.trim() && g.to.trim()),
      });
      setInitialForm(form);
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Les paramètres n\'ont pas été enregistrés. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [form, toast]);

  const addGlossaryRow = useCallback(() => {
    setForm(f => f.ai_glossary.length >= MAX_GLOSSARY
      ? f
      : { ...f, ai_glossary: [...f.ai_glossary, { from: '', to: '' }] });
  }, []);

  const updateGlossaryRow = useCallback((index: number, field: 'from' | 'to', value: string) => {
    setForm(f => ({
      ...f,
      ai_glossary: f.ai_glossary.map((row, i) => i === index ? { ...row, [field]: value } : row),
    }));
  }, []);

  const removeGlossaryRow = useCallback((index: number) => {
    setForm(f => ({ ...f, ai_glossary: f.ai_glossary.filter((_, i) => i !== index) }));
  }, []);

  if (loading) {
    return (
      <section className="settings-section">
        <Skeleton className="sk-title" />
        <Skeleton className="sk-p" />
      </section>
    );
  }

  return (
    <section className="settings-section" aria-labelledby="ai-title">
      <div className="settings-section__header">
        <h2 id="ai-title" className="settings-section__title icon-label"><Sparkles size={20} />Recherche interne</h2>
        <p className="settings-section__desc">
          Paramètres de la <strong>réponse IA</strong> affichée aux conseillers au-dessus des résultats
          de la recherche interne. Les réponses sont générées par Mistral, uniquement à partir
          de votre base.
        </p>
        <LastModifiedBadge actions={['org.ai_settings_updated']} />
      </div>

      <form className="settings-form" onSubmit={handleSave} noValidate>
        {/* Toggle principal */}
        <div className="settings-toggles">
          <div className="toggle-row">
            <div className="toggle-row__text">
              <label htmlFor="ai-enabled-toggle" className="toggle-row__label">
                Recherche IA activée
              </label>
              <p className="toggle-row__desc">
                Désactivée, la barre de recherche affiche seulement les résultats
                classiques, sans carte « Réponse IA ».
              </p>
            </div>
            <button
              type="button"
              role="switch"
              id="ai-enabled-toggle"
              aria-checked={form.ai_answer_enabled}
              className={`toggle ${form.ai_answer_enabled ? 'toggle--on' : ''}`}
              onClick={() => setForm(f => ({ ...f, ai_answer_enabled: !f.ai_answer_enabled }))}
            >
              <span className="toggle__thumb" />
            </button>
          </div>
        </div>

        {/* Champs personnalisation — ne servent que si enabled est ON */}
        <fieldset
          disabled={!form.ai_answer_enabled}
          className="ai-settings__fields"
          style={{ opacity: form.ai_answer_enabled ? 1 : 0.5 }}
        >
          <Input
            id="ai-industry"
            label="Secteur d'activité"
            value={form.industry ?? ''}
            maxLength={80}
            placeholder="Par exemple : télécoms, banque, commerce, santé…"
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
            helperText="Précise le contexte donné à l'IA (« assistant pour un service client dans le secteur X »). Laissez vide pour une formulation générique."
          />

          {/* Tonalité */}
          <div className="field">
            <label htmlFor="ai-tone" className="field-label">Tonalité</label>
            <select
              id="ai-tone"
              className="field-input"
              value={form.ai_tone ?? ''}
              onChange={e => setForm(f => ({
                ...f,
                ai_tone: (e.target.value || null) as AiTone | null,
              }))}
            >
              <option value="">— Aucune préférence —</option>
              {TONE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label} — {t.hint}</option>
              ))}
            </select>
            <p className="field-helper">
              Comment l'IA s'exprime dans ses réponses. « Aucune préférence » laisse Mistral en mode neutre par défaut.
            </p>
          </div>

          {/* Forme d'adresse */}
          <div className="field">
            <label className="field-label">Forme d'adresse</label>
            <div className="ai-radio-group">
              <label className="ai-radio">
                <input
                  type="radio"
                  name="ai-address-form"
                  value=""
                  checked={form.ai_address_form === null}
                  onChange={() => setForm(f => ({ ...f, ai_address_form: null }))}
                />
                <span>Aucune préférence</span>
              </label>
              <label className="ai-radio">
                <input
                  type="radio"
                  name="ai-address-form"
                  value="vous"
                  checked={form.ai_address_form === 'vous'}
                  onChange={() => setForm(f => ({ ...f, ai_address_form: 'vous' }))}
                />
                <span>Vouvoiement</span>
              </label>
              <label className="ai-radio">
                <input
                  type="radio"
                  name="ai-address-form"
                  value="tu"
                  checked={form.ai_address_form === 'tu'}
                  onChange={() => setForm(f => ({ ...f, ai_address_form: 'tu' }))}
                />
                <span>Tutoiement</span>
              </label>
            </div>
          </div>

          {/* Glossaire */}
          <div className="field">
            <label className="field-label">Glossaire</label>
            <p className="field-helper" style={{ marginTop: 0, marginBottom: 8 }}>
              Termes que l'IA doit utiliser à la place du vocabulaire générique,
              par exemple « abonné » à la place de « client ».
            </p>
            <div className="ai-glossary">
              {form.ai_glossary.length === 0 && (
                <p className="ai-glossary__empty">
                  Aucune correspondance pour l'instant. Ajoutez-en pour personnaliser le vocabulaire de l'IA.
                </p>
              )}
              {form.ai_glossary.map((row: AiGlossaryEntry, i: number) => (
                <div key={i} className="ai-glossary__row">
                  <input
                    type="text"
                    className="field-input ai-glossary__input"
                    value={row.from}
                    placeholder="Terme générique (ex. client)"
                    maxLength={50}
                    onChange={e => updateGlossaryRow(i, 'from', e.target.value)}
                  />
                  <span className="ai-glossary__arrow" aria-hidden="true"><ArrowRight size={16} /></span>
                  <input
                    type="text"
                    className="field-input ai-glossary__input"
                    value={row.to}
                    placeholder="Terme préféré (ex. abonné)"
                    maxLength={50}
                    onChange={e => updateGlossaryRow(i, 'to', e.target.value)}
                  />
                  <button
                    type="button"
                    className="ai-glossary__remove"
                    onClick={() => removeGlossaryRow(i)}
                    aria-label="Supprimer cette correspondance"
                    title="Supprimer cette correspondance"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {form.ai_glossary.length < MAX_GLOSSARY && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addGlossaryRow}
                >
                  <Plus size={16} />Ajouter un terme
                </Button>
              )}
            </div>
          </div>
        </fieldset>

        <div className="settings-form__actions">
          <Button type="submit" variant="primary" size="md" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </section>
  );
}
