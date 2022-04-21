import { useRouter } from 'next/router'

import ValidatorsTable from '../../components/validators/validators-table'

export default function ValidatorsStatus() {
  const router = useRouter()
  const { query } = { ...router }

  return (
    <ValidatorsTable status={query.status} />
  )
}