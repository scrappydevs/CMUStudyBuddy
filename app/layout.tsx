import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CMU CS Courses 3D Map',
  description: 'Interactive 3D visualization of CMU Computer Science courses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

