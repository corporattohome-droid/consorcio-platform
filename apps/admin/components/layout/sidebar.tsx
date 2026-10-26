'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, CreditCard, FileText,
  DollarSign, Calendar, Award, LogOut, Settings, ChevronRight,
  Shield, Bell, BarChart3
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/groups', label: 'Grupos', icon: Building2 },
  { href: '/quotas', label: 'Cotas', icon: CreditCard },
  { href: '/contracts', label: 'Contratos', icon: FileText },
  { href: '/installments', label: 'Parcelas', icon: DollarSign },
  { href: '/payments', label: 'Pagamentos', icon: Award },
  { href: '/assemblies', label: 'Assembleias', icon: Calendar },
  { href: '/accounting', label: 'Contabilidade', icon: BarChart3 },
  { href: '/reports', label: 'Relatórios', icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-[var(--sidebar-width,260px)] bg-brand-navy flex flex-col z-40 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Consórcio</p>
          <p className="text-blue-300 text-xs">Platform Admin</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-blue-400 group-hover:text-white')} />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto text-blue-200" />}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/10 pt-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <Settings className="w-4 h-4 text-blue-400" />
          Configurações
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-red-500/20 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
