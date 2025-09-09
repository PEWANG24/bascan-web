import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BA SCAN - Brand Ambassador Portal',
  description: 'Web portal for Brand Ambassadors to scan serials and submit start key requests',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#4F46E5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#4F46E5" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}