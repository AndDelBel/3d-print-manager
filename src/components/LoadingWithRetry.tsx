import React from 'react'

interface LoadingWithRetryProps {
  message?: string
  className?: string
}

export function LoadingWithRetry({ 
  message = "Caricamento...", 
  className = ""
}: LoadingWithRetryProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  )
} 