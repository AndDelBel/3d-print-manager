import { useUser } from '@/hooks/useUser'
import UserAvatar from './UserAvatar'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function DashboardHeader() {
  const { user } = useUser()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (!user) return null

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar 
            nome={user.nome} 
            cognome={user.cognome} 
            size="md"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user.nome} {user.cognome}
            </p>
            <p className="text-xs text-gray-600">
              {user.email}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}