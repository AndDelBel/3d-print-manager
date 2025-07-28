'use client'

import React, { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { listStampanti } from '@/services/stampante'
import { listOrdini } from '@/services/ordine'
import { listCommesse } from '@/services/commessa'
import type { Stampante } from '@/types/stampante'
import type { Ordine } from '@/types/ordine'
import type { Commessa } from '@/types/commessa'

interface AnalyticsData {
  totalPrinters: number
  activePrinters: number
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  totalProjects: number
  averagePrintTime: number
  successRate: number
  monthlyStats: {
    month: string
    orders: number
    completed: number
    revenue: number
  }[]
}

export default function AnalyticsPage() {
  const { user, isSuperuser } = useUser()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        // Fetch dati
        const [stampanti, ordini, commesse] = await Promise.all([
          listStampanti({ isSuperuser }),
          listOrdini({ isSuperuser }),
          listCommesse({ isSuperuser })
        ])

        // Calcola statistiche
        const activePrinters = stampanti.filter(s => s.attiva).length
        const completedOrders = ordini.filter(o => o.stato === 'consegnato').length
        const pendingOrders = ordini.filter(o => ['processamento', 'in_coda', 'in_stampa'].includes(o.stato)).length

        // Calcola tempo medio di stampa (mock)
        const averagePrintTime = 7200 // 2 ore in secondi

        // Calcola tasso di successo
        const successRate = ordini.length > 0 ? (completedOrders / ordini.length) * 100 : 0

        // Statistiche mensili (mock)
        const monthlyStats = [
          { month: 'Gen', orders: 15, completed: 12, revenue: 2500 },
          { month: 'Feb', orders: 18, completed: 16, revenue: 3200 },
          { month: 'Mar', orders: 22, completed: 20, revenue: 3800 },
          { month: 'Apr', orders: 25, completed: 23, revenue: 4200 },
          { month: 'Mag', orders: 28, completed: 26, revenue: 4800 },
          { month: 'Giu', orders: 30, completed: 28, revenue: 5200 },
        ]

        setAnalytics({
          totalPrinters: stampanti.length,
          activePrinters,
          totalOrders: ordini.length,
          completedOrders,
          pendingOrders,
          totalProjects: commesse.length,
          averagePrintTime,
          successRate,
          monthlyStats
        })
      } catch (err) {
        setError('Errore nel caricamento delle statistiche')
        console.error('Errore analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, isSuperuser])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
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
      <h1 className="text-3xl font-bold mb-8">Dashboard Analytics</h1>

      {/* Statistiche principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
              🖨️
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">Stampanti Attive</p>
              <p className="text-2xl font-bold">{analytics.activePrinters}/{analytics.totalPrinters}</p>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-500/20 text-green-400">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">Ordini Completati</p>
              <p className="text-2xl font-bold">{analytics.completedOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400">
              ⏳
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">In Attesa</p>
              <p className="text-2xl font-bold">{analytics.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
              📊
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium opacity-70">Tasso Successo</p>
              <p className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grafici e statistiche dettagliate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Statistiche mensili */}
        <div className="bg-base-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Andamento Mensile</h3>
          <div className="space-y-3">
            {analytics.monthlyStats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-base-300 rounded">
                <span className="font-medium">{stat.month}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-blue-400">{stat.orders} ordini</span>
                  <span className="text-green-400">{stat.completed} completati</span>
                  <span className="text-purple-400">€{stat.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistiche tecniche */}
        <div className="bg-base-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Statistiche Tecniche</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="opacity-70">Tempo medio di stampa</span>
              <span className="font-semibold">{formatTime(analytics.averagePrintTime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Progetti totali</span>
              <span className="font-semibold">{analytics.totalProjects}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Ordini totali</span>
              <span className="font-semibold">{analytics.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Efficienza stampanti</span>
              <span className="font-semibold">
                {analytics.totalPrinters > 0 ? ((analytics.activePrinters / analytics.totalPrinters) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="mt-8 bg-base-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
        <div className="flex gap-4">
          <button className="btn btn-primary">
            📊 Report Dettagliato
          </button>
          <button className="btn btn-success">
            📧 Esporta Dati
          </button>
          <button className="btn btn-accent">
            🔔 Configura Alert
          </button>
        </div>
      </div>
    </div>
  )
} 