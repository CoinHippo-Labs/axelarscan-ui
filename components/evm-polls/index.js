import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { HiOutlineClock } from 'react-icons/hi'

import Datatable from '../datatable'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { evm_polls } from '../../lib/api/evm-poll'
import { getChain, chainName } from '../../lib/object/chain'
import { number_format, name, ellipse, equals_ignore_case, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 25

export default () => {
  const {
    preferences,
    evm_chains,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }

  const router = useRouter()
  const {
    pathname,
    asPath,
  } = { ...router }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)

  useEffect(() => {
    if (asPath) {
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(asPath.indexOf('?') + 1)
      )

      const {
        pollId,
        chain,
        status,
        transactionId,
        transferId,
        depositAddress,
        voter,
        vote,
        fromTime,
        toTime,
      } = { ...params }

      setFilters({
        pollId,
        chain,
        status: [
          'completed',
          'failed',
          'comfirmed',
        ].includes(status?.toLowerCase()) ?
          status.toLowerCase() :
          undefined,
        transactionId,
        transferId,
        depositAddress,
        voter,
        vote: [
          'yes',
          'no',
          'unsubmitted',
        ].includes(vote?.toLowerCase()) ?
          vote.toLowerCase() :
          undefined,
        time: fromTime &&
          toTime &&
          [
            moment(Number(fromTime)),
            moment(Number(toTime)),
          ],
      })
    }
  }, [asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(
        is_interval ?
          moment().valueOf() :
          typeof fetchTrigger === 'number' ?
            null :
            0
      )
    }

    if (
      evm_chains_data &&
      pathname &&
      filters
    ) {
      triggering()
    }

    const interval = setInterval(() =>
      triggering(true),
      0.5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [evm_chains_data, pathname, filters])

  useEffect(() => {
    const getData = async () => {
      if (filters) {
        setFetching(true)

        if (!fetchTrigger) {
          setTotal(null)
          setData(null)
          setOffet(0)
        }

        let _data = !fetchTrigger ?
          [] :
          data || []
        const size = LIMIT
        const from = fetchTrigger === true || fetchTrigger === 1 ?
          _data.length :
          0

        const {
          pollId,
          chain,
          status,
          transactionId,
          transferId,
          depositAddress,
          voter,
          vote,
          time,
        } = { ...filters }

        const response = await evm_polls(
          {
            pollId,
            chain,
            status,
            transactionId,
            transferId,
            depositAddress,
            voter,
            vote,
            fromTime: time?.[0]?.unix(),
            toTime: time?.[1]?.unix(),
            from,
            size,
          },
        )

        if (response) {
          const {
            data,
            total,
          } = { ...response }

          setTotal(total)

          _data = _.orderBy(
            _.uniqBy(
              _.concat(
                (data || [])
                  .map(d => {
                    const {
                      transaction_id,
                      deposit_address,
                      transfer_id,
                      event,
                      participants,
                    } = { ...d }

                    const _data = {},
                      votes = []

                    Object.entries({ ...d })
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

                    const vote_options =
                      Object.entries(
                        _.groupBy(
                          (votes || [])
                            .map(v => {
                              const {
                                vote,
                              } = { ...v }

                              return {
                                ...v,
                                option: vote ?
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
                          value: (v || [])
                            .length,
                        }
                      })
                      .filter(v => v.value)
                      .map(v => {
                        const {
                          option,
                        } = { ...v }

                        return {
                          ...v,
                          i: option === 'yes' ?
                            0 :
                            option === 'no' ?
                              1 :
                              2
                        }
                      })

                    if (
                      participants?.length > 0 &&
                      vote_options.findIndex(v => v?.option === 'unsubmitted') < 0 &&
                      _.sumBy(
                        vote_options,
                        'value',
                      ) < participants.length
                    ) {
                      vote_options.push(
                        {
                          option: 'unsubmitted',
                          value: participants.length -
                            _.sumBy(
                              vote_options,
                              'value',
                            ),
                        }
                      )
                    }

                    vote_options = _.orderBy(
                      vote_options,
                      ['i'],
                      ['asc'],
                    )

                    return {
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
                      vote_options,
                      _url: `/${event?.includes('token_sent') ? 'sent' : event?.includes('contract_call') || !(event?.includes('transfer') || deposit_address) ? 'gmp' : 'transfer'}/${transaction_id || (transfer_id ? `?transfer_id=${transfer_id}` : '')}`,
                    }
                  }),
                _data,
              ),
              'id',
            ),
            ['created_at.ms'],
            ['desc'],
          )

          setData(_data)
        }
        else if (!fetchTrigger) {
          setTotal(0)
          setData([])
        }

        setFetching(false)
      }
    }

    getData()
  }, [fetchTrigger])

  useEffect(() => {
    if (data) {
      setTypes(
        _.countBy(
          _.uniqBy(
            data,
            'id',
          )
          .map(d => d?.event)
          .filter(t => t)
        )
      )
    }
  }, [data])

  const data_filtered = data?.filter(d =>
    !(filterTypes?.length > 0) ||
    filterTypes.includes(d?.event) ||
    (
      filterTypes.includes('undefined') &&
      !d?.event
    )
  )

  return (
    data ?
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-2 -mt-0.5">
          {typeof total === 'number' && (
            <div className="flex items-center space-x-1.5 sm:mb-1 ml-2 sm:ml-0">
              <span className="tracking-wider text-sm font-semibold">
                {number_format(
                  total,
                  '0,0',
                )}
              </span>
              <span className="tracking-wider text-sm">
                Results
              </span>
            </div>
          )}
          <div className="overflow-x-auto block sm:flex sm:flex-wrap items-center justify-start sm:justify-end sm:space-x-2.5">
            {Object.entries({ ...types })
              .map(([k, v]) => (
                <div
                  key={k}
                  onClick={() =>
                    setFilterTypes(
                      _.uniq(
                        filterTypes?.includes(k) ?
                          filterTypes
                            .filter(t => !equals_ignore_case(t, k)) :
                        _.concat(
                          filterTypes || [],
                          k,
                        )
                      )
                    )
                  }
                  className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'font-bold' : 'text-slate-400 hover:text-black dark:text-slate-600 dark:hover:text-white hover:font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs space-x-1 mr-1 mt-1`}
                  style={{ textTransform: 'none' }}
                >
                  <span>
                    {k === 'undefined' ?
                      'Unknown' :
                      (name(k) || '')
                        .split(' ')
                        .join('')
                    }
                  </span>
                  <span className="text-blue-500 dark:text-white">
                    {number_format(
                      v,
                      '0,0',
                    )}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
        <Datatable
          columns={[
            {
              Header: 'Poll ID',
              accessor: 'id',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                return (
                  <div className="flex flex-col mb-3">
                    <div className="flex items-center space-x-1">
                      <Link href={`/evm-poll/${value}`}>
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                        >
                          {ellipse(
                            value,
                            10,
                          )}
                        </a>
                      </Link>
                      <Copy
                        value={value}
                      />
                    </div>
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap',
            },
            {
              Header: 'Chain',
              accessor: 'sender_chain',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                const chain_data = getChain(
                  value,
                  evm_chains_data,
                )
                const {
                  image,
                } = { ...chain_data }

                return (
                  <div className="h-6 flex items-center space-x-2">
                    {chain_data ?
                      <>
                        {image && (
                          <Image
                            src={image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-base font-semibold">
                          {chainName(chain_data)}
                        </span>
                      </> :
                      <span className="font-medium">
                        {name(value)}
                      </span>
                    }
                  </div>
                )
              },
            },
            {
              Header: 'Event',
              accessor: 'event',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  _url,
                } = { ...props.row.original }

                return value &&
                  (
                    <Link href={_url}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-min bg-slate-200 dark:bg-slate-800 rounded capitalize text-sm lg:text-base font-medium -mt-0.5 py-1 px-2"
                      >
                        {name(value)
                          .split(' ')
                          .join('')
                        }
                      </a>
                    </Link>
                  )
              },
            },
            {
              Header: 'Transaction ID',
              accessor: 'transaction_id',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  sender_chain,
                } = { ...props.row.original }

                const chain_data = getChain(
                  sender_chain,
                  evm_chains_data,
                )
                const {
                  explorer,
                } = { ...chain_data }
                const {
                  url,
                  transaction_path,
                } = { ...explorer }

                return value && 
                  (
                    <div className="h-6 flex items-center space-x-1">
                      {url ?
                        <>
                          <a
                            href={`${url}/${transaction_path?.replace('{tx}', value)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {ellipse(
                              value,
                              12,
                            )}
                          </a>
                          <Copy
                            size={20}
                            value={value}
                          />
                        </> :
                        <Copy
                          size={20}
                          value={value}
                          title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-medium">
                            {ellipse(
                              value,
                              16,
                            )}
                          </span>}
                        />
                      }
                    </div>
                  )
              },
              headerClassName: 'whitespace-nowrap',
            },
            {
              Header: 'Transfer ID',
              accessor: 'transfer_id',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  _url,
                } = { ...props.row.original }

                return value && 
                  (
                    <div className="flex items-center space-x-1">
                      <a
                        href={_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                      >
                        {value}
                      </a>
                      <Copy
                        size={20}
                        value={value}
                      />
                    </div>
                  )
              },
              headerClassName: 'whitespace-nowrap',
            },
            {
              Header: 'Status',
              accessor: 'status',
              disableSortBy: true,
              Cell: props => {
                const {
                  confirmation,
                  failed,
                  success,
                  votes,
                } = { ...props.row.original }

                const status = success ?
                  'completed' :
                  failed ?
                    'failed' :
                    confirmation ||
                    votes?.findIndex(v => v?.confirmed) > -1 ?
                      'confirmed' :
                      'pending'

                return (
                  <div className={`${['completed', 'confirmed'].includes(status) ? 'text-green-400 dark:text-green-300' : status === 'failed' ? 'text-red-500 dark:text-red-600' : 'text-blue-400 dark:text-blue-500'} flex items-center space-x-1`}>
                    {[
                      'completed',
                      'confirmed',
                    ].includes(status) ?
                      <BiCheckCircle
                        size={20}
                      /> :
                      status === 'failed' ?
                        <BiXCircle
                          size={20}
                        /> :
                        <HiOutlineClock
                          size={20}
                        />
                    }
                    <span className="uppercase text-sm font-semibold">
                      {status}
                    </span>
                  </div>
                )
              },
            },
            {
              Header: 'Participations',
              accessor: 'vote_options',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  id,
                } = { ...props.row.original }

                return value &&
                  (
                    <Link href={`/evm-poll/${id}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1"
                      >
                        {value
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
                                <span className="uppercase">
                                  {(option || '')
                                    .replace(
                                      'submitted',
                                      '',
                                    )
                                  }
                                </span>
                              </div>
                            )
                          })
                        }
                      </a>
                    </Link>
                  )
              },
            },
            {
              Header: 'Updated',
              accessor: 'created_at.ms',
              disableSortBy: true,
              Cell: props => (
                <TimeAgo
                  time={props.value}
                  className="ml-auto"
                />
              ),
              headerClassName: 'justify-end text-right',
            },
          ]}
          data={data_filtered}
          noPagination={data_filtered.length <= 10}
          defaultPageSize={LIMIT}
          className="min-h-full no-border"
        />
        {
          data.length > 0 &&
          (
            typeof total !== 'number' ||
            data.length < total
          ) &&
          (
            !fetching ?
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setOffet(data.length)
                    setFetchTrigger(
                      typeof fetchTrigger === 'number' ?
                        true :
                        1
                    )
                  }}
                  className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-500 font-normal hover:font-medium mx-auto"
                >
                  Load more
                </button>
              </div> :
              <div className="flex justify-center">
                <ColorRing
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              </div>
          )
        }
      </div> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}