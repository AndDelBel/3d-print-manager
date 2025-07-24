
/**
 * Filtra un array di oggetti in base a una query,
 * controllando se la query compare in almeno uno dei campi restituiti da `getters`.
 */
export function filterBySearch<T>(
  items: T[],
  query: string,
  getters: Array<(item: T) => string>
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(item =>
    getters.some(fn => {
      // se fn(item) torna undefined/null, lo trattiamo come stringa vuota
      const value = fn(item) ?? ''
      return value.toLowerCase().includes(q)
    })
  )
}