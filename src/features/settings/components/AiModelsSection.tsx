import React, { useEffect, useState, useCallback } from 'react';
import { aiModelsApi }    from '../api/aiModelsApi';
import { useToast }       from '../../../shared/lib/useToast';
import { Skeleton }       from '../../../shared/components/ui/Skeleton';
import { HelpPopover }    from '../../../shared/components/ui/HelpPopover';
import { LastModifiedBadge } from './LastModifiedBadge';
import { ApiError }       from '../../../shared/lib/apiClient';
import type {
  AiServicesPayload, AiServiceItem, ChatModelId, ChatModelMeta,
} from '../types';
import { BookOpen, Globe, GraduationCap, LockKeyhole, MessageCircle, Radar, Search } from 'lucide-react';

/**
 * Section "Modèles IA" — admin org. Liste les 4 services IA de la
 * plateforme avec leur modèle actuel. Seul "chat-response" est
 * modifiable en V1, les autres sont verrouillés sur Mistral Small.
 *
 * Effet de la bascule : prend effet au prochain turn bot, y compris
 * dans les conversations actives. Pas de fallback en V1.
 */
export function AiModelsSection() {
  const toast = useToast();
  const [data, setData] = useState<AiServicesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    aiModelsApi.list()
      .then(payload => { setData(payload); setLoading(false); })
      .catch(err => {
        toast.error(err instanceof ApiError ? err.message : 'Les modèles d\'IA n\'ont pas pu être chargés. Rechargez la page.');
        setLoading(false);
      });
  }, [toast]);

  const handleChatModelChange = useCallback(async (modelId: ChatModelId) => {
    if (!data || saving) return;
    setSaving(true);
    try {
      await aiModelsApi.updateChatModel(modelId);
      // Mise à jour optimiste locale
      setData(prev => prev ? {
        ...prev,
        services: prev.services.map(s =>
          s.key === 'chat-response' ? { ...s, model: modelId } : s,
        ),
      } : prev);
      toast.success('Modèle du chatbot mis à jour.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Le modèle n\'a pas été modifié. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [data, saving, toast]);

  if (loading) {
    return (
      <section className="settings-section">
        <h2 className="settings-section__title">Modèles d'IA</h2>
        <Skeleton className="ai-models-sk" />
        <Skeleton className="ai-models-sk" />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="settings-section">
        <h2 className="settings-section__title">Modèles d'IA</h2>
        <p className="settings-section__error" role="alert">
          Les modèles d'IA n'ont pas pu être chargés. Rechargez la page.
        </p>
      </section>
    );
  }

  return (
    <section className="settings-section ai-models">
      <header className="settings-section__header">
        <h2 className="settings-section__title">
          Modèles d'IA
          <HelpPopover content={
            <>
              Le coût relatif est estimé par rapport au modèle de référence{' '}
              <code>Mistral Small</code> (×1). Un modèle ×10 coûte 10 fois plus
              par requête. La rapidité affichée est indicative : le temps
              d'attente du visiteur dépend aussi de la longueur de la
              réponse générée.
            </>
          } />
        </h2>
        <p className="settings-section__desc">
          Cette plateforme utilise plusieurs services d'intelligence artificielle.
          Vous pouvez choisir ci-dessous le modèle utilisé par le chatbot. Les autres
          services utilisent le modèle par défaut.
        </p>
        <LastModifiedBadge actions={['org.chat_model.changed']} />
      </header>

      <div className="ai-models__list">
        {(data.categories ?? []).length === 0 ? (
          // Fallback : backend pas encore redéployé OU services anciens
          // sans `category`. On affiche les services à plat sans groupage.
          data.services.map(svc => (
            <ServiceCard
              key={svc.key}
              service={svc}
              availableModels={data.availableModels}
              saving={saving}
              onChangeModel={handleChatModelChange}
            />
          ))
        ) : (
          data.categories.map(cat => {
            const servicesInCat = data.services.filter(s => s.category === cat.key);
            if (servicesInCat.length === 0) return null;
            return (
              <div key={cat.key} className="ai-models__category">
                <div className="ai-models__category-head">
                  <h3 className="ai-models__category-title icon-label">
                    {CATEGORY_ICON[cat.key] ?? null}{stripLeadingEmoji(cat.label)}
                  </h3>
                  <p className="ai-models__category-desc">{cat.description}</p>
                </div>
                <div className="ai-models__category-services">
                  {servicesInCat.map(svc => (
                    <ServiceCard
                      key={svc.key}
                      service={svc}
                      availableModels={data.availableModels}
                      saving={saving}
                      onChangeModel={handleChatModelChange}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

interface ServiceCardProps {
  service:         AiServiceItem;
  availableModels: ChatModelMeta[];
  saving:          boolean;
  onChangeModel:   (id: ChatModelId) => void;
}

/** Picto de chaque groupe de modèles ; le libellé du back porte encore un emoji, retiré à l'affichage. */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  chatbot:          <MessageCircle size={20} />,
  search:           <Search size={20} />,
  kb:               <BookOpen size={20} />,
  learning:         <GraduationCap size={20} />,
  brand_monitoring: <Radar size={20} />,
};
const stripLeadingEmoji = (label: string) => label.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '');

function ServiceCard({ service, availableModels, saving, onChangeModel }: ServiceCardProps) {
  const currentMeta = availableModels.find(m => m.id === service.model);
  // Drapeau gardé pour la France (identifiant, comme un logo) ; sinon le globe.
  const flag = currentMeta?.region === 'FR' ? '🇫🇷' : <Globe size={16} />;

  return (
    <article className="ai-models__service" aria-labelledby={`ai-svc-${service.key}-title`}>
      <div className="ai-models__service-head">
        <div>
          <h3 id={`ai-svc-${service.key}-title`} className="ai-models__service-title">
            {service.label}
          </h3>
          <p className="ai-models__service-desc">{service.description}</p>
        </div>
        <div className="ai-models__service-current">
          <span className="ai-models__flag" aria-hidden="true">{flag}</span>
          <span className="ai-models__current-label">
            {service.modelLabel ?? currentMeta?.label ?? service.model}
          </span>
          {!service.modifiable && (
            <span className="ai-models__lock" title="Non modifiable pour l'instant">
              <LockKeyhole size={16} role="img" aria-label="Verrouillé" />
            </span>
          )}
        </div>
      </div>

      {service.modifiable && (
        <ul className="ai-models__choices" role="radiogroup" aria-label={`Modèle pour ${service.label}`}>
          {availableModels.map(m => {
            const checked = m.id === service.model;
            return (
              <li key={m.id}>
                <label className={`ai-models__choice${checked ? ' ai-models__choice--active' : ''}${saving ? ' ai-models__choice--saving' : ''}`}>
                  <input
                    type="radio"
                    name={`ai-svc-${service.key}-model`}
                    value={m.id}
                    checked={checked}
                    disabled={saving}
                    onChange={() => onChangeModel(m.id)}
                    className="ai-models__choice-input"
                  />
                  <div className="ai-models__choice-body">
                    <div className="ai-models__choice-head">
                      <span className="ai-models__choice-flag" aria-hidden="true">🇫🇷</span>
                      <span className="ai-models__choice-name">{m.label}</span>
                      <span className={`ai-models__latency ai-models__latency--${m.latencyClass}`}>
                        {latencyLabel(m.latencyClass)}
                      </span>
                      <span className="ai-models__cost" title="Coût relatif">
                        ×{m.costRelative}
                      </span>
                    </div>
                    <p className="ai-models__choice-desc">{m.description}</p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function latencyLabel(c: ChatModelMeta['latencyClass']): string {
  switch (c) {
    case 'fast':   return 'Rapide';
    case 'medium': return 'Équilibré';
    case 'slow':   return 'Précis (plus lent)';
  }
}
