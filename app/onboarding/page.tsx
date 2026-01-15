'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type WorkExperience = {
  id: string
  jobTitle: string
  organizationName: string
  organizationAddress: string
  organizationContact: string
  startDate: string
  endDate: string
  hasReference: string
  referenceName: string
  referencePosition: string
  referenceTitle: string
  referenceWorkEmail: string
  referenceDurationKnown: string
  referencePhone: string
  referenceRelationship: string
  referenceInstitution: string
  referenceInstitutionAddress: string
  certificateFile: File | null
  lorFile: File | null
  salarySlipFile: File | null
  referenceDocumentFile: File | null
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    email: '',
    phone: '',
    alternatePhone: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    program: 'BS',
    intakeYear: new Date().getFullYear(),
    previousEducation: '',
    previousInstitution: '',
    previousGrade: '',
  })
  const [hasWorkExperience, setHasWorkExperience] = useState<string>('')
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const totalSteps = 4

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
          dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
          gender: student.gender || '',
          nationality: student.nationality || '',
          email: student.email || '',
          phone: student.phone || '',
          alternatePhone: student.alternatePhone || '',
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || '',
          parentEmail: student.parentEmail || '',
          address: student.address || '',
          city: student.city || '',
          state: student.state || '',
          postalCode: student.postalCode || '',
          country: student.country || '',
          program: student.program || 'BS',
          intakeYear: student.intakeYear || new Date().getFullYear(),
          previousEducation: student.previousEducation || '',
          previousInstitution: student.previousInstitution || '',
          previousGrade: student.previousGrade || '',
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
    
    // If not on the final step, don't submit the form
    if (currentStep < totalSteps) {
      return
    }
    
    setError('')
    setLoading(true)

    try {
      const url = isEditMode ? '/api/student/profile' : '/api/student/onboarding'
      const method = isEditMode ? 'PUT' : 'POST'

      // Prepare work experiences data (without file objects)
      const workExperiencesData = workExperiences.map(exp => ({
        jobTitle: exp.jobTitle,
        organizationName: exp.organizationName,
        organizationAddress: exp.organizationAddress || undefined,
        organizationContact: exp.organizationContact || undefined,
        startDate: exp.startDate,
        endDate: exp.endDate,
        hasReference: exp.hasReference === 'yes',
        reference: exp.hasReference === 'yes' ? {
          name: exp.referenceName,
          position: exp.referencePosition,
          title: exp.referenceTitle || undefined,
          workEmail: exp.referenceWorkEmail,
          phone: exp.referencePhone,
          durationKnown: exp.referenceDurationKnown || undefined,
          relationship: exp.referenceRelationship || undefined,
          institution: exp.referenceInstitution || undefined,
          institutionAddress: exp.referenceInstitutionAddress || undefined,
        } : undefined,
      }))

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          intakeYear: parseInt(formData.intakeYear.toString()),
          hasWorkExperience: hasWorkExperience === 'yes',
          workExperiences: hasWorkExperience === 'yes' ? workExperiencesData : undefined,
        }),
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
    if (e) {
      e.preventDefault()
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Prevent Enter key from submitting form on steps 1 and 2
    if (e.key === 'Enter' && currentStep < totalSteps) {
      e.preventDefault()
      // If on a valid step and can proceed, move to next step
      if (canProceed()) {
        nextStep()
      }
    }
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.firstName && formData.lastName && formData.dateOfBirth && formData.nationality && formData.gender
    }
    if (currentStep === 2) {
      return formData.phone && formData.address && formData.parentName && formData.parentPhone && formData.parentEmail
    }
    if (currentStep === 3) {
      return true // Academic info is optional
    }
    if (currentStep === 4) {
      // If user selected "no" to work experience, they can proceed
      if (hasWorkExperience === 'no') return true
      // If user hasn't selected yet, can't proceed
      if (!hasWorkExperience) return false
      // If user selected "yes", check if they've added at least one work experience
      if (hasWorkExperience === 'yes' && workExperiences.length === 0) return false
      // Validate all work experiences
      return workExperiences.every(exp => {
        const basicValid = exp.jobTitle && exp.organizationName && exp.startDate && exp.endDate
        // If they have a reference, validate reference fields
        if (exp.hasReference === 'yes') {
          return basicValid && exp.referenceName && exp.referencePosition && exp.referenceWorkEmail && exp.referencePhone
        }
        return basicValid
      })
    }
    return true
  }

  // Convert date from YYYY-MM-DD to DD-MM-YYYY for display
  const formatDateForDisplay = (isoDate: string) => {
    if (!isoDate) return ''
    const [year, month, day] = isoDate.split('-')
    return `${day}-${month}-${year}`
  }

  // Convert date from DD-MM-YYYY to YYYY-MM-DD for storage
  const formatDateForStorage = (displayDate: string) => {
    if (!displayDate) return ''
    const [day, month, year] = displayDate.split('-')
    return `${year}-${month}-${day}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-2xl mb-6">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to VIIE ERP
          </h1>
          <p className="text-indigo-100 text-lg">
            Let&apos;s complete your profile to get started
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center max-w-3xl mx-auto">
            {[
              { num: 1, label: 'Personal Info' },
              { num: 2, label: 'Contact Details' },
              { num: 3, label: 'Academic Info' },
              { num: 4, label: 'Work Experience' }
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
                  <span className={`mt-3 text-sm font-medium whitespace-nowrap ${
                    step.num <= currentStep ? 'text-white' : 'text-indigo-200'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={`h-1 w-24 mx-2 rounded transition-all duration-300 ${
                    step.num < currentStep ? 'bg-indigo-600' : 'bg-white bg-opacity-30'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 animate-slide-up">
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="DD-MM-YYYY"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: DD-MM-YYYY</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nationality <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    >
                      <option value="">Select Nationality</option>
                      <option value="Indian">Indian</option>
                      <option value="British">British</option>
                      <option value="American">American</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Contact Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="+91 8692811341"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Alternate Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="+91 1234567890"
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      rows={3}
                      placeholder="Enter your complete address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="e.g. 400001"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="e.g. India"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Parent/Guardian Contact</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Parent/Guardian Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="e.g. John Doe"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Parent Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="+91 1234567890"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Parent Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="parent@example.com"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Academic Information */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Academic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Program <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    >
                      <option value="BS">BS</option>
                      <option value="BBA">BBA</option>
                      <option value="MS">MS</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Intake Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="2020"
                      max="2030"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={formData.intakeYear}
                      onChange={(e) => setFormData({ ...formData, intakeYear: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Previous Education</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Highest Qualification
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="e.g. High School, Bachelor's"
                        value={formData.previousEducation}
                        onChange={(e) => setFormData({ ...formData, previousEducation: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Institution Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="e.g. XYZ School/College"
                        value={formData.previousInstitution}
                        onChange={(e) => setFormData({ ...formData, previousInstitution: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Grade/Percentage
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="e.g. 85%, 3.5 GPA"
                        value={formData.previousGrade}
                        onChange={(e) => setFormData({ ...formData, previousGrade: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Work Experience & References */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Work Experience & References</h3>

                {/* Main Question */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Do you have any professional work experience? <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    value={hasWorkExperience}
                    onChange={(e) => {
                      setHasWorkExperience(e.target.value)
                      if (e.target.value === 'no') {
                        setWorkExperiences([])
                      }
                    }}
                  >
                    <option value="">Select an option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Work Experiences Section - Only show if "yes" */}
                {hasWorkExperience === 'yes' && (
                  <div className="space-y-6">
                    {workExperiences.map((experience, index) => (
                      <div key={experience.id} className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold text-indigo-700">Work Experience #{index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setWorkExperiences(workExperiences.filter((_, i) => i !== index))
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="space-y-4">
                          {/* Job Title and Organization */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Job Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter job title"
                                value={experience.jobTitle}
                                onChange={(e) => {
                                  const updated = [...workExperiences]
                                  updated[index].jobTitle = e.target.value
                                  setWorkExperiences(updated)
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Organization Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter organization name offering the job"
                                value={experience.organizationName}
                                onChange={(e) => {
                                  const updated = [...workExperiences]
                                  updated[index].organizationName = e.target.value
                                  setWorkExperiences(updated)
                                }}
                              />
                            </div>
                          </div>

                          {/* Organization Address and Contact */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Organization Address
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter organization location or city"
                                value={experience.organizationAddress}
                                onChange={(e) => {
                                  const updated = [...workExperiences]
                                  updated[index].organizationAddress = e.target.value
                                  setWorkExperiences(updated)
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Organization Phone or Contact
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter organization contact info"
                                value={experience.organizationContact}
                                onChange={(e) => {
                                  const updated = [...workExperiences]
                                  updated[index].organizationContact = e.target.value
                                  setWorkExperiences(updated)
                                }}
                              />
                            </div>
                          </div>

                          {/* Job Duration */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Job start date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={experience.startDate}
                                onChange={(e) => {
                                  const updated = [...workExperiences]
                                  updated[index].startDate = e.target.value
                                  setWorkExperiences(updated)
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Job end date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={experience.endDate}
                                onChange={(e) => {
                                  const updated = [...workExperiences]
                                  updated[index].endDate = e.target.value
                                  setWorkExperiences(updated)
                                }}
                              />
                            </div>
                          </div>

                            {/* Document Uploads */}
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Certificate (Optional)
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].certificateFile = e.target.files?.[0] || null
                                      setWorkExperiences(updated)
                                    }}
                                    className="w-full sm:flex-1 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                  />
                                </div>
                                {experience.certificateFile && (
                                  <p className="text-xs text-gray-600 mt-1">Selected: {experience.certificateFile.name}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Letter of Recommendation (Optional)
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].lorFile = e.target.files?.[0] || null
                                      setWorkExperiences(updated)
                                    }}
                                    className="w-full sm:flex-1 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                  />
                                </div>
                                {experience.lorFile && (
                                  <p className="text-xs text-gray-600 mt-1">Selected: {experience.lorFile.name}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Salary Slip (Optional)
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].salarySlipFile = e.target.files?.[0] || null
                                      setWorkExperiences(updated)
                                    }}
                                    className="w-full sm:flex-1 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                  />
                                </div>
                                {experience.salarySlipFile && (
                                  <p className="text-xs text-gray-600 mt-1">Selected: {experience.salarySlipFile.name}</p>
                                )}
                              </div>
                            </div>

                          {/* Reference Question */}
                          <div className="pt-4 border-t border-gray-300">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Do you have a reference from this organization? <span className="text-red-500">*</span>
                            </label>
                            <select
                              required
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={experience.hasReference}
                              onChange={(e) => {
                                const updated = [...workExperiences]
                                updated[index].hasReference = e.target.value
                                if (e.target.value === 'no') {
                                  // Clear reference fields
                                  updated[index].referenceName = ''
                                  updated[index].referencePosition = ''
                                  updated[index].referenceTitle = ''
                                  updated[index].referenceWorkEmail = ''
                                  updated[index].referenceDurationKnown = ''
                                  updated[index].referencePhone = ''
                                  updated[index].referenceRelationship = ''
                                  updated[index].referenceInstitution = ''
                                  updated[index].referenceInstitutionAddress = ''
                                  updated[index].referenceDocumentFile = null
                                }
                                setWorkExperiences(updated)
                              }}
                            >
                              <option value="">Select an option</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>

                          {/* Reference Details - Only show if "yes" */}
                          {experience.hasReference === 'yes' && (
                            <div className="bg-white rounded-lg p-5 space-y-4 border border-indigo-200">
                              <h5 className="text-md font-semibold text-indigo-700 mb-3">Reference Details</h5>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter reference name"
                                    value={experience.referenceName}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referenceName = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Position <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter reference position"
                                    value={experience.referencePosition}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referencePosition = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter reference title"
                                    value={experience.referenceTitle}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referenceTitle = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Work Email <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter reference work email"
                                    value={experience.referenceWorkEmail}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referenceWorkEmail = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Duration Known
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter duration known"
                                    value={experience.referenceDurationKnown}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referenceDurationKnown = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Phone <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="tel"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter reference phone"
                                    value={experience.referencePhone}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referencePhone = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Relationship
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter relationship"
                                    value={experience.referenceRelationship}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referenceRelationship = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Institution
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter institution"
                                    value={experience.referenceInstitution}
                                    onChange={(e) => {
                                      const updated = [...workExperiences]
                                      updated[index].referenceInstitution = e.target.value
                                      setWorkExperiences(updated)
                                    }}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Institution Address
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Enter institution address"
                                  value={experience.referenceInstitutionAddress}
                                  onChange={(e) => {
                                    const updated = [...workExperiences]
                                    updated[index].referenceInstitutionAddress = e.target.value
                                    setWorkExperiences(updated)
                                  }}
                                />
                              </div>

                              {/* Reference Document Upload */}
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Reference Document (Optional)
                                </label>
                                <div className="flex items-center gap-3">
                                  <label className="cursor-pointer px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200 text-sm font-semibold">
                                    Browse...
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                      onChange={(e) => {
                                        const updated = [...workExperiences]
                                        updated[index].referenceDocumentFile = e.target.files?.[0] || null
                                        setWorkExperiences(updated)
                                      }}
                                    />
                                  </label>
                                  <span className="text-sm text-gray-600">
                                    {experience.referenceDocumentFile ? experience.referenceDocumentFile.name : 'No file selected.'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Work Experience Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setWorkExperiences([
                          ...workExperiences,
                          {
                            id: Date.now().toString(),
                            jobTitle: '',
                            organizationName: '',
                            organizationAddress: '',
                            organizationContact: '',
                            startDate: '',
                            endDate: '',
                            hasReference: '',
                            referenceName: '',
                            referencePosition: '',
                            referenceTitle: '',
                            referenceWorkEmail: '',
                            referenceDurationKnown: '',
                            referencePhone: '',
                            referenceRelationship: '',
                            referenceInstitution: '',
                            referenceInstitutionAddress: '',
                            certificateFile: null,
                            lorFile: null,
                            salarySlipFile: null,
                            referenceDocumentFile: null,
                          },
                        ])
                      }}
                      className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Work Experience
                    </button>
                  </div>
                )}
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
                  disabled={!canProceed()}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center ${
                    canProceed()
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
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
