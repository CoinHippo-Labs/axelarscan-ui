import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

import Info from './info'
import Data from './data'
import Spinner from '../../spinner'
import { getTransaction } from '../../../lib/api/lcd'
import { equalsIgnoreCase } from '../../../lib/utils'

export default () => {
  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (tx) {
          setData(await getTransaction(tx))
        }
      }
      getData()
    },
    [tx],
  )

  const matched = equalsIgnoreCase(tx, data?.tx_response?.txhash)

  return (
    <div className="children px-3">
      {data && matched ?
        <div className="max-w-6xl space-y-4 sm:space-y-6 pt-6 sm:pt-8 mx-auto">
          <Info data={data} />
          <Data data={data} />
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}