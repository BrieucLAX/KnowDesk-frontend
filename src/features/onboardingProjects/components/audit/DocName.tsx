import React from 'react';
import { documentName, documentPath, fileName, type Audit } from '../../lib/audit';

/** Un nom de fichier, avec son chemin complet en infobulle quand il en a un. */
export function FileName({ name, path, className }: { name: string; path: string; className?: string }) {
  return <span className={className} title={path !== name ? path : undefined}>{name}</span>;
}

/** Un document de l'inventaire, par son nom de fichier (chemin de l'archive en infobulle). */
export function DocName({ audit, id, className }: { audit: Audit; id: string; className?: string }) {
  return <FileName name={documentName(audit, id)} path={documentPath(audit, id)} className={className} />;
}

/** Plusieurs documents, séparés par des virgules. */
export function DocNames({ audit, ids }: { audit: Audit; ids: string[] }) {
  return <>{ids.map((id, i) => <React.Fragment key={id}>{i > 0 && ', '}<DocName audit={audit} id={id} /></React.Fragment>)}</>;
}

/** Un fichier nommé par l'IA (chemin libre, pas un identifiant de l'inventaire). */
export const AiFileName = ({ path }: { path: string }) => <FileName name={fileName(path)} path={path} />;
