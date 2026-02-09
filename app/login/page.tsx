'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerificationScreen, setShowVerificationScreen] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Check for verification success message
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified successfully! Please log in to continue.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setShowVerificationScreen(false)
    setResendMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        // Show verification screen if email not verified
        if (data.needsVerification) {
          setUserEmail(formData.emailOrUsername)
          setShowVerificationScreen(true)
          // Clear the form
          setFormData({ emailOrUsername: '', password: '' })
        } else {
          setError(data.error || 'Login failed')
        }
        return
      }

      // Redirect based on role and onboarding status
      // Onboarding check takes priority over any stored paths
      if (data.user.role === 'ADMIN') {
        router.push('/admin')
      } else if (!data.user.hasCompletedOnboarding) {
        // Email is verified but onboarding not completed - must go to onboarding
        sessionStorage.removeItem('redirectAfterLogin') // Clear any stored path
        router.push('/onboarding')
      } else {
        // Fully onboarded - check for stored redirect path
        const storedPath = sessionStorage.getItem('redirectAfterLogin')
        sessionStorage.removeItem('redirectAfterLogin') // Clear it
        
        if (storedPath && storedPath !== '/login') {
          router.push(storedPath)
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return
    
    setResendLoading(true)
    setResendMessage('')

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      })

      const data = await res.json()

      if (res.ok) {
        setResendMessage(data.message || 'Verification email sent!')
        // Set 60 second cooldown after successful resend
        setResendCooldown(60)
      }
    } catch (err) {
      // Handle silently
    } finally {
      setResendLoading(false)
    }
  }

  // If showing verification screen, render that instead
  if (showVerificationScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-md w-full relative">
          <div className="card animate-slide-up text-center">
            {/* Success Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
              Check your email!
            </h2>

            {/* Main Message */}
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
              Account exists but is not verified. Please verify your email to continue onboarding.
            </p>

            {/* Success Message if resend worked */}
            {resendMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium">{resendMessage}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-700">
                  Can&apos;t find the email? Check your spam folder or{' '}
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendCooldown > 0}
                    className="font-semibold underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? 'sending...' : resendCooldown > 0 ? `resend in ${resendCooldown}s` : 'resend verification email'}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => {
                setShowVerificationScreen(false)
                setResendMessage('')
              }}
              className="w-full btn btn-primary text-lg py-3"
            >
              Go to Login →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative">
        {/* Logo and header */}
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 shadow-2xl shadow-primary-500/50 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            VIIE ERP
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-lg">Welcome back! Sign in to continue</p>
        </div>

        {/* LsuccessMessage && (
              <div className="alert alert-success bg-green-50 border border-green-200 text-green-700">
                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}

            {ogin card */}
        <div className="card animate-slide-up">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error">
                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}



            <div className="space-y-5">
              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="emailOrUsername"
                    type="text"
                    required
                    className="input pl-11"
                    placeholder="you@example.com or username"
                    value={formData.emailOrUsername}
                    onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    className="input pl-11"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary text-lg py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">New to VIIE?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a
                href="/register"
                className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                Create an account →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
