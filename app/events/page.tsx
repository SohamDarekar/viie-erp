'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components'

interface Event {
  id: string
  name: string
  description: string
  eventDate: string
  eventTime: string
  venue: string
  banner?: string
  registrationLink?: string
  resources: string[]
  batchIds: string[]
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  events: Event[]
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    generateCalendar()
  }, [currentDate, events])

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/admin/events')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
        
        // Auto-select first upcoming event
        if (data.events && data.events.length > 0) {
          const upcomingEvents = data.events.filter((e: Event) => 
            new Date(e.eventDate) >= new Date()
          )
          if (upcomingEvents.length > 0) {
            setSelectedEvent(upcomingEvents[0])
          }
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const prevMonthLastDay = new Date(year, month, 0)
    
    const startingDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const daysInPrevMonth = prevMonthLastDay.getDate()
    
    const days: CalendarDay[] = []
    
    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i)
      days.push({
        date,
        isCurrentMonth: false,
        events: getEventsForDate(date)
      })
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push({
        date,
        isCurrentMonth: true,
        events: getEventsForDate(date)
      })
    }
    
    // Next month days to complete the grid
    const remainingDays = 42 - days.length // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        events: getEventsForDate(date)
      })
    }
    
    setCalendarDays(days)
  }

  const getEventsForDate = (date: Date): Event[] => {
    return events.filter(event => {
      const eventDate = new Date(event.eventDate)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthYear = currentDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading events...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            View Events
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please follow the events calendar to complete your application on time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {monthYear}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    today
                  </button>
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Week day headers */}
                {weekDays.map(day => (
                  <div
                    key={day}
                    className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300 py-2"
                  >
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] border border-gray-200 dark:border-gray-700 p-2
                      ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'}
                      ${day.date.toDateString() === new Date().toDateString() ? 'ring-2 ring-blue-500' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      !day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* Events for this day */}
                    <div className="space-y-1">
                      {day.events.map(event => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="w-full text-left text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded truncate transition-colors"
                        >
                          {event.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Event Details Section */}
          <div className="lg:col-span-1">
            {selectedEvent ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                {/* Event banner */}
                {selectedEvent.banner ? (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={selectedEvent.banner} 
                      alt={selectedEvent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-red-700 to-red-600 h-48 flex items-center justify-center">
                    <div className="text-center text-white px-4">
                      <div className="text-3xl font-bold mb-2">{selectedEvent.name}</div>
                    </div>
                  </div>
                )}
                
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Event Name
                    </h3>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedEvent.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Event Date
                      </h3>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(selectedEvent.eventDate)}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Event Time
                      </h3>
                      <p className="text-gray-900 dark:text-white">
                        {selectedEvent.eventTime}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Event Venue
                    </h3>
                    <p className="text-gray-900 dark:text-white">
                      {selectedEvent.venue}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Event Description
                    </h3>
                    <p className="text-gray-900 dark:text-white">
                      {selectedEvent.description}
                    </p>
                  </div>

                  {selectedEvent.registrationLink && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Registration Link
                      </h3>
                      <a
                        href={selectedEvent.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
                      >
                        {selectedEvent.registrationLink}
                      </a>
                    </div>
                  )}

                  {selectedEvent.resources && selectedEvent.resources.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        Event Resources
                      </h3>
                      <div className="space-y-2">
                        {selectedEvent.resources.map((resource, idx) => (
                          <a
                            key={idx}
                            href={resource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-center font-medium transition-colors"
                          >
                            View Resource {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500 dark:text-gray-400">
                Select an event to view details
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
