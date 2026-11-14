import React, { useState, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import '../settings.css';
import { useToast }     from '../../../shared/lib/useToast';
import { Button }       from '../../../shared/components/ui/Button';
import { Input }        from '../../../shared/components/ui/Input';
import { Switch }       from '../../../shared/components/ui/Switch';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { MOCK_BILLING, mockDeleteOrg } from '../api/settings.mock';
import { useAuthStore }    from '../../../store/authStore';
import { ApiKeysSection } from './ApiKeysSection';
import { PageHeader }    from '../../../shared/components/layout/PageHeader';
import { SearchSettingsSection } from './SearchSettingsSection';
import { TagsSettingsSection }   from './TagsSettingsSection';
import { AiSettingsSection }     from './AiSettingsSection';
import { ChatbotSettingsSection } from './ChatbotSettingsSection';
import { ImportsSettingsSection } from './ImportsSettingsSection';
import { AuditPage }              from '../../audit/components/AuditPage';
import { AiModelsSection }        from './AiModelsSection';
import { ArticleQualitySettingsSection } from './ArticleQualitySettingsSection';
import { DirtyContext, useTrackDirty } from '../lib/dirtyContext';
import { useUnsavedChanges }     from '../../../shared/lib/useUnsavedChanges';
import { LastModifiedBadge }     from './LastModifiedBadge';
import type { SettingsSection, NotifPreferences } from '../types';
import { ChevronRight } from 'lucide-react';

interface SettingsPageProps {
  initialSection?: SettingsSection;
}

export function SettingsPage({ initialSection = 'general' }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  // Section "en attente" — l'admin a cliqué dessus alors qu'il y a des
  // modifs non sauvegardées. On affiche un ConfirmDialog avant le switch.
  const [pendingSection, setPendingSection] = useState<SettingsSection | null>(null);
  // État dirty agrégé : remonté par les sections via useTrackDirty.
  const [isDirty, setIsDirty] = useState(false);
  const role = useAuthStore(s => s.session?.user.role ?? null);

  // beforeunload : alerte le navigateur avant fermeture/refresh tant que dirty
  useUnsavedChanges(isDirty);

  // Wrappe le clic sidebar : si dirty, on ouvre le ConfirmDialog avant switch
  const handleSectionClick = useCallback((id: SettingsSection) => {
    if (id === activeSection) return;
    if (isDirty) {
      setPendingSection(id);
    } else {
      setActiveSection(id);
    }
  }, [activeSection, isDirty]);

  const dirtyCtxValue = useMemo(() => ({ setDirty: setIsDirty }), []);

  return (
    <DirtyContext.Provider value={dirtyCtxValue}>
      <div className="settings-page-wrap">
        <PageHeader
          title="Paramètres"
          subtitle="Paramètres de votre organisation et de votre compte."
        />
        <div className="settings-page">
          <MobileSettingsNav
            tree={navTree(role === 'admin')}
            activeSection={activeSection}
            onNavigate={handleSectionClick}
          />
          <div className="settings-page__sidebar">
            <PlanBadge />
            <SettingsNav
              tree={navTree(role === 'admin')}
              activeSection={activeSection}
              onNavigate={handleSectionClick}
            />
          </div>
          <div className="settings-page__body">
            {activeSection === 'general'       && <SectionGeneral />}
            {activeSection === 'ai'            && <AiSettingsSection />}
            {activeSection === 'chatbot'       && <ChatbotSettingsSection />}
            {activeSection === 'ai-quality'    && <ArticleQualitySettingsSection />}
            {activeSection === 'ai-models'     && <AiModelsSection />}
            {activeSection === 'notifications' && <SectionNotifications />}
            {activeSection === 'api' && <ApiKeysSection />}
            {activeSection === 'search'        && <SearchSettingsSection />}
            {activeSection === 'tags'          && <TagsSettingsSection />}
            {activeSection === 'imports'       && <ImportsSettingsSection />}
            {activeSection === 'audit'         && <AuditPage embed />}
            {activeSection === 'billing'       && <SectionBilling />}
            {activeSection === 'danger'        && <SectionDanger />}
          </div>
        </div>
      </div>

      {pendingSection && (
        <ConfirmDialog
          title="Quitter sans enregistrer ?"
          description="Les modifications de cette section seront perdues. Elles ne pourront pas être récupérées."
          confirmLabel="Quitter sans enregistrer"
          variant="danger"
          onConfirm={() => {
            setIsDirty(false);
            setActiveSection(pendingSection);
            setPendingSection(null);
          }}
          onCancel={() => setPendingSection(null)}
        />
      )}
    </DirtyContext.Provider>
  );
}

/* ── Mobile nav (S4-T4) — sélecteur natif visible < 900px ──────── */

function MobileSettingsNav({ tree, activeSection, onNavigate }: SettingsNavProps) {
  return (
    <select
      className="settings-page__mobile-nav"
      value={activeSection}
      onChange={e => onNavigate(e.target.value as SettingsSection)}
      aria-label="Naviguer entre les sections"
    >
      {tree.map(entry => (
        entry.type === 'leaf'
          ? <option key={entry.id} value={entry.id}>{entry.label}</option>
          : (
            <optgroup key={entry.id} label={entry.label}>
              {entry.children.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </optgroup>
          )
      ))}
    </select>
  );
}

/* ── Badge plan persistant (S4-T2) ─────────────────────────────── */

function PlanBadge() {
  const plan = useAuthStore(s => s.session?.organization.plan ?? 'free');
  const labels: Record<string, string> = {
    free:       'Gratuit',
    pro:        'Pro',
    enterprise: 'Enterprise',
  };
  return (
    <div className={`plan-badge plan-badge--${plan}`} role="status" aria-label={`Plan actuel : ${labels[plan] ?? plan}`}>
      <span className="plan-badge__label">Plan</span>
      <span className="plan-badge__value">{labels[plan] ?? plan}</span>
    </div>
  );
}

/* ── Nav arborescente ─────────────────────────────────────────────
   Catégories collapsibles pour réduire la charge cognitive (11 → 7
   entrées top-level). Cf audit S2-T1.
   ───────────────────────────────────────────────────────────────── */

interface NavLeaf {
  type:       'leaf';
  id:         SettingsSection;
  label:      string;
  /** Mots-clés / synonymes pour la recherche locale (S4-T3) */
  keywords?:  string[];
  adminOnly?: boolean;
  isDanger?:  boolean;
}
interface NavCategory {
  type:       'category';
  id:         string;            // identifiant pour persister expand state
  label:      string;
  adminOnly?: boolean;
  children:   NavLeaf[];
}
type NavEntry = NavLeaf | NavCategory;

function navTree(isAdmin: boolean): NavEntry[] {
  const tree: NavEntry[] = [
    { type: 'leaf', id: 'general', label: 'Général',
      keywords: ['nom', 'organisation', 'fuseau', 'horaire', 'timezone'] },
    { type: 'category', id: 'ai', label: 'Intelligence artificielle', adminOnly: true, children: [
      { type: 'leaf', id: 'ai', label: 'Recherche interne',
        keywords: ['ia', 'mistral', 'recherche', 'tonalité', 'glossaire', 'secteur'] },
      { type: 'leaf', id: 'chatbot', label: 'Chatbot public',
        keywords: ['chat', 'widget', 'embed', 'rgpd', 'rétention', 'handoff', 'prompt', 'consigne', 'conservation', 'humain', 'privacy', 'confidentialité'] },
      { type: 'leaf', id: 'ai-quality', label: 'Auditeur qualité',
        keywords: ['qualité', 'audit', 'articles', 'révision', 'scoring', 'retravailler', 'clarté'] },
      { type: 'leaf', id: 'ai-models', label: 'Modèles et fournisseurs',
        keywords: ['modèle', 'mistral', 'small', 'medium', 'large', 'ministral', 'coût'] },
    ]},
    { type: 'leaf', id: 'notifications', label: 'Notifications',
      keywords: ['email', 'e-mail', 'digest', 'in-app', 'canal'] },
    { type: 'category', id: 'data', label: 'Données', adminOnly: true, children: [
      { type: 'leaf', id: 'search', label: 'Synonymes',
        keywords: ['meilisearch', 'recherche'] },
      { type: 'leaf', id: 'tags', label: 'Tags',
        keywords: ['étiquettes', 'catégorisation'] },
      { type: 'leaf', id: 'api', label: 'API',
        keywords: ['clé', 'token', 'public', 'apikey', 'webhook'] },
      { type: 'leaf', id: 'imports', label: 'Imports',
        keywords: ['pdf', 'docx', 'pptx'] },
      { type: 'leaf', id: 'audit', label: 'Audit',
        keywords: ['journal', 'activité', 'logs', 'historique', 'sécurité', 'compliance', 'impersonation'] },
    ]},
    { type: 'leaf', id: 'billing', label: 'Facturation',
      keywords: ['plan', 'pro', 'enterprise', 'facture', 'stripe', 'abonnement'] },
    { type: 'leaf', id: 'danger', label: 'Zone de danger', isDanger: true, adminOnly: true,
      keywords: ['supprimer', 'delete', 'suppression', 'organisation'] },
  ];
  return tree.filter(e => isAdmin || !e.adminOnly);
}

/* Filtrage local de l'arbre (S4-T3). Match sur label OU keywords (case
 * + accent insensitive). Une catégorie est conservée si elle-même match
 * OU si au moins un enfant match (les enfants non-matchant sont alors
 * eux aussi gardés pour ne pas casser le sens du groupe). */
function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function leafMatches(leaf: NavLeaf, q: string): boolean {
  if (!q) return true;
  const haystack = normalizeForSearch([leaf.label, ...(leaf.keywords ?? [])].join(' '));
  return haystack.includes(q);
}
function filterTree(tree: NavEntry[], rawQuery: string): NavEntry[] {
  const q = normalizeForSearch(rawQuery.trim());
  if (!q) return tree;
  const out: NavEntry[] = [];
  for (const e of tree) {
    if (e.type === 'leaf') {
      if (leafMatches(e, q)) out.push(e);
    } else {
      const catSelfMatch = normalizeForSearch(e.label).includes(q);
      if (catSelfMatch) {
        out.push(e);
      } else {
        const matched = e.children.filter(c => leafMatches(c, q));
        if (matched.length > 0) out.push({ ...e, children: matched });
      }
    }
  }
  return out;
}

/** Ensemble des catégories qui contiennent l'item actif (pour
 *  auto-expand au mount / changement de section). */
function findParentCategoryId(tree: NavEntry[], section: SettingsSection): string | null {
  for (const e of tree) {
    if (e.type === 'category' && e.children.some(c => c.id === section)) {
      return e.id;
    }
  }
  return null;
}

const EXPANDED_KEY = 'settings.nav.expanded-categories';

interface SettingsNavProps {
  tree:           NavEntry[];
  activeSection:  SettingsSection;
  onNavigate:     (id: SettingsSection) => void;
}

function SettingsNav({ tree, activeSection, onNavigate }: SettingsNavProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(EXPANDED_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // Recherche locale (S4-T3) — filtre l'arbre par label + keywords.
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleTree = useMemo(() => filterTree(tree, query), [tree, query]);
  const isSearching = query.trim().length > 0;

  // Auto-expand la catégorie de la section active
  useEffect(() => {
    const parent = findParentCategoryId(tree, activeSection);
    if (parent && !expanded.has(parent)) {
      setExpanded(prev => {
        const next = new Set(prev);
        next.add(parent);
        return next;
      });
    }
  }, [activeSection, tree, expanded]);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(Array.from(expanded))); }
    catch { /* quota */ }
  }, [expanded]);

  // Cmd/Ctrl+K ou « / » focus l'input. Escape clear la query.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (!isTyping && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav aria-label="Sections des paramètres">
      <div className="settings-nav__search">
        <input
          ref={inputRef}
          type="search"
          className="settings-nav__search-input"
          placeholder="Rechercher…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setQuery(''); inputRef.current?.blur(); } }}
          aria-label="Rechercher dans les paramètres"
        />
        <kbd className="settings-nav__search-kbd" aria-hidden="true">⌘K</kbd>
      </div>
      {isSearching && visibleTree.length === 0 && (
        <p className="settings-nav__empty" role="status">Aucune section ne correspond à « {query} ».</p>
      )}
      <ul className="settings-nav" role="list">
        {visibleTree.map(entry => {
          if (entry.type === 'leaf') {
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`settings-nav__item ${activeSection === entry.id ? 'settings-nav__item--active' : ''}`}
                  onClick={() => onNavigate(entry.id)}
                  aria-current={activeSection === entry.id ? 'page' : undefined}
                >
                  {entry.label}
                  {entry.isDanger && <span className="settings-nav__danger-dot" aria-hidden="true" />}
                </button>
              </li>
            );
          }
          // En mode recherche on force l'expansion pour montrer les enfants matchants.
          const isOpen = isSearching || expanded.has(entry.id);
          const containsActive = entry.children.some(c => c.id === activeSection);
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={`settings-nav__category ${containsActive ? 'settings-nav__category--has-active' : ''}`}
                onClick={() => toggle(entry.id)}
                aria-expanded={isOpen}
              >
                <span
                  className={`settings-nav__chevron ${isOpen ? 'settings-nav__chevron--open' : ''}`}
                  aria-hidden="true"
                ><ChevronRight size={16} /></span>
                {entry.label}
              </button>
              {isOpen && (
                <ul className="settings-nav__sublist" role="list">
                  {entry.children.map(child => (
                    <li key={child.id}>
                      <button
                        type="button"
                        className={`settings-nav__subitem ${activeSection === child.id ? 'settings-nav__subitem--active' : ''}`}
                        onClick={() => onNavigate(child.id)}
                        aria-current={activeSection === child.id ? 'page' : undefined}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── Section: Général ────────────────────────────────────────── */

function SectionGeneral() {
  const session = useAuthStore(s => s.session);
  const toast   = useToast();
  const [form,        setForm]        = useState({ name: '', timezone: 'Europe/Paris' });
  const [initialForm, setInitialForm] = useState({ name: '', timezone: 'Europe/Paris' });
  const [saving, setSaving] = useState(false);
  useTrackDirty(form, initialForm);

  // Charger le vrai nom depuis l'API au montage
  useEffect(() => {
    apiClient.get<{ name: string; slug: string; plan: string }>('/settings/org')
      .then(org => {
        const next = { name: org.name, timezone: 'Europe/Paris' };
        setForm(next);
        setInitialForm(next);
      })
      .catch(err => {
        // Fallback sur le store si l'API échoue + signaler à l'utilisateur
        const fallback = { name: session?.organization.name ?? '', timezone: 'Europe/Paris' };
        setForm(fallback);
        setInitialForm(fallback);
        toast.error(err instanceof ApiError ? err.message : 'Les paramètres n\'ont pas pu être chargés. Rechargez la page.');
      });
  }, [session, toast]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put('/settings/org', { name: form.name });
      setInitialForm(form);
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Les paramètres n\'ont pas été enregistrés. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [form, toast]);

  return (
    <section className="settings-section" aria-labelledby="general-title">
      <div className="settings-section__header">
        <h2 id="general-title" className="settings-section__title">Général</h2>
        <p className="settings-section__desc">Informations de base de votre organisation.</p>
        <LastModifiedBadge actions={['org.general_updated']} />
      </div>
      <form className="settings-form" onSubmit={handleSave} noValidate>
        <Input
          id="org-name"
          label="Nom de l'organisation"
          value={form.name}
          required
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          helperText="Affiché dans l'en-tête de l'application et dans les e-mails envoyés à votre équipe."
        />
        <div className="field">
          <label htmlFor="timezone" className="field-label">Fuseau horaire</label>
          <select
            id="timezone"
            className="field-input"
            value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
          >
            <option value="Europe/Paris">Europe/Paris (UTC+1 / UTC+2)</option>
            <option value="Europe/London">Europe/London (UTC+0 / UTC+1)</option>
            <option value="America/New_York">America/New_York (UTC-5 / UTC-4)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (UTC-8 / UTC-7)</option>
          </select>
        </div>
        <div className="settings-form__actions">
          <Button type="submit" variant="primary" size="md" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </section>
  );
}

/* ── Section: Notifications ──────────────────────────────────── */

// Defaults neutres alignés sur le backend (tous activés sauf weeklyDigest).
// Pas un mock — c'est l'état affiché en attendant le fetch initial.
const DEFAULT_NOTIF_PREFS: NotifPreferences = {
  articleUpdated: true,
  memberJoined:   true,
  weeklyDigest:   false,
  channel:        'email',
};

function SectionNotifications() {
  const [prefs,        setPrefs]        = useState<NotifPreferences>(DEFAULT_NOTIF_PREFS);
  const [initialPrefs, setInitialPrefs] = useState<NotifPreferences>(DEFAULT_NOTIF_PREFS);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useTrackDirty(prefs, initialPrefs);

  // Charger les préférences réelles
  useEffect(() => {
    apiClient.get<NotifPreferences>('/notifications/preferences')
      .then(p => { setPrefs(p); setInitialPrefs(p); })
      .catch(() => {/* on conserve les defaults — pas critique */});
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put('/notifications/preferences', prefs);
      setInitialPrefs(prefs);
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Les préférences n\'ont pas été enregistrées. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [prefs, toast]);

  return (
    <section className="settings-section" aria-labelledby="notif-title">
      <div className="settings-section__header">
        <h2 id="notif-title" className="settings-section__title">Notifications</h2>
        <p className="settings-section__desc">Choisissez quand et comment être notifié.</p>
      </div>
      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-toggles">
          <Switch
            id="notif-article"
            label="Article mis à jour"
            description="Recevez une notification quand un article de votre base est modifié."
            checked={prefs.articleUpdated}
            onChange={v => setPrefs(p => ({ ...p, articleUpdated: v }))}
          />
          <Switch
            id="notif-member"
            label="Nouveau membre"
            description="Soyez averti quand un membre rejoint votre organisation."
            checked={prefs.memberJoined}
            onChange={v => setPrefs(p => ({ ...p, memberJoined: v }))}
          />
          <Switch
            id="notif-digest"
            label="Résumé hebdomadaire"
            description="Un e-mail récapitulatif chaque lundi matin."
            checked={prefs.weeklyDigest}
            onChange={v => setPrefs(p => ({ ...p, weeklyDigest: v }))}
          />
        </div>
        <div className="field field--narrow">
          <label htmlFor="notif-channel" className="field-label">Canal préféré</label>
          <select
            id="notif-channel"
            className="field-input"
            value={prefs.channel}
            onChange={e => setPrefs(p => ({ ...p, channel: e.target.value as NotifPreferences['channel'] }))}
          >
            <option value="email">E-mail uniquement</option>
            <option value="in_app">Dans l'application uniquement</option>
            <option value="both">E-mail et dans l'application</option>
          </select>
        </div>
        <div className="settings-form__actions">
          <Button type="submit" variant="primary" size="md" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </section>
  );
}

/* ── Section: Billing ────────────────────────────────────────── */

function SectionBilling() {
  const billing = MOCK_BILLING;
  const isPro   = billing.plan === 'pro';

  return (
    <section className="settings-section" aria-labelledby="billing-title">
      <div className="settings-section__header">
        <h2 id="billing-title" className="settings-section__title">Facturation</h2>
        <p className="settings-section__desc">Votre plan et vos factures.</p>
      </div>
      <div className="billing-plan-card">
        <div className="billing-plan-card__header">
          <div>
            <span className="billing-plan-card__plan">
              Plan {billing.plan === 'free' ? 'Gratuit' : billing.plan === 'pro' ? 'Pro' : 'Enterprise'}
            </span>
          </div>
          {!isPro && (
            <a href="#upgrade" className="billing-upgrade-btn">
              Passer au plan Pro — 49 €/mois
            </a>
          )}
        </div>
        <div className="billing-limits">
          <div className="billing-limit-row">
            <span>Membres actifs</span>
            <span className="billing-limit-row__val">{billing.seatsUsed} / {billing.seats}</span>
          </div>
          <div className="billing-limit-row">
            <span>Articles</span>
            <span className="billing-limit-row__val">50 max</span>
          </div>
        </div>
      </div>
      {!isPro && (
        <div className="billing-upgrade-card">
          <h3 className="billing-upgrade-card__title">Plan Pro — 49 € / mois</h3>
          <ul className="billing-upgrade-card__features">
            <li>Membres illimités</li>
            <li>Articles illimités</li>
            <li>Notifications par e-mail avancées</li>
            <li>Support prioritaire</li>
          </ul>
          <Button variant="primary" size="md">Passer au plan Pro</Button>
        </div>
      )}
    </section>
  );
}

/* ── Section: Danger ─────────────────────────────────────────── */

function SectionDanger() {
  const orgName      = useAuthStore(s => s.session?.organization.name ?? '');
  const clearSession = useAuthStore(s => s.clearSession);
  const [confirm,    setConfirm]    = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const inputId = useId();

  const canDelete = confirm === orgName;

  const handleDelete = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDelete) return;
    setIsDeleting(true);
    await mockDeleteOrg(orgName);
    clearSession();
  }, [canDelete, orgName, clearSession]);

  return (
    <section className="settings-section settings-section--danger" aria-labelledby="danger-title">
      <div className="settings-section__header">
        <h2 id="danger-title" className="settings-section__title settings-section__title--danger">
          Zone de danger
        </h2>
        <p className="settings-section__desc">Ces actions sont irréversibles.</p>
      </div>
      <div className="danger-card">
        <div className="danger-card__header">
          <div>
            <h3 className="danger-card__title">Supprimer l'organisation</h3>
            <p className="danger-card__desc">
              Supprime définitivement tous les articles, FAQ et données de l'équipe.
            </p>
          </div>
        </div>
        <form className="danger-card__form" onSubmit={handleDelete} noValidate>
          <Input
            id={inputId}
            type="text"
            label={`Saisissez « ${orgName} » pour confirmer`}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder={orgName}
            autoComplete="off"
            error={confirm && !canDelete ? 'Le nom ne correspond pas. Saisissez-le exactement comme il est affiché.' : undefined}
          />
          <Button type="submit" variant="danger" size="md" disabled={!canDelete} loading={isDeleting}>
            Supprimer définitivement l'organisation
          </Button>
        </form>
      </div>
    </section>
  );
}

