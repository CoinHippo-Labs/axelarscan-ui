import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import _ from 'lodash'

import Info from './info'
import Events from './events'
import Transactions from '../../transactions'
import Spinner from '../../spinner'
import { getBlock } from '../../../lib/api/lcd'
import { toArray, equalsIgnoreCase, toHex, normalizeQuote } from '../../../lib/utils'

const BLOCK_EVENTS_FIELDS = ['begin_block_events', 'end_block_events']

export default () => {
  const router = useRouter()
  const { query } = { ...router }
  const { height } = { ...query }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (height) {
          const response = await getBlock(height)
          if (response) {
            const { block } = { ...await getBlock(Number(height) + 1) }
            const { last_commit } = { ...block }
            const { round, validators } = { ...last_commit }

            if (typeof round === 'number') {
              response.round = round
            }
            if (validators) {
              response.validators = validators
            }

            BLOCK_EVENTS_FIELDS.forEach(f => {
              if (response?.[f]) {
                response[f] = Object.entries(_.groupBy(response[f], 'type')).map(([k, v]) => { return { type: k, data: toArray(v).map(e => Object.fromEntries(toArray(e.attributes).map(a => [a.key, normalizeQuote(toHex(a.value))]))) } })
              }
            })
          }
          setData(response)
        }
      }
      getData()
    },
    [height],
  )

  const { header } = { ...data?.block }
  const matched = equalsIgnoreCase(height?.toString(), header?.height)

  return (
    <div className="children px-3">
      {data && matched ?
        <div className="max-w-6xl space-y-4 sm:space-y-6 pt-6 sm:pt-8 mx-auto">
          <Info data={data} />
          <Transactions />
          <Events data={data} />
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}