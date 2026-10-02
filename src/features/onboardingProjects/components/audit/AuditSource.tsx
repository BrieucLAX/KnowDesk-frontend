import React, { createContext, useContext, useEffect, useState } from 'react';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { documentName, type Audit, type SourceRef } from '../../lib/audit';
import { sourceLocation, VISION_NOTE } from '../../lib/auditLabels';
import { ExcerptText } from './ExcerptText';

/** Images de l'audit affiché : celles conservées par le back, et leur lecture. */
export interface AuditImages {
  available: ReadonlySet<string>;
  load:      (imageId: string) => Promise<Blob>;
}

export const AuditImagesContext = createContext<AuditImages>({
  available: new Set(),
  load:      () => Promise.reject(new Error('aucune image')),
});

/**
 * Image d'un extrait lu par vision. Absente du back (EMF, WMF, type refusé)
 * ou illisible : un encadré le dit ; le document et l'emplacement restent
 * affichés par l'extrait. Échec silencieux : l'image n'est qu'un appui.
 */
export function AuditImage({ imageId, alt }: { imageId: string | null; alt: string }) {
  const { available, load } = useContext(AuditImagesContext);
  const known = imageId !== null && available.has(imageId);
  const [url,    setUrl]    = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!known || imageId === null) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setFailed(false);
    load(imageId)
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [known, imageId, load]);

  if (!known || failed) {
    return <div className="obp-audit-image obp-audit-image--missing">Image non disponible</div>;
  }
  if (!url) return <Skeleton className="obp-audit-image obp-audit-image--loading" />;
  return <img className="obp-audit-image" src={url} alt={alt} />;
}

/**
 * Un extrait cité : le document (par son nom de fichier), l'emplacement,
 * le texte ; s'il a été lu par vision, la mention et l'image à côté.
 */
export function AuditSource({ audit, source, imageShown = false }: {
  audit: Audit; source: SourceRef;
  /** L'image de cet extrait est déjà affichée juste au-dessus (même image, même côté) : on y renvoie. */
  imageShown?: boolean;
}) {
  const doc = documentName(audit, source.documentId);
  const location = sourceLocation(source);
  return (
    <figure className={`obp-audit-source${source.visionUnverified ? ' obp-audit-source--vision' : ''}`}>
      <figcaption className="obp-audit-source__where">
        <span className="obp-audit-source__doc">{doc}</span>
        <span className="obp-muted">{location}</span>
      </figcaption>
      <div className="obp-audit-source__body">
        <blockquote className="obp-audit-source__excerpt"><ExcerptText excerpt={source.excerpt} /></blockquote>
        {source.visionUnverified && (
          <>
            <p className="obp-audit-vision">{VISION_NOTE}</p>
            {imageShown
              ? <p className="obp-muted">Lu dans la même image, affichée ci-dessus.</p>
              : <AuditImage imageId={source.imageId} alt={`Image lue dans ${doc}, ${location}`} />}
          </>
        )}
      </div>
    </figure>
  );
}
