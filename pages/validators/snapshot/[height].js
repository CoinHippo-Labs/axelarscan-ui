import { useRouter } from 'next/router'

import Snapshot from '../../../components/snapshot'

import { numberFormat } from '../../../lib/utils'

export default function SnapshotIndex() {
  const router = useRouter()
  const { query } = { ...router }

  return (
    <Snapshot height={query?.height} />
  )
}