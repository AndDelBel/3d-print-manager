'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface UserAvatarProps {
  nome: string
  cognome: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function UserAvatar({ size = 'md', className = '' }: UserAvatarProps) {
  const [user, setUser] = useState<{ nome: string; cognome: string } | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase
          .from('utente')
          .select('nome, cognome')
          .eq('id', session.user.id)
          .single()
        setUser(data)
      }
    }
    fetchUser()
  }, [])

  const getInitials = (nome: string, cognome: string) => {
    return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase()
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm', 
    lg: 'w-12 h-12 text-base'
  }

  if (!user) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-300 animate-pulse ${className}`} />
    )
  }

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        bg-blue-500 
        text-white 
        font-semibold
        flex 
        items-center 
        justify-center
        select-none
        ${className}
      `}
    >
      {getInitials(user.nome, user.cognome)}
export default function UserAvatar({ 
  nome, 
  cognome, 
  size = 'md',
  className = '' 
}: UserAvatarProps) {
  // Estrae le iniziali
  const initials = `${nome.charAt(0).toUpperCase()}${cognome.charAt(0).toUpperCase()}`
  
  // Definisce le dimensioni
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base', 
    lg: 'w-12 h-12 text-lg'
  }
  
  return (
    <div 
      className={`
        ${sizeClasses[size]}
        bg-blue-600 
        text-white 
        rounded-full 
        flex 
        items-center 
        justify-center 
        font-semibold
        ${className}
      `}
    >
      {initials}
    </div>
  )
}