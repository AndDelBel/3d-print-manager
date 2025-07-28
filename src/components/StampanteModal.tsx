'use client'

import React, { useState, useEffect } from 'react'
import type { Stampante } from '@/types/stampante'
import type { Organizzazione } from '@/types/organizzazione'
import { LoadingButton } from './LoadingButton'

interface StampanteModalProps {
  isOpen: boolean
  onClose: () => void
  stampante?: Stampante | null
  onSave: (stampante: Partial<Stampante>) => Promise<void>
}

export function StampanteModal({ 
  isOpen, 
  onClose, 
  stampante, 
  onSave 
}: StampanteModalProps) {
  const [formData, setFormData] = useState<Partial<Stampante>>({
    nome: '',
    modello: '',
    seriale: '',
    attiva: true,
    tipo_sistema: undefined,
    endpoint_api: '',
    api_key: '',
    note: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (stampante) {
      setFormData({
        nome: stampante.nome,
        modello: stampante.modello || '',
        seriale: stampante.seriale || '',
        attiva: stampante.attiva,
        tipo_sistema: stampante.tipo_sistema,
        endpoint_api: stampante.endpoint_api || '',
        api_key: stampante.api_key || '',
        note: stampante.note || ''
      })
    } else {
      setFormData({
        nome: '',
        modello: '',
        seriale: '',
        attiva: true,
        tipo_sistema: undefined,
        endpoint_api: '',
        api_key: '',
        note: ''
      })
    }
  }, [stampante])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setError('Errore nel salvataggio della stampante')
      console.error('Errore salvataggio stampante:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Stampante, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {stampante ? 'Modifica Stampante' : 'Nuova Stampante'}
          </h2>
          <button
            onClick={onClose}
            className="opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informazioni base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className="input input-bordered w-full"
                placeholder="Nome della stampante"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Modello
              </label>
              <input
                type="text"
                value={formData.modello}
                onChange={(e) => handleInputChange('modello', e.target.value)}
                className="input input-bordered w-full"
                placeholder="es. X1C, A1, Ender 3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Numero Seriale
              </label>
              <input
                type="text"
                value={formData.seriale}
                onChange={(e) => handleInputChange('seriale', e.target.value)}
                className="input input-bordered w-full"
                placeholder="Numero seriale"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Data Acquisto
              </label>
              <input
                type="date"
                value={formData.data_acquisto}
                onChange={(e) => handleInputChange('data_acquisto', e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Configurazione API */}
          <div className="border-t border-base-300 pt-4">
            <h3 className="text-lg font-medium mb-4">Configurazione Monitoraggio Remoto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo Sistema
                </label>
                <select
                  value={formData.tipo_sistema || ''}
                  onChange={(e) => handleInputChange('tipo_sistema', e.target.value || undefined)}
                  className="select select-bordered w-full"
                >
                  <option value="">Seleziona tipo</option>
                  <option value="klipper">Klipper (Mainsail/Fluidd)</option>
                  <option value="bambu">Bambu Lab</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Endpoint API
                </label>
                <input
                  type="url"
                  value={formData.endpoint_api}
                  onChange={(e) => handleInputChange('endpoint_api', e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="http://192.168.1.100:7125"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                API Key (opzionale)
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => handleInputChange('api_key', e.target.value)}
                className="input input-bordered w-full"
                placeholder="API key per autenticazione"
              />
            </div>

            {/* Istruzioni per tipo sistema */}
            {formData.tipo_sistema === 'klipper' && (
              <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded text-info text-sm">
                <strong>Configurazione Klipper:</strong><br />
                • Endpoint: http://IP_STAMPANTE:7125<br />
                • API Key: opzionale, configurabile in moonraker.conf<br />
                • Esempio: http://192.168.1.100:7125
              </div>
            )}

            {formData.tipo_sistema === 'bambu' && (
              <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded text-success text-sm">
                <strong>Configurazione Bambu Lab:</strong><br />
                • Endpoint: https://api.bambulab.com<br />
                • API Key: Access Code dalla stampante<br />
                • Device ID: ID dispositivo dalla stampante
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder="Note aggiuntive sulla stampante..."
            />
          </div>

          {/* Stato attivo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="attiva"
              checked={formData.attiva}
              onChange={(e) => handleInputChange('attiva', e.target.checked)}
              className="checkbox"
            />
            <label htmlFor="attiva" className="text-sm font-medium ml-2">
              Stampante attiva
            </label>
          </div>

          {/* Azioni */}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Annulla
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              className="btn btn-primary"
            >
              {stampante ? 'Aggiorna' : 'Crea'} Stampante
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
} 