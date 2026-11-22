const MB = 1024 * 1024;

/** Taille lisible, en Ko ou Mo (base 1024, comme les plafonds du back). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Mo';
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  const mb = bytes / MB;
  return `${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} Mo`;
}

/** La source d'une mention KnowDesk (lot 7a) : « à partir de 3 documents », rien si elle n'est pas connue. */
export function fromDocuments(n: number | undefined): string {
  if (!n) return '';
  return ` à partir de ${n === 1 ? '1 document' : `${n} documents`}`;
}
