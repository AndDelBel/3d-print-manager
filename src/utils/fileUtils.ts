/** Estrae il nome “utente” da un path tipo org/commessa/base.timestamp.ext */
export function parseDisplayName(path: string): string {
  const parts = path.split('/').pop()?.split('.') || ['']
  return parts.length > 2 ? parts[parts.length - 3] : parts[0]
}