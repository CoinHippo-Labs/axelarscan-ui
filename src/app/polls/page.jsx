import { Suspense } from 'react'

import { EVMPolls } from '@/components/EVMPolls'

export default function PollsPage() {
  return <Suspense><EVMPolls /></Suspense>
}
