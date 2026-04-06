'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [name, setName] = useState('')
  const [service, setService] = useState('')
  const [status, setStatus] = useState('active')

  async function getProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    setProjects(data || [])
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault()

    await supabase.from('projects').insert([
      { name, service, status }
    ])

    setName('')
    setService('')
    setStatus('active')

    getProjects()
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', id)

    getProjects()
  }

  useEffect(() => {
    getProjects()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#f4f7fb]">

      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-gray-100 p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-8">CRM</h2>

        <nav className="flex flex-col gap-3 text-sm">
          <Link href="/" className="text-gray-500 hover:text-blue-700">
            Dashboard
          </Link>
          <Link href="/leads" className="text-gray-500 hover:text-blue-700">
            Leads
          </Link>
          <Link href="/projects" className="text-blue-700 font-medium">
            Projects
          </Link>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 max-w-6xl">

        <h1 className="text-3xl font-semibold mb-8">Projects</h1>

        {/* FORM */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-10">
          <h2 className="text-lg font-medium mb-5">Create Project</h2>

          <form onSubmit={addProject} className="grid grid-cols-3 gap-4">

            <input
              className="bg-gray-100 rounded-xl px-4 py-2"
              placeholder="Customer Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="bg-gray-100 rounded-xl px-4 py-2"
              placeholder="Service"
              value={service}
              onChange={(e) => setService(e.target.value)}
            />

            <select
              className="bg-white border border-gray-200 rounded-xl px-4 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>

            <button className="col-span-3 bg-blue-700 text-white py-3 rounded-xl">
              Create Project
            </button>

          </form>
        </div>

        {/* PROJECT LIST */}
        <div className="bg-white rounded-2xl shadow-md p-4">

          <div className="px-2 pb-3 font-medium text-gray-600">
            Active Projects
          </div>

          <div className="space-y-3">

            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center px-4 py-4 rounded-xl border border-gray-100 hover:shadow-md transition"
              >

                <div className="flex-1">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-500">{project.service}</p>
                </div>

                <div className="w-40">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <select
                    className="w-full bg-gray-100 rounded-lg px-2 py-1 text-sm"
                    value={project.status}
                    onChange={(e) => updateStatus(project.id, e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

              </div>
            ))}

          </div>

        </div>

      </main>
    </div>
  )
}