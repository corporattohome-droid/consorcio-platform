import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatCurrency(value?: number | string | null): string {
  if (value == null) return 'R$ —'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return 'R$ —'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export function formatDate(dateStr?: string | null, fmt = 'dd/MM/yyyy'): string {
  if (!dateStr) return '—'
  try { return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, fmt, { locale: ptBR }) }
  catch { return '—' }
}

export const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'yellow' },
  PAID: { label: 'Pago', color: 'green' },
  OVERDUE: { label: 'Vencida', color: 'red' },
  PARTIAL: { label: 'Parcial', color: 'yellow' },
  CANCELLED: { label: 'Cancelada', color: 'gray' },
  ACTIVE: { label: 'Ativo', color: 'green' },
  INACTIVE: { label: 'Inativo', color: 'gray' },
  DRAFT: { label: 'Rascunho', color: 'gray' },
  SIGNED: { label: 'Assinado', color: 'blue' },
  NOT_CONTEMPLATED: { label: 'Aguardando', color: 'gray' },
  CONTEMPLATED_DRAW: { label: 'Contemplado (sorteio)', color: 'green' },
  CONTEMPLATED_BID: { label: 'Contemplado (lance)', color: 'green' },
}
