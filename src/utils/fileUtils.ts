// Cache for parsed display names to avoid repeated string operations
const displayNameCache = new Map<string, string>()

export function parseDisplayName(fullPath: string): string {
  // Check cache first
  if (displayNameCache.has(fullPath)) {
    return displayNameCache.get(fullPath)!
  }
  
  // Extract filename from path
  const segments = fullPath.split('/')
  const filename = segments[segments.length - 1] || fullPath
  
  // Remove timestamp and extension
  const displayName = filename
    .replace(/\.\d+\./, '.') // Remove timestamp like .1234567890.
    .replace(/\.[^.]+$/, '') // Remove file extension
    .replace(/_/g, ' ')      // Replace underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize words
  
  // Cache the result
  displayNameCache.set(fullPath, displayName)
  
  return displayName
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase()
}

export function getBaseName(filename: string): string {
  const lastSlash = filename.lastIndexOf('/')
  const name = lastSlash === -1 ? filename : filename.slice(lastSlash + 1)
  const lastDot = name.lastIndexOf('.')
  return lastDot === -1 ? name : name.slice(0, lastDot)
}

// Parse organization and project from file path
export function parseFilePath(fullPath: string): {
  organization: string
  project: string
  filename: string
  extension: string
} {
  const segments = fullPath.split('/')
  const filename = segments[segments.length - 1] || ''
  
  return {
    organization: segments[0] || '',
    project: segments[1] || '',
    filename: getBaseName(filename),
    extension: getFileExtension(filename)
  }
}

// Generate storage path for new files
export function generateStoragePath(
  orgName: string,
  projectName: string,
  originalFilename: string,
  timestamp?: number
): string {
  const cleanOrgName = orgName.replace(/\s+/g, '_').toLowerCase()
  const cleanProjectName = projectName.replace(/\s+/g, '_').toLowerCase()
  const cleanBaseName = getBaseName(originalFilename).replace(/\s+/g, '_').toLowerCase()
  const extension = getFileExtension(originalFilename)
  const ts = timestamp || Date.now()
  
  return `${cleanOrgName}/${cleanProjectName}/${cleanBaseName}.${ts}.${extension}`
}

// Validate file types
export function isValidFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = getFileExtension(filename)
  return allowedTypes.includes(extension)
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Clean up display name cache periodically
export function cleanDisplayNameCache(): void {
  if (displayNameCache.size > 1000) { // Arbitrary limit
    displayNameCache.clear()
  }
}