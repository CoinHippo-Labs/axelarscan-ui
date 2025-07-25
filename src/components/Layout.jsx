'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export function Layout({ children }) {
  const pathname = usePathname()

  const lite = pathname.startsWith('/lite/')

  const noHeader = lite
  const noStatusMessage = lite || ['/tvl'].includes(pathname)
  const noFooter = lite || ['/tvl'].includes(pathname)

  return (
    <div className="h-full">
      {!noHeader && (
        <>
          <motion.header layoutScroll className="contents lg:z-40">
            {process.env.NEXT_PUBLIC_STATUS_MESSAGE && !noStatusMessage && (
              <div className="w-full bg-blue-600 dark:bg-blue-700 overflow-x-auto flex items-center p-3">
                <div className="flex flex-wrap items-center text-white text-sm font-medium text-center gap-x-2 mx-auto">
                  <span className="status-message">
                    <Linkify>
                      {parse(process.env.NEXT_PUBLIC_STATUS_MESSAGE)}
                    </Linkify>
                  </span>
                </div>
              </div>
            )}
            <Header />
          </motion.header>
        </>
      )}
      <div className={clsx('relative flex flex-col', !noFooter && 'h-full')}>
        <main className="bg-white dark:bg-zinc-900 flex-auto">
          {children}
        </main>
        {!noFooter && <Footer />}
      </div>
    </div>
  )
}
