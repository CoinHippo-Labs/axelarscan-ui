import { Suspense } from 'react'

import { Validators } from '@/components/Validators'

export default function ValidatorsPage() {
  return <Suspense><Validators status="active" /></Suspense>
}
