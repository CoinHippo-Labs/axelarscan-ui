'use client'

import { motion } from 'framer-motion'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export function Layout({ children }) {
  return (
    <div className="h-full">
      <motion.header layoutScroll className="contents lg:z-40">
        <Header />
      </motion.header>
      <div className="relative flex h-full flex-col">
        <main className="bg-white dark:bg-zinc-900 flex-auto">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
