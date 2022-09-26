import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import _ from 'lodash'

import Info from './info'
import Votes from './votes'
import { evm_polls } from '../../lib/api/evm-poll'

export default () => {
  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    id,
  } = { ...query }

  const [poll, setPoll] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (id) {
        const response = await evm_polls(
          {
            pollId: id,
          },
        )

        const data = Array.isArray(response?.data) &&
           _.head(response.data)

        if (data) {
          const _data = {},
            votes = []

          Object.entries(data)
            .forEach(([k, v]) => {
              if (k) {
                if (k.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)) {
                  votes.push(v)
                }
                else {
                  _data[k] = v
                }
              }
            })

          setPoll(
            {
              data: {
                ..._data,
                votes: _.orderBy(
                  votes,
                  [
                    'height',
                    'created_at',
                  ],
                  [
                    'desc',
                    'desc',
                  ],
                ),
              },
              id,
            }
          )
        }
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      0.5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [id])

  const {
    data,
  } = { ...poll }
  const {
    votes,
  } = { ...data }

  const matched = poll?.id === id

  return (
    <div className="space-y-5 mt-2 mb-6 mx-auto">
      <Info
        data={
          matched &&
          data
        }
      />
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="capitalize tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium">
            Votes
          </span>
        </div>
        <Votes
          data={
            matched &&
            data
          }
        />
      </div>
    </div>
  )
}