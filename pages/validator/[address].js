import { useRouter } from 'next/router'

import Validator from '../../components/validator'

export default function ValidatorAddress() {
  const router = useRouter()
  const { query } = { ...router }

  return (
    <div className="max-w-8xl mx-auto">
      <Validator address={query.address} />
    </div>
  )
}