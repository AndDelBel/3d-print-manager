'use client'

import { useState, useEffect } from 'react'
import { addToCodaStampa } from '@/services/codaStampa'
import { listStampanti } from '@/services/stampante'
import { listOrders } from '@/services/ordine'
import type { Stampante } from '@/types/stampante'
import type { Ordine } from '@/types/ordine'
import { LoadingButton } from './LoadingButton'

interface AddToQueueModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  organizzazione_id?: number
  isSuperuser: boolean
}

export function AddToQueueModal({ 
  open, 
  onClose, 
  onSuccess, 
  organizzazione_id,
  isSuperuser 
}: AddToQueueModalProps) {
  const [loading, setLoading] = useState(false)
  const [stampanti, setStampanti] = useState<Stampante[]>([])
  const [ordini, setOrdini] = useState<Ordine[]>([])
  const [selectedOrdine, setSelectedOrdine] = useState<number | ''>('')
  const [selectedStampante, setSelectedStampante] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, organizzazione_id])

  const loadData = async () => {
    try {
      // Carica stampanti attive
      const stampantiData = await listStampanti({ isSuperuser })
      setStampanti(stampantiData.filter(s => s.attiva))

      // Carica ordini disponibili (non in coda)
      const ordiniData = await listOrders({ 
        organizzazione_id: isSuperuser ? undefined : organizzazione_id,
        isSuperuser 
      })
      // Filtra solo ordini che possono essere aggiunti alla coda
      const ordiniDisponibili = ordiniData.filter((o: Ordine) => 
        o.stato === 'in_coda' || o.stato === 'processamento'
      )
      setOrdini(ordiniDisponibili)
    } catch (err) {
      console.error('Errore caricamento dati:', err)
      setError('Errore caricamento dati')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedOrdine || !selectedStampante) {
      setError('Seleziona un ordine e una stampante')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await addToCodaStampa(Number(selectedOrdine), Number(selectedStampante))
      onSuccess()
      onClose()
      // Reset form
      setSelectedOrdine('')
      setSelectedStampante('')
    } catch (err) {
      console.error('Errore aggiunta alla coda:', err)
      setError('Errore nell\'aggiunta alla coda')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">Aggiungi alla Coda Stampa</h3>
        
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Ordine</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedOrdine}
              onChange={(e) => setSelectedOrdine(e.target.value as number | '')}
              required
            >
              <option value="">Seleziona un ordine</option>
              {ordini.map(ordine => (
                <option key={ordine.id} value={ordine.id}>
                  Ordine #{ordine.id} - Qty: {ordine.quantita} - {ordine.stato}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">Stampante</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedStampante}
              onChange={(e) => setSelectedStampante(e.target.value as number | '')}
              required
            >
              <option value="">Seleziona una stampante</option>
              {stampanti.map(stampante => (
                <option key={stampante.id} value={stampante.id}>
                  {stampante.nome} {stampante.modello && `(${stampante.modello})`}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </button>
            <LoadingButton
              type="submit"
              className="btn btn-primary"
              loading={loading}
              disabled={!selectedOrdine || !selectedStampante}
            >
              Aggiungi alla Coda
            </LoadingButton>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
} 