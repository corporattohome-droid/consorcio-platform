'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { paymentsApi, quotasApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/shared/badge'
import { AlertTriangle, DollarSign, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const testPaymentSchema = z.object({
  quotaId: z.string().min(1, 'Selecione uma cota'),
  installmentId: z.string().min(1, 'Selecione uma parcela'),
  amount: z.string().min(1, 'Informe o valor').refine(
    (v) => !isNaN(Number(v.replace(',', '.'))) && Number(v.replace(',', '.')) > 0,
    'Valor inválido',
  ),
  paymentMethod: z.enum(['PIX', 'BOLETO', 'TED', 'CREDIT_CARD']),
  notes: z.string().optional(),
})
type TestPaymentForm = z.infer<typeof testPaymentSchema>

const methodLabels: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  TED: 'TED/DOC',
  CREDIT_CARD: 'Cartão de Crédito',
}

export default function PaymentsPage() {
  const [selectedQuotaId, setSelectedQuotaId] = useState<string>('')
  const queryClient = useQueryClient()

  const { data: quotasData } = useQuery({
    queryKey: ['quotas-for-payment'],
    queryFn: () => quotasApi.list({ status: 'ACTIVE', limit: 100 }) as Promise<unknown>,
  })

  const quotas = (quotasData as { data?: { items: QuotaOption[] } })?.data?.items ??
    (quotasData as { items?: QuotaOption[] })?.items ?? []

  const { data: installmentsData, isLoading: loadingInstallments } = useQuery({
    queryKey: ['installments-for-payment', selectedQuotaId],
    queryFn: () =>
      import('@/lib/api').then(({ installmentsApi }) =>
        installmentsApi.byQuota(selectedQuotaId) as Promise<unknown>,
      ),
    enabled: !!selectedQuotaId,
  })

  const installments = (installmentsData as { data?: { items: InstallmentOption[] } })?.data?.items ??
    (installmentsData as { items?: InstallmentOption[] })?.items ?? []
  const pendingInstallments = installments.filter((i) => ['PENDING', 'OVERDUE'].includes(i.status))

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TestPaymentForm>({ resolver: zodResolver(testPaymentSchema) })

  const payMutation = useMutation({
    mutationFn: (data: TestPaymentForm) =>
      paymentsApi.registerTest({
        quotaId: data.quotaId,
        installmentId: data.installmentId,
        amount: Number(data.amount.replace(',', '.')),
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success('Pagamento de teste registrado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['installments-for-payment', selectedQuotaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-admin'] })
      reset()
      setSelectedQuotaId('')
    },
    onError: (err: unknown) => {
      toast.error(String(err) || 'Erro ao registrar pagamento.')
    },
  })

  const onSubmit = (data: TestPaymentForm) => payMutation.mutate(data)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pagamentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registro de pagamentos e reconciliação bancária</p>
      </div>

      {/* Aviso de ambiente de teste */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Ambiente de homologação — Pagamentos de teste</p>
          <p>
            Este formulário registra pagamentos simulados para fins de demonstração. Nenhuma
            transação financeira real é executada. Em produção, pagamentos são confirmados
            exclusivamente via webhook do gateway bancário.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-brand-primary" />
          Registrar Pagamento de Teste
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cota */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Cota
            </label>
            <select
              {...register('quotaId')}
              onChange={(e) => {
                setValue('quotaId', e.target.value)
                setValue('installmentId', '')
                setSelectedQuotaId(e.target.value)
              }}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Selecione uma cota...</option>
              {quotas.map((q) => (
                <option key={q.id} value={q.id}>
                  Cota #{String(q.number).padStart(4, '0')} — {q.group?.code} — {q.customer?.name ?? 'Sem titular'}
                </option>
              ))}
            </select>
            {errors.quotaId && <p className="mt-1 text-xs text-red-600">{errors.quotaId.message}</p>}
          </div>

          {/* Parcela */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Parcela
            </label>
            <select
              {...register('installmentId')}
              disabled={!selectedQuotaId || loadingInstallments}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
            >
              <option value="">
                {loadingInstallments ? 'Carregando...' : 'Selecione uma parcela...'}
              </option>
              {pendingInstallments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  Parcela #{inst.installmentNumber} — Venc. {formatDate(inst.dueDate)} — {formatCurrency(inst.totalAmount)}
                </option>
              ))}
            </select>
            {errors.installmentId && (
              <p className="mt-1 text-xs text-red-600">{errors.installmentId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Valor (R$)
              </label>
              <input
                {...register('amount')}
                type="text"
                placeholder="0,00"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>

            {/* Forma de pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Forma de Pagamento
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Observações (opcional)
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Referência, comprovante, etc."
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || payMutation.isPending}
            className="w-full py-2.5 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(isSubmitting || payMutation.isPending) ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Registrar Pagamento de Teste</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

interface QuotaOption {
  id: string
  number: number
  group?: { code: string }
  customer?: { name: string }
}
interface InstallmentOption {
  id: string
  installmentNumber: number
  dueDate: string
  totalAmount: number
  status: string
}
