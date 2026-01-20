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

interface FormVisibility {
  personalDetails?: boolean
  education?: boolean
  travel?: boolean
  workDetails?: boolean
  financials?: boolean
  documents?: boolean
  courseDetails?: boolean
  university?: boolean
  postAdmission?: boolean
}

// Total number of profile sections
const TOTAL_SECTIONS = 9

export function calculateProfileCompletion(
  profile: ProfileData,
  formVisibility?: FormVisibility | null
): number {
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
  // Complete when: school and high school info is filled
  // Fields: school, schoolGrade, highSchool, highSchoolGrade
  const educationCompleted =
    isFieldFilled(profile.school) &&
    isFieldFilled(profile.schoolGrade) &&
    isFieldFilled(profile.highSchool) &&
    isFieldFilled(profile.highSchoolGrade)

  // 3. Travel
  // Complete when: user has added at least one travel history entry OR answered the visa refusal question
  const travelCompleted = 
    (Array.isArray(profile.travelHistory) && profile.travelHistory.length > 0) ||
    isBooleanExplicitlySet(profile.visaRefused)

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

  // Map sections to their visibility settings
  const sectionVisibilityMap = [
    { completed: personalCompleted, visible: formVisibility?.personalDetails ?? true },
    { completed: educationCompleted, visible: formVisibility?.education ?? true },
    { completed: travelCompleted, visible: formVisibility?.travel ?? true },
    { completed: workCompleted, visible: formVisibility?.workDetails ?? true },
    { completed: financialsCompleted, visible: formVisibility?.financials ?? true },
    { completed: documentsCompleted, visible: formVisibility?.documents ?? true },
    { completed: courseCompleted, visible: formVisibility?.courseDetails ?? true },
    { completed: universityCompleted, visible: formVisibility?.university ?? true },
    { completed: postAdmissionCompleted, visible: formVisibility?.postAdmission ?? true },
  ]

  // Filter to only count visible sections
  const visibleSections = sectionVisibilityMap.filter(s => s.visible)
  const totalVisibleSections = visibleSections.length
  
  // If no sections are visible, return 0
  if (totalVisibleSections === 0) {
    return 0
  }

  // Count how many visible sections are completed
  const completedVisibleCount = visibleSections.filter(s => s.completed).length
  
  // Calculate percentage based only on visible sections
  const percentage = parseFloat(((completedVisibleCount / totalVisibleSections) * 100).toFixed(2))
  
  return percentage
}
