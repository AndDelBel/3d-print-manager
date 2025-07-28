'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabaseClient'

export function Navbar() {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const isAuthPage = pathname.startsWith('/auth/')

  // Don't show navbar on auth pages
  if (isAuthPage) {
    return null
  }

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <div className="dropdown lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          {isMobileMenuOpen && (
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link></li>
              {user && (
                <>
                  <li><Link href="/dashboard/files" onClick={() => setIsMobileMenuOpen(false)}>File</Link></li>
                  <li><Link href="/dashboard/orders" onClick={() => setIsMobileMenuOpen(false)}>Ordini</Link></li>
                  {user.is_superuser && (
                    <>
                    <li><Link href="/dashboard/coda-stampa" onClick={() => setIsMobileMenuOpen(false)}>Coda Stampa</Link></li>
                      <li><Link href="/dashboard/organization" onClick={() => setIsMobileMenuOpen(false)}>Organizzazioni</Link></li>
                      <li><Link href="/dashboard/stampanti" onClick={() => setIsMobileMenuOpen(false)}>Stampanti</Link></li>
                      <li><Link href="/dashboard/analytics" onClick={() => setIsMobileMenuOpen(false)}>Analytics</Link></li>
                    </>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
        <Link href="/" className="btn btn-ghost text-xl">
          3D Print Manager
        </Link>
      </div>
      
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/" className={isActive('/') ? 'active' : ''}>
              Home
            </Link>
          </li>
          {user && (
            <>
              <li>
                <Link href="/dashboard/files" className={isActive('/dashboard/files') ? 'active' : ''}>
                  File
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className={isActive('/dashboard/orders') ? 'active' : ''}>
                  Ordini
                </Link>
              </li>
              {user.is_superuser && (
                <>
              <li>
                <Link href="/dashboard/coda-stampa" className={isActive('/dashboard/coda-stampa') ? 'active' : ''}>
                  Coda Stampa
                </Link>
              </li>
                  <li>
                    <Link href="/dashboard/organization" className={isActive('/dashboard/organization') ? 'active' : ''}>
                      Organizzazioni
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/stampanti" className={isActive('/dashboard/stampanti') ? 'active' : ''}>
                      Stampanti
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/analytics" className={isActive('/dashboard/analytics') ? 'active' : ''}>
                      Analytics
                    </Link>
                  </li>
                </>
              )}
            </>
          )}
        </ul>
      </div>
      
      <div className="navbar-end">
        {loading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : user ? (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user.nome?.[0]}{user.cognome?.[0]}
                </span>
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <div className="text-sm">
                  {user.nome} {user.cognome}
                  {user.is_superuser && (
                    <div className="badge badge-primary badge-sm">Admin</div>
                  )}
                </div>
              </li>
              <li><div className="text-xs text-base-content/70">{user.email}</div></li>
              <li><hr /></li>
              <li>
                <button onClick={handleLogout} className="text-error">
                  Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/auth/login" className="btn btn-primary btn-sm">
              Login
            </Link>
            <Link href="/auth/register" className="btn btn-outline btn-sm">
              Registrati
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 