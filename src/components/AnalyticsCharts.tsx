'use client'

import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { AnalyticsData } from '@/services/analytics'

interface AnalyticsChartsProps {
  data: AnalyticsData
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Prepara i dati per i grafici
  const timeChartData = data.timeStats.map(stat => ({
    name: stat.period,
    ordini: stat.orders,
    completati: stat.completed,
    tempo: stat.averageTime,
    ricavi: stat.revenue
  }))

  const printerChartData = data.printerStats.map(printer => ({
    name: printer.nome,
    ordini: printer.ordersCompleted,
    efficienza: printer.successRate,
    tempo: printer.averagePrintTime
  }))

  const deliveryData = [
    { name: 'In Tempo', value: data.deliveredOrders.onTimeDelivery, color: '#00C49F' },
    { name: 'In Ritardo', value: data.deliveredOrders.lateDelivery, color: '#FF8042' }
  ]

  return (
    <div className="space-y-8">
      {/* Grafico andamento temporale */}
      <div className="bg-base-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Andamento Ordini nel Tempo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="ordini" 
              stroke="#0088FE" 
              strokeWidth={2}
              name="Ordini Totali"
            />
            <Line 
              type="monotone" 
              dataKey="completati" 
              stroke="#00C49F" 
              strokeWidth={2}
              name="Completati"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico prestazioni stampanti */}
      <div className="bg-base-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Prestazioni per Stampante</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={printerChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ordini" fill="#0088FE" name="Ordini Completati" />
            <Bar dataKey="efficienza" fill="#00C49F" name="Efficienza %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico area ricavi */}
      <div className="bg-base-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Andamento Ricavi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timeChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="ricavi" 
              stroke="#8884D8" 
              fill="#8884D8" 
              fillOpacity={0.6}
              name="Ricavi (€)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico a torta consegne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-base-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Qualità Consegne</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deliveryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(typeof percent === 'number' ? percent * 100 : 0).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {deliveryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Statistiche rapide */}
        <div className="bg-base-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Statistiche Rapide</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="opacity-70">Tempo medio consegna:</span>
              <span className="font-semibold text-blue-400">
                {Math.floor(data.deliveredOrders.averageDeliveryTime / 24)} giorni
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Tasso successo:</span>
              <span className="font-semibold text-green-400">
                {data.deliveredOrders.total > 0 
                  ? ((data.deliveredOrders.onTimeDelivery / data.deliveredOrders.total) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Crescita mensile:</span>
              <span className={`font-semibold ${
                data.deliveredOrders.thisMonth > data.deliveredOrders.lastMonth 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {data.deliveredOrders.lastMonth > 0 
                  ? (((data.deliveredOrders.thisMonth - data.deliveredOrders.lastMonth) / data.deliveredOrders.lastMonth) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Efficienza media:</span>
              <span className="font-semibold text-purple-400">
                {data.printerStats.length > 0 
                  ? (data.printerStats.reduce((acc, p) => acc + p.successRate, 0) / data.printerStats.length).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top performers dettagliato */}
      <div className="bg-base-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top Stampanti - Dettaglio</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topPerformers}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="printer" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="orders" fill="#0088FE" name="Ordini" />
            <Bar dataKey="efficiency" fill="#00C49F" name="Efficienza %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 