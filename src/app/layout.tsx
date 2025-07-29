import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

// Optimize font loading
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: '3D Print Manager',
    template: '%s | 3D Print Manager'
  },
  description: 'Sistema di gestione automazione stampe 3D con Bambu Lab',
  keywords: ['3D printing', 'Bambu Lab', 'automation', 'print management'],
  authors: [{ name: '3D Print Manager Team' }],
  creator: '3D Print Manager',
  publisher: '3D Print Manager',
  robots: {
    index: false, // Private application
    follow: false,
  },
  // PWA metadata
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    title: '3D Print Manager',
    description: 'Sistema di gestione automazione stampe 3D',
    siteName: '3D Print Manager',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" className={inter.variable}>
      <head>
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="//api.supabase.co" />
        
        {/* Preload critical CSS */}
        <link rel="preload" href="/globals.css" as="style" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Performance hints */}
        <meta httpEquiv="Accept-CH" content="DPR, Viewport-Width, Width" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <div id="app-root" className="min-h-screen bg-gray-50">
            {children}
          </div>
        </ErrorBoundary>
        
        {/* Performance monitoring script */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Basic performance monitoring
                if ('performance' in window) {
                  window.addEventListener('load', function() {
                    setTimeout(function() {
                      const perfData = performance.getEntriesByType('navigation')[0];
                      if (perfData) {
                        console.log('Page load time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
                      }
                    }, 0);
                  });
                }
              `
            }}
          />
        )}
      </body>
    </html>
  )
}
