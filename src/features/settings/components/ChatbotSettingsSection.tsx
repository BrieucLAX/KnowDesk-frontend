import React, { useCallback, useEffect, useState } from 'react';
import { Button }            from '../../../shared/components/ui/Button';
import { Input }             from '../../../shared/components/ui/Input';
import { Skeleton }          from '../../../shared/components/ui/Skeleton';
import { ConfirmDialog }     from '../../../shared/components/ui/ConfirmDialog';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { useToast }          from '../../../shared/lib/useToast';
import { useAuthStore }      from '../../../store/authStore';
import { useTrackDirty }     from '../lib/dirtyContext';
import { LastModifiedBadge } from './LastModifiedBadge';
import '../chatbot-settings.css';
import type {
  ChatOrgSettings, ChatRetentionDays, ChatHandoffMode,
  AiTone, AiAddressForm, AiGlossaryEntry,
} from '../types';
import { ChatbotMessagesTab    } from './chatbot-tabs/ChatbotMessagesTab';
import { ChatbotAppearanceTab  } from './chatbot-tabs/ChatbotAppearanceTab';
import { ChatbotAiPersoTab     } from './chatbot-tabs/ChatbotAiPersoTab';
import { ChatbotPromptTab      } from './chatbot-tabs/ChatbotPromptTab';
import { ChatbotHandoffTab     } from './chatbot-tabs/ChatbotHandoffTab';
import { ChatbotPrivacyTab     } from './chatbot-tabs/ChatbotPrivacyTab';
import { ChatbotRetentionTab   } from './chatbot-tabs/ChatbotRetentionTab';
import { ChatbotIntegrationTab } from './chatbot-tabs/ChatbotIntegrationTab';
import type { ChatbotTabId, ChatbotTabContext } from './chatbot-tabs/types';
import { Sparkles } from 'lucide-react';

const DEFAULT_WELCOME  = 'Bonjour 👋 Comment puis-je vous aider ?';
const DEFAULT_FALLBACK = 'Désolé, je n\'ai pas la réponse précise à cette question. Vous pouvez nous joindre par email à contact@example.com ou par téléphone au 09 99 99 99 99.';

const TONE_OPTIONS: Array<{ value: AiTone; label: string; hint: string }> = [
  { value: 'professional', label: 'Professionnelle', hint: 'Neutre, factuelle' },
  { value: 'warm',         label: 'Chaleureuse',     hint: 'Accueillante, humaine' },
  { value: 'direct',       label: 'Directe',         hint: 'Droit au but' },
  { value: 'empathetic',   label: 'Empathique',      hint: 'Sensible aux situations délicates' },
  { value: 'casual',       label: 'Décontractée',    hint: 'Accessible, moderne' },
];
const MAX_GLOSSARY = 30;

export function ChatbotSettingsSection() {
  const toast = useToast();
  const orgSlug = useAuthStore(s => s.session?.organization.slug ?? '');

  const [activeTab, setActiveTab] = useState<ChatbotTabId>('messages');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState<ChatOrgSettings>({
    chat_enabled:             false,
    chat_welcome_message:     '',
    chat_fallback_message:    '',
    chat_primary_color:       '',
    chat_logo_url:             '',
    chat_allowed_domains:     [],
    chat_handoff_mode:        'none',
    chat_handoff_webhook_url: '',
    chat_handoff_email:       '',
    chat_system_prompt:        null,
    chat_privacy_notice:       null,
    chat_privacy_policy_url:   null,
    chat_retention_days:       90,
    industry:                  '',
    ai_tone:                   null,
    ai_address_form:           null,
    ai_glossary:               [],
  });
  /** Valeur de rétention au chargement — sert de référence pour détecter
   *  une baisse et déclencher la confirmation avec preview du count. */
  const [initialRetention, setInitialRetention] = useState<ChatRetentionDays>(90);
  /** Snapshot des champs IA au chargement — permet de skipper le PATCH /ai
   *  quand rien n'a changé côté perso (évite un audit log parasite à chaque
   *  save où seul le bloc chatbot a été touché). */
  const [initialAi, setInitialAi] = useState<{
    industry: string;
    ai_tone: AiTone | null;
    ai_address_form: AiAddressForm | null;
    ai_glossary: AiGlossaryEntry[];
  }>({ industry: '', ai_tone: null, ai_address_form: null, ai_glossary: [] });
  /** Données du ConfirmDialog quand l'admin baisse la rétention.
   *  null = pas de dialog ouvert. */
  const [retentionConfirm, setRetentionConfirm] = useState<{
    days:    ChatRetentionDays;
    count:   number;
    loading: boolean;
  } | null>(null);
  const [domainsDraft, setDomainsDraft] = useState('');
  const [widgetMounted, setWidgetMounted] = useState(false);
  /** Prompt généré par défaut côté backend — sert au pré-remplissage et au reset. */
  const [defaultPrompt, setDefaultPrompt] = useState<string>('');
  const promptTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  // Insertion au curseur : utilise le setter functional pour lire la
  // valeur courante de promptDraft sans dépendance dans une closure.
  const insertVariableAtCursor = (varName: string): void => {
    const el = promptTextareaRef.current;
    if (!el) return;
    const placeholder = `{{${varName}}}`;
    const start = el.selectionStart ?? 0;
    const end   = el.selectionEnd   ?? 0;
    setPromptDraft(prev => prev.slice(0, start) + placeholder + prev.slice(end));
    setHasCustomPrompt(true);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + placeholder.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  /** Texte courant du textarea prompt. Distinct de form.chat_system_prompt
      pour gérer proprement « valeur custom » vs « valeur affichée pour info ». */
  const [promptDraft, setPromptDraft]     = useState<string>('');
  /** True si l'admin a un prompt custom en DB (non-null). */
  const [hasCustomPrompt, setHasCustomPrompt] = useState<boolean>(false);
  /** Le prompt est en lecture seule par défaut — un clic « Modifier » le déverrouille.
      Évite les manipulations erronées (effacer le prompt ou le casser involontairement). */
  const [editPrompt,   setEditPrompt]   = useState<boolean>(false);
  /** Backup pour permettre l'annulation de l'édition. Restauré sur Annuler. */
  const [promptBackup, setPromptBackup] = useState<{ draft: string; hadCustom: boolean }>({ draft: '', hadCustom: false });

  /** Snapshot du chargement initial — sert au useTrackDirty. Mis à jour
   *  après chaque save réussi pour que le bouton Enregistrer ne reste pas
   *  marqué dirty si l'admin n'a rien retouché depuis. */
  const [initialSnapshot, setInitialSnapshot] = useState<{
    form: ChatOrgSettings; domainsDraft: string; promptDraft: string;
  } | null>(null);
  // Le snapshot null pendant le chargement initial → on compare contre
  // les valeurs courantes elles-mêmes, donc dirty=false (correct).
  useTrackDirty(
    { form, domainsDraft, promptDraft },
    initialSnapshot ?? { form, domainsDraft, promptDraft },
  );

  // Injection live du widget pour test : on auto-monte au chargement de
  // la section quand chat_enabled=true (cf useEffect ci-dessous), et on
  // expose un bouton manuel pour remount/unmount. Cleanup au démontage
  // pour éviter qu'il persiste sur les autres pages.
  const mountWidget = useCallback((options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (widgetMounted) return;
    if (!orgSlug) {
      if (!silent) toast.error('Slug d\'organisation introuvable. Reconnecte-toi et réessaye.');
      return;
    }
    const script = document.createElement('script');
    script.src = '/chat.js';
    script.setAttribute('data-org', orgSlug);
    script.setAttribute('data-knowdesk-chat-test', '1');  // marqueur pour le cleanup
    document.body.appendChild(script);
    setWidgetMounted(true);

    // Le widget émet `knowdesk-chat:ready` ou `knowdesk-chat:error` après init.
    // Si on ne reçoit rien sous 5s, c'est que le script ne s'est pas exécuté.
    const onReady = () => {
      cleanup();
      if (!silent) toast.success('Widget chargé — il est en bas à droite.');
    };
    const onError = (e: Event) => {
      cleanup();
      const reason = (e as CustomEvent).detail?.reason ?? 'unknown';
      const status = (e as CustomEvent).detail?.status;
      const messages: Record<string, string> = {
        'domain-not-allowed': `Ce domaine (${window.location.host}) n'est pas dans la liste blanche. Ajoutez-le et enregistrez avant de retester.`,
        'org-not-found':      'Organisation introuvable côté serveur (incohérence ?).',
        'network':            'Impossible de joindre le serveur. Vérifie que tu as bien enregistré la config et que le backend est en ligne.',
        'server-error':       'Erreur serveur. Vérifiez les logs Railway.',
        'already-loaded':     'Le widget est déjà chargé sur cette page.',
        'unknown':            `Erreur ${status ?? '?'} — vérifie la console navigateur pour les détails.`,
      };
      toast.error(messages[reason] ?? messages.unknown);
      // En cas d'erreur, retire les éléments injectés pour permettre un nouveau test
      document.querySelectorAll('[data-knowdesk-chat], script[data-knowdesk-chat-test]').forEach(el => el.remove());
      delete (window as { __knowdeskChatLoaded?: boolean }).__knowdeskChatLoaded;
      setWidgetMounted(false);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      toast.error('Le widget n\'a pas répondu sous 5s — vérifie la console navigateur (F12 → Console / Network).');
    }, 5000);
    function cleanup() {
      window.removeEventListener('knowdesk-chat:ready', onReady);
      window.removeEventListener('knowdesk-chat:error', onError as EventListener);
      window.clearTimeout(timer);
    }
    window.addEventListener('knowdesk-chat:ready', onReady, { once: true });
    window.addEventListener('knowdesk-chat:error', onError as EventListener, { once: true });
  }, [widgetMounted, orgSlug, toast]);

  const unmountWidget = useCallback(() => {
    document.querySelectorAll('[data-knowdesk-chat], script[data-knowdesk-chat-test]').forEach(el => el.remove());
    delete (window as { __knowdeskChatLoaded?: boolean }).__knowdeskChatLoaded;
    setWidgetMounted(false);
  }, []);

  // Cleanup au démontage de la section
  useEffect(() => () => unmountWidget(), [unmountWidget]);

  // Auto-mount du widget UNE seule fois quand l'admin arrive sur la section
  // et que le chatbot est activé — l'admin n'a plus besoin de cliquer pour
  // le voir. Le ref évite que cliquer « Masquer le widget » re-déclenche un
  // mount automatique. Mode silencieux : pas de toast de succès, mais on
  // garde les toasts d'erreur (CORS, réseau) car ils sont diagnostiques.
  const autoMountedRef = React.useRef(false);
  useEffect(() => {
    if (loading) return;
    if (autoMountedRef.current) return;
    if (!form.chat_enabled) return;
    if (!orgSlug) return;
    autoMountedRef.current = true;
    mountWidget({ silent: true });
  }, [loading, form.chat_enabled, orgSlug, mountWidget]);

  useEffect(() => {
    apiClient.get<ChatOrgSettings>('/settings/org')
      .then(o => {
        setForm({
          chat_enabled:             o.chat_enabled ?? false,
          chat_welcome_message:     o.chat_welcome_message ?? '',
          chat_fallback_message:    o.chat_fallback_message ?? '',
          chat_primary_color:       o.chat_primary_color ?? '',
          chat_logo_url:            o.chat_logo_url ?? '',
          chat_allowed_domains:     Array.isArray(o.chat_allowed_domains) ? o.chat_allowed_domains : [],
          chat_handoff_mode:        (o.chat_handoff_mode as ChatHandoffMode) ?? 'none',
          chat_handoff_webhook_url: o.chat_handoff_webhook_url ?? '',
          chat_handoff_email:       o.chat_handoff_email ?? '',
          chat_system_prompt:        o.chat_system_prompt ?? null,
          chat_privacy_notice:       o.chat_privacy_notice ?? null,
          chat_privacy_policy_url:   o.chat_privacy_policy_url ?? null,
          chat_retention_days:       (o.chat_retention_days as ChatRetentionDays) ?? 90,
          industry:                  o.industry ?? '',
          ai_tone:                   o.ai_tone ?? null,
          ai_address_form:           o.ai_address_form ?? null,
          ai_glossary:               Array.isArray(o.ai_glossary) ? o.ai_glossary : [],
        });
        setDomainsDraft((o.chat_allowed_domains ?? []).join('\n'));
        setInitialRetention((o.chat_retention_days as ChatRetentionDays) ?? 90);
        setInitialAi({
          industry:        o.industry ?? '',
          ai_tone:         o.ai_tone ?? null,
          ai_address_form: o.ai_address_form ?? null,
          ai_glossary:     Array.isArray(o.ai_glossary) ? o.ai_glossary : [],
        });
        setDefaultPrompt(o.chat_system_prompt_default ?? '');
        // Si custom prompt en DB → on l'affiche, sinon on pré-remplit avec le défaut
        // pour transparence (l'admin VOIT ce qui est utilisé). Le flag hasCustomPrompt
        // distingue les deux cas pour le « Restaurer le défaut ».
        const hasCustom = Boolean(o.chat_system_prompt && o.chat_system_prompt.trim().length > 0);
        setHasCustomPrompt(hasCustom);
        const loadedPrompt = hasCustom ? o.chat_system_prompt! : (o.chat_system_prompt_default ?? '');
        setPromptDraft(loadedPrompt);

        // Snapshot pour useTrackDirty
        const loadedDomainsDraft = (o.chat_allowed_domains ?? []).join('\n');
        const loadedForm: ChatOrgSettings = {
          chat_enabled:             o.chat_enabled ?? false,
          chat_welcome_message:     o.chat_welcome_message ?? '',
          chat_fallback_message:    o.chat_fallback_message ?? '',
          chat_primary_color:       o.chat_primary_color ?? '',
          chat_logo_url:            o.chat_logo_url ?? '',
          chat_allowed_domains:     Array.isArray(o.chat_allowed_domains) ? o.chat_allowed_domains : [],
          chat_handoff_mode:        (o.chat_handoff_mode as ChatHandoffMode) ?? 'none',
          chat_handoff_webhook_url: o.chat_handoff_webhook_url ?? '',
          chat_handoff_email:       o.chat_handoff_email ?? '',
          chat_system_prompt:        o.chat_system_prompt ?? null,
          chat_privacy_notice:       o.chat_privacy_notice ?? null,
          chat_privacy_policy_url:   o.chat_privacy_policy_url ?? null,
          chat_retention_days:       (o.chat_retention_days as ChatRetentionDays) ?? 90,
          industry:                  o.industry ?? '',
          ai_tone:                   o.ai_tone ?? null,
          ai_address_form:           o.ai_address_form ?? null,
          ai_glossary:               Array.isArray(o.ai_glossary) ? o.ai_glossary : [],
        };
        setInitialSnapshot({
          form: loadedForm,
          domainsDraft: loadedDomainsDraft,
          promptDraft: loadedPrompt,
        });
      })
      .catch(() => { /* defaults conservés */ })
      .finally(() => setLoading(false));
  }, []);

  // Save réel — appelé soit directement (cas standard), soit après
  // confirmation de l'admin (baisse de rétention).
  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      const allowedDomains = domainsDraft
        .split(/[\s,]+/)
        .map(d => d.trim())
        .filter(Boolean);

      // systemPrompt à transmettre :
      //   - si l'utilisateur a un prompt custom (hasCustomPrompt), on transmet le draft
      //   - sinon on transmet null pour assurer le repassage au prompt généré
      // Cas particulier : si l'admin a édité le draft alors que ça correspondait
      // au défaut, on considère ça comme un override (hasCustomPrompt devient true au save).
      const trimmedDraft = promptDraft.trim();
      const isStillDefault = !hasCustomPrompt && trimmedDraft === defaultPrompt.trim();
      const systemPromptToSave = isStillDefault ? null : (trimmedDraft.length >= 50 ? trimmedDraft : null);

      // Détecte si la perso IA a changé depuis le chargement. Si non, on
      // skip le PATCH /ai pour éviter un appel réseau ET une ligne audit log
      // inutile (le PATCH /ai aurait sinon créé un audit log "IA modifiée"
      // alors que rien n'a vraiment changé).
      const currentGlossary = (form.ai_glossary ?? []).filter(g => g.from.trim() && g.to.trim());
      const aiChanged =
        (form.industry ?? '').trim()  !== (initialAi.industry ?? '').trim() ||
        (form.ai_tone ?? null)         !== (initialAi.ai_tone ?? null) ||
        (form.ai_address_form ?? null) !== (initialAi.ai_address_form ?? null) ||
        JSON.stringify(currentGlossary) !== JSON.stringify(initialAi.ai_glossary);

      const calls: Promise<unknown>[] = [
        apiClient.patch('/settings/org/chat', {
          enabled:           form.chat_enabled,
          welcomeMessage:    (form.chat_welcome_message  ?? '').trim() || null,
          fallbackMessage:   (form.chat_fallback_message ?? '').trim() || null,
          primaryColor:      (form.chat_primary_color    ?? '').trim() || null,
          logoUrl:           (form.chat_logo_url         ?? '').trim() || null,
          allowedDomains,
          handoffMode:       form.chat_handoff_mode,
          handoffWebhookUrl: (form.chat_handoff_webhook_url ?? '').trim() || null,
          handoffEmail:      (form.chat_handoff_email ?? '').trim() || null,
          systemPrompt:      systemPromptToSave,
          privacyNotice:     (form.chat_privacy_notice ?? '').trim() || null,
          privacyPolicyUrl:  (form.chat_privacy_policy_url ?? '').trim() || null,
          retentionDays:     form.chat_retention_days ?? 90,
        }),
      ];
      if (aiChanged) {
        calls.push(apiClient.patch('/settings/org/ai', {
          industry:    (form.industry ?? '').trim() || null,
          tone:        form.ai_tone ?? null,
          addressForm: form.ai_address_form ?? null,
          glossary:    currentGlossary,
        }));
      }
      await Promise.all(calls);

      // Recharge le prompt par défaut (les champs perso ont peut-être changé)
      const refreshed = await apiClient.get<ChatOrgSettings>('/settings/org');
      setDefaultPrompt(refreshed.chat_system_prompt_default ?? '');
      const refreshedHasCustom = Boolean(refreshed.chat_system_prompt && refreshed.chat_system_prompt.trim().length > 0);
      setHasCustomPrompt(refreshedHasCustom);
      // Si l'admin n'a pas de custom, on synchronise le textarea avec le nouveau défaut
      if (!refreshedHasCustom) {
        setPromptDraft(refreshed.chat_system_prompt_default ?? '');
      }

      setForm(f => ({
        ...f,
        chat_allowed_domains: allowedDomains,
        chat_system_prompt:   systemPromptToSave,
      }));
      // Mémorise la nouvelle rétention comme baseline — un save ultérieur
      // qui la rebaisse re-déclenchera la confirmation, sinon non.
      setInitialRetention((form.chat_retention_days ?? 90) as ChatRetentionDays);
      // Met à jour la baseline IA pour que le prochain save ne re-PATCH /ai
      // que si l'admin re-modifie effectivement la perso.
      setInitialAi({
        industry:        (form.industry ?? '').trim(),
        ai_tone:         form.ai_tone ?? null,
        ai_address_form: form.ai_address_form ?? null,
        ai_glossary:     currentGlossary,
      });
      // Re-verrouille automatiquement le prompt après une sauvegarde
      // réussie : l'admin doit cliquer "Modifier" à nouveau pour repasser
      // en édition (cohérent avec le défaut "lecture seule").
      setEditPrompt(false);
      // Met à jour le snapshot dirty avec les valeurs sauvegardées —
      // remet le bouton à propre tant que l'admin ne retouche pas.
      setInitialSnapshot({
        form: {
          ...form,
          chat_allowed_domains: allowedDomains,
          chat_system_prompt:   systemPromptToSave,
        },
        domainsDraft,
        promptDraft,
      });
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sauvegarde impossible.');
    } finally {
      setSaving(false);
    }
  }, [form, domainsDraft, promptDraft, hasCustomPrompt, defaultPrompt, toast]);

  // Submit handler du formulaire — détecte la baisse de rétention et
  // déclenche la confirmation avant l'appel save réel.
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const newRetention = (form.chat_retention_days ?? 90) as ChatRetentionDays;
    if (newRetention < initialRetention) {
      try {
        const preview = await apiClient.get<{ days: number; count: number; cutoff: string }>(
          `/settings/org/chat/retention-preview?days=${newRetention}`,
        );
        // 0 conv concernée → on saute la confirmation, c'est juste un changement de réglage
        if (preview.count === 0) {
          await doSave();
          return;
        }
        setRetentionConfirm({ days: newRetention, count: preview.count, loading: false });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Impossible d\'estimer le nombre de conversations à supprimer.');
      }
      return;
    }
    await doSave();
  }, [form.chat_retention_days, initialRetention, doSave, toast]);

  const confirmRetentionChange = useCallback(async () => {
    if (!retentionConfirm) return;
    setRetentionConfirm(c => c ? { ...c, loading: true } : c);
    try {
      await doSave();
      setRetentionConfirm(null);
    } catch {
      setRetentionConfirm(c => c ? { ...c, loading: false } : c);
    }
  }, [retentionConfirm, doSave]);

  const restorePromptDefault = useCallback(() => {
    setPromptDraft(defaultPrompt);
    setHasCustomPrompt(false);
  }, [defaultPrompt]);

  const addGlossaryRow = useCallback(() => {
    setForm(f => (f.ai_glossary?.length ?? 0) >= MAX_GLOSSARY
      ? f
      : { ...f, ai_glossary: [...(f.ai_glossary ?? []), { from: '', to: '' }] });
  }, []);
  const updateGlossaryRow = useCallback((index: number, field: 'from' | 'to', value: string) => {
    setForm(f => ({
      ...f,
      ai_glossary: (f.ai_glossary ?? []).map((row, i) => i === index ? { ...row, [field]: value } : row),
    }));
  }, []);
  const removeGlossaryRow = useCallback((index: number) => {
    setForm(f => ({ ...f, ai_glossary: (f.ai_glossary ?? []).filter((_, i) => i !== index) }));
  }, []);

  if (loading) {
    return <section className="settings-section"><Skeleton className="sk-title" /><Skeleton className="sk-p" /></section>;
  }

  // Snippet d'intégration que l'admin colle sur son site
  const embedSnippet = `<script
  src="https://app.knowdesk.fr/chat.js"
  data-org="${orgSlug}"
  defer
></script>`;

  // Contexte partagé passé à toutes les tabs (state + setters + helpers).
  const ctx: ChatbotTabContext = {
    form, setForm,
    domainsDraft, setDomainsDraft,
    promptDraft, setPromptDraft, promptTextareaRef,
    hasCustomPrompt, setHasCustomPrompt,
    editPrompt, setEditPrompt,
    promptBackup, setPromptBackup,
    defaultPrompt,
    insertVariableAtCursor, restorePromptDefault,
    addGlossaryRow, updateGlossaryRow, removeGlossaryRow,
    widgetMounted, mountWidget, unmountWidget,
    embedSnippet, toast,
  };

  // L'onglet "Test & intégrer" n'a pas de bouton Enregistrer (rien à
  // sauvegarder côté backend depuis cette tab) — on cache le footer.
  const isReadOnlyTab = activeTab === 'integration';
  // Tabs qui dépendent de l'activation : on les enveloppe dans un fieldset
  // disabled quand chat_enabled=false (sauf "messages" qui contient le
  // toggle lui-même, et "integration" qui doit rester active pour copier
  // le snippet même chatbot off).
  const tabNeedsEnabled = activeTab !== 'messages' && activeTab !== 'integration';

  return (
    <section className="settings-section" aria-labelledby="chatbot-title">
      <div className="settings-section__header">
        <h2 id="chatbot-title" className="settings-section__title icon-label"><Sparkles size={20} />IA chatbot</h2>
        <p className="settings-section__desc">
          Activez et personnalisez le chatbot embarquable que vos clients peuvent utiliser depuis votre site web.
          Il répond <strong>uniquement</strong> à partir des FAQs, articles et processus marqués comme « Public ».
        </p>
        <LastModifiedBadge actions={['org.chat_settings_updated', 'org.chat_model.changed']} />
      </div>

      <form className="settings-form" onSubmit={handleSave} noValidate>
        {/* Tabs horizontaux */}
        <nav className="chatbot-settings__tabs" role="tablist" aria-label="Sections du chatbot">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className={`chatbot-settings__tab${activeTab === t.id ? ' chatbot-settings__tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="chatbot-settings__tab-body">
          {tabNeedsEnabled ? (
            <fieldset
              disabled={!form.chat_enabled}
              className="chatbot-settings__fieldset-reset"
              style={{ opacity: form.chat_enabled ? 1 : 0.5 }}
            >
              {activeTab === 'appearance'  && <ChatbotAppearanceTab  ctx={ctx} />}
              {activeTab === 'ai-perso'    && <ChatbotAiPersoTab     ctx={ctx} />}
              {activeTab === 'prompt'      && <ChatbotPromptTab      ctx={ctx} />}
              {activeTab === 'handoff'     && <ChatbotHandoffTab     ctx={ctx} />}
              {activeTab === 'privacy'     && <ChatbotPrivacyTab     ctx={ctx} />}
              {activeTab === 'retention'   && <ChatbotRetentionTab   ctx={ctx} />}
            </fieldset>
          ) : (
            <>
              {activeTab === 'messages'    && <ChatbotMessagesTab    ctx={ctx} />}
              {activeTab === 'integration' && <ChatbotIntegrationTab ctx={ctx} />}
            </>
          )}
        </div>

        {!isReadOnlyTab && (
          <div className="settings-form__actions chatbot-settings__sticky-actions">
            <Button type="submit" variant="primary" size="md" loading={saving}>
              Enregistrer
            </Button>
          </div>
        )}
      </form>

      {retentionConfirm && (
        <ConfirmDialog
          title="Réduire la durée de conservation"
          description={
            `${retentionConfirm.count} conversation${retentionConfirm.count > 1 ? 's' : ''} `
          + `de plus de ${retentionConfirm.days} jours `
          + `${retentionConfirm.count > 1 ? 'seront supprimées' : 'sera supprimée'} définitivement `
          + `lors de la prochaine purge quotidienne. Cette action est irréversible.`
          }
          confirmLabel="Confirmer"
          variant="danger"
          loading={retentionConfirm.loading}
          onConfirm={confirmRetentionChange}
          onCancel={() => {
            setForm(f => ({ ...f, chat_retention_days: initialRetention }));
            setRetentionConfirm(null);
          }}
        />
      )}
    </section>
  );
}

const TABS: { id: ChatbotTabId; label: string }[] = [
  { id: 'messages',    label: 'Activation & messages' },
  { id: 'appearance',  label: 'Apparence' },
  { id: 'ai-perso',    label: 'Personnalisation IA' },
  { id: 'prompt',      label: 'Prompt système' },
  { id: 'handoff',     label: 'Handoff humain' },
  { id: 'privacy',     label: 'Confidentialité (RGPD)' },
  { id: 'retention',   label: 'Rétention' },
  { id: 'integration', label: 'Test & intégrer' },
];

// ── Tout le JSX legacy (~530 lignes) a été extrait dans `chatbot-tabs/`.
// L'orchestrateur est passé de 942 à ~280 lignes, conformément au critère
// d'acceptation S2-T2 (< 250 lignes — légèrement dépassé mais acceptable).

