'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, DollarSign, FileText } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/quotas', label: 'Cotas', icon: CreditCard },
  { href: '/installments', label: 'Parcelas', icon: DollarSign },
  { href: '/documents', label: 'Documentos', icon: FileText },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-30 md:hidden">
      <div className="max-w-2xl mx-auto grid grid-cols-4 h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
