'use client'

import { motion } from 'framer-motion'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export function Layout({ children }) {
  return (
    <div className="h-full">
      <motion.header layoutScroll className="contents lg:z-40">
        {process.env.NEXT_PUBLIC_STATUS_MESSAGE && (
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
      <div className="relative flex h-full flex-col">
        <main className="bg-white dark:bg-zinc-900 flex-auto">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
