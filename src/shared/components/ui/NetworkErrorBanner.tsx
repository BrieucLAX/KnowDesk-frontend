import React, { useState, useEffect } from 'react';
import { StatusIcon } from './StatusIcon';
import './NetworkErrorBanner.css';

/**
 * Bannière qui apparaît quand la connexion est perdue.
 * Se ferme automatiquement quand la connexion revient.
 */
export function NetworkErrorBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline  = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="network-banner" role="status">
      <StatusIcon tone="warning" className="network-banner__icon" />
      Connexion perdue — vos modifications seront synchronisées au retour du réseau.
    </div>
  );
}
