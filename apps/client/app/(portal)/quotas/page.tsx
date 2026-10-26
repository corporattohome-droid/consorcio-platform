'use client'

import { useQuery } from '@tanstack/react-query'
import { clientQuotasApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, ChevronRight, CheckCircle, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ClientQuotasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-quotas'],
    queryFn: () => clientQuotasApi.mine() as Promise<unknown>,
  })

  const quotas: Quota[] =
    (data as { data?: { items: Quota[] } })?.data?.items ??
    (data as { items?: Quota[] })?.items ?? []

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
    </div>
  )

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Minhas Cotas</h1>
      {quotas.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow-card text-center">
          <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma cota vinculada à sua conta.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotas.map((quota) => {
            const isContemplated = ['CONTEMPLATED_DRAW', 'CONTEMPLATED_BID'].includes(quota.contemplationStatus)
            return (
              <Link key={quota.id} href={`/quotas/${quota.id}`}>
                <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{quota.group?.code}</p>
                      <p className="text-lg font-bold text-gray-900">Cota #{String(quota.number).padStart(4, '0')}</p>
                    </div>
                    {isContemplated ? (
                      <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> Contemplado
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" /> Aguardando
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-xs text-gray-400">Crédito</p><p className="text-sm font-semibold text-gray-900">{formatCurrency(quota.creditValue)}</p></div>
                    <div><p className="text-xs text-gray-400">Parcelas</p><p className="text-sm font-semibold text-gray-900">{quota.paidInstallments ?? '—'}/{quota.totalInstallments ?? '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Mensalidade</p><p className="text-sm font-semibold text-gray-900">{formatCurrency(quota.installmentAmount)}</p></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mr-3">
                      <div className="bg-brand-primary rounded-full h-1.5 transition-all" style={{ width: `${quota.totalInstallments ? Math.round(((quota.paidInstallments ?? 0) / quota.totalInstallments) * 100) : 0}%` }} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface Quota { id: string; number: number; creditValue: number; contemplationStatus: string; totalInstallments?: number; paidInstallments?: number; installmentAmount?: number; group?: { code: string } }
