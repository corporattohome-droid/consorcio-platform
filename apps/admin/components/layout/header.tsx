'use client'

import { Bell, Search, ChevronDown, Moon, Sun } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export function Header({ title }: { title?: string }) {
  const { data: session } = useSession()
  const [darkMode, setDarkMode] = useState(false)

  const toggleDark = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="h-16 bg-white dark:bg-neutral-800 border-b border-gray-100 dark:border-neutral-700 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        )}
        <div className="relative hidden md:flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar clientes, grupos, cotas..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
        </button>

        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-neutral-700">
          <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
            {session?.user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
              {session?.user?.name ?? 'Administrador'}
            </p>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400 hidden md:block" />
        </div>
      </div>
    </header>
  )
}
