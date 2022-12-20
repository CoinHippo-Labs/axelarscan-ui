import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import _ from 'lodash'

import Info from './info'
import Votes from './votes'
import { evm_polls } from '../../lib/api/evm-polls'
import { getBlock, transactions_by_events, getTransaction } from '../../lib/api/lcd'
import { number_format, capitalize } from '../../lib/utils'

export default () => {
  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    id,
  } = { ...query }

  const [poll, setPoll] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (id) {
          const response =
            await evm_polls(
              {
                pollId: id,
              },
            )

          const data =
            Array.isArray(response?.data) &&
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
                  votes:
                    _.orderBy(
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

            const {
              height,
              event,
              participants,
            } = { ..._data }

            const confirmation_vote = votes
              .find(v =>
                v?.confirmed
              )

            if (
              height &&
              (
                !confirmation_vote ||
                (
                  participants &&
                  votes.length < participants.length
                )
              )
            ) {
              for (let i = -3; i <= 5; i++) {
                const _height = height + i

                getBlock(_height)

                await transactions_by_events(
                  `tx.height=${_height}`,
                )
              }
            }
            if (
              !event &&
              confirmation_vote
            ) {
              const {
                id,
              } = { ...confirmation_vote }

              if (id) {
                getTransaction(id)
              }
            }
          }
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(),
          0.5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [id],
  )

  const {
    data,
  } = { ...poll }
  const {
    participants,
    votes,
  } = { ...data }

  const matched = poll?.id === id

  let vote_options =
    matched ?
      Object.entries(
        _.groupBy(
          (votes || [])
            .map(v => {
              const {
                vote,
              } = { ...v }

              return {
                ...v,
                option:
                  vote ?
                    'yes' :
                    typeof vote === 'boolean' ?
                      'no' :
                      'unsubmitted',
              }
            }),
          'option',
        )
      )
      .map(([k, v]) => {
        return {
          option: k,
          value:
            (v || [])
              .length,
        }
      })
      .filter(v => v.value) :
      []

  if (
    matched &&
    participants?.length > 0 &&
    vote_options
      .findIndex(v =>
        v?.option === 'unsubmitted'
      ) < 0 &&
    _.sumBy(
      vote_options,
      'value',
    ) < participants.length
  ) {
    vote_options
      .push(
        {
          option: 'unsubmitted',
          value:
            participants.length -
            _.sumBy(
              vote_options,
              'value',
            ),
        }
      )
  }

  vote_options =
    _.orderBy(
      vote_options
        .map(v => {
          const {
            option,
          } = { ...v }

          return {
            ...v,
            i:
              option === 'yes' ?
                0 :
                option === 'no' ?
                  1 :
                  2
          }
        }),
      ['i'],
      ['asc'],
    )

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
            votes
          </span>
          <div className="flex items-center space-x-1">
            {vote_options
              .map((v, i) => {
                const {
                  option,
                  value,
                } = { ...v }

                return (
                  <div
                    key={i}
                    className={`${['yes'].includes(option) ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700' : ['no'].includes(option) ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600'} rounded-xl whitespace-nowrap text-xs font-semibold space-x-1 py-0.5 px-2`}
                  >
                    <span>
                      {number_format(
                        value,
                        '0,0',
                      )}
                    </span>
                    <span>
                      {capitalize(option)}
                    </span>
                  </div>
                )
              })
            }
          </div>
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