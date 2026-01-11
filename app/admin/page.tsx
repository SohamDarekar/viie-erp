'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Student {
  id: string
  firstName: string
  lastName: string
  program: string
  batch: {
    id: string
    name: string
  }
  user: {
    email: string
  }
}

interface Batch {
  id: string
  name: string
  program: string
  isActive: boolean
  _count?: {
    students: number
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'batches' | 'email'>('overview')
  const [batches, setBatches] = useState<Batch[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    activeBatches: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedBatchForAssign, setSelectedBatchForAssign] = useState<string>('')
  
  const [emailForm, setEmailForm] = useState({
    recipientType: 'ALL' as 'BATCH' | 'PROGRAM' | 'ALL',
    batchId: '',
    program: 'BS' as 'BS' | 'BBA',
    subject: '',
    message: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [batchRes, studentRes] = await Promise.all([
        fetch('/api/admin/batches'),
        fetch('/api/admin/students'),
      ])
      
      const batchData = await batchRes.json()
      const studentData = await studentRes.json()
      
      const batchList = batchData.batches || []
      setBatches(batchList)
      setStudents(studentData.students || [])
      
      setStats({
        totalStudents: studentData.pagination?.total || 0,
        totalBatches: batchData.total || 0,
        activeBatches: batchList.filter((b: Batch) => b.isActive).length,
      })
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleAssignBatch = async () => {
    if (!selectedStudent || !selectedBatchForAssign) {
      setError('Please select both a student and a batch')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/students/assign-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          batchId: selectedBatchForAssign,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to assign batch')
        return
      }

      setSuccess('Student assigned to batch successfully!')
      setSelectedStudent('')
      setSelectedBatchForAssign('')
      await loadData()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/emails/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send emails')
        return
      }

      setSuccess(`Email sent successfully to ${data.recipientCount} students!`)
      setEmailForm({
        recipientType: 'ALL',
        batchId: '',
        program: 'BS',
        subject: '',
        message: '',
      })
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
                <p className="text-slate-600 text-sm">Manage students, batches, and communications</p>
              </div>
            </div>
            <Link href="/settings">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="alert alert-error mb-6 animate-fade-in">
            <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success mb-6 animate-fade-in">
            <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 border-b border-slate-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'students', label: 'Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { id: 'batches', label: 'Batch Assignment', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { id: 'email', label: 'Send Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setError('')
                  setSuccess('')
                }}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="stat-label text-blue-700">Total Students</p>
                    <p className="stat-value !bg-gradient-to-r !from-blue-600 !to-blue-800 bg-clip-text text-transparent">
                      {stats.totalStudents}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="stat-label text-green-700">Active Batches</p>
                    <p className="stat-value !bg-gradient-to-r !from-green-600 !to-green-800 bg-clip-text text-transparent">
                      {stats.activeBatches}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="stat-label text-purple-700">Total Batches</p>
                    <p className="stat-value !bg-gradient-to-r !from-purple-600 !to-purple-800 bg-clip-text text-transparent">
                      {stats.totalBatches}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">All Batches</h2>
              </div>
              {batches.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-slate-500 font-medium">No batches found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Batch Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Program</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Students</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {batches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-semibold text-slate-900">{batch.name}</td>
                          <td className="px-6 py-4 text-slate-700">{batch.program}</td>
                          <td className="px-6 py-4 text-slate-700">{batch._count?.students || 0}</td>
                          <td className="px-6 py-4">
                            <span className={`badge ${batch.isActive ? 'badge-success' : 'badge-neutral'}`}>
                              {batch.isActive ? 'Active' : 'Archived'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="animate-fade-in">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">All Students</h2>
                <span className="text-sm text-slate-600">{students.length} total</span>
              </div>
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-slate-500 font-medium">No students found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Program</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-6 py-4 text-slate-700">{student.user.email}</td>
                          <td className="px-6 py-4 text-slate-700">{student.program}</td>
                          <td className="px-6 py-4">
                            <span className="badge badge-primary">{student.batch.name}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Batch Assignment Tab */}
        {activeTab === 'batches' && (
          <div className="animate-fade-in">
            <div className="card max-w-2xl mx-auto">
              <div className="card-header">
                <h2 className="card-title">Assign Student to Batch</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Student
                  </label>
                  <select
                    className="input"
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                  >
                    <option value="">-- Choose a student --</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} ({student.user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select New Batch
                  </label>
                  <select
                    className="input"
                    value={selectedBatchForAssign}
                    onChange={(e) => setSelectedBatchForAssign(e.target.value)}
                  >
                    <option value="">-- Choose a batch --</option>
                    {batches.filter(b => b.isActive).map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch._count?.students || 0} students)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssignBatch}
                  disabled={loading || !selectedStudent || !selectedBatchForAssign}
                  className="btn btn-primary w-full"
                >
                  {loading ? 'Assigning...' : 'Assign to Batch'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="animate-fade-in">
            <div className="card max-w-3xl mx-auto">
              <div className="card-header">
                <h2 className="card-title">Send Bulk Email</h2>
              </div>
              <form onSubmit={handleSendEmail} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Recipients
                  </label>
                  <select
                    className="input"
                    value={emailForm.recipientType}
                    onChange={(e) => setEmailForm({ ...emailForm, recipientType: e.target.value as any })}
                  >
                    <option value="ALL">All Students</option>
                    <option value="BATCH">Specific Batch</option>
                    <option value="PROGRAM">By Program</option>
                  </select>
                </div>

                {emailForm.recipientType === 'BATCH' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Batch
                    </label>
                    <select
                      className="input"
                      value={emailForm.batchId}
                      onChange={(e) => setEmailForm({ ...emailForm, batchId: e.target.value })}
                      required
                    >
                      <option value="">-- Choose a batch --</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {emailForm.recipientType === 'PROGRAM' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Program
                    </label>
                    <select
                      className="input"
                      value={emailForm.program}
                      onChange={(e) => setEmailForm({ ...emailForm, program: e.target.value as any })}
                    >
                      <option value="BS">BS</option>
                      <option value="BBA">BBA</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Email subject"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Message
                  </label>
                  <textarea
                    className="input"
                    rows={8}
                    placeholder="Type your message here..."
                    value={emailForm.message}
                    onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <>
                      Send Email
                      <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
