import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0f0f1a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://after-party-xi.vercel.app'),
  title: 'After Party — Close the physical distance between you two',
  description: 'Watch movies, play games and talk privately with your partner, in perfect sync, from anywhere. Free, private, and works right in your browser.',
  applicationName: 'After Party',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  openGraph: {
    title: 'After Party — Close the physical distance between you two',
    description: 'Watch movies, play games and talk privately with your partner, in perfect sync, from anywhere.',
    url: 'https://after-party-xi.vercel.app',
    siteName: 'After Party',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'After Party — Private Virtual Lounge for Long-Distance Couples',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'After Party — Close the physical distance between you two',
    description: 'Watch movies, play games and talk privately with your partner, in perfect sync, from anywhere.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://after-party-xi.vercel.app',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'After Party',
    operatingSystem: 'Any (Web-based PWA)',
    applicationCategory: 'CommunicationApplication',
    description: 'Private virtual lounge for long-distance couples to watch synchronized videos, play games, and talk privately in sync.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    url: 'https://after-party-xi.vercel.app',
  }

  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} bg-background text-slate-100 min-h-screen selection:bg-rose-500/30 selection:text-rose-200 antialiased`}>
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#141428',
              color: '#fff',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '16px',
            }
          }}
        />
      </body>
    </html>
  )
}
