'use client'

import React from 'react'
import type { Gcode } from '@/types/gcode'

interface GcodeAnalysisDisplayProps {
  gcode: Gcode
  onRefresh?: () => void
}

export default function GcodeAnalysisDisplay({ gcode, onRefresh }: GcodeAnalysisDisplayProps) {
  const formatTime = (minutes: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatWeight = (grams: number) => {
    if (!grams) return 'N/A'
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)}kg`
    }
    return `${grams}g`
  }

  const formatCost = (cost: number) => {
    if (!cost) return 'N/A'
    return `€${cost.toFixed(2)}`
  }

  const hasAnalysis = gcode.peso_grammi || gcode.tempo_stampa_min || gcode.materiale

  if (!hasAnalysis) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-yellow-800">Analisi G-code non disponibile</h4>
            <p className="text-sm text-yellow-600 mt-1">
              Questo G-code non è stato ancora analizzato per estrarre tempo di stampa e peso.
            </p>
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="btn btn-sm btn-warning"
            >
              🔄 Analizza
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-base-200 rounded-lg shadow p-4">
      <h4 className="font-semibold mb-3">Analisi G-code</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tempo di stampa */}
        <div className="bg-base-300 rounded p-3">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-500/20 text-blue-400 mr-3">
              ⏱️
            </div>
            <div>
              <p className="text-sm opacity-70">Tempo di stampa</p>
              <p className="font-semibold">{formatTime(gcode.tempo_stampa_min)}</p>
            </div>
          </div>
        </div>

        {/* Peso */}
        <div className="bg-base-300 rounded p-3">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-500/20 text-green-400 mr-3">
              ⚖️
            </div>
            <div>
              <p className="text-sm opacity-70">Peso materiale</p>
              <p className="font-semibold">{formatWeight(gcode.peso_grammi)}</p>
            </div>
          </div>
        </div>

        {/* Materiale */}
        <div className="bg-base-300 rounded p-3">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-purple-500/20 text-purple-400 mr-3">
              🧪
            </div>
            <div>
              <p className="text-sm opacity-70">Materiale</p>
              <p className="font-semibold">{gcode.materiale || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Costo stimato */}
        {gcode.peso_grammi && (
          <div className="bg-base-300 rounded p-3">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-500/20 text-yellow-400 mr-3">
                💰
              </div>
              <div>
                <p className="text-sm opacity-70">Costo stimato</p>
                <p className="font-semibold">
                  {formatCost(((gcode.peso_grammi || 0) / 1000) * 25)} {/* Stima 25€/kg */}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Efficienza */}
        {gcode.tempo_stampa_min && gcode.peso_grammi && (
          <div className="bg-base-300 rounded p-3">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-orange-500/20 text-orange-400 mr-3">
                📊
              </div>
              <div>
                <p className="text-sm opacity-70">Efficienza</p>
                <p className="font-semibold">
                  {(((gcode.peso_grammi || 0) / (gcode.tempo_stampa_min || 1)) * 60).toFixed(1)}g/h
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data caricamento */}
        <div className="bg-base-300 rounded p-3">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-gray-500/20 text-gray-400 mr-3">
              📅
            </div>
            <div>
              <p className="text-sm opacity-70">Caricato il</p>
              <p className="font-semibold text-sm">
                {new Date(gcode.data_caricamento).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni */}
      {onRefresh && (
        <div className="mt-4 pt-4 border-t border-base-300">
          <button 
            onClick={onRefresh}
            className="btn btn-sm btn-outline"
          >
            🔄 Aggiorna Analisi
          </button>
        </div>
      )}
    </div>
  )
} 