import type { OnboardingDocument } from '../types';

/** Un document tel que le rend le back du lot 2a (contrat, section 5) : classé, lu, sans date. */
export function makeDocument(over: Partial<OnboardingDocument> & Pick<OnboardingDocument, 'id' | 'filename'>): OnboardingDocument {
  return {
    format: 'pdf', sizeBytes: 1024, sha256: over.id, textChars: 100, locked: false, createdAt: '2026-11-28T08:00:00Z',
    title: null, documentType: 'tarifs', typeOrigin: 'knowdesk', usage: 'client', usageOrigin: 'knowdesk',
    toVerify: false, date: null, dateOrigin: 'aucune', datePage: null, state: 'lu', classificationStatus: 'termine',
    ...over,
  };
}
