'use client'

import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import Header from '@/components/Header'
import { usePathname } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <title>VIIE ERP - Student Management System</title>
        <meta name="description" content="Internal ERP system for student lifecycle management" />
        <link rel="icon" href="/img/logo.png" />
        <link rel="shortcut icon" href="/img/logo.png" />
        <link rel="apple-touch-icon" href="/img/logo.png" />
      </head>
      <body>
        <ThemeProvider>
          {!isAdminPage && <Header />}
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
