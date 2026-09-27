const MB = 1024 * 1024;

/** Taille lisible, en Ko ou Mo (base 1024, comme les plafonds du back). */
export function formatBytes(bytes: number): string {
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  const mb = bytes / MB;
  return `${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} Mo`;
}
