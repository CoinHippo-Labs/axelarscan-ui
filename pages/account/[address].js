import { useRouter } from 'next/router'

import Account from '../../components/account'

export default function AccountIndex() {
  const router = useRouter()
  const { query } = { ...router }

  return (
    <Account address={query.address} />
  )
}