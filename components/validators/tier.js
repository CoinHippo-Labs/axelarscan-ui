import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { DebounceInput } from 'react-debounce-input'
import { ProgressBar, TailSpin, ColorRing } from 'react-loader-spinner'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import Image from '../image'
import { ProgressBarWithText } from '../progress-bars'
import { uptimes as getUptimes, heartbeats as getHeartbeats, evm_votes as getEvmVotes, evm_polls as getEvmPolls, keygens as getKeygens, sign_attempts as getSignAttempts } from '../../lib/api/index'
import { chainManager } from '../../lib/object/chain'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/heartbeat'
import { number_format, name, ellipse, loader_color } from '../../lib/utils'

export default () => {
  const {
    preferences,
    evm_chains,
    status,
    validators,
    validators_chains,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        status: state.status,
        validators: state.validators,
        validators_chains: state.validators_chains,
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
  const {
    status_data,
  } = { ...status }
  const {
    validators_data,
  } = { ...validators }
  const {
    validators_chains_data,
  } = { ...validators_chains }

  const [validatorsData, setValidatorsData] = useState(null)
  const [fromBlock, setFromBlock] = useState(null)
  const [toBlock, setToBlock] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(null)

  useEffect(() => {
    const {
      latest_block_height,
    } = { ...status_data }

    if (latest_block_height) {
      if (!toBlock) {
        setToBlock(latest_block_height)
      }

      if (!fromBlock) {
        setFromBlock(
          latest_block_height -
          Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) * 50
        )
      }

      if (
        !fromBlock &&
        !toBlock
      ) {
        setFetchTrigger(moment().valueOf())
      }
    }
  }, [status_data])

  useEffect(() => {
    if (
      toBlock &&
      toBlock < fromBlock
    ) {
      setToBlock(fromBlock + 1)
    }
  }, [fromBlock])

  useEffect(() => {
    if (
      fromBlock &&
      toBlock &&
      fromBlock > toBlock
    ) {
      setFromBlock(toBlock - 1)
    }
  }, [toBlock])

  useEffect(() => {
    const getData = async () => {
      if (
        validators_data &&
        validators_chains_data &&
        fetchTrigger &&
        fromBlock &&
        toBlock
      ) {
        setFetching(true)

        const num_blocks = toBlock - fromBlock + 1
        const num_blocks_per_heartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)

        let _data = validators_data
          .map(v => {
            const {
              operator_address,
            } = { ...v }

            return {
              ...v,
              supported_chains: Object.entries({ ...validators_chains_data })
                .filter(([k, _v]) => _v?.includes(operator_address))
                .map(([k, _v]) => k),
            }
          })

        // uptimes
        let response = await getUptimes(
          {
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } },
            },
            aggs: {
              uptimes: {
                terms: { field: 'validators.keyword', size: _data.length },
              },
            },
          },
        )

        if (response?.data) {
          const {
            data,
          } = { ...response }
          let {
            total,
          } = { ...response }

          total = total ||
            num_blocks

          _data = _data
            .map(v => {
              const {
                consensus_address,
              } = { ...v }

              const up = data[consensus_address] ||
                0

              let percent = up * 100 / total

              percent = typeof percent === 'number' ?
                percent > 100 ?
                  100 :
                  percent < 0 ?
                    0 :
                    percent :
                undefined

              return {
                ...v,
                uptimes: {
                  up,
                  total,
                  percent,
                },
              }
            })
        }

        // heartbeats
        const first = firstHeartbeatBlock(fromBlock)
        const last = lastHeartbeatBlock(toBlock)

        response = await getHeartbeats(
          {
            query: {
              bool: {
                must: [
                  { range: { height: { gte: first, lte: toBlock } } },
                ],
              },
            },
            aggs: {
              heartbeats: {
                terms: { field: 'sender.keyword', size: _data.length },
              },
            },
          },
        )

        if (response?.data) {
          const {
            data,
          } = { ...response }

          const total = Math.floor(
            (last - first) /
            num_blocks_per_heartbeat
          ) + 1

          _data = _data
            .map(v => {
              const {
                broadcaster_address,
              } = { ...v }

              const up = data[broadcaster_address] ||
                0

              let percent = up * 100 / total

              percent = typeof percent === 'number' ?
                percent > 100 ?
                  100 :
                  percent < 0 ?
                    0 :
                    percent :
                undefined

              return {
                ...v,
                heartbeats: {
                  up,
                  total,
                  percent,
                },
              }
            })
        }

        // evm votes
        response = await getEvmVotes(
          {
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } },
            },
            aggs: {
              voters: {
                terms: { field: 'voter.keyword', size: 1000 },
                aggs: {
                  chains: {
                    terms: { field: 'sender_chain.keyword', size: 1000 },
                    aggs: {
                      votes: {
                        terms: { field: 'vote' },
                      },
                    },
                  },
                },
              },
            },
          },
        )

        if (response?.data) {
          const {
            data,
          } = { ...response }

          _data = _data
            .map(v => {
              const {
                broadcaster_address,
              } = { ...v }

              const votes = {
                ...data[broadcaster_address],
              }
              const {
                chains,
              } = { ...votes }

              const get_votes = vote =>
                _.sum(
                  Object.entries({ ...chains })
                    .map(c =>
                      _.last(
                        Object.entries({ ..._.last(c)?.votes })
                          .find(_v => _.head(_v) === vote?.toString())
                      ) ||
                        0
                    )
                )

              return {
                ...v,
                votes,
                total_votes: votes.total ||
                  0,
                total_yes_votes: get_votes(true),
                total_no_votes: get_votes(false),
              }
            })
        }

        // evm polls
        response = await getEvmPolls(
          {
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } },
            },
            aggs: {
              chains: {
                terms: { field: 'sender_chain.keyword', size: 1000 },
              },
            },
            track_total_hits: true,
          },
        )

        if (response?.data) {
          const {
            data,
            total,
          } = { ...response }

          const total_polls = total ||
            _.maxBy(
              data,
              'total_votes',
            )?.total_votes ||
            0

          _data = _data
            .map(v => {
              const {
                votes,
                total_votes,
                total_yes_votes,
                total_no_votes,
              } = { ...v }
              const {
                chains,
              } = { ...votes }

              Object.entries({ ...chains })
                .forEach(([k, _v]) => {
                  const {
                    total,
                  } = { ..._v }

                  chains[k] = {
                    ..._v,
                    total_polls: data[k] ||
                      total,
                  }
                })

              return {
                ...v,
                votes: {
                  ...votes,
                  chains,
                },
                total_votes: total_votes > total_polls ?
                  total_polls :
                  total_votes,
                total_yes_votes: total_yes_votes > total_polls ?
                  total_polls :
                  total_yes_votes,
                total_no_votes: total_no_votes > total_polls ?
                  total_polls :
                  total_no_votes,
                total_polls,
              }
            })
            .map(v => {
              const {
                total_yes_votes,
                total_no_votes,
                total_polls,
              } = { ...v }

              return {
                ...v,
                evm_votes: {
                  yes: total_yes_votes,
                  no: total_no_votes,
                  total: total_polls,
                  percent: total_yes_votes * 100 / total_polls,
                },
              }
            })
        }

        // keygens
        response = await getKeygens(
          {
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } }
            },
            aggs: {
              keygens: {
                terms: { field: 'snapshot_validators.validators.validator.keyword', size: _data.length },
              },
            },
            size: 0,
            track_total_hits: true,
          },
        )

        if (response?.data) {
          const {
            data,
            total,
          } = { ...response }

          _data = _data
            .map(v => {
              const {
                operator_address,
              } = { ...v }

              let percent =
                (
                  data[operator_address] ||
                  0
                ) * 100 / total

              percent = typeof percent === 'number' ?
                percent > 100 ?
                  100 :
                  percent < 0 ?
                    0 :
                    percent :
                undefined

              return {
                ...v,
                keygens: {
                  participated: data[operator_address] ||
                    0,
                  total,
                  percent,
                }
              }
            })
        }

        // signs
        response = await getSignAttempts(
          {
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } },
            },
            aggs: {
              signs: {
                terms: { field: 'participants.keyword', size: _data.length },
              },
            },
            size: 0,
            track_total_hits: true,
          },
        )

        if (response?.data) {
          const {
            data,
            total,
          } = { ...response }

          _data = _data
            .map(v => {
              const {
                operator_address,
              } = { ...v }

              let percent = (
                data[operator_address] ||
                0
              ) * 100 / total

              percent = typeof percent === 'number' ?
                percent > 100 ?
                  100 :
                  percent < 0 ?
                    0 :
                    percent :
                undefined

              return {
                ...v,
                signs: {
                  participated: data[operator_address] ||
                    0,
                  total,
                  percent,
                }
              }
            })
        }

        _data = _data
          .map(v => {
            let {
              uptimes,
              heartbeats,
              evm_votes,
              keygens,
              signs,
            } = { ...v }

            uptimes = uptimes?.percent ||
              0
            heartbeats = heartbeats?.percent ||
              0
            evm_votes = evm_votes?.percent ||
              0
            keygens = keygens?.percent ||
              0
            signs = signs?.percent ||
              0

            return {
              ...v,
              scores: {
                uptimes,
                heartbeats,
                evm_votes,
                keygens,
                signs,
                total: (
                  (0.1 * uptimes) +
                  (0.2 * heartbeats) +
                  (0.3 * evm_votes) +
                  (0.1 * keygens) +
                  (0.1 * signs)
                ) / 0.7
              },
            }
          })

        setValidatorsData(data)
        setFetching(false)
      }
    }

    getData()
  }, [validators_data, validators_chains_data, fetchTrigger])

  const filterData = () => validatorsData?.filter(v => v)

  const data_filtered = filterData()

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <div className="flex items-center space-x-3">
        <span className="text-base font-semibold">
          Block
        </span>
        <DebounceInput
          debounceTimeout={300}
          size="small"
          type="number"
          placeholder="From"
          disabled={fetching}
          value={fromBlock}
          onChange={e => {
            const regex = /^[0-9.\b]+$/

            let block

            if (
              e.target.value === '' ||
              regex.test(e.target.value)
            ) {
              block = e.target.value
            }

            block = block < 0 ?
              0 :
              block

            setFromBlock(
              block && !isNaN(block) ?
                Number(block) :
                block
            )
          }}
          onWheel={e => e.target.blur()}
          onKeyDown={e =>
            [
              'e',
              'E',
              '-',
            ].includes(e.key) &&
            e.preventDefault()
          }
          className={`w-24 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${fetching ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-lg text-base font-medium py-1 px-2.5`}
        />
        <span className="text-slate-400 dark:text-slate-200 text-base font-medium">
          -
        </span>
        <DebounceInput
          debounceTimeout={300}
          size="small"
          type="number"
          placeholder="To"
          disabled={fetching}
          value={toBlock}
          onChange={e => {
            const regex = /^[0-9.\b]+$/

            let block

            if (
              e.target.value === '' ||
              regex.test(e.target.value)
            ) {
              block = e.target.value
            }

            block = block < 0 ?
              0 :
              block

            setToBlock(
              block && !isNaN(block) ?
                Number(block) :
                block
            )
          }}
          onWheel={e => e.target.blur()}
          onKeyDown={e =>
            [
              'e',
              'E',
              '-',
            ].includes(e.key) &&
            e.preventDefault()
          }
          className={`w-24 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${fetching ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-lg text-base font-medium py-1 px-2.5`}
        />
        <button
          disabled={
            fetching ||
            typeof fromBlock !== 'number' ||
            typeof toBlock !== 'number'
          }
          onClick={() => setFetchTrigger(moment().valueOf())}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 ${fetching || typeof fromBlock !== 'number' || typeof toBlock !== 'number' ? 'cursor-not-allowed' : ''} rounded-lg flex items-center text-white font-medium hover:font-semibold space-x-1 py-1 px-2`}
        >
          {
            fetching &&
            (
              <TailSpin
                color="white"
                width="16"
                height="16"
              />
            )
          }
          <span>
            Query
          </span>
        </button>
      </div>
      {data_filtered ?
        <Datatable
          columns={[
            {
              Header: '#',
              accessor: 'i',
              sortType: (a, b) => a.original.i > b.original.i ?
                1 :
                -1,
              Cell: props => (
                <span className="font-medium">
                  {number_format(
                    (
                      props.flatRows?.indexOf(props.row) > -1 ?
                        props.flatRows.indexOf(props.row) :
                        props.value
                    ) + 1,
                    '0,0',
                  )}
                </span>
              ),
            },
            {
              Header: 'Validator',
              accessor: 'operator_address',
              sortType: (a, b) =>
                (
                  a.original.description?.moniker ||
                  a.original.operator_address
                ) >
                (
                  b.original.description?.moniker ||
                  b.original.operator_address
                ) ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  description,
                } = { ...props.row.original }
                const {
                  moniker,
                } = { ...description }

                return (
                  description ?
                    <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                      <Link href={`/validator/${value}`}>
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ValidatorProfile
                            validator_description={description}
                          />
                        </a>
                      </Link>
                      <div className="flex flex-col">
                        {moniker && (
                          <Link href={`/validator/${value}`}>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                            >
                              {ellipse(
                                moniker,
                                10,
                              )}
                            </a>
                          </Link>
                        )}
                        <div className="flex items-center space-x-1">
                          <Link href={`/validator/${value}`}>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 dark:text-slate-600 text-xs"
                            >
                              {ellipse(
                                value,
                                6,
                                process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                              )}
                            </a>
                          </Link>
                          <Copy
                            size={16}
                            value={value}
                          />
                        </div>
                      </div>
                    </div> :
                    value ?
                      <div className="flex items-center space-x-1">
                        <Link href={`/validator/${value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {ellipse(
                              value,
                              6,
                              process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                            )}
                          </a>
                        </Link>
                        <Copy
                          value={value}
                        />
                      </div> :
                      <span>
                        -
                      </span>
                )
              },
            },
            {
              Header: 'Uptime [0.1]',
              accessor: 'uptimes.percent',
              sortType: (a, b) => a.original.uptimes?.percent > b.original.uptimes?.percent ?
                1 :
                -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  start_height,
                } = { ...props.row.original }

                return (
                  <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                    {typeof value === 'number' ?
                      value > 0 ?
                        <div className="w-full mt-1">
                          <ProgressBarWithText
                            width={value}
                            text={<div className="text-white text-2xs font-semibold mx-1.5">
                              {number_format(
                                value,
                                '0,0.00',
                              )}%
                            </div>}
                            color="bg-green-400 dark:bg-green-500 rounded-lg"
                            backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 hover:bg-opacity-50 rounded-lg"
                            className={`h-4 flex items-center justify-${value < 33 ? 'start' : 'end'}`}
                          />
                        </div> :
                        <span className="h-4 text-slate-300 dark:text-slate-600">
                          No Uptimes
                        </span> :
                      <div className="mt-0.5">
                        <ColorRing
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                      </div>
                    }
                    {typeof start_height === 'number' && (
                      <div className="text-2xs space-x-1">
                        <span className="text-slate-400 dark:text-slate-200 font-medium space-x-0.5">
                          <span>
                            Started
                          </span>
                          <span>
                            @
                          </span>
                        </span>
                        <Link href={`/block/${start_height}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium"
                          >
                            {number_format(
                              start_height,
                              '0,0',
                            )}
                          </a>
                        </Link>
                      </div>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Heartbeat [0.2]',
              accessor: 'heartbeats.percent',
              sortType: (a, b) => a.original.heartbeats?.percent > b.original.heartbeats?.percent ?
                1 :
                -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  start_proxy_height,
                } = { ...props.row.original }

                return (
                  <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                    {typeof value === 'number' ?
                      value > 0 ?
                        <div className="w-full mt-1">
                          <ProgressBarWithText
                            width={value}
                            text={<div className="text-white text-2xs font-semibold mx-1.5">
                              {number_format(
                                value,
                                '0,0.00',
                              )}
                              %
                            </div>}
                            color="bg-green-400 dark:bg-green-500 rounded-lg"
                            backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 hover:bg-opacity-50 rounded-lg"
                            className={`h-4 flex items-center justify-${value < 33 ? 'start' : 'end'}`}
                          />
                        </div> :
                        <span className="h-4 text-slate-300 dark:text-slate-600 mt-0.5">
                          No Heartbeats
                        </span> :
                      <div className="mt-0.5">
                        <ColorRing
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                      </div>
                    }
                    {typeof start_proxy_height === 'number' && (
                      <div className="text-2xs space-x-1">
                        <span className="text-slate-400 dark:text-slate-200 font-medium space-x-0.5">
                          <span>
                            Registered
                          </span>
                          <span>
                            @
                          </span>
                        </span>
                        <Link href={`/block/${start_proxy_height}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium"
                          >
                            {number_format(
                              start_proxy_height,
                              '0,0',
                            )}
                          </a>
                        </Link>
                      </div>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'EVM votes [0.3]',
              accessor: 'votes',
              sortType: (a, b) => a.original.total_yes_votes > b.original.total_yes_votes ?
                1 :
                a.original.total_yes_votes < b.original.total_yes_votes ?
                  -1 :
                  a.original.total_no_votes <= b.original.total_no_votes ?
                    1 :
                    -1,
              Cell: props => (
                <div className="flex flex-col justify-center space-y-0.5 mt-0.5">
                  {props.value ?
                    Object.keys({ ...props.value.chains }).length > 0 ?
                      Object.entries(props.value.chains)
                        .map(([k, v]) => {
                          const image = chainManager.image(
                            k,
                            evm_chains_data,
                          )
                          const {
                            votes,
                            total_polls,
                            total,
                          } = { ...v }

                          return (
                            <div
                              key={k}
                              className="min-w-max flex items-center justify-between space-x-2"
                            >
                              <div className="flex items-center space-x-2">
                                {image && (
                                  <Image
                                    src={image}
                                    title={chainManager.name(
                                      k,
                                      evm_chains_data,
                                    )}
                                    className="w-5 h-5 rounded-full"
                                  />
                                )}
                                <span className={`${votes?.true ? 'text-green-400 dark:text-green-300 font-semibold' : 'text-slate-300 dark:text-slate-700 font-normal'} -mt-0.5`}>
                                  {number_format(
                                    votes?.true ||
                                      0,
                                    '0,0',
                                  )} Y
                                </span>
                                <span className={`${votes?.false ? 'text-red-500 dark:text-red-600 font-semibold' : 'text-slate-300 dark:text-slate-700 font-normal'} -mt-0.5`}>
                                  {number_format(
                                    votes?.false ||
                                      0,
                                    '0,0',
                                  )} N
                                </span>
                                {total_polls - total > 0 && (
                                  <span className="text-slate-400 dark:text-slate-500 font-semibold -mt-0.5">
                                    {number_format(
                                      total_polls - total,
                                      '0,0',
                                    )} UN
                                  </span>
                                )}
                              </div>
                              <span className="text-blue-400 dark:text-blue-200 font-medium -mt-0.5">
                                [
                                {number_format(
                                  v?.total_polls || 0,
                                  '0,0',
                                )}
                                ]
                              </span>
                            </div>
                          )
                        }) :
                      <span className="text-slate-300 dark:text-slate-600">
                        No Votes
                      </span> :
                    <ColorRing
                      color={loader_color(theme)}
                      width="24"
                      height="24"
                    />
                  }
                </div>
              ),
              headerClassName: 'whitespace-nowrap',
            },
            {
              Header: 'Keygens [0.1]',
              accessor: 'keygens.percent',
              sortType: (a, b) => a.original.keygens?.percent > b.original.keygens?.percent ?
                1 :
                -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                return (
                  <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                    {typeof value === 'number' ?
                      value > 0 ?
                        <div className="w-full mt-1">
                          <ProgressBarWithText
                            width={value}
                            text={<div className="text-white text-2xs font-semibold mx-1.5">
                              {number_format(
                                value,
                                '0,0.00',
                              )}
                              %
                            </div>}
                            color="bg-green-400 dark:bg-green-500 rounded-lg"
                            backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 hover:bg-opacity-50 rounded-lg"
                            className={`h-4 flex items-center justify-${value < 33 ? 'start' : 'end'}`}
                          />
                        </div> :
                        <span className="h-4 text-slate-300 dark:text-slate-600 mt-0.5">
                          No Participations
                        </span> :
                      <div className="mt-0.5">
                        <ColorRing
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                      </div>
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Signs [0.1]',
              accessor: 'signs.percent',
              sortType: (a, b) => a.original.signs?.percent > b.original.signs?.percent ?
                1 :
                -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                return (
                  <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                    {typeof value === 'number' ?
                      value > 0 ?
                        <div className="w-full mt-1">
                          <ProgressBarWithText
                            width={value}
                            text={<div className="text-white text-2xs font-semibold mx-1.5">
                              {number_format(
                                value,
                                '0,0.00',
                              )}
                              %
                            </div>}
                            color="bg-green-400 dark:bg-green-500 rounded-lg"
                            backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 hover:bg-opacity-50 rounded-lg"
                            className={`h-4 flex items-center justify-${value < 33 ? 'start' : 'end'}`}
                          />
                        </div> :
                        <span className="h-4 text-slate-300 dark:text-slate-600 mt-0.5">
                          No Participations
                        </span> :
                      <div className="mt-0.5">
                        <ColorRing
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                      </div>
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'tier',
              accessor: 'tier',
              sortType: (a, b) => a.original.i > b.original.i ?
                1 :
                -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                return (
                  <div className={`max-w-min ${value === 1 ? 'bg-blue-600 font-semibold' : value === 2 ? 'bg-blue-400 font-medium' : 'bg-blue-300 font-normal'} rounded text-white text-left sm:text-right sm:ml-auto py-0.5 px-1.5`}>
                    Tier {value}
                  </div>
                )
              },
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            }
          ]}
          data={
            _.orderBy(
              data_filtered,
              ['scores.total'],
              ['desc'],
            )
            .map((d, i) => {
              return {
                ...d,
                i,
                tier: i < 15 ?
                  1 :
                  i < 35 ?
                    2 :
                    3
              }
            })
          }
          noPagination={data_filtered.length <= 10}
          defaultPageSize={50}
          className="no-border"
        /> :
        <ProgressBar
          borderColor={loader_color(theme)}
          width="36"
          height="36"
        />
      }
    </div>
  )
}