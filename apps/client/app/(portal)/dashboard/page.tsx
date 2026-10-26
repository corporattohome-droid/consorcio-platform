'use client'

import { useQuery } from '@tanstack/react-query'
import { clientDashboardApi, clientQuotasApi } from '@/lib/api'
import { formatCurrency, formatDate, statusLabels } from '@/lib/utils'
import {
  CreditCard, DollarSign, Calendar, CheckCircle,
  AlertTriangle, ChevronRight, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

function StatusPill({ status }: { status: string }) {
  const info = statusLabels[status] ?? { label: status, color: 'gray' }
  const colorMap: Record<string, string> = {
    green:  'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red:    'bg-red-50 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
    blue:   'bg-blue-50 text-blue-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[info.color] ?? colorMap.gray}`}>
      {info.label}
    </span>
  )
}

export default function ClientDashboard() {
  const { data: session } = useSession()
  const { data, isLoading } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: () => clientDashboardApi.getSummary() as Promise<unknown>,
  })
  const { data: quotasData } = useQuery({
    queryKey: ['client-quotas'],
    queryFn: () => clientQuotasApi.mine() as Promise<unknown>,
  })

  const summary = (data as { data?: ClientSummary })?.data ?? (data as ClientSummary)
  const quotas: ClientQuota[] =
    (quotasData as { data?: { items: ClientQuota[] } })?.data?.items ??
    (quotasData as { items?: ClientQuota[] })?.items ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Consorciado'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Olá, {firstName}!</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatDate(new Date().toISOString(), "EEEE, dd 'de' MMMM")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <CreditCard className="w-4 h-4 text-brand-primary" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Minhas Cotas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalQuotas ?? quotas.length}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-success" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Crédito Total</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary?.totalCreditValue)}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Vence este mês</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.installmentsDueThisMonth ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Próx. Assembleia</span>
          </div>
          <p className="text-sm font-bold text-gray-900">
            {summary?.nextAssemblyDate
              ? formatDate(summary.nextAssemblyDate, 'dd/MM')
              : 'Não agendada'}
          </p>
        </div>
      </div>

      {(summary?.upcomingInstallments?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Próximas Parcelas</h2>
          <div className="space-y-2">
            {summary!.upcomingInstallments.slice(0, 3).map((inst) => (
              <div key={inst.id} className="bg-white rounded-xl p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inst.totalAmount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Venc. {formatDate(inst.dueDate)} · Parcela #{inst.installmentNumber}
                  </p>
                </div>
                <StatusPill status={inst.status} />
              </div>
            ))}
            <Link href="/installments" className="flex items-center justify-center gap-1 py-2 text-sm text-brand-primary font-medium">
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Minhas Cotas</h2>
          <Link href="/quotas" className="text-xs text-brand-primary font-medium">Ver todas</Link>
        </div>
        {quotas.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-card text-center">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma cota vinculada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotas.slice(0, 3).map((quota) => (
              <Link key={quota.id} href={`/quotas/${quota.id}`}>
                <div className="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-primary">{String(quota.number).padStart(3, '0')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Cota #{String(quota.number).padStart(4, '0')}</p>
                    <p className="text-xs text-gray-400 truncate">{quota.group?.code} · {formatCurrency(quota.creditValue)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {quota.contemplationStatus !== 'NOT_CONTEMPLATED' && (
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface UpcomingInstallment { id: string; installmentNumber: number; totalAmount: number; dueDate: string; status: string }
interface ClientSummary { totalQuotas: number; totalCreditValue: number; installmentsDueThisMonth: number; nextAssemblyDate?: string; upcomingInstallments: UpcomingInstallment[] }
interface ClientQuota { id: string; number: number; creditValue: number; contemplationStatus: string; group?: { code: string } }
