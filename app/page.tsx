'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([])

  async function getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')

    if (error) {
      console.error('ERROR FETCHING LEADS:', error)
      return
    }

    setLeads(data || [])
  }

  useEffect(() => {
    getLeads()
  }, [])

  const totalLeads = leads.length
  const soldLeads = leads.filter(l => l.result === 'sold').length
  const lostLeads = leads.filter(l => l.result && l.result !== 'sold').length

  const closeRate = totalLeads
    ? ((soldLeads / totalLeads) * 100).toFixed(1)
    : 0

  const lossReasons: Record<string, number> = {}
  leads.forEach(l => {
    if (l.result && l.result !== 'sold') {
      lossReasons[l.result] = (lossReasons[l.result] || 0) + 1
    }
  })

  const sources: Record<string, number> = {}
  leads.forEach(l => {
    if (l.source) {
      sources[l.source] = (sources[l.source] || 0) + 1
    }
  })

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">

      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-gray-100 p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-8">CRM</h2>

        <nav className="flex flex-col gap-3 text-sm">
          <Link href="/" className="text-blue-700 font-medium">
            Dashboard
          </Link>
          <Link href="/leads" className="text-gray-500 hover:text-blue-700">
            Leads
          </Link>
          <Link href="/projects" className="text-gray-500 hover:text-blue-700">
            Projects
          </Link>
          <Link href="/catalog" className="text-gray-500 hover:text-blue-700">
            Catalog
          </Link>
          <Link href="/templates" className="text-gray-500 hover:text-blue-700">
            Templates
          </Link>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 max-w-6xl">

        <h1 className="text-3xl font-semibold mb-8">Dashboard</h1>

        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-sm text-gray-500">Total Leads</p>
            <p className="text-2xl font-semibold mt-2">{totalLeads}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-sm text-gray-500">Sold</p>
            <p className="text-2xl font-semibold mt-2 text-green-600">{soldLeads}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-sm text-gray-500">Lost</p>
            <p className="text-2xl font-semibold mt-2 text-red-500">{lostLeads}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-sm text-gray-500">Close Rate</p>
            <p className="text-2xl font-semibold mt-2 text-blue-600">{closeRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="font-medium mb-4">Why Deals Are Lost</h2>
            {Object.entries(lossReasons).length === 0 && (
              <p className="text-gray-400 text-sm">No data yet</p>
            )}
            {Object.entries(lossReasons).map(([reason, count]) => (
              <div key={reason} className="flex justify-between py-2 border-b last:border-none">
                <span className="capitalize text-gray-600">{reason.replace('_', ' ')}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="font-medium mb-4">Lead Sources</h2>
            {Object.entries(sources).length === 0 && (
              <p className="text-gray-400 text-sm">No data yet</p>
            )}
            {Object.entries(sources).map(([src, count]) => (
              <div key={src} className="flex justify-between py-2 border-b last:border-none">
                <span className="text-gray-600">{src}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}