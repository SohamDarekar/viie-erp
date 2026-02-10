'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PhoneInput } from 'react-international-phone'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { CountryDropdown, Country } from '@/components/CountryDropdown'

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

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
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
    nationality: 'India',
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
    schoolBoard: '',
    schoolBoardOther: '',
    schoolGrade: '',
    highSchool: '',
    highSchoolCountry: '',
    highSchoolAddress: '',
    highSchoolStartYear: '',
    highSchoolEndYear: '',
    highSchoolBoard: '',
    highSchoolBoardOther: '',
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
    greTestDate: '',
    toeflTaken: undefined as boolean | undefined,
    toeflScore: '',
    toeflTestDate: '',
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
  const [greScorecard, setGreScorecard] = useState<File | null>(null)
  const [toeflScorecard, setToeflScorecard] = useState<File | null>(null)
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null)
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string>('')
  const [aadharCard, setAadharCard] = useState<File | null>(null)
  
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Check for verification success message
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified successfully! Please complete your profile to continue.')
      // Clear message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  
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
      
      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated, redirect to login
          router.push('/login')
          return
        }
        // Profile doesn't exist yet, continue with onboarding
        setInitialLoading(false)
        return
      }

      const data = await res.json()
      const student = data.student
      
      // Check if onboarding is already completed
      if (student.hasCompletedOnboarding) {
        // Redirect to dashboard if already onboarded
        router.push('/dashboard')
        return
      }
        
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
          schoolBoard: student.schoolBoard || '',
          schoolBoardOther: student.schoolBoardOther || '',
          schoolGrade: student.schoolGrade || '',
          highSchool: student.highSchool || '',
          highSchoolCountry: student.highSchoolCountry || '',
          highSchoolAddress: student.highSchoolAddress || '',
          highSchoolStartYear: student.highSchoolStartYear?.toString() || '',
          highSchoolEndYear: student.highSchoolEndYear?.toString() || '',
          highSchoolBoard: student.highSchoolBoard || '',
          highSchoolBoardOther: student.highSchoolBoardOther || '',
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
          greTestDate: student.greTestDate ? (() => {
            const date = new Date(student.greTestDate)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })() : '',
          toeflTaken: student.toeflTaken,
          toeflScore: student.toeflScore || '',
          toeflTestDate: student.toeflTestDate ? (() => {
            const date = new Date(student.toeflTestDate)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })() : '',
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
        
        // Load passport photo if exists
        if (student.passportPhoto) {
          if (student.passportPhoto.startsWith('data:image/')) {
            setPassportPhotoPreview(student.passportPhoto)
          } else {
            setPassportPhotoPreview(`/api/student/passport-photo`)
          }
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
      
      // Validate nationality, country of birth, native language - MANDATORY
      if (!formData.nationality.trim()) errors.nationality = 'Nationality is required'
      if (!formData.countryOfBirth.trim()) errors.countryOfBirth = 'Country of birth is required'
      if (!formData.nativeLanguage.trim()) errors.nativeLanguage = 'Native language is required'
      
      // Validate address - MANDATORY
      if (!formData.address.trim()) {
        errors.address = 'Address is required'
      }
      // Validate postal code - MANDATORY
      if (!formData.postalCode.trim()) {
        errors.postalCode = 'Postal code is required'
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
      
      // Validate parent/guardian name - MANDATORY
      if (!formData.parentName.trim()) {
        errors.parentName = 'Parent/Guardian name is required'
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
      
      // Validate passport photo - MANDATORY
      if (!passportPhoto && !passportPhotoPreview) {
        errors.passportPhoto = 'Passport size photo is required'
      }
      
      // Validate Aadhar Card - MANDATORY
      if (!aadharCard) {
        errors.aadharCard = 'Aadhar Card is required'
      }
    }
    
    if (step === 2) {
      // Validate School (10th Grade) - ALL MANDATORY
      if (!formData.school.trim()) errors.school = 'School name is required'
      if (!formData.schoolCountry.trim()) errors.schoolCountry = 'School country is required'
      if (!formData.schoolAddress.trim()) errors.schoolAddress = 'School address is required'
      if (!formData.schoolStartYear) errors.schoolStartYear = 'School start year is required'
      if (!formData.schoolEndYear) errors.schoolEndYear = 'School end year is required'
      if (!formData.schoolBoard) errors.schoolBoard = 'School board is required'
      if (formData.schoolBoard === 'Other' && !formData.schoolBoardOther.trim()) {
        errors.schoolBoardOther = 'Please specify your school board'
      }
      if (!formData.schoolGrade.trim()) errors.schoolGrade = 'School grade is required'
      
      // Validate Bachelor's completion status - MANDATORY
      if (formData.bachelorsCompleted === undefined) {
        errors.bachelorsCompleted = 'Please select if you have completed your Bachelor\'s'
      }
      
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
    console.log('🔥 FORM SUBMIT - preventing default')
    e.preventDefault()
    e.stopPropagation()
    
    if (currentStep < totalSteps) {
      console.log('🔥 Not on final step, current:', currentStep, 'total:', totalSteps)
      return
    }
    
    console.log('🔥 ON FINAL STEP - proceeding with API call')
    
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
      console.log('🔥 Starting fetch to API')
      const url = isEditMode ? '/api/student/profile' : '/api/student/onboarding'
      const method = isEditMode ? 'PUT' : 'POST'
      console.log('🔥 Target URL:', url)

      // Check if we have actual files to upload (only for onboarding, not edit mode)
      // In edit mode, files are already uploaded or will be uploaded separately
      const hasFiles = !isEditMode && ((marksheet10th instanceof File) || (marksheet12th instanceof File) || (ieltsScorecard instanceof File) || (passportFile instanceof File) || (languageTestScorecard instanceof File) || (greScorecard instanceof File) || (toeflScorecard instanceof File) || (passportPhoto instanceof File) || (aadharCard instanceof File))
      
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
      
      const convertedGreTestDate = safeDateConvert(formData.greTestDate)
      if (convertedGreTestDate) {
        convertedFormData.greTestDate = convertedGreTestDate
      } else {
        delete convertedFormData.greTestDate
      }
      
      const convertedToeflTestDate = safeDateConvert(formData.toeflTestDate)
      if (convertedToeflTestDate) {
        convertedFormData.toeflTestDate = convertedToeflTestDate
      } else {
        delete convertedFormData.toeflTestDate
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
        if (greScorecard) formDataObj.append('greScorecard', greScorecard)
        if (toeflScorecard) formDataObj.append('toeflScorecard', toeflScorecard)
        if (passportPhoto) formDataObj.append('passportPhoto', passportPhoto)
        if (aadharCard) formDataObj.append('aadharCard', aadharCard)
        
        payload = formDataObj
        // Don't set Content-Type, browser will set it with boundary
      } else {
        // Regular JSON payload - Start with a clean object
        payload = {}
        
        // First, clean all string values from convertedFormData before adding to payload
        Object.keys(convertedFormData).forEach(key => {
          const value = convertedFormData[key]
          // Skip if undefined, null, or empty string
          if (value === undefined || value === null || value === '') {
            return
          }
          // Skip if it's a string with only whitespace or special chars like "-"
          if (typeof value === 'string') {
            const trimmed = value.trim()
            if (trimmed === '' || trimmed === '-' || trimmed === '/' || trimmed === '--') {
              return
            }
          }
          // Add to payload if it passed validation
          payload[key] = value
        })
        
        // Convert intakeYear to number if it's valid
        if (formData.intakeYear && formData.intakeYear !== '' && formData.intakeYear !== '-') {
          const intakeYearNum = parseInt(formData.intakeYear.toString())
          if (!isNaN(intakeYearNum)) {
            payload.intakeYear = intakeYearNum
          }
        }
        
        // Convert year strings to numbers - only if valid
        if (formData.schoolStartYear && formData.schoolStartYear !== '' && formData.schoolStartYear !== '-') {
          const yearNum = parseInt(formData.schoolStartYear)
          if (!isNaN(yearNum)) {
            payload.schoolStartYear = yearNum
          }
        }
        if (formData.schoolEndYear && formData.schoolEndYear !== '' && formData.schoolEndYear !== '-') {
          const yearNum = parseInt(formData.schoolEndYear)
          if (!isNaN(yearNum)) {
            payload.schoolEndYear = yearNum
          }
        }
        if (formData.highSchoolStartYear && formData.highSchoolStartYear !== '' && formData.highSchoolStartYear !== '-') {
          const yearNum = parseInt(formData.highSchoolStartYear)
          if (!isNaN(yearNum)) {
            payload.highSchoolStartYear = yearNum
          }
        }
        if (formData.highSchoolEndYear && formData.highSchoolEndYear !== '' && formData.highSchoolEndYear !== '-') {
          const yearNum = parseInt(formData.highSchoolEndYear)
          if (!isNaN(yearNum)) {
            payload.highSchoolEndYear = yearNum
          }
        }
        
        console.log('Payload before stringify:', payload)
        headers['Content-Type'] = 'application/json'
        payload = JSON.stringify(payload)
        console.log('Payload after stringify:', payload)
      }

      console.log('🔥 About to call fetch with credentials')
      const res = await fetch(url, {
        method,
        headers,
        body: payload,
        credentials: 'include', // This ensures cookies are sent
      })

      console.log('🔥 Fetch completed with status:', res.status)
      const data = await res.json()
      console.log('🔥 Response data:', data)

      if (!res.ok) {
        console.log('🔥 Request failed with error:', data.error)
        setError(data.error || (isEditMode ? 'Update failed' : 'Onboarding failed'))
        scrollToFirstError()
        return
      }

      console.log('🔥 Success! Redirecting to dashboard')
      // Refresh router cache to pick up updated session before redirecting
      router.refresh()
      // Force a full page navigation to ensure new cookie is picked up
      window.location.href = '/dashboard'
    } catch (err) {
      console.log('🔥 Catch block - error occurred:', err)
      setError('An error occurred. Please try again.')
      scrollToFirstError()
    } finally {
      console.log('🔥 Finally - setting loading false')
      setLoading(false)
    }
  }

  const nextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Validate current step before moving forward
    if (!validateStep(currentStep)) {
      scrollToFirstError()
      return
    }
    
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
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

  // Prevent Enter key from submitting the form
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
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

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 mx-auto max-w-2xl">
            <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg shadow-lg flex items-start animate-fade-in">
              <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

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
          <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={handleFormKeyDown}>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth <span className="text-red-500">*</span> (DD/MM/YYYY)</label>
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
                  
                  {/* Passport Size Photo Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Passport Size Photo <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">Upload a recent passport-size photograph (PNG, JPG, or JPEG only)</p>
                    
                    {passportPhotoPreview ? (
                      <div className="flex items-start space-x-4">
                        <div className="relative">
                          <img 
                            src={passportPhotoPreview} 
                            alt="Passport Photo Preview" 
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPassportPhoto(null)
                              setPassportPhotoPreview('')
                              if (fieldErrors.passportPhoto) {
                                const newErrors = { ...fieldErrors }
                                delete newErrors.passportPhoto
                                setFieldErrors(newErrors)
                              }
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-green-600 font-medium mb-2">✓ Photo uploaded successfully</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPassportPhoto(null)
                              setPassportPhotoPreview('')
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                          >
                            Change photo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/png,image/jpg,image/jpeg"
                          className={`w-full text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 ${
                            fieldErrors.passportPhoto ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                          }`}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              // Validate file type
                              const validTypes = ['image/png', 'image/jpg', 'image/jpeg']
                              if (!validTypes.includes(file.type)) {
                                setFieldErrors({ ...fieldErrors, passportPhoto: 'Only PNG, JPG, and JPEG formats are allowed' })
                                setPassportPhoto(null)
                                setPassportPhotoPreview('')
                                e.target.value = ''
                                return
                              }
                              
                              // Validate file size (max 5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                setFieldErrors({ ...fieldErrors, passportPhoto: 'File size must be less than 5MB' })
                                setPassportPhoto(null)
                                setPassportPhotoPreview('')
                                e.target.value = ''
                                return
                              }
                              
                              setPassportPhoto(file)
                              const reader = new FileReader()
                              reader.onloadend = (event) => {
                                setPassportPhotoPreview(event.target?.result as string)
                              }
                              reader.readAsDataURL(file)
                              
                              // Clear error
                              if (fieldErrors.passportPhoto) {
                                const newErrors = { ...fieldErrors }
                                delete newErrors.passportPhoto
                                setFieldErrors(newErrors)
                              }
                            }
                          }}
                        />
                        {fieldErrors.passportPhoto && (
                          <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.passportPhoto}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Maximum file size: 5MB</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Aadhar Card Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Aadhar Card <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">Upload your Aadhar Card (PDF only)</p>
                    
                    {aadharCard && (
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-2">
                        <div className="flex items-center space-x-3">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{aadharCard.name}</p>
                            <p className="text-xs text-gray-500">{(aadharCard.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAadharCard(null)
                            if (fieldErrors.aadharCard) {
                              const newErrors = { ...fieldErrors }
                              delete newErrors.aadharCard
                              setFieldErrors(newErrors)
                            }
                          }}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="application/pdf"
                      className={`w-full text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 ${
                        fieldErrors.aadharCard ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                      }`}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                setFieldErrors({ ...fieldErrors, aadharCard: 'Only PDF files are allowed' })
                                setAadharCard(null)
                                e.target.value = ''
                                return
                              }
                              
                              if (file.size > 5 * 1024 * 1024) {
                                setFieldErrors({ ...fieldErrors, aadharCard: 'File size must be less than 5MB' })
                                setAadharCard(null)
                                e.target.value = ''
                                return
                              }
                              
                              setAadharCard(file)
                              
                              if (fieldErrors.aadharCard) {
                                const newErrors = { ...fieldErrors }
                                delete newErrors.aadharCard
                                setFieldErrors(newErrors)
                              }
                            }
                          }}
                        />
                        {fieldErrors.aadharCard && (
                          <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.aadharCard}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Maximum file size: 5MB</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender <span className="text-red-500">*</span></label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nationality <span className="text-red-500">*</span></label>
                    <CountryDropdown
                      defaultValue={formData.nationality}
                      onChange={(country: Country) => {
                        setFormData({ ...formData, nationality: country.name })
                        if (fieldErrors.nationality) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.nationality
                          setFieldErrors(newErrors)
                        }
                      }}
                      placeholder="Select your nationality"
                      disabled={false}
                      error={!!fieldErrors.nationality}
                    />
                    {fieldErrors.nationality && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.nationality}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country of Birth <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className={`w-full px-4 py-3 border ${fieldErrors.countryOfBirth ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.countryOfBirth}
                      onChange={(e) => {
                        setFormData({ ...formData, countryOfBirth: e.target.value })
                        if (fieldErrors.countryOfBirth) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.countryOfBirth
                          setFieldErrors(newErrors)
                        }
                      }}
                    />
                    {fieldErrors.countryOfBirth && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.countryOfBirth}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Native Language <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className={`w-full px-4 py-3 border ${fieldErrors.nativeLanguage ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.nativeLanguage}
                      onChange={(e) => {
                        setFormData({ ...formData, nativeLanguage: e.target.value })
                        if (fieldErrors.nativeLanguage) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.nativeLanguage
                          setFieldErrors(newErrors)
                        }
                      }}
                    />
                    {fieldErrors.nativeLanguage && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.nativeLanguage}</p>
                    )}
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
                    {passportFile && (
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-2">
                        <div className="flex items-center space-x-3">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{passportFile.name}</p>
                            <p className="text-xs text-gray-500">{(passportFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPassportFile(null)
                            if (fieldErrors.passportFile) {
                              const newErrors = { ...fieldErrors }
                              delete newErrors.passportFile
                              setFieldErrors(newErrors)
                            }
                          }}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      className={`w-full text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 ${
                        fieldErrors.passportFile ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
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
                    {fieldErrors.passportFile && (
                      <p className="error-message mt-1 text-sm text-red-600">{fieldErrors.passportFile}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Address <span className="text-red-500">*</span></label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Postal Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className={`w-full px-4 py-3 border ${fieldErrors.postalCode ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={formData.postalCode}
                      onChange={(e) => {
                        setFormData({ ...formData, postalCode: e.target.value })
                        if (fieldErrors.postalCode) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.postalCode
                          setFieldErrors(newErrors)
                        }
                      }}
                    />
                    {fieldErrors.postalCode && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.postalCode}</p>
                    )}
                  </div>
                </div>

                {/* Parent/Guardian Contact Section */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl mt-6 border border-indigo-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Parent/Guardian Contact *</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Parent/Guardian Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        className={`w-full px-4 py-3 border ${fieldErrors.parentName ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white`}
                        value={formData.parentName}
                        onChange={(e) => {
                          setFormData({ ...formData, parentName: e.target.value })
                          if (fieldErrors.parentName) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.parentName
                            setFieldErrors(newErrors)
                          }
                        }}
                      />
                      {fieldErrors.parentName && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.parentName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Relation <span className="text-red-500">*</span></label>
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Please Specify Relation <span className="text-red-500">*</span></label>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Parent/Guardian Phone Number <span className="text-red-500">*</span></label>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Parent/Guardian Email <span className="text-red-500">*</span></label>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Program <span className="text-red-500">*</span></label>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Intake Year <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        required
                        readOnly
                        placeholder="Enter intake year"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 cursor-not-allowed focus:outline-none"
                        value={formData.intakeYear || new Date().getFullYear()}
                        style={{
                          appearance: 'none',
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none',
                        }}
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">School Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.school ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.school}
                        onChange={(e) => {
                          setFormData({ ...formData, school: e.target.value })
                          if (fieldErrors.school) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.school
                            setFieldErrors(newErrors)
                          }
                        }}
                      />
                      {fieldErrors.school && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.school}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Country <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.schoolCountry ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.schoolCountry}
                        onChange={(e) => {
                          setFormData({ ...formData, schoolCountry: e.target.value })
                          if (fieldErrors.schoolCountry) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.schoolCountry
                            setFieldErrors(newErrors)
                          }
                        }}
                      />
                      {fieldErrors.schoolCountry && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.schoolCountry}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.schoolAddress ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.schoolAddress}
                        onChange={(e) => {
                          setFormData({ ...formData, schoolAddress: e.target.value })
                          if (fieldErrors.schoolAddress) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.schoolAddress
                            setFieldErrors(newErrors)
                          }
                        }}
                      />
                      {fieldErrors.schoolAddress && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.schoolAddress}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year <span className="text-red-500">*</span></label>
                      <select
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.schoolStartYear ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.schoolStartYear}
                        onChange={(e) => {
                          setFormData({ ...formData, schoolStartYear: e.target.value })
                          if (fieldErrors.schoolStartYear) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.schoolStartYear
                            setFieldErrors(newErrors)
                          }
                        }}
                      >
                        <option value="">Select Year</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      {fieldErrors.schoolStartYear && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.schoolStartYear}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Year <span className="text-red-500">*</span></label>
                      <select
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.schoolEndYear ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.schoolEndYear}
                        onChange={(e) => {
                          setFormData({ ...formData, schoolEndYear: e.target.value })
                          if (fieldErrors.schoolEndYear) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.schoolEndYear
                            setFieldErrors(newErrors)
                          }
                        }}
                      >
                        <option value="">Select Year</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      {fieldErrors.schoolEndYear && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.schoolEndYear}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">School Board <span className="text-red-500">*</span></label>
                      <select
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.schoolBoard ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.schoolBoard}
                        onChange={(e) => {
                          setFormData({ ...formData, schoolBoard: e.target.value, schoolGrade: '' })
                          if (fieldErrors.schoolBoard) {
                            const newErrors = { ...fieldErrors }
                            delete newErrors.schoolBoard
                            setFieldErrors(newErrors)
                          }
                        }}
                      >
                        <option value="">Select School Board</option>
                        <option value="SSC">SSC</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="IB">IB</option>
                        <option value="Other">Other (Please specify)</option>
                      </select>
                      {fieldErrors.schoolBoard && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.schoolBoard}</p>
                      )}
                    </div>
                    {formData.schoolBoard === 'Other' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Custom School Board <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            fieldErrors.schoolBoardOther ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter your school board"
                          value={formData.schoolBoardOther}
                          onChange={(e) => {
                            setFormData({ ...formData, schoolBoardOther: e.target.value })
                            if (fieldErrors.schoolBoardOther) {
                              const newErrors = { ...fieldErrors }
                              delete newErrors.schoolBoardOther
                              setFieldErrors(newErrors)
                            }
                          }}
                        />
                        {fieldErrors.schoolBoardOther && (
                          <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.schoolBoardOther}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {formData.schoolBoard === 'IB' ? 'Grade (Points out of 45)' : 'Grade (in %)'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.schoolGrade ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={formData.schoolBoard === 'IB' ? 'Enter points (max 45)' : 'Enter percentage'}
                        value={formData.schoolGrade}
                        onChange={(e) => {
                          const value = e.target.value
                          if (formData.schoolBoard === 'IB') {
                            // For IB, validate that it's a number and max 45
                            if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 45)) {
                              setFormData({ ...formData, schoolGrade: value })
                              if (fieldErrors.schoolGrade) {
                                const newErrors = { ...fieldErrors }
                                delete newErrors.schoolGrade
                                setFieldErrors(newErrors)
                              }
                            }
                          } else {
                            setFormData({ ...formData, schoolGrade: value })
                            if (fieldErrors.schoolGrade) {
                              const newErrors = { ...fieldErrors }
                              delete newErrors.schoolGrade
                              setFieldErrors(newErrors)
                            }
                          }
                        }}
                      />
                      {fieldErrors.schoolGrade && (
                        <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.schoolGrade}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        10th Grade Marksheet <span className="text-red-500">*</span>
                      </label>
                      {marksheet10th && (
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-2">
                          <div className="flex items-center space-x-3">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{marksheet10th.name}</p>
                              <p className="text-xs text-gray-500">{(marksheet10th.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMarksheet10th(null)
                              if (fieldErrors.marksheet10th) {
                                const newErrors = { ...fieldErrors }
                                delete newErrors.marksheet10th
                                setFieldErrors(newErrors)
                              }
                            }}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className={`w-full text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 ${
                          fieldErrors.marksheet10th ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                        }`}
                        onChange={(e) => setMarksheet10th(e.target.files?.[0] || null)}
                      />
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">School Board</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.highSchoolBoard}
                        onChange={(e) => setFormData({ ...formData, highSchoolBoard: e.target.value, highSchoolGrade: '' })}
                      >
                        <option value="">Select School Board</option>
                        <option value="SSC">SSC</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="IB">IB</option>
                        <option value="Other">Other (Please specify)</option>
                      </select>
                    </div>
                    {formData.highSchoolBoard === 'Other' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Custom School Board</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Enter your school board"
                          value={formData.highSchoolBoardOther}
                          onChange={(e) => setFormData({ ...formData, highSchoolBoardOther: e.target.value })}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {formData.highSchoolBoard === 'IB' ? 'Grade (Points out of 45)' : 'Grade (in %)'}
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={formData.highSchoolBoard === 'IB' ? 'Enter points (max 45)' : 'Enter percentage'}
                        value={formData.highSchoolGrade}
                        onChange={(e) => {
                          const value = e.target.value
                          if (formData.highSchoolBoard === 'IB') {
                            // For IB, validate that it's a number and max 45
                            if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 45)) {
                              setFormData({ ...formData, highSchoolGrade: value })
                            }
                          } else {
                            setFormData({ ...formData, highSchoolGrade: value })
                          }
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">12th Grade Marksheet</label>
                      {marksheet12th && (
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-2">
                          <div className="flex items-center space-x-3">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{marksheet12th.name}</p>
                              <p className="text-xs text-gray-500">{(marksheet12th.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMarksheet12th(null)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300"
                        onChange={(e) => setMarksheet12th(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                </div>

                {/* Bachelor's Degree */}
                <div className="bg-slate-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Bachelor&apos;s Degree</h4>
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Have you completed your Bachelor&apos;s? <span className="text-red-500">*</span></label>
                    <select
                      required
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        fieldErrors.bachelorsCompleted ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.bachelorsCompleted === undefined ? '' : (formData.bachelorsCompleted ? 'yes' : 'no')}
                      onChange={(e) => {
                        setFormData({ ...formData, bachelorsCompleted: e.target.value === 'yes' })
                        if (fieldErrors.bachelorsCompleted) {
                          const newErrors = { ...fieldErrors }
                          delete newErrors.bachelorsCompleted
                          setFieldErrors(newErrors)
                        }
                      }}
                    >
                      <option value="">-- Please Select --</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    {fieldErrors.bachelorsCompleted && (
                      <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.bachelorsCompleted}</p>
                    )}
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
                    <div className="md:col-span-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={formData.greTaken}
                          onChange={(e) => {
                            setFormData({ ...formData, greTaken: e.target.checked })
                            if (!e.target.checked) {
                              setGreScorecard(null)
                            }
                          }}
                        />
                        GRE Taken
                      </label>
                      {formData.greTaken && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">GRE Score{formData.greTaken && <span className="text-red-500">*</span>}</label>
                            <input
                              type="text"
                              required={formData.greTaken}
                              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                fieldErrors.greScore ? 'border-red-500' : 'border-gray-300'
                              }`}
                              placeholder="Enter GRE score"
                              value={formData.greScore}
                              onChange={(e) => {
                                setFormData({ ...formData, greScore: e.target.value })
                                if (fieldErrors.greScore) {
                                  const newErrors = { ...fieldErrors }
                                  delete newErrors.greScore
                                  setFieldErrors(newErrors)
                                }
                              }}
                            />
                            {fieldErrors.greScore && (
                              <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.greScore}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Date (DD/MM/YYYY)</label>
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={formData.greTestDate}
                              onChange={(e) => {
                                const formatted = formatDateInput(e.target.value, formData.greTestDate)
                                setFormData({ ...formData, greTestDate: formatted })
                              }}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              GRE Scorecard/Certificate{formData.greTaken && <span className="text-red-500">*</span>}
                            </label>
                            {greScorecard && (
                              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-2">
                                <div className="flex items-center space-x-3">
                                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{greScorecard.name}</p>
                                    <p className="text-xs text-gray-500">{(greScorecard.size / 1024).toFixed(2)} KB</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGreScorecard(null)
                                    if (fieldErrors.greScorecard) {
                                      const newErrors = { ...fieldErrors }
                                      delete newErrors.greScorecard
                                      setFieldErrors(newErrors)
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              required={formData.greTaken && !greScorecard}
                              className={`w-full text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 ${
                                fieldErrors.greScorecard ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                              }`}
                              onChange={(e) => {
                                setGreScorecard(e.target.files?.[0] || null)
                                if (fieldErrors.greScorecard) {
                                  const newErrors = { ...fieldErrors }
                                  delete newErrors.greScorecard
                                  setFieldErrors(newErrors)
                                }
                              }}
                            />
                            {fieldErrors.greScorecard && (
                              <p className="error-message mt-1 text-sm text-red-600">{fieldErrors.greScorecard}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">Upload your GRE test scorecard (PDF, JPG, or PNG, max 10MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={formData.toeflTaken}
                          onChange={(e) => {
                            setFormData({ ...formData, toeflTaken: e.target.checked })
                            if (!e.target.checked) {
                              setToeflScorecard(null)
                            }
                          }}
                        />
                        TOEFL Taken
                      </label>
                      {formData.toeflTaken && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">TOEFL Score{formData.toeflTaken && <span className="text-red-500">*</span>}</label>
                            <input
                              type="text"
                              required={formData.toeflTaken}
                              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                fieldErrors.toeflScore ? 'border-red-500' : 'border-gray-300'
                              }`}
                              placeholder="Enter TOEFL score"
                              value={formData.toeflScore}
                              onChange={(e) => {
                                setFormData({ ...formData, toeflScore: e.target.value })
                                if (fieldErrors.toeflScore) {
                                  const newErrors = { ...fieldErrors }
                                  delete newErrors.toeflScore
                                  setFieldErrors(newErrors)
                                }
                              }}
                            />
                            {fieldErrors.toeflScore && (
                              <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.toeflScore}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Date (DD/MM/YYYY)</label>
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={formData.toeflTestDate}
                              onChange={(e) => {
                                const formatted = formatDateInput(e.target.value, formData.toeflTestDate)
                                setFormData({ ...formData, toeflTestDate: formatted })
                              }}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              TOEFL Scorecard/Certificate{formData.toeflTaken && <span className="text-red-500">*</span>}
                            </label>
                            {toeflScorecard && (
                              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-2">
                                <div className="flex items-center space-x-3">
                                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{toeflScorecard.name}</p>
                                    <p className="text-xs text-gray-500">{(toeflScorecard.size / 1024).toFixed(2)} KB</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setToeflScorecard(null)
                                    if (fieldErrors.toeflScorecard) {
                                      const newErrors = { ...fieldErrors }
                                      delete newErrors.toeflScorecard
                                      setFieldErrors(newErrors)
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              required={formData.toeflTaken && !toeflScorecard}
                              className={`w-full text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 ${
                                fieldErrors.toeflScorecard ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                              }`}
                              onChange={(e) => {
                                setToeflScorecard(e.target.files?.[0] || null)
                                if (fieldErrors.toeflScorecard) {
                                  const newErrors = { ...fieldErrors }
                                  delete newErrors.toeflScorecard
                                  setFieldErrors(newErrors)
                                }
                              }}
                            />
                            {fieldErrors.toeflScorecard && (
                              <p className="error-message mt-1 text-sm text-red-600">{fieldErrors.toeflScorecard}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">Upload your TOEFL test scorecard (PDF, JPG, or PNG, max 10MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">English Proficiency Test</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.languageTest}
                        onChange={(e) => {
                          setFormData({ ...formData, languageTest: e.target.value })
                          if (!e.target.value) {
                            setLanguageTestScorecard(null)
                          }
                        }}
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
                          <label className="block text-sm font-semibold text-gray-700 mb-2">{formData.languageTest} Score{formData.languageTest && <span className="text-red-500">*</span>}</label>
                          <input
                            type="text"
                            required={!!formData.languageTest}
                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              fieldErrors.languageTestScore ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder={`Enter ${formData.languageTest} score`}
                            value={formData.languageTestScore}
                            onChange={(e) => {
                              setFormData({ ...formData, languageTestScore: e.target.value })
                              if (fieldErrors.languageTestScore) {
                                const newErrors = { ...fieldErrors }
                                delete newErrors.languageTestScore
                                setFieldErrors(newErrors)
                              }
                            }}
                          />
                          {fieldErrors.languageTestScore && (
                            <p className="mt-1 text-sm text-red-600 error-message">{fieldErrors.languageTestScore}</p>
                          )}
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
                            {formData.languageTest} Scorecard/Certificate{formData.languageTest && <span className="text-red-500">*</span>}
                          </label>
                          {languageTestScorecard && (
                            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-2">
                              <div className="flex items-center space-x-3">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{languageTestScorecard.name}</p>
                                  <p className="text-xs text-gray-500">{(languageTestScorecard.size / 1024).toFixed(2)} KB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setLanguageTestScorecard(null)
                                  if (fieldErrors.languageTestScorecard) {
                                    const newErrors = { ...fieldErrors }
                                    delete newErrors.languageTestScorecard
                                    setFieldErrors(newErrors)
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            required={!!formData.languageTest && !languageTestScorecard}
                            className={`w-full text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 ${
                              fieldErrors.languageTestScorecard ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                            }`}
                            onChange={(e) => {
                              setLanguageTestScorecard(e.target.files?.[0] || null)
                              if (fieldErrors.languageTestScorecard) {
                                const newErrors = { ...fieldErrors }
                                delete newErrors.languageTestScorecard
                                setFieldErrors(newErrors)
                              }
                            }}
                          />
                          {fieldErrors.languageTestScorecard && (
                            <p className="error-message mt-1 text-sm text-red-600">{fieldErrors.languageTestScorecard}</p>
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  )
}
