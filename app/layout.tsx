import type { Metadata } from 'next'
import '../app/globals.css'

export const metadata: Metadata = {
  title: 'Möbius-Game',
  description: '서스펙트 프로젝트 · Möbius-Game',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
