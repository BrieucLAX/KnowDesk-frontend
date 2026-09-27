import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { computeInitials } from '../../lib/initials';
import { useAuthStore, selectUserRole, selectOrganization } from '../../../store/authStore';
import { hasModule, type ModuleName } from '../../lib/modules';
import { useNotifications } from '../../../features/notifications/hooks/useNotifications';
import { NotificationPanel } from '../../../features/notifications/components/NotificationPanel';
// .sidenav__badge est défini dans notifications.css (couplage badge ↔ feature notif)
import '../../../features/notifications/notifications.css';

export type NavRoute = 'dashboard' | 'search' | 'knowledge' | 'faqs' | 'trees' | 'learning' | 'team' | 'analytics' | 'chats' | 'brand-monitoring' | 'settings' | 'account' | 'onboarding';

interface NavItem {
  id:        NavRoute;
  label:     string;
  href:      string;
  icon:      React.ReactNode;
  adminOnly?: boolean;
  /** True : visible UNIQUEMENT pour role='admin' (exclut manager).
   *  Sert pour les pages où le backend exige role strict ('admin' seul). */
  adminStrict?: boolean;
  /** Module requis sur l'organisation (organization.enabledModules). */
  module:    ModuleName;
}

interface SideNavProps {
  active:     NavRoute;
  onNavigate: (route: NavRoute) => void;
  /** Absent : pas de bouton Aide (organisation sans le module help). */
  onHelp?:    () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Accueil',   href: '/',           icon: <HomeIcon />, module: 'dashboard' },
  { id: 'knowledge', label: 'Articles',  href: '/knowledge',  icon: <BookIcon />, module: 'knowledge' },
  { id: 'faqs',      label: 'FAQs',      href: '/faqs',       icon: <FaqIcon />,  module: 'faqs' },
  { id: 'trees',     label: 'Processus', href: '/trees',      icon: <TreeIcon />, module: 'trees' },
  { id: 'learning',  label: 'Formations', href: '/learning',   icon: <LearningIcon />, module: 'learning' },
  { id: 'analytics', label: 'Analyse',       href: '/analytics',  icon: <ChartIcon />, adminOnly: true, module: 'analytics' },
  { id: 'chats',     label: 'Conversations', href: '/chats',      icon: <ChatIcon />,  adminOnly: true, module: 'chats' },
  { id: 'brand-monitoring', label: 'Brand monitoring', href: '/brand-monitoring', icon: <RadarIcon />, adminOnly: true, module: 'brand_monitoring' },
  { id: 'onboarding', label: 'Onboarding', href: '/onboarding', icon: <OnboardingIcon />, adminOnly: true, module: 'onboarding' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'team',      label: 'Équipe',     href: '/team',     icon: <TeamIcon />,    adminOnly: true, module: 'members' },
  { id: 'settings',  label: 'Paramètres', href: '/settings', icon: <SettingsIcon />, module: 'settings' },
];

export function SideNav({ active, onNavigate, onHelp }: SideNavProps) {
  const role    = useAuthStore(selectUserRole);
  const isAdmin = role === 'admin' || role === 'manager';
  const organization = useAuthStore(selectOrganization);
  const session  = useAuthStore(s => s.session);
const initials = (() => {
  const fn = session?.user?.firstName;
  const ln = session?.user?.lastName;
  const em = session?.user?.email ?? '';
  if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
  if (fn)       return fn[0].toUpperCase();
  const parts = em.split('@')[0].split(/[._-]/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0][0] ?? 'K').toUpperCase();
})();

  const renderItem = (item: NavItem) => {
    if (!hasModule(organization, item.module)) return null;
    if (item.adminOnly && !isAdmin) return null;
    if (item.adminStrict && role !== 'admin') return null;
    const isActive = item.id === active;

    return (
      <li key={item.id}>
        <button
          className={cn('sidenav__item', isActive && 'sidenav__item--active')}
          onClick={() => onNavigate(item.id)}
          aria-current={isActive ? 'page' : undefined}
          aria-label={item.label}
        >
          <span className="sidenav__icon" aria-hidden="true">{item.icon}</span>
          <span className="sidenav__label">{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <>
      <nav className="sidenav" aria-label="Navigation principale">
        {/* Logo */}
        <div className="sidenav__logo">
          <span className="sidenav__logo-mark" aria-hidden="true">K</span>
          <span className="sidenav__logo-name">KnowDesk</span>
        </div>

        {/* Main nav */}
        <ul className="sidenav__list" role="list">
          {NAV_ITEMS.map(renderItem)}
        </ul>

        {/* Bottom nav */}
        <ul className="sidenav__list sidenav__list--bottom" role="list">
          {/* Notifications : ni bouton ni interrogation périodique sans le module. */}
          {hasModule(organization, 'notifications') && <NotificationsItem />}

          {BOTTOM_ITEMS.map(renderItem)}
{onHelp && (
<li>
  <button
    type="button"
    className="sidenav__item sidenav__item--help"
    onClick={onHelp}
    aria-label="Aide"
  >
    <span className="sidenav__icon" aria-hidden="true"><HelpIcon /></span>
    <span className="sidenav__label">Aide</span>
  </button>
</li>
)}
<li>
  <button
    type="button"
    className="sidenav__item sidenav__initials"
    onClick={() => onNavigate('account')}
    aria-label="Mon compte"
  >
    <span className="sidenav__initials-circle" aria-hidden="true">{initials}</span>
    <span className="sidenav__label">Mon compte</span>
  </button>
</li>
        </ul>
      </nav>
    </>
  );
}

/**
 * Bouton et panneau des notifications. Monté seulement si l'organisation a le
 * module : useNotifications interroge /notifications toutes les 30 s.
 */
function NotificationsItem() {
  const [showNotifs, setShowNotifs] = useState(false);
  const {
    notifications, unreadCount, loading,
    markAsRead, markAllAsRead, refetch,
  } = useNotifications();

  const handleNotifOpen = useCallback(() => {
    setShowNotifs(true);
    refetch();
  }, [refetch]);

  return (
    <li>
      <button
        className="sidenav__item sidenav__item--notif"
        onClick={handleNotifOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} non lues` : ''}`}
      >
        <span className="sidenav__icon" aria-hidden="true">
          <BellIcon />
        </span>
        <span className="sidenav__label">Notifications</span>
        {unreadCount > 0 && (
          <span className="sidenav__badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {/* Panneau en position fixe, rendu hors de la liste de navigation. */}
      {showNotifs && createPortal(
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          onMarkAsRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onClose={() => setShowNotifs(false)}
        />,
        document.body,
      )}
    </li>
  );
}

function UserAvatar() {
  const user   = useAuthStore(s => s.session?.user);
  const logout = useAuthStore(s => s.logout);

  if (!user) return null;

  const initials = computeInitials(user);

  return (
    <button
      className="sidenav__avatar"
      onClick={() => { void logout(); }}
      title={`${user.email} — Se déconnecter`}
      aria-label="Se déconnecter"
    >
      {initials}
    </button>
  );
}

// ─── Icons ─────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 7.5L9 2l7 5.5V16a.5.5 0 01-.5.5h-4V12h-5v4.5H2.5A.5.5 0 012 16V7.5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="12.5" y1="12.5" x2="16" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 3h5a3 3 0 013 3v10a2 2 0 00-2-2H3V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <path d="M15 3h-5a3 3 0 00-3 3v10a2 2 0 012-2h6V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9"  cy="6"  r="3" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="14" cy="7"  r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="4"  cy="7"  r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M1 16c0-2.5 3.5-4 8-4s8 1.5 8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function SettingsIcon() {
  // Roue crantée style Feather/Lucide — viewBox 24 pour la précision du path,
  // rendu à 18px pour rester cohérent avec les autres icônes de la sidenav.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor" strokeWidth="1.8" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2a5 5 0 00-5 5v3l-1.5 2.5h13L14 10V7a5 5 0 00-5-5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9"  cy="3"  r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="4"  cy="13" r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="14" cy="13" r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M9 5v3M9 8l-5 3M9 8l5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function LearningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M1.5 5.5L9 2l7.5 3.5L9 9 1.5 5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M4.5 7.5v4.5c0 0 2 1.5 4.5 1.5s4.5-1.5 4.5-1.5V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M2 16c0-3 3.1-5 7-5s7 2 7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function RadarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="9" cy="9" r="4"   stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="9" cy="9" r="1.2" fill="currentColor"/>
      <path d="M9 9L14 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 16h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <rect x="3"  y="9"  width="2.5" height="6" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <rect x="7.5"  y="5"  width="2.5" height="10" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <rect x="12" y="2"  width="2.5" height="13" stroke="currentColor" strokeWidth="1.4" fill="none"/>
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M6.5 7c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5c0 1.5-2.5 2-2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <circle cx="9" cy="13" r="0.8" fill="currentColor"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 4a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H7l-3 3v-3a2 2 0 01-1-2V4z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <circle cx="6" cy="7" r="0.7" fill="currentColor"/>
      <circle cx="9" cy="7" r="0.7" fill="currentColor"/>
      <circle cx="12" cy="7" r="0.7" fill="currentColor"/>
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="11" height="14" rx="1.5"
        stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M6 6h6M6 9h6M6 12h4"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function OnboardingIcon() {
  // Dossier avec flèche d'import : projets et documents importés.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 5a1.5 1.5 0 011.5-1.5h3l1.5 1.5h6.5A1.5 1.5 0 0116 6.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 13.5V5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <path d="M9 7.5v4.5M7 10l2 2 2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FaqIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 4a2 2 0 012-2h8a2 2 0 012 2v7a2 2 0 01-2 2H8l-3 3v-3H5a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <path d="M7 6.5c0-1 .8-1.5 2-1.5s2 .5 2 1.5c0 1-2 1-2 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <circle cx="9" cy="11.5" r="0.7" fill="currentColor"/>
    </svg>
  );
}
