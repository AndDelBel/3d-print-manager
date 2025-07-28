import React from 'react'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean
  loadingText?: string
  children: React.ReactNode
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ loading, loadingText, children, ...props }) => (
  <button
    disabled={loading || props.disabled}
    className={`relative ${props.className || ''}`}
    {...props}
  >
    {loading ? (
      <span className="flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        {loadingText || 'Attendi...'}
      </span>
    ) : (
      children
    )}
  </button>
) 