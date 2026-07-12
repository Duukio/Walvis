import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Walvis',
  description: 'Tu espacio para comunicarte',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-800 text-white">
        {children}
      </body>
    </html>
  )
}