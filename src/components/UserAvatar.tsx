interface UserAvatarProps {
  nome: string
  cognome: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

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