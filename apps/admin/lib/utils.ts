import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'R$ —'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value))
}

export function formatDate(date: string | Date | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  return format(new Date(date), pattern, { locale: ptBR })
}

export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  return `${(Number(value) * 100).toFixed(decimals)}%`
}

export const statusLabels: Record<string, { label: string; variant: string }> = {
  ACTIVE: { label: 'Ativo', variant: 'green' },
  INACTIVE: { label: 'Inativo', variant: 'gray' },
  BLOCKED: { label: 'Bloqueado', variant: 'red' },
  PENDING: { label: 'Pendente', variant: 'yellow' },
  PAID: { label: 'Pago', variant: 'green' },
  OVERDUE: { label: 'Vencido', variant: 'red' },
  PAID_PARTIAL: { label: 'Pago parcial', variant: 'yellow' },
  DRAFT: { label: 'Rascunho', variant: 'gray' },
  OPEN_FOR_ENROLLMENT: { label: 'Em captação', variant: 'blue' },
  AVAILABLE: { label: 'Disponível', variant: 'blue' },
  CONTEMPLATED_DRAW: { label: 'Contemplado (sorteio)', variant: 'green' },
  CONTEMPLATED_BID: { label: 'Contemplado (lance)', variant: 'green' },
  NOT_CONTEMPLATED: { label: 'Não contemplado', variant: 'gray' },
  SCHEDULED: { label: 'Agendada', variant: 'blue' },
  COMPLETED: { label: 'Realizada', variant: 'green' },
  CANCELLED: { label: 'Cancelada', variant: 'red' },
}

export function getStatusBadge(status: string) {
  return statusLabels[status] ?? { label: status, variant: 'gray' }
}
