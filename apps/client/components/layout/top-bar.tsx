'use client'

import { useSession, signOut } from 'next-auth/react'
import { Bell, LogOut } from 'lucide-react'

export function TopBar() {
  const { data: session } = useSession()
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 safe-top">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Portal</p>
          <p className="text-sm font-semibold text-gray-900 leading-none">{session?.user?.name?.split(' ')[0] ?? 'Consorciado'}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl hover:bg-gray-50 transition-colors" aria-label="Notificações">
            <Bell className="w-5 h-5 text-gray-500" />
          </button>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="p-2 rounded-xl hover:bg-gray-50 transition-colors" aria-label="Sair">
            <LogOut className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  )
}
