'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BiSolidError } from 'react-icons/bi'
import * as XLSX from 'xlsx'

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
  profileCompletion: number
  batch?: {
    id: string
    name: string
    code: string
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
  code: string
  isActive: boolean
  _count?: {
    students: number
  }
}

interface Resource {
  id: string
  title: string
  description?: string
  fileName: string
  filePath: string
  batch?: {
    id: string
    name: string
    code: string
  } | null
  createdAt: string
}

interface Event {
  id: string
  name: string
  description: string
  eventDate: string
  eventTime: string
  venue: string
  banner?: string
  registrationLink?: string
  resources: string[]
  batchIds: string[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'batches' | 'email' | 'events' | 'forms' | 'form-visibility' | 'resources'>('overview')
  const [batches, setBatches] = useState<Batch[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
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
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    banner: '',
    registrationLink: '',
    batchIds: [] as string[],
  })
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string>('')
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [showEventDeleteConfirm, setShowEventDeleteConfirm] = useState<string | null>(null)
  
  const [batchForm, setBatchForm] = useState({
    program: 'BS' as 'BS' | 'BBA',
    intakeYear: new Date().getFullYear(),
    code: '',
  })
  
  const [emailForm, setEmailForm] = useState({
    recipientType: 'ALL' as 'BATCH' | 'PROGRAM' | 'ALL',
    batchId: '',
    program: 'BS' as 'BS' | 'BBA',
    subject: '',
    message: '',
  })
  
  // Email import state
  const [emailImportFile, setEmailImportFile] = useState<File | null>(null)
  const [importedEmails, setImportedEmails] = useState<Array<{name: string, email: string}>>([])
  
  // Resources state
  const [resources, setResources] = useState<Resource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    batchId: '',
    visibilityType: 'BATCH' as 'BATCH' | 'PROGRAM' | 'ALL',
  })
  const [resourceFile, setResourceFile] = useState<File | null>(null)
  
  // Batch search state
  const [batchSearch, setBatchSearch] = useState('')

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
  
  // State for student forms tab
  const [studentProfiles, setStudentProfiles] = useState<any[]>([])
  const [studentProfilesLoading, setStudentProfilesLoading] = useState(false)
  const [studentProfileSearch, setStudentProfileSearch] = useState('')
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileEditModal, setShowProfileEditModal] = useState(false)
  const [profileEditForm, setProfileEditForm] = useState<any>({})
  const [showDocDeleteWarning, setShowDocDeleteWarning] = useState<string | null>(null)
  
  // State for form visibility tab
  const [formVisibilityBatches, setFormVisibilityBatches] = useState<any[]>([])
  const [formVisibilityLoading, setFormVisibilityLoading] = useState(false)
  const [savingFormVisibility, setSavingFormVisibility] = useState<string | null>(null)
  const [batchVisibilitySearch, setBatchVisibilitySearch] = useState('')
  
  // Search state for all students
  const [studentSearch, setStudentSearch] = useState('')
  
  // Pagination state for all students
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    loadData()
    loadCurrentUser()
  }, [])

  // Reset to page 1 when search changes or items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [studentSearch, itemsPerPage])

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
      console.log('Loading batches, students, and events...')
      const [batchRes, studentRes, eventRes] = await Promise.all([
        fetch('/api/admin/batches'),
        fetch('/api/admin/students?limit=10000'), // Fetch all students
        fetch('/api/admin/events'),
      ])
      
      console.log('Batch response status:', batchRes.status)
      console.log('Student response status:', studentRes.status)
      console.log('Event response status:', eventRes.status)
      
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

      if (!eventRes.ok && eventRes.status !== 401) {
        const errorData = await eventRes.json().catch(() => ({ error: 'Failed to parse error' }))
        console.error('Failed to load events:', errorData)
      }
      
      const batchData = await batchRes.json()
      const studentData = await studentRes.json()
      const eventData = eventRes.ok ? await eventRes.json() : { events: [] }
      
      console.log('Loaded batch data:', batchData)
      console.log('Loaded student data:', studentData)
      console.log('Loaded event data:', eventData)
      
      const batchList = batchData.batches || []
      console.log('Batch list:', batchList)
      console.log('Number of batches:', batchList.length)
      
      setBatches(batchList)
      setStudents(studentData.students || [])
      setEvents(eventData.events || [])
      
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

  const loadStudentProfiles = async () => {
    setStudentProfilesLoading(true)
    try {
      const res = await fetch('/api/admin/students/profiles?limit=1000')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to parse error' }))
        console.error('Failed to load student profiles:', errorData)
        setError(`Failed to load student profiles: ${errorData.error || 'Unknown error'}`)
        return
      }
      const data = await res.json()
      setStudentProfiles(data.students || [])
    } catch (error) {
      console.error('Failed to load student profiles:', error)
      setError('Failed to load student profiles')
    } finally {
      setStudentProfilesLoading(false)
    }
  }

  const handleViewProfile = (student: any) => {
    setSelectedStudentProfile(student)
    setShowProfileModal(true)
  }

  const handleEditProfile = (student: any) => {
    setSelectedStudentProfile(student)
    setProfileEditForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || '',
      phone: student.phone || '',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      gender: student.gender || '',
      nationality: student.nationality || '',
      countryOfBirth: student.countryOfBirth || '',
      nativeLanguage: student.nativeLanguage || '',
      passportNumber: student.passportNumber || '',
      nameAsPerPassport: student.nameAsPerPassport || '',
      passportIssueLocation: student.passportIssueLocation || '',
      passportIssueDate: student.passportIssueDate ? new Date(student.passportIssueDate).toISOString().split('T')[0] : '',
      passportExpiryDate: student.passportExpiryDate ? new Date(student.passportExpiryDate).toISOString().split('T')[0] : '',
      address: student.address || '',
      postalCode: student.postalCode || '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
      school: student.school || '',
      schoolCountry: student.schoolCountry || '',
      schoolAddress: student.schoolAddress || '',
      schoolStartDate: student.schoolStartDate ? new Date(student.schoolStartDate).toISOString().split('T')[0] : '',
      schoolEndDate: student.schoolEndDate ? new Date(student.schoolEndDate).toISOString().split('T')[0] : '',
      schoolGrade: student.schoolGrade || '',
      highSchool: student.highSchool || '',
      highSchoolCountry: student.highSchoolCountry || '',
      highSchoolAddress: student.highSchoolAddress || '',
      highSchoolStartDate: student.highSchoolStartDate ? new Date(student.highSchoolStartDate).toISOString().split('T')[0] : '',
      highSchoolEndDate: student.highSchoolEndDate ? new Date(student.highSchoolEndDate).toISOString().split('T')[0] : '',
      highSchoolGrade: student.highSchoolGrade || '',
      bachelorsIn: student.bachelorsIn || '',
      bachelorsFromInstitute: student.bachelorsFromInstitute || '',
      bachelorsCountry: student.bachelorsCountry || '',
      bachelorsAddress: student.bachelorsAddress || '',
      bachelorsStartDate: student.bachelorsStartDate ? new Date(student.bachelorsStartDate).toISOString().split('T')[0] : '',
      bachelorsEndDate: student.bachelorsEndDate ? new Date(student.bachelorsEndDate).toISOString().split('T')[0] : '',
      bachelorsGrade: student.bachelorsGrade || '',
      greTaken: student.greTaken || false,
      toeflTaken: student.toeflTaken || false,
    })
    setShowProfileEditModal(true)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentProfile) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/students/${selectedStudentProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileEditForm),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update profile')
        return
      }

      setSuccess('Profile updated successfully!')
      setShowProfileEditModal(false)
      setSelectedStudentProfile(null)
      await loadStudentProfiles()
    } catch (err) {
      setError('An error occurred while updating profile')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to delete document')
        return
      }

      setSuccess('Document deleted successfully!')
      setShowDocDeleteWarning(null)
      await loadStudentProfiles()
      // Refresh the selected profile
      if (selectedStudentProfile) {
        const updatedProfile = studentProfiles.find(p => p.id === selectedStudentProfile.id)
        if (updatedProfile) {
          setSelectedStudentProfile(updatedProfile)
        }
      }
    } catch (err) {
      setError('An error occurred while deleting document')
    } finally {
      setLoading(false)
    }
  }

  const loadFormVisibilitySettings = async () => {
    setFormVisibilityLoading(true)
    try {
      const res = await fetch('/api/admin/form-visibility')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to parse error' }))
        console.error('Failed to load form visibility settings:', errorData)
        setError(`Failed to load form visibility settings: ${errorData.error || 'Unknown error'}`)
        return
      }
      const data = await res.json()
      setFormVisibilityBatches(data.batches || [])
    } catch (error) {
      console.error('Failed to load form visibility settings:', error)
      setError('Failed to load form visibility settings')
    } finally {
      setFormVisibilityLoading(false)
    }
  }

  const handleUpdateFormVisibility = async (batchId: string, formVisibility: any) => {
    setSavingFormVisibility(batchId)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/form-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          formVisibility,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update form visibility settings')
        return
      }

      setSuccess(`Form visibility updated for ${formVisibilityBatches.find(b => b.id === batchId)?.name}`)
      await loadFormVisibilitySettings()
    } catch (err) {
      setError('An error occurred while updating form visibility settings')
    } finally {
      setSavingFormVisibility(null)
    }
  }

  const toggleFormSection = (batchId: string, section: string) => {
    setFormVisibilityBatches(prevBatches =>
      prevBatches.map(batch => {
        if (batch.id === batchId) {
          return {
            ...batch,
            formVisibility: {
              ...batch.formVisibility,
              [section]: !batch.formVisibility[section],
            },
          }
        }
        return batch
      })
    )
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

      setSuccess(`Batch ${data.batch.name} (${data.batch.code}) created successfully!`)
      setBatchForm({ program: 'BS', intakeYear: new Date().getFullYear(), code: '' })
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

  // Event handlers
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          banner: bannerPreview || undefined
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create event')
        return
      }

      setSuccess('Event created successfully!')
      setEventForm({
        name: '',
        description: '',
        eventDate: '',
        eventTime: '',
        venue: '',
        banner: '',
        registrationLink: '',
        batchIds: [],
      })
      setBannerFile(null)
      setBannerPreview('')
      await loadData()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          banner: bannerPreview || eventForm.banner || undefined
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update event')
        return
      }

      setSuccess('Event updated successfully!')
      setEditingEvent(null)
      setEventForm({
        name: '',
        description: '',
        eventDate: '',
        eventTime: '',
        venue: '',
        banner: '',
        registrationLink: '',
        batchIds: [],
      })
      setBannerFile(null)
      setBannerPreview('')
      await loadData()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        setError('Failed to delete event')
        return
      }

      setSuccess('Event deleted successfully!')
      setShowEventDeleteConfirm(null)
      await loadData()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setEventForm({
      name: event.name,
      description: event.description,
      eventDate: event.eventDate.split('T')[0],
      eventTime: event.eventTime,
      venue: event.venue,
      banner: event.banner || '',
      registrationLink: event.registrationLink || '',
      batchIds: event.batchIds,
    })
    setBannerFile(null)
    setBannerPreview(event.banner || '')
  }

  const cancelEditEvent = () => {
    setEditingEvent(null)
    setEventForm({
      name: '',
      description: '',
      eventDate: '',
      eventTime: '',
      venue: '',
      banner: '',
      registrationLink: '',
      batchIds: [],
    })
    setBannerFile(null)
    setBannerPreview('')
  }

  const loadResources = async () => {
    try {
      setResourcesLoading(true)
      const res = await fetch('/api/resources')
      if (!res.ok) {
        console.error('Failed to load resources')
        return
      }
      const data = await res.json()
      setResources(data.resources || [])
    } catch (err) {
      console.error('Error loading resources:', err)
    } finally {
      setResourcesLoading(false)
    }
  }

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resourceFile) {
      setError('Please select a file to upload')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('title', resourceForm.title)
      formData.append('description', resourceForm.description)
      formData.append('visibilityType', resourceForm.visibilityType)
      formData.append('batchId', resourceForm.batchId)
      formData.append('file', resourceFile)

      const res = await fetch('/api/resources', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to upload resource')
        return
      }

      setSuccess('Resource uploaded successfully!')
      setResourceForm({ title: '', description: '', batchId: '', visibilityType: 'BATCH' })
      setResourceFile(null)
      await loadResources()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        setError('Failed to delete resource')
        return
      }

      setSuccess('Resource deleted successfully!')
      await loadResources()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Check image dimensions
      const img = new Image()
      const reader = new FileReader()
      
      reader.onload = (event) => {
        img.onload = () => {
          if (img.width !== 600 || img.height !== 600) {
            setError('Image must be exactly 600x600 pixels')
            e.target.value = ''
            return
          }
          setBannerFile(file)
          setBannerPreview(event.target?.result as string)
          setError('')
        }
        img.src = event.target?.result as string
      }
      
      reader.readAsDataURL(file)
    }
  }

  const toggleBatchSelection = (batchId: string) => {
    setEventForm(prev => ({
      ...prev,
      batchIds: prev.batchIds.includes(batchId)
        ? prev.batchIds.filter(id => id !== batchId)
        : [...prev.batchIds, batchId]
    }))
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
              { id: 'form-visibility', label: 'Form Visibility', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
              { id: 'forms', label: 'Student Forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'events', label: 'Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'resources', label: 'Resources', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
              { id: 'email', label: 'Send Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setError('')
                  setSuccess('')
                  // Load student profiles when forms tab is clicked
                  if (tab.id === 'forms') {
                    loadStudentProfiles()
                  }
                  // Load form visibility settings when form-visibility tab is clicked
                  if (tab.id === 'form-visibility') {
                    loadFormVisibilitySettings()
                  }
                  // Load resources when resources tab is clicked
                  if (tab.id === 'resources') {
                    loadResources()
                  }
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

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Batch Code
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={batchForm.code}
                      onChange={(e) => setBatchForm({ ...batchForm, code: e.target.value })}
                      placeholder="e.g., BS-2024"
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
                
                {/* Search Input */}
                <div className="p-4 border-b border-slate-200">
                  <input
                    type="text"
                    placeholder="Search by batch name or code..."
                    className="input w-full"
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                  />
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
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Code</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Program</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Students</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {batches
                        .filter(batch => 
                          batch.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
                          (batch.code && batch.code.toLowerCase().includes(batchSearch.toLowerCase()))
                        )
                        .map((batch) => (
                        <tr key={batch.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-semibold text-slate-900">{batch.name}</td>
                          <td className="px-6 py-4 text-slate-700">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-mono">
                              {batch.code || 'N/A'}
                            </span>
                          </td>
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
                  <p className="text-slate-500 font-medium">No students found matching &quot;{studentSearch}&quot;</p>
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
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Profile</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md flex-shrink-0">
                                {student.firstName[0]}{student.lastName[0]}
                              </div>
                              <div className="font-medium text-sm text-slate-900">
                                {student.firstName} {student.lastName}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-3.5 h-3.5 text-slate-400 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-slate-700 text-sm">@{student.user.username}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center max-w-[200px]">
                              <svg className="w-3.5 h-3.5 text-slate-400 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-slate-600 text-xs truncate" title={student.user.email}>{student.user.email}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {student.program}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {student.batch ? (
                              <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">{student.batch.name} ({student.batch.code})</span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Unassigned</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                <div 
                                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${student.profileCompletion || 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 w-9 text-right flex-shrink-0">
                                {student.profileCompletion || 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleEditStudent(student)}
                                className="inline-flex items-center px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                                title="Edit student"
                              >
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(student.id)}
                                className="inline-flex items-center px-2.5 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
                                title="Delete student"
                              >
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          {batch.name} ({batch.code}) - {batch.program} - {batch._count?.students || 0} students {!batch.isActive && '(Archived)'}
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
            <div className="card max-w-3xl mx-auto mb-6">
              <div className="card-header">
                <h2 className="card-title">Import Recipients from Excel/CSV</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Upload Excel/CSV File (Name, Email columns)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="input"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      
                      setEmailImportFile(file)
                      
                      try {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const data = new Uint8Array(event.target?.result as ArrayBuffer)
                          const workbook = XLSX.read(data, { type: 'array' })
                          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                          const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet)
                          
                          const emails = jsonData.map((row: any) => ({
                            name: row.Name || row.name || '',
                            email: row.Email || row.email || ''
                          })).filter(item => item.email)
                          
                          setImportedEmails(emails)
                          setSuccess(`Imported ${emails.length} email addresses`)
                        }
                        reader.readAsArrayBuffer(file)
                      } catch (err) {
                        setError('Failed to parse file')
                      }
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    File should have &quot;Name&quot; and &quot;Email&quot; columns
                  </p>
                </div>
                
                {importedEmails.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Imported {importedEmails.length} Recipients:
                    </p>
                    <div className="max-h-40 overflow-y-auto bg-slate-50 rounded p-3 space-y-1">
                      {importedEmails.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="text-xs text-slate-600">
                          {item.name} - {item.email}
                        </div>
                      ))}
                      {importedEmails.length > 10 && (
                        <div className="text-xs text-slate-500 italic">
                          ...and {importedEmails.length - 10} more
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImportedEmails([])
                        setEmailImportFile(null)
                      }}
                      className="text-xs text-red-600 hover:text-red-700 mt-2"
                    >
                      Clear Import
                    </button>
                  </div>
                )}
              </div>
            </div>
            
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
                          {batch.name} ({batch.code})
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

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Resource Form */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Upload Resource</h2>
                </div>
                <form onSubmit={handleCreateResource} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                      placeholder="Resource title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                      placeholder="Brief description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Batch
                    </label>
                    <select
                      className="input"
                      value={resourceForm.batchId}
                      onChange={(e) => setResourceForm({ ...resourceForm, batchId: e.target.value })}
                      required
                    >
                      <option value="">-- Select Batch --</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} ({batch.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      File
                    </label>
                    <input
                      type="file"
                      className="input"
                      onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                      required
                    />
                    {resourceFile && (
                      <p className="text-xs text-slate-600 mt-1">
                        Selected: {resourceFile.name}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full"
                  >
                    {loading ? 'Uploading...' : 'Upload Resource'}
                  </button>
                </form>
              </div>

              {/* Resources List */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">All Resources</h2>
                  <span className="text-sm text-slate-600">
                    {resources.length} resource{resources.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {resourcesLoading ? (
                  <div className="flex justify-center py-12">
                    <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <p className="text-slate-500 font-medium">No resources uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resources.map((resource) => (
                      <div key={resource.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">{resource.title}</h3>
                            {resource.description && (
                              <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                            )}
                            <div className="flex items-center space-x-3 text-xs text-slate-500">
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-mono">
                                {resource.batch?.code || 'N/A'}
                              </span>
                              <span>{resource.fileName}</span>
                              <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={`/api/resources/${resource.id}?download=true`}
                              download
                              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
                            >
                              Download
                            </a>
                            <button
                              onClick={() => handleDeleteResource(resource.id)}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                              disabled={loading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Event Form */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    {editingEvent ? 'Edit Event' : 'Create New Event'}
                  </h2>
                </div>
                <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Event Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., EduFair"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Event Date *
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={eventForm.eventDate}
                        onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Event Time *
                      </label>
                      <input
                        type="time"
                        className="input"
                        value={eventForm.eventTime}
                        onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Event Venue *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., VIT"
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Event Description *
                    </label>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="Join world leaders to view the event"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Banner Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="input"
                      onChange={handleBannerChange}
                    />
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <BiSolidError className="text-yellow-500" /> Please use only 600×600 px images.
                    </p>
                    {bannerPreview && (
                      <div className="mt-3">
                        <img 
                          src={bannerPreview} 
                          alt="Banner preview" 
                          className="w-32 h-32 object-cover rounded-lg border-2 border-slate-300"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Registration Link
                    </label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://example.com/register"
                      value={eventForm.registrationLink}
                      onChange={(e) => setEventForm({ ...eventForm, registrationLink: e.target.value })}
                    />
                  </div>

                  {/* Multi-Select Batch Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Batches *
                    </label>
                    <div className="border border-slate-300 rounded-lg p-3 bg-white max-h-48 overflow-y-auto">
                      {batches.length === 0 ? (
                        <p className="text-slate-500 text-sm">No batches available</p>
                      ) : (
                        <div className="space-y-2">
                          {batches.map((batch) => (
                            <label
                              key={batch.id}
                              className="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={eventForm.batchIds.includes(batch.id)}
                                onChange={() => toggleBatchSelection(batch.id)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                              />
                              <span className="ml-3 text-sm text-slate-700 font-medium">
                                {batch.name} ({batch.code}) - {batch.program} - {batch._count?.students || 0} students
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {eventForm.batchIds.length} batch{eventForm.batchIds.length !== 1 ? 'es' : ''} selected
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    {editingEvent && (
                      <button
                        type="button"
                        onClick={cancelEditEvent}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading || eventForm.batchIds.length === 0}
                      className="flex-1 btn btn-primary"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {editingEvent ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {editingEvent ? 'Update Event' : 'Create Event'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Events List */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">All Events</h2>
                  <span className="text-sm text-slate-600">
                    {events.length} event{events.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {events.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-500 font-medium">No events found</p>
                    <p className="text-slate-400 text-sm">Create your first event to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {events.map((event) => {
                      const eventDate = new Date(event.eventDate)
                      const isPast = eventDate < new Date()
                      const batchNames = batches
                        .filter(b => event.batchIds.includes(b.id))
                        .map(b => b.name)
                        .join(', ')
                      
                      return (
                        <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex gap-4">
                            {/* Banner thumbnail */}
                            {event.banner && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={event.banner} 
                                  alt={event.name}
                                  className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200"
                                />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h3 className="font-bold text-slate-900 text-lg">{event.name}</h3>
                                  <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                                </div>
                                <span className={`badge ${isPast ? 'badge-neutral' : 'badge-success'} ml-2 flex-shrink-0`}>
                                  {isPast ? 'Past' : 'Upcoming'}
                                </span>
                              </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {eventDate.toLocaleDateString('en-GB')}
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {event.eventTime}
                            </div>
                            <div className="flex items-center col-span-2">
                              <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {event.venue}
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 mb-3">
                            <span className="font-semibold">Batches:</span> {batchNames || 'None'}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md text-sm font-medium"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => setShowEventDeleteConfirm(event.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm hover:shadow-md text-sm font-medium"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Event Delete Confirmation Modal */}
      {showEventDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Event</h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEventDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEvent(showEventDeleteConfirm)}
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
                        {batch.name} ({batch.code}) - {batch.program} - {batch._count?.students || 0} students
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

      {/* Student Forms Tab */}
      {activeTab === 'forms' && (
        <div className="animate-fade-in">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Student Forms & Documents</h2>
              <p className="text-sm text-slate-600">
                {studentProfiles.length} student{studentProfiles.length !== 1 ? 's' : ''} found
              </p>
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
                  placeholder="Search students..."
                  value={studentProfileSearch}
                  onChange={(e) => setStudentProfileSearch(e.target.value)}
                />
                {studentProfileSearch && (
                  <button
                    onClick={() => setStudentProfileSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {studentProfilesLoading ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-12 w-12 mx-auto text-primary-600 mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-500 font-medium">Loading student profiles...</p>
              </div>
            ) : studentProfiles.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 font-medium">No student profiles found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Program</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Batch</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Documents</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {studentProfiles
                      .filter((student) => {
                        if (!studentProfileSearch) return true
                        const search = studentProfileSearch.toLowerCase()
                        return (
                          student.firstName?.toLowerCase().includes(search) ||
                          student.lastName?.toLowerCase().includes(search) ||
                          student.user?.email?.toLowerCase().includes(search) ||
                          student.batch?.name?.toLowerCase().includes(search) ||
                          student.batch?.code?.toLowerCase().includes(search)
                        )
                      })
                      .map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {student.firstName?.[0]}{student.lastName?.[0]}
                              </div>
                              <div className="ml-3">
                                <div className="font-semibold text-slate-900">
                                  {student.firstName} {student.lastName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-sm">
                            {student.user?.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {student.program}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.batch ? (
                              <span className="badge badge-primary">{student.batch.name} ({student.batch.code})</span>
                            ) : (
                              <span className="badge badge-neutral">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              {student.documents?.length || 0} docs
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleViewProfile(student)}
                                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              <button
                                onClick={() => handleEditProfile(student)}
                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                            </div>
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

      {/* Form Visibility Tab */}
      {activeTab === 'form-visibility' && (
        <div className="animate-fade-in">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Form Visibility Control</h2>
              <p className="text-sm text-slate-600">
                Control which sections of the student profile form are visible to students in each batch
              </p>
            </div>

            {formVisibilityLoading ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-12 w-12 mx-auto text-primary-600 mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-500 font-medium">Loading form visibility settings...</p>
              </div>
            ) : formVisibilityBatches.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-slate-500 font-medium">No batches found</p>
                <p className="text-sm text-slate-400 mt-2">Create batches first to manage form visibility</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Search Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      className="input pl-10 w-full"
                      placeholder="Search batches by name or program..."
                      value={batchVisibilitySearch}
                      onChange={(e) => setBatchVisibilitySearch(e.target.value)}
                    />
                    {batchVisibilitySearch && (
                      <button
                        onClick={() => setBatchVisibilitySearch('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    {formVisibilityBatches.filter((batch) => {
                      if (!batchVisibilitySearch) return true
                      const search = batchVisibilitySearch.toLowerCase()
                      return (
                        batch.name.toLowerCase().includes(search) ||
                        batch.code.toLowerCase().includes(search) ||
                        batch.program.toLowerCase().includes(search)
                      )
                    }).length} of {formVisibilityBatches.length} batch{formVisibilityBatches.length !== 1 ? 'es' : ''}
                  </p>
                </div>

                {/* Batch List */}
                {formVisibilityBatches
                  .filter((batch) => {
                    if (!batchVisibilitySearch) return true
                    const search = batchVisibilitySearch.toLowerCase()
                    return (
                      batch.name.toLowerCase().includes(search) ||
                      batch.code.toLowerCase().includes(search) ||
                      batch.program.toLowerCase().includes(search)
                    )
                  })
                  .map((batch) => (
                  <div key={batch.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-slate-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{batch.name} ({batch.code})</h3>
                          <p className="text-sm text-slate-600">
                            {batch.program} • {batch.intakeYear} • {batch.studentCount} student{batch.studentCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUpdateFormVisibility(batch.id, batch.formVisibility)}
                          disabled={savingFormVisibility === batch.id}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {savingFormVisibility === batch.id ? (
                            <span className="flex items-center">
                              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </span>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { key: 'personalDetails', label: 'Personal Details', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                          { key: 'education', label: 'Education', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' },
                          { key: 'travel', label: 'Travel', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
                          { key: 'workDetails', label: 'Work Details', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                          { key: 'financials', label: 'Financials', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                          { key: 'documents', label: 'Documents', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
                          { key: 'courseDetails', label: 'Course Details', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                          { key: 'university', label: 'University', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                          { key: 'postAdmission', label: 'Post Admission', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                        ].map((section) => (
                          <div
                            key={section.key}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              batch.formVisibility[section.key]
                                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                            }`}
                            onClick={() => toggleFormSection(batch.id, section.key)}
                          >
                            <div className="flex items-center space-x-3">
                              <svg 
                                className={`w-5 h-5 ${batch.formVisibility[section.key] ? 'text-green-600' : 'text-slate-400'}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                              </svg>
                              <span className={`font-medium text-sm ${batch.formVisibility[section.key] ? 'text-green-900' : 'text-slate-600'}`}>
                                {section.label}
                              </span>
                            </div>
                            <div className={`w-12 h-6 rounded-full transition-colors ${
                              batch.formVisibility[section.key] ? 'bg-green-500' : 'bg-slate-300'
                            }`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                                batch.formVisibility[section.key] ? 'translate-x-6' : 'translate-x-0.5'
                              } mt-0.5`}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {showProfileModal && selectedStudentProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {selectedStudentProfile.firstName} {selectedStudentProfile.lastName}
                </h3>
                <p className="text-slate-600 text-sm">{selectedStudentProfile.user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  setSelectedStudentProfile(null)
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Personal Information */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Phone</p>
                    <p className="text-slate-800">{selectedStudentProfile.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</p>
                    <p className="text-slate-800">
                      {selectedStudentProfile.dateOfBirth 
                        ? new Date(selectedStudentProfile.dateOfBirth).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Gender</p>
                    <p className="text-slate-800">{selectedStudentProfile.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Nationality</p>
                    <p className="text-slate-800">{selectedStudentProfile.nationality || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Country of Birth</p>
                    <p className="text-slate-800">{selectedStudentProfile.countryOfBirth || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Native Language</p>
                    <p className="text-slate-800">{selectedStudentProfile.nativeLanguage || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Address</p>
                    <p className="text-slate-800">{selectedStudentProfile.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Postal Code</p>
                    <p className="text-slate-800">{selectedStudentProfile.postalCode || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Passport Information */}
              {(selectedStudentProfile.passportNumber || selectedStudentProfile.nameAsPerPassport) && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Passport Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Passport Number</p>
                      <p className="text-slate-800">{selectedStudentProfile.passportNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Name as per Passport</p>
                      <p className="text-slate-800">{selectedStudentProfile.nameAsPerPassport || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Issue Location</p>
                      <p className="text-slate-800">{selectedStudentProfile.passportIssueLocation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Issue Date</p>
                      <p className="text-slate-800">
                        {selectedStudentProfile.passportIssueDate 
                          ? new Date(selectedStudentProfile.passportIssueDate).toLocaleDateString() 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Expiry Date</p>
                      <p className="text-slate-800">
                        {selectedStudentProfile.passportExpiryDate 
                          ? new Date(selectedStudentProfile.passportExpiryDate).toLocaleDateString() 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Education Information */}
              {(selectedStudentProfile.school || selectedStudentProfile.highSchool || selectedStudentProfile.bachelorsIn) && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Education Information
                  </h4>
                  <div className="space-y-4">
                    {selectedStudentProfile.school && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold text-slate-700 mb-2">School (10th Grade)</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">School Name</p>
                            <p className="text-slate-800">{selectedStudentProfile.school}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Country</p>
                            <p className="text-slate-800">{selectedStudentProfile.schoolCountry || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Grade</p>
                            <p className="text-slate-800">{selectedStudentProfile.schoolGrade || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedStudentProfile.highSchool && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold text-slate-700 mb-2">High School (12th Grade)</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">School Name</p>
                            <p className="text-slate-800">{selectedStudentProfile.highSchool}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Country</p>
                            <p className="text-slate-800">{selectedStudentProfile.highSchoolCountry || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Grade</p>
                            <p className="text-slate-800">{selectedStudentProfile.highSchoolGrade || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedStudentProfile.bachelorsIn && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold text-slate-700 mb-2">Bachelor&apos;s Degree</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Field of Study</p>
                            <p className="text-slate-800">{selectedStudentProfile.bachelorsIn}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Institute</p>
                            <p className="text-slate-800">{selectedStudentProfile.bachelorsFromInstitute || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Country</p>
                            <p className="text-slate-800">{selectedStudentProfile.bachelorsCountry || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Grade</p>
                            <p className="text-slate-800">{selectedStudentProfile.bachelorsGrade || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Work Experience */}
              {selectedStudentProfile.workExperiences && selectedStudentProfile.workExperiences.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Work Experience
                  </h4>
                  <div className="space-y-3">
                    {selectedStudentProfile.workExperiences.map((exp: any, index: number) => (
                      <div key={exp.id} className="bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold text-slate-700 mb-2">Experience {index + 1}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Job Title</p>
                            <p className="text-slate-800">{exp.jobTitle}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Organization</p>
                            <p className="text-slate-800">{exp.organizationName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Start Date</p>
                            <p className="text-slate-800">{new Date(exp.startDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">End Date</p>
                            <p className="text-slate-800">{new Date(exp.endDate).toLocaleDateString()}</p>
                          </div>
                          {exp.organizationAddress && (
                            <div className="col-span-2">
                              <p className="text-xs font-semibold text-slate-500">Address</p>
                              <p className="text-slate-800">{exp.organizationAddress}</p>
                            </div>
                          )}
                          {exp.organizationContact && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500">Contact</p>
                              <p className="text-slate-800">{exp.organizationContact}</p>
                            </div>
                          )}
                          {exp.reference && (
                            <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-2">Reference</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500">Name</p>
                                  <p className="text-slate-800 text-sm">{exp.reference.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-500">Position</p>
                                  <p className="text-slate-800 text-sm">{exp.reference.position}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-500">Email</p>
                                  <p className="text-slate-800 text-sm">{exp.reference.workEmail}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-500">Phone</p>
                                  <p className="text-slate-800 text-sm">{exp.reference.phone}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Information */}
              {(selectedStudentProfile.personalEverEmployed || selectedStudentProfile.personalTakingLoan || 
                selectedStudentProfile.motherIncomeType || selectedStudentProfile.fatherIncomeType || 
                selectedStudentProfile.otherSources) && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Financial Information
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    {selectedStudentProfile.personalEverEmployed && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Ever Employed</p>
                        <p className="text-slate-800">{selectedStudentProfile.personalEverEmployed}</p>
                      </div>
                    )}
                    {selectedStudentProfile.personalTakingLoan && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase">Taking Loan</p>
                          <p className="text-slate-800">{selectedStudentProfile.personalTakingLoan}</p>
                        </div>
                        {selectedStudentProfile.personalLoanAmount && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Loan Amount</p>
                            <p className="text-slate-800">{selectedStudentProfile.personalLoanAmount}</p>
                          </div>
                        )}
                        {selectedStudentProfile.personalLoanBankName && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Bank Name</p>
                            <p className="text-slate-800">{selectedStudentProfile.personalLoanBankName}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedStudentProfile.motherIncomeType && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Mother&apos;s Income Type</p>
                        <p className="text-slate-800">{selectedStudentProfile.motherIncomeType}</p>
                      </div>
                    )}
                    {selectedStudentProfile.fatherIncomeType && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Father&apos;s Income Type</p>
                        <p className="text-slate-800">{selectedStudentProfile.fatherIncomeType}</p>
                      </div>
                    )}
                    {selectedStudentProfile.otherSources && Array.isArray(selectedStudentProfile.otherSources) && selectedStudentProfile.otherSources.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Other Income Sources</p>
                        <div className="space-y-2">
                          {selectedStudentProfile.otherSources.map((source: any, index: number) => (
                            <div key={index} className="bg-white p-3 rounded border border-slate-200">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500">Name</p>
                                  <p className="text-slate-800">{source.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-500">Relationship</p>
                                  <p className="text-slate-800">{source.relationship}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-500">Income Type</p>
                                  <p className="text-slate-800">{source.incomeType}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedStudentProfile.documents && selectedStudentProfile.documents.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Uploaded Documents
                  </h4>
                  <div className="space-y-2">
                    {selectedStudentProfile.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{doc.type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-500">{doc.fileName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(`/api/documents/${doc.id}`, '_blank')}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-200">
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  setSelectedStudentProfile(null)
                }}
                className="w-full px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal - To be continued in next part due to length */}
      {showProfileEditModal && selectedStudentProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Edit Student Profile</h3>
                <p className="text-slate-600 text-sm">
                  {selectedStudentProfile.firstName} {selectedStudentProfile.lastName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowProfileEditModal(false)
                  setSelectedStudentProfile(null)
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Personal Information */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.firstName}
                      onChange={(e) => setProfileEditForm({...profileEditForm, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.lastName}
                      onChange={(e) => setProfileEditForm({...profileEditForm, lastName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.phone}
                      onChange={(e) => setProfileEditForm({...profileEditForm, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      className="input"
                      value={profileEditForm.dateOfBirth}
                      onChange={(e) => setProfileEditForm({...profileEditForm, dateOfBirth: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
                    <select
                      className="input"
                      value={profileEditForm.gender}
                      onChange={(e) => setProfileEditForm({...profileEditForm, gender: e.target.value})}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nationality</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.nationality}
                      onChange={(e) => setProfileEditForm({...profileEditForm, nationality: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Country of Birth</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.countryOfBirth}
                      onChange={(e) => setProfileEditForm({...profileEditForm, countryOfBirth: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Native Language</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.nativeLanguage}
                      onChange={(e) => setProfileEditForm({...profileEditForm, nativeLanguage: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.address}
                      onChange={(e) => setProfileEditForm({...profileEditForm, address: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Postal Code</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.postalCode}
                      onChange={(e) => setProfileEditForm({...profileEditForm, postalCode: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Passport Information */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-3">Passport Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Passport Number</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.passportNumber}
                      onChange={(e) => setProfileEditForm({...profileEditForm, passportNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Name as per Passport</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.nameAsPerPassport}
                      onChange={(e) => setProfileEditForm({...profileEditForm, nameAsPerPassport: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Issue Location</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.passportIssueLocation}
                      onChange={(e) => setProfileEditForm({...profileEditForm, passportIssueLocation: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Issue Date</label>
                    <input
                      type="date"
                      className="input"
                      value={profileEditForm.passportIssueDate}
                      onChange={(e) => setProfileEditForm({...profileEditForm, passportIssueDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Expiry Date</label>
                    <input
                      type="date"
                      className="input"
                      value={profileEditForm.passportExpiryDate}
                      onChange={(e) => setProfileEditForm({...profileEditForm, passportExpiryDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Education - School */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-3">School (10th Grade)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">School Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.school}
                      onChange={(e) => setProfileEditForm({...profileEditForm, school: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Country</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.schoolCountry}
                      onChange={(e) => setProfileEditForm({...profileEditForm, schoolCountry: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Grade/Percentage</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.schoolGrade}
                      onChange={(e) => setProfileEditForm({...profileEditForm, schoolGrade: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Education - High School */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-3">High School (12th Grade)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">School Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.highSchool}
                      onChange={(e) => setProfileEditForm({...profileEditForm, highSchool: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Country</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.highSchoolCountry}
                      onChange={(e) => setProfileEditForm({...profileEditForm, highSchoolCountry: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Grade/Percentage</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.highSchoolGrade}
                      onChange={(e) => setProfileEditForm({...profileEditForm, highSchoolGrade: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Education - Bachelors */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-3">Bachelor&apos;s Degree</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Field of Study</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.bachelorsIn}
                      onChange={(e) => setProfileEditForm({...profileEditForm, bachelorsIn: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Institute</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.bachelorsFromInstitute}
                      onChange={(e) => setProfileEditForm({...profileEditForm, bachelorsFromInstitute: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Country</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.bachelorsCountry}
                      onChange={(e) => setProfileEditForm({...profileEditForm, bachelorsCountry: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Grade/CGPA</label>
                    <input
                      type="text"
                      className="input"
                      value={profileEditForm.bachelorsGrade}
                      onChange={(e) => setProfileEditForm({...profileEditForm, bachelorsGrade: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Test Scores */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-3">Test Scores</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="greTaken"
                      checked={profileEditForm.greTaken}
                      onChange={(e) => setProfileEditForm({...profileEditForm, greTaken: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="greTaken" className="ml-2 text-sm font-semibold text-slate-700">
                      GRE Taken
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="toeflTaken"
                      checked={profileEditForm.toeflTaken}
                      onChange={(e) => setProfileEditForm({...profileEditForm, toeflTaken: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="toeflTaken" className="ml-2 text-sm font-semibold text-slate-700">
                      TOEFL Taken
                    </label>
                  </div>
                </div>
              </div>

              {/* Documents */}
              {selectedStudentProfile.documents && selectedStudentProfile.documents.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3">Documents</h4>
                  <div className="space-y-2">
                    {selectedStudentProfile.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{doc.type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-500">{doc.fileName}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(`/api/documents/${doc.id}`, '_blank')}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDocDeleteWarning(doc.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-200">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileEditModal(false)
                    setSelectedStudentProfile(null)
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Delete Warning Modal */}
      {showDocDeleteWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Document</h3>
              <p className="text-slate-600 mb-6">
                ⚠️ <strong>Warning:</strong> You are about to permanently delete this document. This action cannot be undone. The student will need to re-upload the document if needed.
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to proceed with deleting this document?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDocDeleteWarning(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteDocument(showDocDeleteWarning)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
