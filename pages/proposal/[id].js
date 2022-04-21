import { useRouter } from 'next/router'

import Proposal from '../../components/proposals/proposal'

export default function ProposalId() {
  const router = useRouter()
  const { query } = { ...router }

  return (
    <Proposal id={query.id} />
  )
}