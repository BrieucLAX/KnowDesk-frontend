import React from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';
import { HelpPopover } from '../../../../shared/components/ui/HelpPopover';
import type { AiTone, AiAddressForm, AiGlossaryEntry } from '../../types';
import type { ChatbotTabContext } from './types';
import { ArrowRight, Plus, X } from 'lucide-react';

const TONE_OPTIONS: Array<{ value: AiTone; label: string; hint: string }> = [
  { value: 'professional', label: 'Professionnelle', hint: 'Neutre, factuelle' },
  { value: 'warm',         label: 'Chaleureuse',     hint: 'Accueillante, humaine' },
  { value: 'direct',       label: 'Directe',         hint: 'Droit au but' },
  { value: 'empathetic',   label: 'Empathique',      hint: 'Sensible aux situations délicates' },
  { value: 'casual',       label: 'Décontractée',    hint: 'Accessible, moderne' },
];
const MAX_GLOSSARY = 30;

/**
 * Tab "Personnalisation" — réglages partagés avec ✨ IA recherche
 * (industry, tone, addressForm, glossaire). Modifier ici met aussi
 * à jour la Réponse IA conseiller.
 */
export function ChatbotAiPersoTab({ ctx }: { ctx: ChatbotTabContext }) {
  const { form, setForm, addGlossaryRow, updateGlossaryRow, removeGlossaryRow } = ctx;
  return (
    <>
      <p className="settings-section__desc">
        <strong>Ces valeurs sont partagées avec la section Recherche interne</strong> : les modifier
        ici les modifie aussi pour la réponse IA des conseillers.
      </p>

      <Input
        id="chat-industry"
        label="Secteur d'activité"
        value={form.industry ?? ''}
        maxLength={80}
        placeholder="Par exemple : télécoms, banque, commerce, santé…"
        onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
        helperText="Personnalise la présentation du chatbot. Laissez vide pour une formulation générique."
      />

      <div className="field">
        <label htmlFor="chat-tone" className="field-label">Tonalité</label>
        <select
          id="chat-tone"
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
      </div>

      <div className="field">
        <label className="field-label">Forme d'adresse</label>
        <div className="ai-radio-group">
          {([
            { value: null,   label: 'Aucune préférence' },
            { value: 'vous', label: 'Vouvoiement' },
            { value: 'tu',   label: 'Tutoiement' },
          ] as Array<{ value: AiAddressForm | null; label: string }>).map(opt => (
            <label key={String(opt.value)} className="ai-radio">
              <input
                type="radio"
                name="chat-address-form"
                checked={form.ai_address_form === opt.value}
                onChange={() => setForm(f => ({ ...f, ai_address_form: opt.value }))}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          Glossaire
          <HelpPopover content={
            <>
              Le glossaire est <strong>ajouté à la consigne système</strong>{' '}
              à chaque question. Au-delà de 10 paires, le coût de chaque réponse
              augmente sensiblement. Limitez-le aux termes propres à votre
              métier. Les synonymes génériques se gèrent dans la section
              Synonymes des paramètres.
            </>
          } />
        </label>
        <p className="field-helper chatbot-settings__field-helper-tight">
          Termes que l'IA doit utiliser à la place du vocabulaire générique,
          par exemple « abonné » à la place de « client ».
        </p>
        <div className="ai-glossary">
          {(form.ai_glossary?.length ?? 0) === 0 && (
            <p className="ai-glossary__empty">
              Aucune correspondance pour l'instant.
            </p>
          )}
          {(form.ai_glossary ?? []).map((row: AiGlossaryEntry, i: number) => (
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
                aria-label="Supprimer ce terme"
                title="Supprimer ce terme"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {(form.ai_glossary?.length ?? 0) < MAX_GLOSSARY && (
            <Button type="button" variant="ghost" size="sm" onClick={addGlossaryRow}>
              <Plus size={16} />Ajouter un terme
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
