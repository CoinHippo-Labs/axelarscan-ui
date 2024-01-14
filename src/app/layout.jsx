import { Inter, Lexend } from 'next/font/google'
import clsx from 'clsx'

import { Providers } from '@/app/providers'
import { Layout } from '@/components/Layout'

import '@/styles/tailwind.css'

export const metadata = {
  title: {
    template: '%s - Axelarscan',
    default: process.env.NEXT_PUBLIC_DEFAULT_TITLE,
  },
  description: process.env.NEXT_PUBLIC_DEFAULT_DESCRIPTION,
  image: '/images/ogimage.png',
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={clsx(
        'h-full scroll-smooth bg-white dark:bg-zinc-900 antialiased',
        inter.variable,
        lexend.variable,
      )}
    >
      <body className="flex min-h-full bg-white dark:bg-zinc-900 antialiased">
        <Providers>
          <div className="w-full">
            <Layout>{children}</Layout>
          </div>
        </Providers>
      </body>
    </html>
  )
}
