'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Button, Input, Alert, LoadingSpinner, Header } from '@/components'
import { 
  FaUser, 
  FaGraduationCap, 
  FaPlane, 
  FaClipboardList, 
  FaAddressCard, 
  FaBriefcase, 
  FaFileAlt, 
  FaBook, 
  FaUniversity, 
  FaCheckCircle 
} from 'react-icons/fa'

type Tab = 'personal' | 'education' | 'travel' | 'visa' | 'references' | 'work' | 'documents' | 'course' | 'university' | 'post-admission'

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  nationality: string
  countryOfBirth: string
  nativeLanguage: string
  passportNumber: string
  nameAsPerPassport: string
  passportIssueLocation: string
  passportIssueDate: string
  passportExpiryDate: string
  address: string
  postalCode: string
  program: string
  intakeYear: number
  batchName: string
  // Education fields
  school: string
  schoolCountry: string
  schoolAddress: string
  schoolStartDate: string
  schoolEndDate: string
  schoolGrade: string
  highSchool: string
  highSchoolCountry: string
  highSchoolAddress: string
  highSchoolStartDate: string
  highSchoolEndDate: string
  highSchoolGrade: string
  bachelorsIn: string
  bachelorsFromInstitute: string
  bachelorsCountry: string
  bachelorsAddress: string
  bachelorsStartDate: string
  bachelorsEndDate: string
  bachelorsGrade: string
  greTaken: boolean
  toeflTaken: boolean
}

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'personal', label: 'Personal Details', icon: <FaUser /> },
  { id: 'education', label: 'Education', icon: <FaGraduationCap /> },
  { id: 'travel', label: 'Travel', icon: <FaPlane /> },
  { id: 'visa', label: 'Visa', icon: <FaClipboardList /> },
  { id: 'references', label: 'References', icon: <FaAddressCard /> },
  { id: 'work', label: 'Work Details', icon: <FaBriefcase /> },
  { id: 'documents', label: 'Documents', icon: <FaFileAlt /> },
  { id: 'course', label: 'Course Details', icon: <FaBook /> },
  { id: 'university', label: 'University', icon: <FaUniversity /> },
  { id: 'post-admission', label: 'Post Admission', icon: <FaCheckCircle /> },
]

export default function ProfilePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [marksheet10th, setMarksheet10th] = useState<File | null>(null)
  const [marksheet12th, setMarksheet12th] = useState<File | null>(null)
  const [existingDocs, setExistingDocs] = useState<{ 
    marksheet10th?: { id: string; fileName: string }; 
    marksheet12th?: { id: string; fileName: string } 
  }>({})


  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    countryOfBirth: '',
    nativeLanguage: '',
    passportNumber: '',
    nameAsPerPassport: '',
    passportIssueLocation: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    address: '',
    postalCode: '',
    program: '',
    intakeYear: 2024,
    batchName: '',
    // Education fields
    school: '',
    schoolCountry: '',
    schoolAddress: '',
    schoolStartDate: '',
    schoolEndDate: '',
    schoolGrade: '',
    highSchool: '',
    highSchoolCountry: '',
    highSchoolAddress: '',
    highSchoolStartDate: '',
    highSchoolEndDate: '',
    highSchoolGrade: '',
    bachelorsIn: '',
    bachelorsFromInstitute: '',
    bachelorsCountry: '',
    bachelorsAddress: '',
    bachelorsStartDate: '',
    bachelorsEndDate: '',
    bachelorsGrade: '',
    greTaken: false,
    toeflTaken: false,
  })

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/student/profile')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load profile')
      }
      const responseData = await res.json()
      const student = responseData.student
      
      setProfile({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.user?.email || student.email || '',
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
        program: student.program || '',
        intakeYear: student.intakeYear || 2024,
        batchName: student.batch?.name || '',
        // Education fields
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

      // Load existing documents
      await loadDocuments()
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      if (res.ok) {
        const data = await res.json()
        const docs: any = {}
        data.documents.forEach((doc: any) => {
          if (doc.type === 'MARKSHEET_10TH') {
            docs.marksheet10th = { id: doc.id, fileName: doc.fileName }
          } else if (doc.type === 'MARKSHEET_12TH') {
            docs.marksheet12th = { id: doc.id, fileName: doc.fileName }
          }
        })
        setExistingDocs(docs)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const handleViewDocument = (docId: string) => {
    window.open(`/api/documents/${docId}`, '_blank')
  }

  const handleRemoveDocument = async (docId: string, type: 'MARKSHEET_10TH' | 'MARKSHEET_12TH') => {
    setUploading(true)
    setAlert(null)
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete document')
      }

      setAlert({ type: 'success', message: 'Document removed successfully!' })
      await loadDocuments()
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message })
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'MARKSHEET_10TH' | 'MARKSHEET_12TH') => {
    setUploading(true)
    setAlert(null)
    try {
      // If there's an existing document, delete it first
      const existingDoc = type === 'MARKSHEET_10TH' ? existingDocs.marksheet10th : existingDocs.marksheet12th
      if (existingDoc) {
        const deleteRes = await fetch(`/api/documents/${existingDoc.id}`, {
          method: 'DELETE',
        })
        if (!deleteRes.ok) {
          const data = await deleteRes.json()
          throw new Error(data.error || 'Failed to remove existing document')
        }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload document')
      }

      setAlert({ type: 'success', message: 'Document uploaded successfully!' })
      await loadDocuments()
      
      // Clear file input
      if (type === 'MARKSHEET_10TH') {
        setMarksheet10th(null)
      } else {
        setMarksheet12th(null)
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message })
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async () => {
    setSaving(true)
    setAlert(null)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      setAlert({ type: 'success', message: 'Profile updated successfully!' })
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 transition-colors duration-200">
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alert && (
          <Alert
            variant={alert.type}
            onClose={() => setAlert(null)}
          >
            {alert.message}
          </Alert>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border border-slate-200 dark:border-slate-700 transition-colors">
              <nav className="space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-700 transition-colors">
              {/* Personal Details Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Personal Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">First Name</label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        placeholder="Enter your first name"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        placeholder="Enter your last name"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        placeholder="Enter your email"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="Enter your contact"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Gender</label>
                      <select
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Nationality</label>
                      <input
                        type="text"
                        value={profile.nationality}
                        onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                        placeholder="Enter your nationality"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Country of Birth</label>
                      <input
                        type="text"
                        value={profile.countryOfBirth}
                        onChange={(e) => setProfile({ ...profile, countryOfBirth: e.target.value })}
                        placeholder="Enter your birth country"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Native Language</label>
                      <input
                        type="text"
                        value={profile.nativeLanguage}
                        onChange={(e) => setProfile({ ...profile, nativeLanguage: e.target.value })}
                        placeholder="Enter your native language"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport Number</label>
                      <input
                        type="text"
                        value={profile.passportNumber}
                        onChange={(e) => setProfile({ ...profile, passportNumber: e.target.value })}
                        placeholder="Enter your passport Number"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Name as per passport</label>
                      <input
                        type="text"
                        value={profile.nameAsPerPassport}
                        onChange={(e) => setProfile({ ...profile, nameAsPerPassport: e.target.value })}
                        placeholder="Enter your name as per passport"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport issue location</label>
                      <input
                        type="text"
                        value={profile.passportIssueLocation}
                        onChange={(e) => setProfile({ ...profile, passportIssueLocation: e.target.value })}
                        placeholder="Enter your passport issue location"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport Issue Date</label>
                      <input
                        type="date"
                        value={profile.passportIssueDate}
                        onChange={(e) => setProfile({ ...profile, passportIssueDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport expiry date</label>
                      <input
                        type="date"
                        value={profile.passportExpiryDate}
                        onChange={(e) => setProfile({ ...profile, passportExpiryDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Address</label>
                      <input
                        type="text"
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        placeholder="Enter your complete address"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Postal Code</label>
                      <input
                        type="text"
                        value={profile.postalCode}
                        onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                        placeholder="Enter your postal code"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Education Tab */}
              {activeTab === 'education' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Education</h2>
                  
                  {/* School (10th Grade) */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">School (10th Grade)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">School</label>
                        <input
                          type="text"
                          value={profile.school}
                          onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                          placeholder="Enter your school name"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">School Country</label>
                        <input
                          type="text"
                          value={profile.schoolCountry}
                          onChange={(e) => setProfile({ ...profile, schoolCountry: e.target.value })}
                          placeholder="Enter your school country"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">School Address</label>
                        <input
                          type="text"
                          value={profile.schoolAddress}
                          onChange={(e) => setProfile({ ...profile, schoolAddress: e.target.value })}
                          placeholder="Enter your school address"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">School Start Date</label>
                        <input
                          type="date"
                          value={profile.schoolStartDate}
                          onChange={(e) => setProfile({ ...profile, schoolStartDate: e.target.value })}
                          placeholder="Enter your school start date"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">School End Date</label>
                        <input
                          type="date"
                          value={profile.schoolEndDate}
                          onChange={(e) => setProfile({ ...profile, schoolEndDate: e.target.value })}
                          placeholder="Enter your school end date"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">School Grade (in %)</label>
                        <input
                          type="text"
                          value={profile.schoolGrade}
                          onChange={(e) => setProfile({ ...profile, schoolGrade: e.target.value })}
                          placeholder="Enter your school grade (in %)"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* High School (12th Grade) */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">High School (12th Grade)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">High School</label>
                        <input
                          type="text"
                          value={profile.highSchool}
                          onChange={(e) => setProfile({ ...profile, highSchool: e.target.value })}
                          placeholder="Enter your high school name"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">High School Country</label>
                        <input
                          type="text"
                          value={profile.highSchoolCountry}
                          onChange={(e) => setProfile({ ...profile, highSchoolCountry: e.target.value })}
                          placeholder="Enter your high school country"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">High School Address</label>
                        <input
                          type="text"
                          value={profile.highSchoolAddress}
                          onChange={(e) => setProfile({ ...profile, highSchoolAddress: e.target.value })}
                          placeholder="Enter your high school address"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">High School Start Date</label>
                        <input
                          type="date"
                          value={profile.highSchoolStartDate}
                          onChange={(e) => setProfile({ ...profile, highSchoolStartDate: e.target.value })}
                          placeholder="Enter your high school start date"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">High School End Date</label>
                        <input
                          type="date"
                          value={profile.highSchoolEndDate}
                          onChange={(e) => setProfile({ ...profile, highSchoolEndDate: e.target.value })}
                          placeholder="Enter your high school end date"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">High School Grade (in %)</label>
                        <input
                          type="text"
                          value={profile.highSchoolGrade}
                          onChange={(e) => setProfile({ ...profile, highSchoolGrade: e.target.value })}
                          placeholder="Enter your high school grade (in %)"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bachelor's Degree */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Bachelor&apos;s Degree</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Bachelors In</label>
                        <input
                          type="text"
                          value={profile.bachelorsIn}
                          onChange={(e) => setProfile({ ...profile, bachelorsIn: e.target.value })}
                          placeholder="Enter your bachelor&apos;s degree"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Bachelors From Institute</label>
                        <input
                          type="text"
                          value={profile.bachelorsFromInstitute}
                          onChange={(e) => setProfile({ ...profile, bachelorsFromInstitute: e.target.value })}
                          placeholder="Enter your bachelor&apos;s degree granting institute or university"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Bachelors Country</label>
                        <input
                          type="text"
                          value={profile.bachelorsCountry}
                          onChange={(e) => setProfile({ ...profile, bachelorsCountry: e.target.value })}
                          placeholder="Enter your bachelor&apos;s degree country"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Bachelors Address</label>
                        <input
                          type="text"
                          value={profile.bachelorsAddress}
                          onChange={(e) => setProfile({ ...profile, bachelorsAddress: e.target.value })}
                          placeholder="Enter your bachelor&apos;s degree address"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Bachelors Start Date</label>
                        <input
                          type="date"
                          value={profile.bachelorsStartDate}
                          onChange={(e) => setProfile({ ...profile, bachelorsStartDate: e.target.value })}
                          placeholder="Enter your bachelor&apos;s degree start date"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Bachelors End Date</label>
                        <input
                          type="date"
                          value={profile.bachelorsEndDate}
                          onChange={(e) => setProfile({ ...profile, bachelorsEndDate: e.target.value })}
                          placeholder="Enter your bachelor&apos;s degree end date"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Bachelors Grade</label>
                        <input
                          type="text"
                          value={profile.bachelorsGrade}
                          onChange={(e) => setProfile({ ...profile, bachelorsGrade: e.target.value })}
                          placeholder="Enter your bachelor&apos;s degree grade"
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Test Scores */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Test Scores</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">GRE Taken</label>
                        <select
                          value={profile.greTaken ? 'true' : 'false'}
                          onChange={(e) => setProfile({ ...profile, greTaken: e.target.value === 'true' })}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Value</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Toefl Taken</label>
                        <select
                          value={profile.toeflTaken ? 'true' : 'false'}
                          onChange={(e) => setProfile({ ...profile, toeflTaken: e.target.value === 'true' })}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Value</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Upload Marksheets</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400">10th Grade Marksheet</label>
                        {existingDocs.marksheet10th ? (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => handleViewDocument(existingDocs.marksheet10th!.id)}
                                className="text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 underline cursor-pointer text-left flex-1"
                              >
                                ✓ Uploaded: {existingDocs.marksheet10th.fileName}
                              </button>
                              <button
                                onClick={() => handleRemoveDocument(existingDocs.marksheet10th!.id, 'MARKSHEET_10TH')}
                                disabled={uploading}
                                className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove this document"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) setMarksheet10th(file)
                            }}
                            className="w-full sm:flex-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300"
                          />
                          <button
                            onClick={() => marksheet10th && handleFileUpload(marksheet10th, 'MARKSHEET_10TH')}
                            disabled={!marksheet10th || uploading}
                            className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {uploading ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400">12th Grade Marksheet</label>
                        {existingDocs.marksheet12th ? (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => handleViewDocument(existingDocs.marksheet12th!.id)}
                                className="text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 underline cursor-pointer text-left flex-1"
                              >
                                ✓ Uploaded: {existingDocs.marksheet12th.fileName}
                              </button>
                              <button
                                onClick={() => handleRemoveDocument(existingDocs.marksheet12th!.id, 'MARKSHEET_12TH')}
                                disabled={uploading}
                                className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove this document"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) setMarksheet12th(file)
                            }}
                            className="w-full sm:flex-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300"
                          />
                          <button
                            onClick={() => marksheet12th && handleFileUpload(marksheet12th, 'MARKSHEET_12TH')}
                            disabled={!marksheet12th || uploading}
                            className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {uploading ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Travel Tab */}
              {activeTab === 'travel' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">Travel Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport Number</label>
                      <input
                        type="text"
                        value={profile.passportNumber}
                        onChange={(e) => setProfile({ ...profile, passportNumber: e.target.value })}
                        placeholder="Enter passport number"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Name as per Passport</label>
                      <input
                        type="text"
                        value={profile.nameAsPerPassport}
                        onChange={(e) => setProfile({ ...profile, nameAsPerPassport: e.target.value })}
                        placeholder="Enter name as per passport"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport Issue Location</label>
                      <input
                        type="text"
                        value={profile.passportIssueLocation}
                        onChange={(e) => setProfile({ ...profile, passportIssueLocation: e.target.value })}
                        placeholder="Enter issue location"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport Issue Date</label>
                      <input
                        type="date"
                        value={profile.passportIssueDate}
                        onChange={(e) => setProfile({ ...profile, passportIssueDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Passport Expiry Date</label>
                      <input
                        type="date"
                        value={profile.passportExpiryDate}
                        onChange={(e) => setProfile({ ...profile, passportExpiryDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Visa Tab */}
              {activeTab === 'visa' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">Visa Information</h2>
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">Visa details coming soon...</p>
                    <p className="text-sm mt-2">This section will include visa type, status, and validity information.</p>
                  </div>
                </div>
              )}

              {/* References Tab */}
              {activeTab === 'references' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">References</h2>
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">References coming soon...</p>
                    <p className="text-sm mt-2">This section will include contact information for references.</p>
                  </div>
                </div>
              )}

              {/* Work Details Tab */}
              {activeTab === 'work' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">Work Details</h2>
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">Work experience details coming soon...</p>
                    <p className="text-sm mt-2">This section will include employment history and experience.</p>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">Documents</h2>
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">Document management coming soon...</p>
                    <p className="text-sm mt-2">This section will allow you to upload and manage your documents.</p>
                  </div>
                </div>
              )}

              {/* Course Details Tab */}
              {activeTab === 'course' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">Course Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Program *</label>
                      <select
                        value={profile.program}
                        onChange={(e) => setProfile({ ...profile, program: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Program</option>
                        <option value="BS">BS - Bachelor of Science</option>
                        <option value="BBA">BBA - Bachelor of Business Administration</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Intake Year *</label>
                      <input
                        type="number"
                        value={profile.intakeYear.toString()}
                        onChange={(e) => setProfile({ ...profile, intakeYear: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Current Batch</label>
                      <input
                        type="text"
                        value={profile.batchName}
                        disabled
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* University Tab */}
              {activeTab === 'university' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">University Information</h2>
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">University details coming soon...</p>
                    <p className="text-sm mt-2">This section will include university preferences and application details.</p>
                  </div>
                </div>
              )}

              {/* Post Admission Tab */}
              {activeTab === 'post-admission' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-600">Post Admission</h2>
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">Post admission details coming soon...</p>
                    <p className="text-sm mt-2">This section will include information after receiving admission.</p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => loadProfile()}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
