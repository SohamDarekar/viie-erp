'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  firstName: string
  lastName: string
  email: string
}

interface Resource {
  id: string
  title: string
  fileName: string
  fileSize: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profileCompletion, setProfileCompletion] = useState<number>(0)
  const [batchResources, setBatchResources] = useState<Resource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch('/api/student/profile')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load profile')
      }
      const data = await res.json()
      
      // Check if onboarding is completed
      if (!data.student.hasCompletedOnboarding) {
        // Redirect to onboarding if not completed
        router.push('/onboarding')
        return
      }
      
      setUser({
        firstName: data.student.firstName || '',
        lastName: data.student.lastName || '',
        email: data.student.user?.email || data.student.email || '',
      })
      setProfileCompletion(data.student.profileCompletion || 0)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadBatchResources = useCallback(async () => {
    setResourcesLoading(true)
    try {
      const res = await fetch('/api/student/batch-resources')
      if (res.ok) {
        const data = await res.json()
        setBatchResources(data.resources || [])
      }
    } catch (error) {
      console.error('Failed to load resources:', error)
    } finally {
      setResourcesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
    loadBatchResources()

    // Poll for profile completion updates every 10 seconds when page is visible
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadUser()
      }
    }, 10000) // 10 seconds

    // Also reload when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUser()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadUser, loadBatchResources])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 transition-colors duration-200">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Profile Card */}
          <Link href="/profile">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-blue-100 dark:border-blue-800 hover:scale-105 min-h-[280px] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Profile</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Complete your profile to unlock all features
              </p>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Completion</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{profileCompletion}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
              </div>
              <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold group">
                <span>Complete Now</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Resources Card */}
          <Link href="/dashboard/resources">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-purple-100 dark:border-purple-800 hover:scale-105 min-h-[280px] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Resources</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Access study materials and documents shared with your batch
              </p>
              </div>
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold group">
                {resourcesLoading ? (
                  <span>Loading...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{batchResources.length} Resource{batchResources.length !== 1 ? 's' : ''} Available</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          </Link>

          {/* Events Card */}
          <Link href="/events">
            <div className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-pink-100 dark:border-pink-800 hover:scale-105 min-h-[280px] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Events</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                View the events calendar to stay updated on upcoming events
              </p>
              </div>
              <div className="flex items-center text-pink-600 dark:text-pink-400 font-semibold group">
                <span>View Calendar</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Tasks Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-indigo-100 dark:border-indigo-800 hover:scale-105 min-h-[280px] flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tasks</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              View your to-do list here: track your tasks and stay on top of your work!
            </p>
            </div>
            <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold group">
              <span>Learn More</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
