'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Student {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  nationality?: string
  program: string
  batch?: {
    id: string
    name: string
  } | null
  user: {
    id: string
    username: string
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
  const [currentUser, setCurrentUser] = useState<{email: string, role: string} | null>(null)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    activeBatches: 0,
  })
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedBatchForAssign, setSelectedBatchForAssign] = useState<string>('')
  
  const [batchForm, setBatchForm] = useState({
    program: 'BS' as 'BS' | 'BBA',
    intakeYear: new Date().getFullYear(),
  })
  
  const [emailForm, setEmailForm] = useState({
    recipientType: 'ALL' as 'BATCH' | 'PROGRAM' | 'ALL',
    batchId: '',
    program: 'BS' as 'BS' | 'BBA',
    subject: '',
    message: '',
  })

  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    program: 'BS' as 'BS' | 'BBA',
    batchId: '',
  })
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // New state for batch students modal
  const [showBatchStudentsModal, setShowBatchStudentsModal] = useState(false)
  const [selectedBatchForView, setSelectedBatchForView] = useState<Batch | null>(null)
  const [batchStudents, setBatchStudents] = useState<Student[]>([])
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false)
  const [batchStudentSearch, setBatchStudentSearch] = useState('')
  
  // Search state for all students
  const [studentSearch, setStudentSearch] = useState('')
  
  // Pagination state for all students
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    loadData()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
        console.log('Current user:', data.user)
        if (data.user.role !== 'ADMIN') {
          console.error('WARNING: You are not logged in as an ADMIN!')
          setError('You must be logged in as an admin to access this page')
        }
      }
    } catch (error) {
      console.error('Failed to load current user:', error)
    }
  }

  const loadData = async () => {
    try {
      setDataLoading(true)
      console.log('Loading batches and students...')
      const [batchRes, studentRes] = await Promise.all([
        fetch('/api/admin/batches'),
        fetch('/api/admin/students?limit=10000'), // Fetch all students
      ])
      
      console.log('Batch response status:', batchRes.status)
      console.log('Student response status:', studentRes.status)
      
      if (!batchRes.ok) {
        const errorData = await batchRes.json().catch(() => ({ error: 'Failed to parse error' }))
        console.error('Failed to load batches:', errorData)
        setError(`Failed to load batches: ${errorData.error || 'Unknown error'}`)
        return
      }

      if (!studentRes.ok) {
        const errorData = await studentRes.json().catch(() => ({ error: 'Failed to parse error' }))
        console.error('Failed to load students:', errorData)
        setError(`Failed to load students: ${errorData.error || 'Unknown error'}`)
        return
      }
      
      const batchData = await batchRes.json()
      const studentData = await studentRes.json()
      
      console.log('Loaded batch data:', batchData)
      console.log('Loaded student data:', studentData)
      
      const batchList = batchData.batches || []
      console.log('Batch list:', batchList)
      console.log('Number of batches:', batchList.length)
      
      setBatches(batchList)
      setStudents(studentData.students || [])
      
      setStats({
        totalStudents: studentData.pagination?.total || 0,
        totalBatches: batchData.total || 0,
        activeBatches: batchList.filter((b: Batch) => b.isActive).length,
      })
      
      console.log('Data loaded successfully!')
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Failed to load data. Please check console for details.')
    } finally {
      setDataLoading(false)
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

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchForm),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create batch')
        return
      }

      setSuccess(`Batch ${data.batch.name} created successfully!`)
      setBatchForm({ program: 'BS', intakeYear: new Date().getFullYear() })
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

  const handleEditStudent = (student: Student) => {
    console.log('Editing student:', student)
    console.log('Available batches:', batches)
    console.log('Student batch ID:', student.batch?.id)
    
    setEditingStudent(student)
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      username: student.user.username,
      email: student.user.email,
      phone: student.phone || '',
      program: student.program as 'BS' | 'BBA',
      batchId: student.batch?.id || '',
    })
    setShowEditModal(true)
    setError('')
    setSuccess('')
  }

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update student')
        return
      }

      setSuccess('Student updated successfully!')
      setShowEditModal(false)
      setEditingStudent(null)
      await loadData()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to delete student')
        return
      }

      setSuccess('Student deleted successfully!')
      setShowDeleteConfirm(null)
      await loadData()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleViewBatchStudents = async (batch: Batch) => {
    setSelectedBatchForView(batch)
    setShowBatchStudentsModal(true)
    setBatchStudentsLoading(true)
    setBatchStudentSearch('')
    
    try {
      const res = await fetch(`/api/admin/students?batchId=${batch.id}`)
      if (!res.ok) {
        throw new Error('Failed to load batch students')
      }
      const data = await res.json()
      setBatchStudents(data.students || [])
    } catch (error) {
      console.error('Failed to load batch students:', error)
      setError('Failed to load batch students')
    } finally {
      setBatchStudentsLoading(false)
    }
  }

  const handleRemoveFromBatch = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student from the batch?')) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/students/${studentId}/remove-batch`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to remove student from batch')
        return
      }

      setSuccess('Student removed from batch successfully!')
      // Reload batch students
      if (selectedBatchForView) {
        await handleViewBatchStudents(selectedBatchForView)
      }
      await loadData()
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

  // Filter and paginate students
  const filteredStudents = students.filter((student) => {
    if (!studentSearch) return true
    const search = studentSearch.toLowerCase()
    return (
      student.firstName.toLowerCase().includes(search) ||
      student.lastName.toLowerCase().includes(search) ||
      student.user.username.toLowerCase().includes(search) ||
      student.user.email.toLowerCase().includes(search)
    )
  })

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  // Reset to page 1 when search changes or items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [studentSearch, itemsPerPage])

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Create Batch Form */}
              <div className="card lg:col-span-1">
                <div className="card-header">
                  <h2 className="card-title">Create New Batch</h2>
                </div>
                <form onSubmit={handleCreateBatch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Program
                    </label>
                    <select
                      className="input"
                      value={batchForm.program}
                      onChange={(e) => setBatchForm({ ...batchForm, program: e.target.value as 'BS' | 'BBA' })}
                      required
                    >
                      <option value="BS">BS</option>
                      <option value="BBA">BBA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Intake Year
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={batchForm.intakeYear}
                      onChange={(e) => setBatchForm({ ...batchForm, intakeYear: parseInt(e.target.value) })}
                      min="2000"
                      max="2100"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full"
                  >
                    {loading ? 'Creating...' : 'Create Batch'}
                  </button>
                </form>
              </div>

              {/* All Batches List */}
              <div className="card lg:col-span-2">
                <div className="card-header">
                  <h2 className="card-title">All Batches</h2>
                  <span className="text-sm text-slate-600">
                    {batches.length} batch{batches.length !== 1 ? 'es' : ''} loaded
                  </span>
                </div>
              {batches.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-slate-500 font-medium mb-2">No batches found</p>
                  <p className="text-slate-400 text-sm">Check the browser console for errors</p>
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
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">Actions</th>
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
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleViewBatchStudents(batch)}
                              className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md text-sm font-medium"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Students
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="animate-fade-in">
            <div className="card min-h-[800px]">
              <div className="card-header">
                <h2 className="card-title">All Students</h2>
                <span className="text-sm text-slate-600">{students.length} total</span>
              </div>
              
              {/* Search Box */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="input pl-10 w-full"
                    placeholder="Search students by name, username, or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  {studentSearch && (
                    <button
                      onClick={() => setStudentSearch('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Items Per Page Selector */}
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-semibold text-slate-700">Show:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="input py-1.5 px-3 w-24"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-slate-600">entries per page</span>
                </div>
                <div className="text-sm text-slate-600">
                  Showing {filteredStudents.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} {studentSearch ? 'filtered' : 'total'} students
                </div>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-slate-500 font-medium">No students found</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-slate-500 font-medium">No students found matching "{studentSearch}"</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Username</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Program</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Batch</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {student.firstName[0]}{student.lastName[0]}
                              </div>
                              <div className="ml-3">
                                <div className="font-semibold text-slate-900">
                                  {student.firstName} {student.lastName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-slate-700 font-medium">@{student.user.username}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-slate-600 text-sm">{student.user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {student.program}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.batch ? (
                              <span className="badge badge-primary">{student.batch.name}</span>
                            ) : (
                              <span className="badge badge-neutral">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditStudent(student)}
                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                                title="Edit student"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(student.id)}
                                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
                                title="Delete student"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Previous
                        </button>

                        <div className="flex items-center space-x-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              // Show first page, last page, current page, and pages around current
                              if (page === 1 || page === totalPages) return true
                              if (Math.abs(page - currentPage) <= 1) return true
                              return false
                            })
                            .map((page, index, array) => {
                              // Add ellipsis if there's a gap
                              const prevPage = array[index - 1]
                              const showEllipsis = prevPage && page - prevPage > 1
                              
                              return (
                                <div key={page} className="flex items-center space-x-2">
                                  {showEllipsis && (
                                    <span className="px-2 text-slate-500">...</span>
                                  )}
                                  <button
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                                      currentPage === page
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </div>
                              )
                            })}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
                  {dataLoading ? (
                    <div className="input bg-slate-50 text-slate-500 flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading students...
                    </div>
                  ) : students.length === 0 ? (
                    <div className="input bg-slate-50 text-slate-500">
                      No students available
                    </div>
                  ) : (
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
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select New Batch
                  </label>
                  {dataLoading ? (
                    <div className="input bg-slate-50 text-slate-500 flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading batches...
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="input bg-slate-50 text-slate-500">
                      No batches available - Create a batch first
                    </div>
                  ) : (
                    <select
                      className="input"
                      value={selectedBatchForAssign}
                      onChange={(e) => setSelectedBatchForAssign(e.target.value)}
                    >
                      <option value="">-- Choose a batch --</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} ({batch.program}) - {batch._count?.students || 0} students {!batch.isActive && '(Archived)'}
                        </option>
                      ))}
                    </select>
                  )}
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

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-800">Edit Student</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingStudent(null)
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateStudent} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">@</span>
                    </div>
                    <input
                      type="text"
                      className="input pl-8"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Program
                  </label>
                  <select
                    className="input"
                    value={editForm.program}
                    onChange={(e) => setEditForm({ ...editForm, program: e.target.value as 'BS' | 'BBA' })}
                    required
                  >
                    <option value="BS">BS</option>
                    <option value="BBA">BBA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Batch
                </label>
                {batches.length === 0 ? (
                  <div className="input bg-slate-50 text-slate-500 flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading batches...
                  </div>
                ) : (
                  <select
                    className="input"
                    value={editForm.batchId}
                    onChange={(e) => setEditForm({ ...editForm, batchId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose a batch --</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.program}) - {batch._count?.students || 0} students
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingStudent(null)
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Student</h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete this student? This action cannot be undone and will permanently remove all their data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStudent(showDeleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Students Modal */}
      {showBatchStudentsModal && selectedBatchForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {selectedBatchForView.name} Students
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {batchStudents.length} student{batchStudents.length !== 1 ? 's' : ''} in this batch
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBatchStudentsModal(false)
                    setSelectedBatchForView(null)
                    setBatchStudents([])
                    setBatchStudentSearch('')
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Box for Batch Students */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="input pl-10 w-full"
                  placeholder="Search students in this batch..."
                  value={batchStudentSearch}
                  onChange={(e) => setBatchStudentSearch(e.target.value)}
                />
                {batchStudentSearch && (
                  <button
                    onClick={() => setBatchStudentSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {batchStudentsLoading ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-12 w-12 mx-auto text-primary-600 mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-500 font-medium">Loading students...</p>
                </div>
              ) : batchStudents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-slate-500 font-medium">No students in this batch</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Program</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {batchStudents
                        .filter((student) => {
                          if (!batchStudentSearch) return true
                          const search = batchStudentSearch.toLowerCase()
                          return (
                            student.firstName.toLowerCase().includes(search) ||
                            student.lastName.toLowerCase().includes(search) ||
                            student.user.username.toLowerCase().includes(search) ||
                            student.user.email.toLowerCase().includes(search)
                          )
                        })
                        .map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <div className="ml-3">
                                  <div className="font-semibold text-slate-900">
                                    {student.firstName} {student.lastName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-slate-700 font-medium">@{student.user.username}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-slate-600 text-sm">{student.user.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {student.program}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveFromBatch(student.id)}
                                className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm hover:shadow-md"
                                disabled={loading}
                                title="Remove from batch"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
