'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneInput } from 'react-international-phone'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

// Helper function to format DD/MM/YYYY
const formatDateToDDMMYYYY = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Helper function to convert DD/MM/YYYY to YYYY-MM-DD for input
const convertDDMMYYYYtoYYYYMMDD = (ddmmyyyy: string) => {
  if (!ddmmyyyy || !ddmmyyyy.includes('/')) return ''
  const parts = ddmmyyyy.split('/')
  if (parts.length !== 3) return ''
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

// Helper function to convert YYYY-MM-DD to DD/MM/YYYY
const convertYYYYMMDDtoDDMMYYYY = (yyyymmdd: string) => {
  if (!yyyymmdd) return ''
  const parts = yyyymmdd.split('-')
  if (parts.length !== 3) return ''
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// Validate age (must be at least 15 years old)
const validateAge = (dateOfBirth: string): string | null => {
  if (!dateOfBirth) return null
  
  // Parse DD/MM/YYYY format
  const parts = dateOfBirth.split('/')
  if (parts.length !== 3) {
    return 'Please use DD/MM/YYYY format'
  }
  
  const day = parseInt(parts[0])
  const month = parseInt(parts[1])
  const year = parseInt(parts[2])
  
  // Validate date components
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return 'Invalid date'
  }
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
    return 'Invalid date'
  }
  
  // Create date object (month is 0-indexed in JS)
  const dob = new Date(year, month - 1, day)
  const today = new Date()
  
  // Check if date is in the future
  if (dob > today) {
    return 'Date of birth cannot be in the future'
  }
  
  // Calculate age
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  
  if (age < 15) {
    return 'You must be at least 15 years old'
  }
  
  return null
}

// Validate passport number (8-12 alphanumeric characters)
const validatePassportNumber = (passport: string): string | null => {
  if (!passport) return null
  
  const passportRegex = /^[A-Z0-9]{8,12}$/i
  if (!passportRegex.test(passport)) {
    return 'Passport must be 8-12 alphanumeric characters'
  }
  
  return null
}

// Validate phone number using libphonenumber-js
const validatePhoneNumberField = (phone: string): string | null => {
  if (!phone) return null
  
  // Phone must be in E.164 format (starting with +)
  if (!phone.startsWith('+')) {
    return 'Phone number must include country code'
  }
  
  try {
    if (!isValidPhoneNumber(phone)) {
      return 'Invalid phone number'
    }
    return null
  } catch (error) {
    return 'Invalid phone number format'
  }
}

// Format date input as DD/MM/YYYY with proper backspace support and month validation
const formatDateInput = (value: string, prevValue: string): string => {
  // Remove all non-digits
  const digits = value.replace(/[^0-9]/g, '')
  
  // Handle backspace - if new value has fewer digits, just format what's there
  if (digits.length === 0) return ''
  if (digits.length === 1) return digits
  if (digits.length === 2) return digits + '/'
  if (digits.length <= 4) {
    // Validate month when user enters it
    const month = digits.slice(2, 4)
    if (month.length === 2) {
      const monthNum = parseInt(month)
      if (monthNum > 12 || monthNum < 1) {
        // Invalid month, don't allow it
        return digits.slice(0, 2) + '/' + digits.slice(2, 3)
      }
      // Auto-add slash after month
      return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/'
    }
    return digits.slice(0, 2) + '/' + digits.slice(2)
  }
  // Validate month in full date
  const month = digits.slice(2, 4)
  const monthNum = parseInt(month)
  if (monthNum > 12 || monthNum < 1) {
    return digits.slice(0, 2) + '/' + digits.slice(2, 3)
  }
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8)
}

// Validate date format and month range
const validateDateFormat = (dateString: string): string | null => {
  if (!dateString) return null
  const parts = dateString.split('/')
  if (parts.length !== 3) return 'Please use DD/MM/YYYY format'
  
  const day = parseInt(parts[0])
  const month = parseInt(parts[1])
  const year = parseInt(parts[2])
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Invalid date'
  if (day < 1 || day > 31) return 'Invalid day'
  if (month < 1 || month > 12) return 'Month must be between 01 and 12'
  if (year < 1900 || year > 2100) return 'Invalid year'
  
  return null
}

// Validate passport expiry date (must be within 10 years of issue date)
const validatePassportDates = (issueDate: string, expiryDate: string): string | null => {
  if (!issueDate || !expiryDate) return null
  
  const issueParts = issueDate.split('/')
  const expiryParts = expiryDate.split('/')
  
  if (issueParts.length !== 3 || expiryParts.length !== 3) return null
  
  const issue = new Date(parseInt(issueParts[2]), parseInt(issueParts[1]) - 1, parseInt(issueParts[0]))
  const expiry = new Date(parseInt(expiryParts[2]), parseInt(expiryParts[1]) - 1, parseInt(expiryParts[0]))
  
  // Check if expiry is before issue
  if (expiry <= issue) {
    return 'Passport expiry date must be after issue date'
  }
  
  // Calculate difference in years
  const yearsDiff = (expiry.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  
  if (yearsDiff > 10) {
    return 'Passport validity cannot exceed 10 years'
  }
  
  return null
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Refs to track previous phone values to prevent country code deletion
  const phoneRef = useRef('')
  const parentPhoneRef = useRef('')
  
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
    passportGivenName: '',
    passportLastName: '',
    passportIssueLocation: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    address: '',
    postalCode: '',
    // Parent/Guardian Details
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelation: '',
    parentRelationOther: '',
    // Education Details
    school: '',
    schoolCountry: '',
    schoolAddress: '',
    schoolStartYear: '',
    schoolEndYear: '',
    schoolGrade: '',
    highSchool: '',
    highSchoolCountry: '',
    highSchoolAddress: '',
    highSchoolStartYear: '',
    highSchoolEndYear: '',
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
    languageTestDate: '',
    program: '',
    intakeYear: new Date().getFullYear().toString(),
    bachelorsCompleted: undefined as boolean | undefined,
  })
  
  // File uploads state
  const [marksheet10th, setMarksheet10th] = useState<File | null>(null)
  const [marksheet12th, setMarksheet12th] = useState<File | null>(null)
  const [ieltsScorecard, setIeltsScorecard] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [languageTestScorecard, setLanguageTestScorecard] = useState<File | null>(null)
  
  // Error states - field-level errors
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  
  // Ref for scrolling to errors
  const formRef = useRef<HTMLDivElement>(null)

  const totalSteps = 2

  useEffect(() => {
    loadProfile()
  }, [])
  
  // Sync refs with phone values to track country codes
  useEffect(() => {
    if (formData.phone) {
      phoneRef.current = formData.phone
    }
    if (formData.parentPhone) {
      parentPhoneRef.current = formData.parentPhone
    }
  }, [formData.phone, formData.parentPhone])

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
          dateOfBirth: student.dateOfBirth ? (() => {
            const date = new Date(student.dateOfBirth)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })() : '',
          gender: student.gender || '',
          nationality: student.nationality || '',
          countryOfBirth: student.countryOfBirth || '',
          nativeLanguage: student.nativeLanguage || '',
          passportNumber: student.passportNumber || '',
          passportGivenName: student.passportGivenName || '',
          passportLastName: student.passportLastName || '',
          passportIssueLocation: student.passportIssueLocation || '',
          passportIssueDate: student.passportIssueDate ? (() => {
            const date = new Date(student.passportIssueDate)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })() : '',
          passportExpiryDate: student.passportExpiryDate ? (() => {
            const date = new Date(student.passportExpiryDate)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })() : '',
          address: student.address || '',
          postalCode: student.postalCode || '',
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || '',
          parentEmail: student.parentEmail || '',
          parentRelation: student.parentRelation && student.parentRelation !== 'Other' ? student.parentRelation : (student.parentRelation ? 'Other' : ''),
          parentRelationOther: student.parentRelation && !['Father', 'Mother'].includes(student.parentRelation) ? student.parentRelation : '',
          school: student.school || '',
          schoolCountry: student.schoolCountry || '',
          schoolAddress: student.schoolAddress || '',
          schoolStartYear: student.schoolStartYear?.toString() || '',
          schoolEndYear: student.schoolEndYear?.toString() || '',
          schoolGrade: student.schoolGrade || '',
          highSchool: student.highSchool || '',
          highSchoolCountry: student.highSchoolCountry || '',
          highSchoolAddress: student.highSchoolAddress || '',
          highSchoolStartYear: student.highSchoolStartYear?.toString() || '',
          highSchoolEndYear: student.highSchoolEndYear?.toString() || '',
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
          languageTestDate: student.languageTestDate ? (() => {
            const date = new Date(student.languageTestDate)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })() : '',
          program: student.program || '',
          intakeYear: student.intakeYear?.toString() || '',
          bachelorsCompleted: student.bachelorsCompleted,
        })
      }
    } catch (err) {
      // Profile doesn't exist yet, continue with onboarding
    } finally {
      setInitialLoading(false)
    }
  }

  const validateStep = (step: number): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (step === 1) {
      // Validate required fields
      if (!formData.firstName.trim()) errors.firstName = 'First name is required'
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required'
      if (!formData.phone.trim()) {
        errors.phone = 'Phone number is required'
      } else {
        const phoneError = validatePhoneNumberField(formData.phone)
        if (phoneError) errors.phone = phoneError
      }
      if (!formData.dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required'
      } else {
        const ageError = validateAge(formData.dateOfBirth)
        if (ageError) errors.dateOfBirth = ageError
      }
      if (!formData.gender) errors.gender = 'Gender is required'
      
      // Validate address - MANDATORY
      if (!formData.address.trim()) {
        errors.address = 'Address is required'
      }
      
      // Validate passport if provided
      if (formData.passportNumber) {
        const passportError = validatePassportNumber(formData.passportNumber)
        if (passportError) errors.passportNumber = passportError
      }
      
      // Validate passport dates if both are provided
      if (formData.passportIssueDate && formData.passportExpiryDate) {
        const passportDateError = validatePassportDates(formData.passportIssueDate, formData.passportExpiryDate)
        if (passportDateError) errors.passportExpiryDate = passportDateError
      }
      
      // Validate parent/guardian phone - MANDATORY
      if (!formData.parentPhone.trim()) {
        errors.parentPhone = 'Parent/Guardian phone number is required'
      } else {
        const parentPhoneError = validatePhoneNumberField(formData.parentPhone)
        if (parentPhoneError) errors.parentPhone = parentPhoneError
      }
      
      // Validate parent/guardian email - MANDATORY
      if (!formData.parentEmail.trim()) {
        errors.parentEmail = 'Parent/Guardian email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
        errors.parentEmail = 'Please enter a valid email address'
      }
      
      // Validate parent/guardian relation - MANDATORY if name or phone provided
      if ((formData.parentName || formData.parentPhone) && !formData.parentRelation) {
        errors.parentRelation = 'Please select the relation'
      }
      
      // Validate "Other" relation text field
      if (formData.parentRelation === 'Other' && !formData.parentRelationOther.trim()) {
        errors.parentRelationOther = 'Please specify the relation'
      }
      
      // Validate program and intake year
      if (!formData.program) errors.program = 'Program is required'
      if (!formData.intakeYear) errors.intakeYear = 'Intake year is required'
    }
    
    if (step === 2) {
      // Validate required education documents
      if (!marksheet10th) {
        errors.marksheet10th = '10th Grade Marksheet is required'
      }
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const scrollToFirstError = () => {
    // Small delay to allow error states to render
    setTimeout(() => {
      const firstErrorElement = document.querySelector('.error-message')
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (currentStep < totalSteps) {
      return
    }
    
    // Final validation
    if (!validateStep(1)) {
      setCurrentStep(1)
      scrollToFirstError()
      setError('Please fix the errors in the form')
      return
    }
    
    setError('')
    setLoading(true)

    try {
      const url = isEditMode ? '/api/student/profile' : '/api/student/onboarding'
      const method = isEditMode ? 'PUT' : 'POST'

      // Check if we have actual files to upload
      const hasFiles = (marksheet10th instanceof File) || (marksheet12th instanceof File) || (ieltsScorecard instanceof File) || (passportFile instanceof File) || (languageTestScorecard instanceof File)
      console.log('Has files to upload:', hasFiles)
      
      let payload: any
      let headers: any = {}
      
      // Convert DD/MM/YYYY to ISO format for API
      const convertedFormData: any = { ...formData }
      
      // Handle parent relation - use custom value if "Other" is selected
      if (convertedFormData.parentRelation === 'Other' && convertedFormData.parentRelationOther) {
        convertedFormData.parentRelation = convertedFormData.parentRelationOther
      }
      // Remove the temporary field
      delete convertedFormData.parentRelationOther
      
      // Helper function to safely convert DD/MM/YYYY to YYYY-MM-DD
      const safeDateConvert = (dateStr: string): string | undefined => {
        if (!dateStr || !dateStr.includes('/') || dateStr.trim() === '') return undefined
        const parts = dateStr.split('/')
        if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
          return undefined // Invalid format, return undefined so it gets filtered out
        }
        // Additional validation - check if parts are valid numbers
        const day = parseInt(parts[0])
        const month = parseInt(parts[1])
        const year = parseInt(parts[2])
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
          return undefined
        }
        return `${parts[2]}-${parts[1]}-${parts[0]}`
      }
      
      // Convert all DD/MM/YYYY dates to YYYY-MM-DD
      const convertedDob = safeDateConvert(formData.dateOfBirth)
      if (convertedDob) {
        convertedFormData.dateOfBirth = convertedDob
      } else {
        delete convertedFormData.dateOfBirth
      }
      
      const convertedPassportIssue = safeDateConvert(formData.passportIssueDate)
      if (convertedPassportIssue) {
        convertedFormData.passportIssueDate = convertedPassportIssue
      } else {
        delete convertedFormData.passportIssueDate
      }
      
      const convertedPassportExpiry = safeDateConvert(formData.passportExpiryDate)
      if (convertedPassportExpiry) {
        convertedFormData.passportExpiryDate = convertedPassportExpiry
      } else {
        delete convertedFormData.passportExpiryDate
      }
      
      const convertedLanguageTestDate = safeDateConvert(formData.languageTestDate)
      if (convertedLanguageTestDate) {
        convertedFormData.languageTestDate = convertedLanguageTestDate
      } else {
        delete convertedFormData.languageTestDate
      }
      
      // Bachelor dates are already in YYYY-MM-DD format from date inputs
      // Just validate they're not empty before including them
      if (!formData.bachelorsStartDate || formData.bachelorsStartDate.trim() === '') {
        delete convertedFormData.bachelorsStartDate
      }
      if (!formData.bachelorsEndDate || formData.bachelorsEndDate.trim() === '') {
        delete convertedFormData.bachelorsEndDate
      }
      
      if (hasFiles) {
        // Use FormData for multipart upload
        const formDataObj = new FormData()
        
        // Add all form fields
        Object.entries(convertedFormData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            formDataObj.append(key, value.toString())
          }
        })
        
        // Add files
        if (marksheet10th) formDataObj.append('marksheet10th', marksheet10th)
        if (marksheet12th) formDataObj.append('marksheet12th', marksheet12th)
        if (ieltsScorecard) formDataObj.append('ieltsScorecard', ieltsScorecard)
        if (passportFile) formDataObj.append('passport', passportFile)
        if (languageTestScorecard) formDataObj.append('languageTestScorecard', languageTestScorecard)
        
        payload = formDataObj
        // Don't set Content-Type, browser will set it with boundary
      } else {
        // Regular JSON payload
        payload = {
          ...convertedFormData,
        }
        
        // Convert intakeYear to number if it's not empty
        if (convertedFormData.intakeYear && convertedFormData.intakeYear !== '') {
          payload.intakeYear = parseInt(formData.intakeYear.toString())
        }
        
        // Convert year strings to numbers
        if (formData.schoolStartYear && formData.schoolStartYear !== '') {
          payload.schoolStartYear = parseInt(formData.schoolStartYear)
        }
        if (formData.schoolEndYear && formData.schoolEndYear !== '') {
          payload.schoolEndYear = parseInt(formData.schoolEndYear)
        }
        if (formData.highSchoolStartYear && formData.highSchoolStartYear !== '') {
          payload.highSchoolStartYear = parseInt(formData.highSchoolStartYear)
        }
        if (formData.highSchoolEndYear && formData.highSchoolEndYear !== '') {
          payload.highSchoolEndYear = parseInt(formData.highSchoolEndYear)
        }
        
        // Remove undefined, empty string, null values, and invalid entries
        Object.keys(payload).forEach(key => {
          const value = payload[key]
          // Remove if undefined, null, empty string
          if (value === undefined || value === null || value === '') {
            delete payload[key]
            return
          }
          // Remove if it's a string with only whitespace or special chars like "-"
          if (typeof value === 'string') {
            const trimmed = value.trim()
            if (trimmed === '' || trimmed === '-' || trimmed === '/' || trimmed === '--') {
              delete payload[key]
              return
            }
          }
          // Remove if it's NaN
          if (typeof value === 'number' && isNaN(value)) {
            delete payload[key]
          }
        })
        
        console.log('Payload before stringify:', payload)
        headers['Content-Type'] = 'application/json'
        payload = JSON.stringify(payload)
        console.log('Payload after stringify:', payload)
      }

      const res = await fetch(url, {
        method,
        headers,
        body: payload,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || (isEditMode ? 'Update failed' : 'Onboarding failed'))
        scrollToFirstError()
        return
      }

      // Only navigate on success
      router.push('/dashboard')
    } catch (err) {
      setError('An error occurred. Please try again.')
      scrollToFirstError()
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
    
    // Validate current step before moving forward
    if (!validateStep(currentStep)) {
      scrollToFirstError()
      return
    }
    
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }
  
  // Helper to generate year options
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year >= 1990; year--) {
      years.push(year)
    }
    return years
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-5xl w-full" ref={formRef}>
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
                      className={`w-full px-4 py-3 border ${fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.firstName}
                      onChange={(e) => {
                        setFormData({ ...formData, firstName: e.target.value })
                        if (fieldErrors.firstName) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.firstName
                          setFieldErrors(newErrors)
                        }
                      }}
                    />
                    {fieldErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      required
                      className={`w-full px-4 py-3 border ${fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.lastName}
                      onChange={(e) => {
                        setFormData({ ...formData, lastName: e.target.value })
                        if (fieldErrors.lastName) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.lastName
                          setFieldErrors(newErrors)
                        }
                      }}
                    />
                    {fieldErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.lastName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                    <PhoneInput
                      defaultCountry="in"
                      forceDialCode
                      value={formData.phone}
                      onChange={(phone) => {
                        // Get the current country code from the value or default
                        const currentValue = formData.phone || '+91'
                        const currentCountryCode = currentValue.match(/^\+\d{1,4}/)?.[0] || '+91'
                        
                        // If the new value doesn't include the current country code, reject it
                        if (!phone.startsWith(currentCountryCode)) {
                          // Only allow if it's a valid country change (starts with + and has digits)
                          const newCountryCode = phone.match(/^\+\d{1,4}/)?.[0]
                          if (!newCountryCode || newCountryCode.length < currentCountryCode.length) {
                            // User is trying to delete the country code - reject
                            return
                          }
                        }
                        
                        // Ensure phone always starts with +
                        if (!phone.startsWith('+')) {
                          return
                        }
                        
                        // Ensure minimum length (at least country code)
                        if (phone.length < 2) {
                          return
                        }
                        
                        // Update the ref
                        phoneRef.current = phone
                        
                        // Store in E.164 format
                        setFormData({ ...formData, phone })
                        // Clear error when user types
                        if (fieldErrors.phone) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.phone
                          setFieldErrors(newErrors)
                        }
                      }}
                      countrySelectorStyleProps={{
                        buttonClassName: `px-3 py-3 border ${fieldErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-l-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`,
                        buttonStyle: {
                          height: '48px',
                        }
                      }}
                      inputStyle={{
                        height: '48px',
                        fontSize: '16px',
                        borderTopLeftRadius: '0',
                        borderBottomLeftRadius: '0',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        border: fieldErrors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderLeft: 'none',
                        borderTopRightRadius: '12px',
                        borderBottomRightRadius: '12px',
                      }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      International format (e.g., +1 for US, +44 for UK, +91 for India)
                    </p>
                    {fieldErrors.phone && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth * (DD/MM/YYYY)</label>
                    <input
                      type="text"
                      required
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                      className={`w-full px-4 py-3 border ${fieldErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.dateOfBirth}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value, formData.dateOfBirth)
                        setFormData({ ...formData, dateOfBirth: formatted })
                        if (fieldErrors.dateOfBirth) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.dateOfBirth
                          setFieldErrors(newErrors)
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const parts = e.target.value.split('/')
                          if (parts.length === 3) {
                            const day = parseInt(parts[0])
                            const month = parseInt(parts[1])
                            const year = parseInt(parts[2])
                            if (day > 31 || month > 12 || year < 1900) {
                              setFieldErrors({ ...fieldErrors, dateOfBirth: 'Invalid date format' })
                            }
                          }
                        }
                      }}
                    />
                    {fieldErrors.dateOfBirth && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.dateOfBirth}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                    <select
                      required
                      className={`w-full px-4 py-3 border ${fieldErrors.gender ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData({ ...formData, gender: e.target.value })
                        if (fieldErrors.gender) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.gender
                          setFieldErrors(newErrors)
                        }
                      }}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {fieldErrors.gender && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.gender}</p>
                    )}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Number (8-12 alphanumeric)</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 border ${fieldErrors.passportNumber ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.passportNumber}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase()
                        setFormData({ ...formData, passportNumber: value })
                        if (fieldErrors.passportNumber) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.passportNumber
                          setFieldErrors(newErrors)
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const passportError = validatePassportNumber(e.target.value)
                          if (passportError) {
                            setFieldErrors({ ...fieldErrors, passportNumber: passportError })
                          }
                        }
                      }}
                    />
                    {fieldErrors.passportNumber && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.passportNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Given Name on Passport</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.passportGivenName}
                      onChange={(e) => setFormData({ ...formData, passportGivenName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name on Passport</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.passportLastName}
                      onChange={(e) => setFormData({ ...formData, passportLastName: e.target.value })}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Issue Date (DD/MM/YYYY)</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.passportIssueDate}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value, formData.passportIssueDate)
                        setFormData({ ...formData, passportIssueDate: formatted })
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Expiry Date (DD/MM/YYYY)</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                      className={`w-full px-4 py-3 border ${fieldErrors.passportExpiryDate ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.passportExpiryDate}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value, formData.passportExpiryDate)
                        setFormData({ ...formData, passportExpiryDate: formatted })
                        if (fieldErrors.passportExpiryDate) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.passportExpiryDate
                          setFieldErrors(newErrors)
                        }
                      }}
                    />
                    {fieldErrors.passportExpiryDate && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.passportExpiryDate}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Document (PDF only)</label>
                    <input
                      type="file"
                      accept=".pdf"
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        fieldErrors.passportFile ? 'border-red-500' : 'border-gray-300'
                      }`}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file && file.type !== 'application/pdf') {
                          setFieldErrors({ ...fieldErrors, passportFile: 'Only PDF files are allowed' })
                          setPassportFile(null)
                          e.target.value = ''
                        } else {
                          setPassportFile(file)
                          if (fieldErrors.passportFile) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.passportFile
                            setFieldErrors(newErrors)
                          }
                        }
                      }}
                    />
                    {passportFile && (
                      <p className="mt-1 text-sm text-green-600">Selected: {passportFile.name}</p>
                    )}
                    {fieldErrors.passportFile && (
                      <p className="error-message mt-1 text-sm text-red-600">{fieldErrors.passportFile}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Address *</label>
                    <textarea
                      rows={3}
                      required
                      className={`w-full px-4 py-3 border ${fieldErrors.address ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      placeholder="Enter your complete address with street, city, state, etc."
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value })
                        if (fieldErrors.address) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.address
                          setFieldErrors(newErrors)
                        }
                      }}
                    />
                    {fieldErrors.address && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.address}</p>
                    )}
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

                {/* Parent/Guardian Contact Section */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl mt-6 border border-indigo-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Parent/Guardian Contact *</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Parent/Guardian Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Relation *</label>
                      <select
                        className={`w-full px-4 py-3 border ${fieldErrors.parentRelation ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white`}
                        value={formData.parentRelation}
                        onChange={(e) => {
                          setFormData({ ...formData, parentRelation: e.target.value, parentRelationOther: e.target.value === 'Other' ? formData.parentRelationOther : '' })
                          if (fieldErrors.parentRelation) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.parentRelation
                            setFieldErrors(newErrors)
                          }
                        }}
                      >
                        <option value="">Select Relation</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Other">Other (Please Specify)</option>
                      </select>
                      {fieldErrors.parentRelation && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.parentRelation}</p>
                      )}
                    </div>
                    {formData.parentRelation === 'Other' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Please Specify Relation *</label>
                        <input
                          type="text"
                          className={`w-full px-4 py-3 border ${fieldErrors.parentRelationOther ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white`}
                          placeholder="e.g., Guardian, Uncle, Aunt, etc."
                          value={formData.parentRelationOther}
                          onChange={(e) => {
                            setFormData({ ...formData, parentRelationOther: e.target.value })
                            if (fieldErrors.parentRelationOther) {
                              const newErrors = { ...fieldErrors }
                              delete newErrors.parentRelationOther
                              setFieldErrors(newErrors)
                            }
                          }}
                        />
                        {fieldErrors.parentRelationOther && (
                          <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.parentRelationOther}</p>
                        )}
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Parent/Guardian Phone Number *</label>
                      <PhoneInput
                        defaultCountry="in"
                        forceDialCode
                        value={formData.parentPhone}
                        onChange={(phone) => {
                          const currentValue = formData.parentPhone || '+91'
                          const currentCountryCode = currentValue.match(/^\+\d{1,4}/)?.[0] || '+91'
                          
                          if (!phone.startsWith(currentCountryCode)) {
                            const newCountryCode = phone.match(/^\+\d{1,4}/)?.[0]
                            if (!newCountryCode || newCountryCode.length < currentCountryCode.length) {
                              return
                            }
                          }
                          
                          if (!phone.startsWith('+')) {
                            return
                          }
                          
                          if (phone.length < 2) {
                            return
                          }
                          
                          parentPhoneRef.current = phone
                          
                          setFormData({ ...formData, parentPhone: phone })
                          if (fieldErrors.parentPhone) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.parentPhone
                            setFieldErrors(newErrors)
                          }
                        }}
                        countrySelectorStyleProps={{
                          buttonClassName: `px-3 py-3 border ${fieldErrors.parentPhone ? 'border-red-500' : 'border-gray-300'} rounded-l-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white`,
                          buttonStyle: {
                            height: '48px',
                            backgroundColor: 'white',
                          }
                        }}
                        inputStyle={{
                          height: '48px',
                          fontSize: '16px',
                          borderTopLeftRadius: '0',
                          borderBottomLeftRadius: '0',
                          paddingLeft: '16px',
                          paddingRight: '16px',
                          backgroundColor: 'white',
                          border: fieldErrors.parentPhone ? '1px solid #ef4444' : '1px solid #d1d5db',
                          borderLeft: 'none',
                          borderTopRightRadius: '12px',
                          borderBottomRightRadius: '12px',
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        International format (e.g., +1 for US, +44 for UK, +91 for India)
                      </p>
                      {fieldErrors.parentPhone && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.parentPhone}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Parent/Guardian Email *</label>
                      <input
                        type="email"
                        required
                        className={`w-full px-4 py-3 border ${fieldErrors.parentEmail ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white`}
                        value={formData.parentEmail}
                        onChange={(e) => {
                          setFormData({ ...formData, parentEmail: e.target.value })
                          if (fieldErrors.parentEmail) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.parentEmail
                            setFieldErrors(newErrors)
                          }
                        }}
                      />
                      {fieldErrors.parentEmail && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.parentEmail}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Course Details Section */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl mt-6 border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Course Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Program *</label>
                      <select
                        required
                        className={`w-full px-4 py-3 border ${fieldErrors.program ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        value={formData.program}
                        onChange={(e) => {
                          setFormData({ ...formData, program: e.target.value })
                          if (fieldErrors.program) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.program
                            setFieldErrors(newErrors)
                          }
                        }}
                      >
                        <option value="">Select Program</option>
                        <option value="BS">BS - Bachelor of Science</option>
                        <option value="BBA">BBA - Bachelor of Business Administration</option>
                      </select>
                      {fieldErrors.program && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.program}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Intake Year *</label>
                      <input
                        type="number"
                        required
                        readOnly
                        placeholder="Enter intake year"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 cursor-not-allowed focus:outline-none"
                        value={formData.intakeYear || new Date().getFullYear()}
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.schoolStartYear}
                        onChange={(e) => setFormData({ ...formData, schoolStartYear: e.target.value })}
                      >
                        <option value="">Select Year</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Year</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.schoolEndYear}
                        onChange={(e) => setFormData({ ...formData, schoolEndYear: e.target.value })}
                      >
                        <option value="">Select Year</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
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
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        10th Grade Marksheet <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.marksheet10th ? 'border-red-500' : 'border-gray-300'
                        }`}
                        onChange={(e) => setMarksheet10th(e.target.files?.[0] || null)}
                      />
                      {marksheet10th && (
                        <p className="mt-1 text-sm text-green-600">Selected: {marksheet10th.name}</p>
                      )}
                      {fieldErrors.marksheet10th && (
                        <p className="error-message mt-1 text-sm text-red-600">{fieldErrors.marksheet10th}</p>
                      )}
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolStartYear}
                        onChange={(e) => setFormData({ ...formData, highSchoolStartYear: e.target.value })}
                      >
                        <option value="">Select Year</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Year</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolEndYear}
                        onChange={(e) => setFormData({ ...formData, highSchoolEndYear: e.target.value })}
                      >
                        <option value="">Select Year</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
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
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">12th Grade Marksheet</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onChange={(e) => setMarksheet12th(e.target.files?.[0] || null)}
                      />
                      {marksheet12th && (
                        <p className="mt-1 text-sm text-green-600">Selected: {marksheet12th.name}</p>
                      )}
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date (DD/MM/YYYY)</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsStartDate}
                        onChange={(e) => setFormData({ ...formData, bachelorsStartDate: e.target.value })}
                      />
                      {formData.bachelorsStartDate && (
                        <p className="mt-1 text-xs text-gray-600">
                          Display: {convertYYYYMMDDtoDDMMYYYY(formData.bachelorsStartDate)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Date (DD/MM/YYYY)</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.bachelorsEndDate}
                        onChange={(e) => setFormData({ ...formData, bachelorsEndDate: e.target.value })}
                      />
                      {formData.bachelorsEndDate && (
                        <p className="mt-1 text-xs text-gray-600">
                          Display: {convertYYYYMMDDtoDDMMYYYY(formData.bachelorsEndDate)}
                        </p>
                      )}
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">English Proficiency Test</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.languageTest}
                        onChange={(e) => setFormData({ ...formData, languageTest: e.target.value })}
                      >
                        <option value="">None / Not Taken</option>
                        <option value="IELTS">IELTS</option>
                        <option value="PTE">PTE</option>
                        <option value="Duolingo">Duolingo</option>
                      </select>
                    </div>
                    {formData.languageTest && (
                      <>
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Test Date (DD/MM/YYYY)</label>
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.languageTestDate}
                            onChange={(e) => {
                              const formatted = formatDateInput(e.target.value, formData.languageTestDate)
                              setFormData({ ...formData, languageTestDate: formatted })
                            }}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {formData.languageTest} Scorecard/Certificate
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => setLanguageTestScorecard(e.target.files?.[0] || null)}
                          />
                          {languageTestScorecard && (
                            <p className="mt-1 text-sm text-green-600">Selected: {languageTestScorecard.name}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">Upload your {formData.languageTest} test scorecard (PDF, JPG, or PNG, max 10MB)</p>
                        </div>
                      </>
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
                  Save and Continue
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
