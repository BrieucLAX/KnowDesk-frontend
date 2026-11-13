import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

interface StatusIconProps {
  tone:       StatusTone;
  /** 20 px dans les encarts (fiche Alert), 16 px dans le texte. */
  size?:      number;
  className?: string;
}

/**
 * Icône d'état des encarts (toast, bandeaux), en `currentColor` : la couleur
 * vient de la classe de l'encart (seule l'icône est colorée, fiche Alert).
 * Décorative : l'encart porte toujours un texte.
 * TODO(lot 4, icônes) : remplacer par les pictos Lucide de la sélection
 * (docs/design-system/icons) quand lucide-react sera installé.
 */
export function StatusIcon({ tone, size = 20, className }: StatusIconProps) {
  const paths: Record<StatusTone, React.ReactNode> = {
    success: <path d="M6.5 10.2l2.4 2.4 4.6-5" />,
    danger:  <><path d="M7.5 7.5l5 5" /><path d="M12.5 7.5l-5 5" /></>,
    warning: <><path d="M10 6.2v4.6" /><path d="M10 13.6v.1" /></>,
    info:    <><path d="M10 9.2v4.6" /><path d="M10 6.3v.1" /></>,
  };
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10" cy="10" r="8" />
      {paths[tone]}
    </svg>
  );
}
