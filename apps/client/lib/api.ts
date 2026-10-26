const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Erro na requisição')
  }
  return res.json()
}

export const clientDashboardApi = {
  getSummary: () => fetchApi('/dashboard/client'),
}

export const clientQuotasApi = {
  mine: () => fetchApi('/quotas?status=ACTIVE'),
  detail: (id: string) => fetchApi(`/quotas/${id}`),
  installments: (quotaId: string) => fetchApi(`/installments/quota/${quotaId}`),
}
