import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, BookOpen, ChartColumn, CircleHelp, FileSearch, GraduationCap, House,
  LifeBuoy, ListOrdered, MessageCircle, Radar, Settings, Users,
} from 'lucide-react';
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
  { id: 'dashboard', label: 'Accueil',   href: '/',           icon: <House size={20} />, module: 'dashboard' },
  { id: 'knowledge', label: 'Articles',  href: '/knowledge',  icon: <BookOpen size={20} />, module: 'knowledge' },
  { id: 'faqs',      label: 'FAQ',       href: '/faqs',       icon: <CircleHelp size={20} />,  module: 'faqs' },
  { id: 'trees',     label: 'Processus', href: '/trees',      icon: <ListOrdered size={20} />, module: 'trees' },
  { id: 'learning',  label: 'Formations', href: '/learning',   icon: <GraduationCap size={20} />, module: 'learning' },
  { id: 'analytics', label: 'Analyse',       href: '/analytics',  icon: <ChartColumn size={20} />, adminOnly: true, module: 'analytics' },
  { id: 'chats',     label: 'Conversations', href: '/chats',      icon: <MessageCircle size={20} />,  adminOnly: true, module: 'chats' },
  { id: 'brand-monitoring', label: 'Suivi de marque', href: '/brand-monitoring', icon: <Radar size={20} />, adminOnly: true, module: 'brand_monitoring' },
  { id: 'onboarding', label: 'Onboarding', href: '/onboarding', icon: <FileSearch size={20} />, adminOnly: true, module: 'onboarding' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'team',      label: 'Équipe',     href: '/team',     icon: <Users size={20} />,    adminOnly: true, module: 'members' },
  { id: 'settings',  label: 'Paramètres', href: '/settings', icon: <Settings size={20} />, module: 'settings' },
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
    <span className="sidenav__icon" aria-hidden="true"><LifeBuoy size={20} /></span>
    <span className="sidenav__label">Aide</span>
  </button>
</li>
)}
<li>
  <button
    type="button"
    className={cn('sidenav__item sidenav__initials', active === 'account' && 'sidenav__item--active')}
    onClick={() => onNavigate('account')}
    aria-current={active === 'account' ? 'page' : undefined}
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
          <Bell size={20} />
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
