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
      })
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [router])

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
                  <h2 className="text-2xl font-bold text-indigo-600">Education Details</h2>
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">Education details coming soon...</p>
                    <p className="text-sm mt-2">This section will include previous education, qualifications, and transcripts.</p>
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
