import { useRouter } from 'next/router'

import Transaction from '../../components/transactions/transaction'

export default function Tx() {
  const router = useRouter()
  const { query } = { ...router }

  return (
    <Transaction tx={query.tx} />
  )
}