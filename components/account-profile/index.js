import { useState, useEffect } from 'react'

import { ellipse, equals_ignore_case } from '../../lib/utils'
import accounts from '../../data/accounts'
  
export default ({
  address,
  ellipse_size = 10,
  prefix = process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
}) => {
  const [name, setName] = useState(null)

  useEffect(() => {
    if (address) {
      setName(
        accounts.find(a =>
          equals_ignore_case(a?.address, address) &&
          (
            !a?.environment ||
            equals_ignore_case(a.environment, environment)
          )
        )?.name ||
        address
      )
    }
  }, [address])

  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT

  const is_name = !equals_ignore_case(name, address)
  const length =
    ellipse_size *
    (
      is_name ?
        2 :
        1
    )
  prefix = is_name ?
    undefined :
    prefix

  return name &&
    (
      <span
        title={name}
      >
        <span className="xl:hidden">
          {ellipse(
            name,
            length,
            prefix,
          )}
        </span>
        <span className="hidden xl:block">
          {ellipse(
            name,
            length,
            prefix,
          )}
        </span>
      </span>
    )
}