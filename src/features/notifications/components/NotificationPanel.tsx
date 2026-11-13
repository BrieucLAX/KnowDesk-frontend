import React, { useEffect, useRef } from 'react';
import { formatRelative } from '../../../shared/lib/formatDate';
import '../notifications.css';
import type { Notification } from '../types';
import { Bell, FileText, Pencil, RotateCw, UserPlus, X } from 'lucide-react';

interface NotificationPanelProps {
  notifications: Notification[];
  loading:       boolean;
  onMarkAsRead:  (id: string) => void;
  onMarkAllRead: () => void;
  onClose:       () => void;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  article_published: { label: 'Article publié',     icon: <FileText size={16} /> },
  article_updated:   { label: 'Article modifié',    icon: <Pencil size={16} /> },
  member_joined:     { label: 'Nouveau membre',     icon: <UserPlus size={16} /> },
  learning_renewal:  { label: 'Module à renouveler', icon: <RotateCw size={16} /> },
};

export function NotificationPanel({
  notifications, loading, onMarkAsRead, onMarkAllRead, onClose,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Ferme le panneau en cliquant en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Ferme avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const unread = notifications.filter(n => !n.read_at);

  return (
    <div
      ref={panelRef}
      className="notif-panel"
      role="dialog"
      aria-label="Notifications"
      aria-modal="false"
    >
      <div className="notif-panel__header">
        <h2 className="notif-panel__title">
          Notifications
          {unread.length > 0 && (
            <span className="notif-panel__count">{unread.length}</span>
          )}
        </h2>
        <div className="notif-panel__actions">
          {unread.length > 0 && (
            <button
              type="button"
              className="notif-panel__mark-all"
              onClick={onMarkAllRead}
            >
              Tout marquer lu
            </button>
          )}
          <button
            type="button"
            className="notif-panel__close"
            onClick={onClose}
            aria-label="Fermer les notifications"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="notif-panel__body">
        {loading && (
          <div className="notif-panel__loading" aria-label="Chargement…">
            <div className="notif-panel__spinner" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="notif-panel__empty">
            <p>Aucune notification pour l'instant.</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <ul className="notif-list" role="list">
            {notifications.map(notif => {
              const config = TYPE_CONFIG[notif.type] ?? { label: notif.type, icon: <Bell size={16} /> };
              const isUnread = !notif.read_at;
              const title = String(notif.payload?.title ?? '');

              return (
                <li
                  key={notif.id}
                  className={`notif-item ${isUnread ? 'notif-item--unread' : ''}`}
                >
                  <span className="notif-item__icon" aria-hidden="true">
                    {config.icon}
                  </span>
                  <div className="notif-item__body">
                    <p className="notif-item__label">{config.label}</p>
                    {title && (
                      <p className="notif-item__title">"{title}"</p>
                    )}
                    <time className="notif-item__time" dateTime={notif.created_at}>
                      {formatRelative(notif.created_at)}
                    </time>
                  </div>
                  {isUnread && (
                    <button
                      type="button"
                      className="notif-item__read-btn"
                      onClick={() => onMarkAsRead(notif.id)}
                      aria-label="Marquer comme lu"
                    >
                      <span className="notif-item__dot" aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
