'use client'

import { FileText, Download, Lock } from 'lucide-react'

const documentTypes = [
  { label: 'Contrato de Adesão', description: 'Contrato assinado de participação no grupo', available: true },
  { label: 'Extrato de Parcelas', description: 'Histórico completo de pagamentos', available: true },
  { label: 'Informe de Rendimentos', description: 'Para declaração de Imposto de Renda', available: false },
  { label: 'Carta de Contemplação', description: 'Documento de contemplação (quando aplicável)', available: false },
  { label: 'Apólice de Seguro', description: 'Seguro prestamista vinculado à cota', available: false },
]

export default function DocumentsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Documentos vinculados às suas cotas</p>
      </div>
      <div className="space-y-3">
        {documentTypes.map((doc) => (
          <div key={doc.label} className={`bg-white rounded-2xl p-4 shadow-card flex items-center gap-4 ${!doc.available ? 'opacity-60' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.available ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <FileText className={`w-5 h-5 ${doc.available ? 'text-brand-primary' : 'text-gray-300'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
            </div>
            {doc.available ? (
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-xs font-medium rounded-lg hover:bg-brand-dark transition-colors">
                <Download className="w-3.5 h-3.5" /> Baixar
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5" /> Indisponível
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
        Os documentos são gerados com dados do sistema e armazenados com segurança.
        Dados pessoais tratados conforme a LGPD (Lei 13.709/2018).
      </p>
    </div>
  )
}
