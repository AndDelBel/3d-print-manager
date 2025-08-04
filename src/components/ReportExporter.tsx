'use client'

import React from 'react'
import type { AnalyticsData } from '@/services/analytics'

interface ReportExporterProps {
  data: AnalyticsData
  onExport: () => void
}

export default function ReportExporter({ data, onExport }: ReportExporterProps) {
  const formatTime = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const formatPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0'
  }

  const generatePDF = async () => {
    try {
      // Per ora implementiamo solo la logica di base
      // In futuro si integrerà con jsPDF
      console.log('Generazione PDF report...')
      
      const reportData = {
        title: 'Report Prestazioni - 3D Print Manager',
        date: new Date().toLocaleDateString('it-IT'),
        summary: {
          totalDelivered: data.deliveredOrders.total,
          thisMonth: data.deliveredOrders.thisMonth,
          averageDeliveryTime: formatTime(data.deliveredOrders.averageDeliveryTime),
          successRate: formatPercentage(data.deliveredOrders.onTimeDelivery, data.deliveredOrders.total),
          printerEfficiency: data.printerStats.length > 0 
            ? (data.printerStats.reduce((acc, p) => acc + p.successRate, 0) / data.printerStats.length).toFixed(1)
            : '0'
        },
        topPerformers: data.topPerformers,
        printerStats: data.printerStats
      }

      console.log('Dati report:', reportData)
      
      // Simula l'esportazione
      setTimeout(() => {
        alert('Report PDF generato con successo! (Simulazione)')
        onExport()
      }, 1000)
      
    } catch (error) {
      console.error('Errore generazione PDF:', error)
      alert('Errore nella generazione del PDF')
    }
  }

  const sendEmailReport = async () => {
    try {
      console.log('Invio report via email...')
      
      // Simula l'invio email
      setTimeout(() => {
        alert('Report inviato via email! (Simulazione)')
        onExport()
      }, 1000)
      
    } catch (error) {
      console.error('Errore invio email:', error)
      alert('Errore nell\'invio dell\'email')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-base-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Esporta Report</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Riepilogo Report</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="opacity-70">Ordini consegnati:</span>
                <span className="ml-2 font-semibold">{data.deliveredOrders.total}</span>
              </div>
              <div>
                <span className="opacity-70">Questo mese:</span>
                <span className="ml-2 font-semibold text-green-400">{data.deliveredOrders.thisMonth}</span>
              </div>
              <div>
                <span className="opacity-70">Tempo medio:</span>
                <span className="ml-2 font-semibold">{formatTime(data.deliveredOrders.averageDeliveryTime)}</span>
              </div>
              <div>
                <span className="opacity-70">Tasso successo:</span>
                <span className="ml-2 font-semibold text-green-400">
                  {formatPercentage(data.deliveredOrders.onTimeDelivery, data.deliveredOrders.total)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={generatePDF}
              className="btn btn-primary"
            >
              📊 Genera PDF
            </button>
            <button 
              onClick={sendEmailReport}
              className="btn btn-success"
            >
              📧 Invia Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 