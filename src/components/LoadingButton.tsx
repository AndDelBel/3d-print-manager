import React, { memo } from 'react'

interface LoadingButtonProps {
  onClick: () => void | Promise<void>
  loading: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
}

export const LoadingButton = memo(({
  onClick,
  loading,
  disabled = false,
  className = '',
  children,
  type = 'button'
}: LoadingButtonProps) => {
  const isDisabled = loading || disabled

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
        ${isDisabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        }
        transition-colors duration-200
        ${className}
      `}
    >
      {loading && (
        <svg 
          className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
})

LoadingButton.displayName = 'LoadingButton'