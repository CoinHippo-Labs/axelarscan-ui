import { Suspense } from 'react'

import { Transfer } from '@/components/Transfer'

export default function TransferPage({ params }) {
  return <Suspense><Transfer {...params} /></Suspense>
}
