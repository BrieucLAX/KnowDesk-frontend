import type { LearningPathRenewal } from './types';
import { Scale, ShieldAlert, UserPlus, type LucideIcon } from 'lucide-react';

/**
 * Templates de parcours pré-remplis. Pure frontend pour la V1 — chaque
 * template est instancié par une création normale (POST /paths puis
 * POST /paths/:id/modules pour chaque entrée `modules`). L'admin reste
 * libre d'ajouter ressources et quiz module par module ensuite, ces
 * templates ne touchent pas au contenu.
 */
export interface LearningPathTemplate {
  id:             string;
  label:          string;
  /** Icône courte (emoji) pour la card de sélection. */
  icon:           LucideIcon;
  /** Phrase d'accroche affichée sous le label dans le sélecteur. */
  hint:           string;
  name:           string;
  description:    string;
  mandatory:      boolean;
  renewal_months: LearningPathRenewal;
  modules:        string[];
}

export const LEARNING_TEMPLATES: LearningPathTemplate[] = [
  {
    id:    'rgpd',
    label: 'RGPD & données clients',
    icon:  Scale,
    hint:  'Conformité — renouvellement 12 mois',
    name:  'RGPD & traitement des données client',
    description:
      'Bases du RGPD, droits des clients (accès, rectification, suppression) et bonnes pratiques au quotidien.',
    mandatory:      true,
    renewal_months: 12,
    modules: [
      'Bases du RGPD',
      'Droits des clients : accès, rectification, suppression',
      'Traiter une demande de droit (RGPD)',
      'Sécurité des échanges et confidentialité',
    ],
  },
  {
    id:    'security',
    label: 'Sécurité — phishing & fraude',
    icon:  ShieldAlert,
    hint:  'Risque opérationnel — renouvellement 6 mois',
    name:  'Sécurité : reconnaître phishing et tentatives de fraude',
    description:
      'Identifier les emails suspects, suivre la procédure de signalement et appliquer l\'authentification client renforcée.',
    mandatory:      true,
    renewal_months: 6,
    modules: [
      'Reconnaître un phishing',
      'Procédure de signalement interne',
      'Cas concrets : fraude à l\'usurpation d\'identité',
      'Authentification client renforcée',
    ],
  },
  {
    id:    'onboarding',
    label: 'Onboarding nouveau conseiller',
    icon:  UserPlus,
    hint:  'Première semaine — pas de renouvellement',
    name:  'Onboarding nouveau conseiller',
    description:
      'Premier parcours pour un nouvel arrivant : outils, posture conseiller et premiers appels accompagnés.',
    mandatory:      true,
    renewal_months: null,
    modules: [
      'Bienvenue et présentation de l\'équipe',
      'Outils & accès — tour d\'horizon',
      'Posture conseiller et tonalité',
      'Premiers appels accompagnés',
    ],
  },
];

export function findTemplate(id: string | null): LearningPathTemplate | null {
  if (!id) return null;
  return LEARNING_TEMPLATES.find(t => t.id === id) ?? null;
}
