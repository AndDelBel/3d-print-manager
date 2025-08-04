'use client'

import React, { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { getAnalyticsData, type AnalyticsData, type FilterOptions } from '@/services/analytics'
import AnalyticsCharts from '@/components/AnalyticsCharts'
import ReportExporter from '@/components/ReportExporter'

interface FilterState {
  period: 'week' | 'month' | 'quarter' | 'year'
  startDate: string
  endDate: string
  printerId?: number
}

export default function AnalyticsPage() {
  const { user } = useUser()
  const isSuperuser = user?.is_superuser || false
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    period: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        // Usa il nuovo servizio analytics
        const analyticsData = await getAnalyticsData({
          period: filters.period,
          startDate: filters.startDate,
          endDate: filters.endDate,
          printerId: filters.printerId,
          isSuperuser
        })

        setAnalytics(analyticsData)
      } catch (err) {
        setError('Errore nel caricamento delle statistiche')
        console.error('Errore analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, isSuperuser, filters])

  const formatTime = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const formatPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento statistiche...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Nessun dato disponibile</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Report Prestazioni</h1>
        
        {/* Filtri */}
        <div className="flex gap-4 items-center">
          <select 
            value={filters.period}
            onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value as 'week' | 'month' | 'quarter' | 'year' }))}
            className="select select-bordered select-sm"
          >
            <option value="week">Settimana</option>
            <option value="month">Mese</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Anno</option>
          </select>
          
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="input input-bordered input-sm"
          />
          
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="input input-bordered input-sm"
          />
        </div>
      </div>

      {/* Statistiche principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-500/20 text-green-400">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">Ordini Consegnati</p>
              <p className="text-2xl font-bold">{analytics.deliveredOrders.total}</p>
              <p className="text-xs text-green-400">+{analytics.deliveredOrders.thisMonth} questo mese</p>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
              ⏱️
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">Tempo Medio Consegna</p>
              <p className="text-2xl font-bold">{formatTime(analytics.deliveredOrders.averageDeliveryTime)}</p>
              <p className="text-xs text-blue-400">Ore</p>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400">
              📊
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">Consegnati in Tempo</p>
              <p className="text-2xl font-bold">{formatPercentage(analytics.deliveredOrders.onTimeDelivery, analytics.deliveredOrders.total)}%</p>
              <p className="text-xs text-yellow-400">{analytics.deliveredOrders.onTimeDelivery} ordini</p>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
              🏆
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">Efficienza Media</p>
              <p className="text-2xl font-bold">
                {analytics.printerStats.length > 0 
                  ? (analytics.printerStats.reduce((acc, p) => acc + p.successRate, 0) / analytics.printerStats.length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-purple-400">Successo stampanti</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grafici e statistiche dettagliate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Andamento temporale */}
        <div className="bg-base-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Andamento Prestazioni</h3>
          <div className="space-y-3">
            {analytics.timeStats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-base-300 rounded">
                <span className="font-medium">{stat.period}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-blue-400">{stat.completed}/{stat.orders}</span>
                  <span className="text-green-400">{formatTime(stat.averageTime)}</span>
                  <span className="text-purple-400">€{stat.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top performers */}
        <div className="bg-base-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Stampanti</h3>
          <div className="space-y-4">
            {analytics.topPerformers.map((performer, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-base-300 rounded">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="font-medium">{performer.printer}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{performer.orders} ordini</p>
                  <p className="text-sm text-green-400">{performer.efficiency}% efficienza</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabella dettagliata stampanti */}
      <div className="bg-base-200 rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Prestazioni per Stampante</h3>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Stampante</th>
                <th>Ordini Completati</th>
                <th>Tempo Medio</th>
                <th>Tasso Successo</th>
                <th>Ore Totali</th>
                <th>Efficienza</th>
              </tr>
            </thead>
            <tbody>
              {analytics.printerStats.map((printer) => (
                <tr key={printer.id}>
                  <td className="font-medium">{printer.nome}</td>
                  <td>{printer.ordersCompleted}</td>
                  <td>{formatTime(printer.averagePrintTime)}</td>
                  <td>
                    <div className="flex items-center">
                      <div className="w-16 bg-base-300 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${printer.successRate}%` }}
                        ></div>
                      </div>
                      {printer.successRate}%
                    </div>
                  </td>
                  <td>{printer.totalHours}h</td>
                  <td>
                    <span className={`badge ${printer.successRate >= 90 ? 'badge-success' : printer.successRate >= 70 ? 'badge-warning' : 'badge-error'}`}>
                      {printer.successRate >= 90 ? 'Eccellente' : printer.successRate >= 70 ? 'Buona' : 'Da migliorare'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistiche avanzate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-base-200 rounded-lg shadow p-6">
          <h4 className="font-semibold mb-3">Confronto Mensile</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Questo mese:</span>
              <span className="font-semibold text-green-400">{analytics.deliveredOrders.thisMonth}</span>
            </div>
            <div className="flex justify-between">
              <span>Mese scorso:</span>
              <span className="font-semibold">{analytics.deliveredOrders.lastMonth}</span>
            </div>
            <div className="flex justify-between">
              <span>Variazione:</span>
              <span className={`font-semibold ${analytics.deliveredOrders.thisMonth > analytics.deliveredOrders.lastMonth ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.deliveredOrders.lastMonth > 0 
                  ? (((analytics.deliveredOrders.thisMonth - analytics.deliveredOrders.lastMonth) / analytics.deliveredOrders.lastMonth) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <h4 className="font-semibold mb-3">Qualità Consegne</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>In tempo:</span>
              <span className="font-semibold text-green-400">{analytics.deliveredOrders.onTimeDelivery}</span>
            </div>
            <div className="flex justify-between">
              <span>In ritardo:</span>
              <span className="font-semibold text-red-400">{analytics.deliveredOrders.lateDelivery}</span>
            </div>
            <div className="flex justify-between">
              <span>Puntualità:</span>
              <span className="font-semibold">
                {formatPercentage(analytics.deliveredOrders.onTimeDelivery, analytics.deliveredOrders.total)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <h4 className="font-semibold mb-3">Efficienza Sistema</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Stampanti attive:</span>
              <span className="font-semibold">{analytics.activePrinters}/{analytics.totalPrinters}</span>
            </div>
            <div className="flex justify-between">
              <span>Utilizzo:</span>
              <span className="font-semibold">
                {analytics.totalPrinters > 0 ? ((analytics.activePrinters / analytics.totalPrinters) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ordini in coda:</span>
              <span className="font-semibold text-yellow-400">{analytics.pendingOrders}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="bg-base-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
        <div className="flex gap-4 flex-wrap">
          <button 
            className="btn btn-primary"
            onClick={() => setShowExportModal(true)}
          >
            📊 Esporta Report PDF
          </button>
          <button 
            className="btn btn-success"
            onClick={() => setShowExportModal(true)}
          >
            📧 Invia Report Email
          </button>
          <button className="btn btn-accent">
            🔔 Configura Alert
          </button>
          <button 
            className={`btn ${showAdvancedCharts ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowAdvancedCharts(!showAdvancedCharts)}
          >
            📈 {showAdvancedCharts ? 'Nascondi' : 'Mostra'} Grafici Avanzati
          </button>
        </div>
      </div>

      {/* Grafici avanzati */}
      {showAdvancedCharts && analytics && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Grafici Avanzati</h2>
          <AnalyticsCharts data={analytics} />
        </div>
      )}

      {/* Modal esportazione */}
      {showExportModal && analytics && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Esporta Report</h3>
            <ReportExporter 
              data={analytics} 
              onExport={() => setShowExportModal(false)}
            />
            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => setShowExportModal(false)}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 