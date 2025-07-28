
/**
 * Filtra un array di oggetti in base a una query,
 * controllando se la query compare in almeno uno dei campi restituiti da `getters`.
 */
export function filterBySearch<T>(
  items: T[],
  query: string,
  searchFields: ((item: T) => string)[]
): T[] {
  if (!query.trim()) return items
  
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean)
  
  return items.filter(item => {
    const searchText = searchFields
      .map(field => field(item).toLowerCase())
      .join(' ')
    
    // All search terms must be found
    return searchTerms.every(term => searchText.includes(term))
  })
}

// Debounced search for better performance
export function createDebouncedSearch<T>(
  searchFn: (items: T[], query: string) => T[],
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (
    items: T[], 
    query: string, 
    callback: (results: T[]) => void
  ) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      const results = searchFn(items, query)
      callback(results)
    }, delay)
  }
}

// Enhanced text matching with fuzzy search capabilities
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true
  
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  
  // Exact match gets highest priority
  if (textLower.includes(queryLower)) return true
  
  // Check if all characters in query exist in text in order
  let textIndex = 0
  for (const char of queryLower) {
    textIndex = textLower.indexOf(char, textIndex)
    if (textIndex === -1) return false
    textIndex++
  }
  
  return true
}

// Multi-field search with weights
export function weightedSearch<T>(
  items: T[],
  query: string,
  searchConfig: Array<{
    field: (item: T) => string
    weight: number
  }>
): Array<{ item: T; score: number }> {
  if (!query.trim()) {
    return items.map(item => ({ item, score: 0 }))
  }
  
  const queryLower = query.toLowerCase()
  
  return items
    .map(item => {
      let score = 0
      
      for (const { field, weight } of searchConfig) {
        const fieldValue = field(item).toLowerCase()
        
        if (fieldValue.includes(queryLower)) {
          // Exact substring match
          score += weight * 2
        } else if (fuzzyMatch(fieldValue, queryLower)) {
          // Fuzzy match
          score += weight
        }
      }
      
      return { item, score }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
}