'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientQuotasApi } from '@/lib/api'
import { formatCurrency, formatDate, statusLabels } from '@/lib/utils'
import { DollarSign, Loader2 } from 'lucide-react'

function StatusPill({ status }: { status: string }) {
  const info = statusLabels[status] ?? { label: status, color: 'gray' }
  const colorMap: Record<string, string> = { green: 'bg-green-50 text-green-700', yellow: 'bg-yellow-50 text-yellow-700', red: 'bg-red-50 text-red-600', gray: 'bg-gray-100 text-gray-500' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[info.color] ?? colorMap.gray}`}>{info.label}</span>
}

export default function ClientInstallmentsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')

  const { data: quotasData, isLoading: loadingQuotas } = useQuery({
    queryKey: ['client-quotas-ids'],
    queryFn: () => clientQuotasApi.mine() as Promise<unknown>,
  })

  const quotas: { id: string }[] =
    (quotasData as { data?: { items: { id: string }[] } })?.data?.items ??
    (quotasData as { items?: { id: string }[] })?.items ?? []

  const firstQuota = quotas[0]

  const { data: installmentsData, isLoading: loadingInst } = useQuery({
    queryKey: ['client-installments', firstQuota?.id],
    queryFn: () => clientQuotasApi.installments(firstQuota!.id) as Promise<unknown>,
    enabled: !!firstQuota,
  })

  const allInstallments: Installment[] =
    (installmentsData as { data?: { items: Installment[] } })?.data?.items ??
    (installmentsData as { items?: Installment[] })?.items ?? []

  const filteredInstallments = allInstallments.filter((i) => {
    if (filter === 'all') return true
    if (filter === 'pending') return i.status === 'PENDING'
    if (filter === 'paid') return i.status === 'PAID'
    if (filter === 'overdue') return i.status === 'OVERDUE'
    return true
  })

  const isLoading = loadingQuotas || loadingInst

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Parcelas</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'overdue', 'paid'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-brand-primary text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'overdue' ? 'Vencidas' : 'Pagas'}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-primary" /></div>
      ) : filteredInstallments.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow-card text-center">
          <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma parcela encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInstallments.map((inst) => (
            <div key={inst.id} className={`bg-white rounded-xl px-4 py-3.5 shadow-card flex items-center gap-4 ${inst.status === 'OVERDUE' ? 'border-l-4 border-danger' : ''}`}>
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gray-500">#{inst.installmentNumber}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(inst.totalAmount)}</p>
                <p className="text-xs text-gray-400">Venc. {formatDate(inst.dueDate)}</p>
              </div>
              <StatusPill status={inst.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Installment { id: string; installmentNumber: number; totalAmount: number; dueDate: string; status: string }
