interface ProfileData {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  dateOfBirth?: Date | string | null
  gender?: string | null
  nationality?: string | null
  countryOfBirth?: string | null
  nativeLanguage?: string | null
  passportNumber?: string | null
  nameAsPerPassport?: string | null
  passportIssueLocation?: string | null
  passportIssueDate?: Date | string | null
  passportExpiryDate?: Date | string | null
  address?: string | null
  postalCode?: string | null
  school?: string | null
  schoolGrade?: string | null
  highSchool?: string | null
  highSchoolGrade?: string | null
  travelHistory?: any
  visaRefused?: boolean | null
  hasWorkExperience?: boolean | null
  workExperiences?: any[] | null
  personalEverEmployed?: string | null
  motherIncomeType?: string | null
  fatherIncomeType?: string | null
  program?: string | null
  intakeYear?: number | null
  documents?: Array<{ type: string }> | null
  passportPhoto?: string | null
}

// Total number of profile sections
const TOTAL_SECTIONS = 9

export function calculateProfileCompletion(profile: ProfileData): number {
  const isFieldFilled = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return false
    if (typeof value === 'string' && value.trim() === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  }

  // Helper to check if a boolean field was explicitly set (not null/undefined)
  const isBooleanExplicitlySet = (value: boolean | null | undefined): boolean => {
    return value === true || value === false
  }

  // 1. Personal Details
  // Complete when: basic personal info is filled
  // Fields: firstName, lastName, phone, dateOfBirth, gender, nationality
  const personalCompleted = 
    isFieldFilled(profile.firstName) &&
    isFieldFilled(profile.lastName) &&
    isFieldFilled(profile.phone) &&
    isFieldFilled(profile.dateOfBirth) &&
    isFieldFilled(profile.gender) &&
    isFieldFilled(profile.nationality)

  // 2. Education
  // Complete when: school and high school info is filled AND education documents are uploaded
  // Fields: school, schoolGrade, highSchool, highSchoolGrade
  // Documents: MARKSHEET_10TH, MARKSHEET_12TH
  const isEducationDocType = (type?: string) => {
    if (!type || typeof type !== 'string') return false
    return /^(MARKSHEET_10TH|MARKSHEET_12TH|GRE_SCORECARD|TOEFL_SCORECARD|LANGUAGE_TEST_SCORECARD)$/.test(type)
  }
  const hasMarksheets = Array.isArray(profile.documents) && 
    profile.documents.some(doc => doc.type === 'MARKSHEET_10TH') &&
    profile.documents.some(doc => doc.type === 'MARKSHEET_12TH')
  const educationCompleted =
    isFieldFilled(profile.school) &&
    isFieldFilled(profile.schoolGrade) &&
    isFieldFilled(profile.highSchool) &&
    isFieldFilled(profile.highSchoolGrade) &&
    hasMarksheets

  // 3. Travel
  // Complete when: user has added travel history OR explicitly answered visa refusal question
  // The visa question is in the Travel tab, so it counts toward Travel completion
  const hasTravelEntries = Array.isArray(profile.travelHistory) && profile.travelHistory.length > 0
  const hasAnsweredVisaQuestion = isBooleanExplicitlySet(profile.visaRefused)
  const travelCompleted = hasTravelEntries || hasAnsweredVisaQuestion

  // 4. Work Details
  // Complete when: user explicitly indicated work experience status
  // If hasWorkExperience is true, must have at least one work experience entry
  const workCompleted = 
    (profile.hasWorkExperience === false) || 
    (profile.hasWorkExperience === true && Array.isArray(profile.workExperiences) && profile.workExperiences.length > 0)

  // 5. Financials
  // Complete when: financial fields are filled AND has financial documents
  const isFinancialDocType = (type?: string) => {
    if (!type || typeof type !== 'string') return false
    return /PERSONAL_|MOTHER_|FATHER_|OTHER_SOURCE_/.test(type)
  }
  const hasFinancialDocs = Array.isArray(profile.documents) && profile.documents.some(doc => isFinancialDocType(doc.type))
  const financialsCompleted =
    isFieldFilled(profile.personalEverEmployed) &&
    isFieldFilled(profile.motherIncomeType) &&
    isFieldFilled(profile.fatherIncomeType) &&
    hasFinancialDocs

  // 6. Documents
  // Complete when: passport photo AND at least one general document uploaded (passport, resume, SOP, etc.)
  // This section is for general documents NOT tied to other specific sections
  // Excludes: financial documents, education documents (marksheets, test scores)
  const isGeneralDocType = (type?: string) => {
    if (!type || typeof type !== 'string') return false
    // General documents are those that don't belong to Education or Financials sections
    const isFinancial = /PERSONAL_|MOTHER_|FATHER_|OTHER_SOURCE_/.test(type)
    const isEducation = /^(MARKSHEET_10TH|MARKSHEET_12TH|GRE_SCORECARD|TOEFL_SCORECARD|LANGUAGE_TEST_SCORECARD)$/.test(type)
    return !isFinancial && !isEducation
  }
  const hasGeneralDocs = Array.isArray(profile.documents) && profile.documents.some(doc => {
    return isGeneralDocType(doc.type)
  })
  const documentsCompleted = isFieldFilled(profile.passportPhoto) && hasGeneralDocs

  // 7. Course Details
  // This tab shows program and intake year which are MANDATORY from onboarding registration
  // These fields are set during registration and are essentially read-only
  // Since this section represents registration status rather than profile completion,
  // and there are no additional user-fillable fields, this section remains INCOMPLETE
  // until the tab is updated with actual user-fillable fields
  const courseCompleted = false

  // 8. University
  // This is a placeholder tab with "coming soon" message - no actual fields to fill
  // Marked as INCOMPLETE until actual university preference fields are added
  const universityCompleted = false

  // 9. Post Admission
  // This is a placeholder tab with "coming soon" message - no actual fields to fill
  // Marked as INCOMPLETE until actual post-admission fields are added
  const postAdmissionCompleted = false

  // Count completed sections
  const sections = [
    personalCompleted,
    educationCompleted,
    travelCompleted,
    workCompleted,
    financialsCompleted,
    documentsCompleted,
    courseCompleted,
    universityCompleted,
    postAdmissionCompleted,
  ]

  const completedCount = sections.filter(Boolean).length
  // Each section is worth 11.11% (9 sections total)
  const percentage = parseFloat((completedCount * 11.11).toFixed(2))
  
  return percentage
}
