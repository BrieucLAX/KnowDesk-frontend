import React from 'react';
import { Button } from './Button';
import './NotFoundPage.css';
import { ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  title?:       string;
  description?: string;
  onBack?:      () => void;
  backLabel?:   string;
}

export function NotFoundPage({
  title       = 'Page introuvable',
  description = 'La page que vous cherchez n\'existe pas ou a été déplacée.',
  onBack,
  backLabel   = 'Retour au tableau de bord',
}: NotFoundPageProps) {
  return (
    <div className="not-found-page">
      <div className="not-found-page__content">
        <span className="not-found-page__code">404</span>
        <h1 className="not-found-page__title">{title}</h1>
        <p className="not-found-page__desc">{description}</p>
        {onBack && (
          <Button variant="primary" size="md" onClick={onBack} leftIcon={<ArrowLeft size={20} />}>
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
