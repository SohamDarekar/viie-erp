'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState({
    // Personal Details
    firstName: '',
    lastName: '',
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
    // Education Details
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
    greTaken: undefined as boolean | undefined,
    greScore: '',
    toeflTaken: undefined as boolean | undefined,
    toeflScore: '',
    languageTest: '',
    languageTestScore: '',
    program: '',
    intakeYear: '',
    bachelorsCompleted: undefined as boolean | undefined,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const totalSteps = 2

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/student/profile')
      
      if (res.ok) {
        const data = await res.json()
        const student = data.student
        
        setIsEditMode(true)
        setFormData({
          firstName: student.firstName || '',
          lastName: student.lastName || '',
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
          greTaken: student.greTaken,
          greScore: student.greScore || '',
          toeflTaken: student.toeflTaken,
          toeflScore: student.toeflScore || '',
          languageTest: student.languageTest || '',
          languageTestScore: student.languageTestScore || '',
          program: student.program || '',
          intakeYear: student.intakeYear || '',
          bachelorsCompleted: student.bachelorsCompleted,
        })
      }
    } catch (err) {
      // Profile doesn't exist yet, continue with onboarding
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (currentStep < totalSteps) {
      return
    }
    
    setError('')
    setLoading(true)

    try {
      const url = isEditMode ? '/api/student/profile' : '/api/student/onboarding'
      const method = isEditMode ? 'PUT' : 'POST'

      // Remove undefined and empty string values from formData
      const payload: any = {
        ...formData,
      }
      
      // Convert intakeYear to number if it's not empty
      if (formData.intakeYear && formData.intakeYear !== '') {
        payload.intakeYear = parseInt(formData.intakeYear.toString())
      }
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === '') {
          delete payload[key]
        }
      })

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || (isEditMode ? 'Update failed' : 'Onboarding failed'))
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  const nextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-2xl mb-6">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Welcome to VIIE ERP</h1>
          <p className="text-indigo-100 text-lg">Let&apos;s complete your profile to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center max-w-md mx-auto">
            {[
              { num: 1, label: 'Personal Details' },
              { num: 2, label: 'Education' }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                      step.num < currentStep
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : step.num === currentStep
                        ? 'bg-white text-indigo-600 shadow-xl ring-4 ring-white ring-opacity-50'
                        : 'bg-white bg-opacity-30 text-white'
                    }`}
                  >
                    {step.num < currentStep ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={`mt-3 text-sm font-medium whitespace-nowrap ${step.num <= currentStep ? 'text-white' : 'text-indigo-200'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < 1 && (
                  <div className={`h-1 w-24 mx-2 rounded transition-all duration-300 ${step.num < currentStep ? 'bg-indigo-600' : 'bg-white bg-opacity-30'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Step 1: Personal Details */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nationality</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country of Birth</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.countryOfBirth}
                      onChange={(e) => setFormData({ ...formData, countryOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Native Language</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.nativeLanguage}
                      onChange={(e) => setFormData({ ...formData, nativeLanguage: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Number</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name as per Passport</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.nameAsPerPassport}
                      onChange={(e) => setFormData({ ...formData, nameAsPerPassport: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Issue Location</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.passportIssueLocation}
                      onChange={(e) => setFormData({ ...formData, passportIssueLocation: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Issue Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.passportIssueDate}
                      onChange={(e) => setFormData({ ...formData, passportIssueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Expiry Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.passportExpiryDate}
                      onChange={(e) => setFormData({ ...formData, passportExpiryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Postal Code</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                </div>

                {/* Course Details Section */}
                <div className="bg-slate-50 p-6 rounded-lg mt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Course Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Program *</label>
                      <select
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.program}
                        onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                      >
                        <option value="">Select Program</option>
                        <option value="BS">BS - Bachelor of Science</option>
                        <option value="BBA">BBA - Bachelor of Business Administration</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Intake Year *</label>
                      <input
                        type="number"
                        required
                        placeholder="Enter intake year"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.intakeYear}
                        onChange={(e) => setFormData({ ...formData, intakeYear: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Education */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Education</h3>
                
                {/* School (10th Grade) */}
                <div className="bg-slate-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">School (10th Grade)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">School Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.school}
                        onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.schoolCountry}
                        onChange={(e) => setFormData({ ...formData, schoolCountry: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.schoolAddress}
                        onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.schoolStartDate}
                        onChange={(e) => setFormData({ ...formData, schoolStartDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.schoolEndDate}
                        onChange={(e) => setFormData({ ...formData, schoolEndDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Grade (in %)</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.schoolGrade}
                        onChange={(e) => setFormData({ ...formData, schoolGrade: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* High School (12th Grade) */}
                <div className="bg-slate-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">High School (12th Grade)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">High School Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchool}
                        onChange={(e) => setFormData({ ...formData, highSchool: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolCountry}
                        onChange={(e) => setFormData({ ...formData, highSchoolCountry: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolAddress}
                        onChange={(e) => setFormData({ ...formData, highSchoolAddress: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolStartDate}
                        onChange={(e) => setFormData({ ...formData, highSchoolStartDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolEndDate}
                        onChange={(e) => setFormData({ ...formData, highSchoolEndDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Grade (in %)</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolGrade}
                        onChange={(e) => setFormData({ ...formData, highSchoolGrade: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Bachelor's Degree */}
                <div className="bg-slate-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Bachelor&apos;s Degree</h4>
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Have you completed your Bachelor&apos;s?</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.bachelorsCompleted ? 'yes' : 'no'}
                      onChange={(e) => setFormData({ ...formData, bachelorsCompleted: e.target.value === 'yes' })}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  {formData.bachelorsCompleted && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bachelor&apos;s In</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsIn}
                        onChange={(e) => setFormData({ ...formData, bachelorsIn: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">From Institute</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsFromInstitute}
                        onChange={(e) => setFormData({ ...formData, bachelorsFromInstitute: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsCountry}
                        onChange={(e) => setFormData({ ...formData, bachelorsCountry: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsAddress}
                        onChange={(e) => setFormData({ ...formData, bachelorsAddress: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsStartDate}
                        onChange={(e) => setFormData({ ...formData, bachelorsStartDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsEndDate}
                        onChange={(e) => setFormData({ ...formData, bachelorsEndDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsGrade}
                        onChange={(e) => setFormData({ ...formData, bachelorsGrade: e.target.value })}
                      />
                    </div>
                  </div>
                  )}
                </div>

                {/* Test Scores */}
                <div className="bg-slate-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Test Scores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={formData.greTaken}
                          onChange={(e) => setFormData({ ...formData, greTaken: e.target.checked })}
                        />
                        GRE Taken
                      </label>
                      {formData.greTaken && (
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="GRE Score"
                          value={formData.greScore}
                          onChange={(e) => setFormData({ ...formData, greScore: e.target.value })}
                        />
                      )}
                    </div>
                    <div>
                      <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={formData.toeflTaken}
                          onChange={(e) => setFormData({ ...formData, toeflTaken: e.target.checked })}
                        />
                        TOEFL Taken
                      </label>
                      {formData.toeflTaken && (
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="TOEFL Score"
                          value={formData.toeflScore}
                          onChange={(e) => setFormData({ ...formData, toeflScore: e.target.value })}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Language Test</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.languageTest}
                        onChange={(e) => setFormData({ ...formData, languageTest: e.target.value })}
                      >
                        <option value="">Select Test</option>
                        <option value="IELTS">IELTS</option>
                        <option value="PTE">PTE</option>
                        <option value="Duolingo">Duolingo</option>
                      </select>
                    </div>
                    {formData.languageTest && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{formData.languageTest} Score</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Enter ${formData.languageTest} score`}
                          value={formData.languageTestScore}
                          onChange={(e) => setFormData({ ...formData, languageTestScore: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-indigo-500 hover:text-indigo-600'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 rounded-xl font-semibold transition-all flex items-center bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl"
                >
                  Next
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    <>
                      {isEditMode ? 'Update Profile' : 'Complete Profile'}
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
