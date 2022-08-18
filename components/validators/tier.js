import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { DebounceInput } from 'react-debounce-input'
import { TailSpin, ThreeDots, Grid } from 'react-loader-spinner'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import Image from '../image'
import { ProgressBarWithText } from '../progress-bars'
import { uptimes as getUptimes, heartbeats as getHeartbeats, evm_votes as getEvmVotes, evm_polls as getEvmPolls, keygens as getKeygens, sign_attempts as getSignAttempts } from '../../lib/api/index'
import { chain_manager } from '../../lib/object/chain'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/hb'
import { number_format, name, ellipse, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, status, validators, validators_chains } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, status: state.status, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { status_data } = { ...status }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { ...validators_chains }

  const [validatorsData, setValidatorsData] = useState(null)
  const [fromBlock, setFromBlock] = useState(null)
  const [toBlock, setToBlock] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(null)

  useEffect(() => {
    const { latest_block_height } = { ...status_data }
    if (latest_block_height) {
      const latest_block = Number(latest_block_height)
      if (!toBlock) {
        setToBlock(latest_block)
      }
      if (!fromBlock) {
        setFromBlock(latest_block - Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) * 50)
      }
      if (!fromBlock && !toBlock) {
        setFetchTrigger(moment().valueOf())
      }
    }
  }, [status_data])

  useEffect(() => {
    if (toBlock && toBlock < fromBlock) {
      setToBlock(fromBlock + 1)
    }
  }, [fromBlock])

  useEffect(() => {
    if (fromBlock && toBlock && fromBlock > toBlock) {
      setFromBlock(toBlock - 1)
    }
  }, [toBlock])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (validators_data && validators_chains_data && fetchTrigger && fromBlock && toBlock) {
        if (!controller.signal.aborted) {
          setFetching(true)
          const num_blocks = toBlock - fromBlock + 1
          const num_blocks_per_heartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)
          let data = validators_data.map(v => {
            return {
              ...v,
              supported_chains: Object.entries({ ...validators_chains_data }).filter(([k, _v]) => _v?.includes(v?.operator_address)).map(([k, _v]) => k),
            }
          })
          // uptimes
          let response = await getUptimes({
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } }
            },
            aggs: {
              uptimes: {
                terms: { field: 'validators.keyword', size: data.length },
              },
            },
          })
          if (response?.data) {
            data = data.map(v => {
              return {
                ...v,
                uptimes: {
                  up: response.data[v?.consensus_address] || 0,
                  total: response.total || num_blocks,
                  percent: (response.data[v?.consensus_address] || 0) * 100 / (response.total || num_blocks),
                },
              }
            }).map(v => {
              return {
                ...v,
                uptimes: {
                  ...v?.uptimes,
                  percent: typeof v?.uptimes?.percent === 'number' ?
                    v.uptimes.percent > 100 ? 100 :
                    v.uptimes.percent < 0 ? 0 :
                    v.uptimes.percent : undefined,
                },
              }
            })
          }
          // heartbeats
          const first = firstHeartbeatBlock(fromBlock)
          const last = lastHeartbeatBlock(toBlock)
          response = await getHeartbeats({
            query: {
              bool: {
                must: [
                  { range: { height: {
                    gte: first,
                    lte: toBlock,
                  } } },
                ],
              },
            },
            aggs: {
              heartbeats: {
                terms: { field: 'sender.keyword', size: data.length },
              },
            },
          })
          for (let i = 0; i < data.length; i++) {
            const v = data[i]
            const total = Math.floor((last - first) / num_blocks_per_heartbeat) + 1
            const up = response?.data?.[v?.broadcaster_address] || 0
            let uptime = total > 0 ? up * 100 / total : 0
            uptime = uptime > 100 ? 100 : uptime
            v.heartbeats = {
              up,
              total,
              percent: uptime,
            }
            data[i] = v
          }
          // evm votes
          response = await getEvmVotes({
            query: {
              range: { height: {
                gte: fromBlock,
                lte: toBlock,
              } },
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
          })
          for (let i = 0; i < data.length; i++) {
            const v = data[i]
            v.votes = { ...response?.data?.[v?.broadcaster_address] }
            v.total_votes = v.votes.total || 0
            const get_votes = vote => _.sum(Object.entries({ ...v.votes?.chains }).map(c => Object.entries({ ...c[1]?.votes }).find(_v => _v[0] === vote?.toString())?.[1] || 0))
            v.total_yes_votes = get_votes(true)
            v.total_no_votes = get_votes(false)
            data[i] = v
          }
          response = await getEvmPolls({
            query: {
              range: { height: {
                gte: fromBlock,
                lte: toBlock,
              } },
            },
            aggs: {
              chains: {
                terms: { field: 'sender_chain.keyword', size: 1000 },
              },
            },
            track_total_hits: true,
          })
          const { total } = { ...response }
          const total_polls = total || _.maxBy(data, 'total_votes')?.total_votes || 0
          data = data.map(v => {
            const { votes, total_votes, total_yes_votes, total_no_votes } = { ...v }
            const { chains } = { ...votes }
            Object.entries({ ...chains }).forEach(([k, _v]) => {
              chains[k] = {
                ..._v,
                total_polls: response?.data?.[k] || _v?.total,
              }
            })
            return {
              ...v,
              votes: {
                ...votes,
                chains,
              },
              total_votes: total_votes > total_polls ? total_polls : total_votes,
              total_yes_votes: total_yes_votes > total_polls ? total_polls : total_yes_votes,
              total_no_votes: total_no_votes > total_polls ? total_polls : total_no_votes,
              total_polls,
            }
          }).map(v => {
            return {
              ...v,
              evm_votes: {
                yes: v.total_yes_votes,
                no: v.total_no_votes,
                total: v.total_polls,
                percent: v.total_yes_votes * 100 / v.total_polls,
              },
            }
          })
          // keygens
          response = await getKeygens({
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } }
            },
            aggs: {
              keygens: {
                terms: { field: 'snapshot_validators.validators.validator.keyword', size: data.length },
              },
            },
            size: 0,
            track_total_hits: true,
          })
          if (response?.data) {
            data = data.map(v => {
              return {
                ...v,
                keygens: {
                  participated: response.data[v?.operator_address] || 0,
                  total: response.total,
                  percent: (response.data[v?.operator_address] || 0) * 100 / response.total,
                }
              }
            }).map(v => {
              return {
                ...v,
                keygens: {
                  ...v?.keygens,
                  percent: typeof v?.keygens?.percent === 'number' ?
                    v.keygens.percent > 100 ? 100 :
                    v.keygens.percent < 0 ? 0 :
                    v.keygens.percent : undefined,
                },
              }
            })
          }
          // signs
          response = await getSignAttempts({
            query: {
              range: { height: { gte: fromBlock, lte: toBlock } }
            },
            aggs: {
              signs: {
                terms: { field: 'participants.keyword', size: data.length },
              },
            },
            size: 0,
            track_total_hits: true,
          })
          if (response?.data) {
            data = data.map(v => {
              return {
                ...v,
                signs: {
                  participated: response.data[v?.operator_address] || 0,
                  total: response.total,
                  percent: (response.data[v?.operator_address] || 0) * 100 / response.total,
                }
              }
            }).map(v => {
              return {
                ...v,
                signs: {
                  ...v?.signs,
                  percent: typeof v?.signs?.percent === 'number' ?
                    v.signs.percent > 100 ? 100 :
                    v.signs.percent < 0 ? 0 :
                    v.signs.percent : undefined,
                },
              }
            })
          }
          data = data.map(v => {
            return {
              ...v,
              scores: {
                uptimes: v?.uptimes?.percent || 0,
                heartbeats: v?.heartbeats?.percent || 0,
                evm_votes: v?.evm_votes?.percent || 0,
                keygens: v?.keygens?.percent || 0,
                signs: v?.signs?.percent || 0,
              },
            }
          }).map(v => {
            const { scores } = { ...v }
            const { uptimes, heartbeats, evm_votes, keygens, signs } = { ...scores }
            return {
              ...v,
              scores: {
                ...scores,
                total: ((0.1 * uptimes) + (0.2 * heartbeats) + (0.3 * evm_votes) + (0.1 * keygens) + (0.1 * signs)) / 0.7,
              },
            }
          })
          setValidatorsData(data)
          setFetching(false)
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [validators_data, validators_chains_data, fetchTrigger])

  const filterData = () => validatorsData?.filter(v => v)

  const data_filtered = filterData()

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <div className="flex items-center space-x-3">
        <span className="text-base font-bold">
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
            if (e.target.value === '' || regex.test(e.target.value)) {
              block = e.target.value
            }
            block = block < 0 ? 0 : block
            setFromBlock(block && !isNaN(block) ? Number(block) : block)
          }}
          onWheel={e => e.target.blur()}
          onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
          className={`w-24 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${fetching ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-lg text-base font-semibold py-1 px-2.5`}
        />
        <span className="text-slate-400 dark:text-slate-200 text-base font-semibold">
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
            if (e.target.value === '' || regex.test(e.target.value)) {
              block = e.target.value
            }
            block = block < 0 ? 0 : block
            setToBlock(block && !isNaN(block) ? Number(block) : block)
          }}
          onWheel={e => e.target.blur()}
          onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
          className={`w-24 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${fetching ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-lg text-base font-semibold py-1 px-2.5`}
        />
        <button
          disabled={fetching || typeof fromBlock !== 'number' || typeof toBlock !== 'number'}
          onClick={() => setFetchTrigger(moment().valueOf())}
          className={`bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 ${fetching || typeof fromBlock !== 'number' || typeof toBlock !== 'number' ? 'cursor-not-allowed' : ''} rounded-lg flex items-center text-white font-semibold hover:font-bold space-x-1 py-1 px-2`}
        >
          {fetching && (
            <TailSpin color="white" width="16" height="16" />
          )}
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
              sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
              Cell: props => (
                <span className="font-semibold">
                  {number_format((props.flatRows?.indexOf(props.row) > -1 ?
                    props.flatRows.indexOf(props.row) : props.value
                  ) + 1, '0,0')}
                </span>
              ),
            },
            {
              Header: 'Validator',
              accessor: 'operator_address',
              sortType: (a, b) => (a.original.description?.moniker || a.original.operator_address) > (b.original.description?.moniker || b.original.operator_address) ? 1 : -1,
              Cell: props => (
                props.row.original.description ?
                  <div className={`min-w-max flex items-${props.row.original.description.moniker ? 'start' : 'center'} space-x-2`}>
                    <Link href={`/validator/${props.value}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ValidatorProfile validator_description={props.row.original.description} />
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {props.row.original.description.moniker && (
                        <Link href={`/validator/${props.value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white font-bold"
                          >
                            {ellipse(props.row.original.description.moniker, 12)}
                          </a>
                        </Link>
                      )}
                      <div className="flex items-center space-x-1">
                        <Link href={`/validator/${props.value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 dark:text-slate-600 font-medium"
                          >
                            {ellipse(props.value, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                          </a>
                        </Link>
                        <Copy value={props.value} />
                      </div>
                    </div>
                  </div>
                  :
                  props.value ?
                    <div className="flex items-center space-x-1">
                      <Link href={`/validator/${props.value}`}>
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white font-medium"
                        >
                          {ellipse(props.value, 8, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                        </a>
                      </Link>
                      <Copy value={props.value} />
                    </div>
                    :
                    <span>
                      -
                    </span>
              ),
            },
            {
              Header: (
                <span className="flex items-center space-x-1">
                  <span>
                    Uptime [0.1]
                  </span>
                </span>
              ),
              accessor: 'uptimes.percent',
              sortType: (a, b) => a.original.uptimes?.percent > b.original.uptimes?.percent ? 1 : -1,
              Cell: props => (
                <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                  {typeof props.value === 'number' ?
                    props.value > 0 ?
                      <div className="w-full mt-1">
                        <ProgressBarWithText
                          width={props.value}
                          text={<div className="text-white text-2xs font-bold mx-1">
                            {number_format(props.value, '0,0.00')}%
                          </div>}
                          color="bg-green-500 dark:bg-green-600 rounded"
                          backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 rounded"
                          className={`h-4 flex items-center justify-${props.value < 33 ? 'start' : 'end'}`}
                        />
                      </div>
                      :
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        No Uptimes
                      </span>
                    :
                    <div className="mt-1">
                      <ThreeDots color={loader_color(theme)} width="32" height="16" />
                    </div>
                  }
                  {typeof props.row.original.start_height === 'number' && (
                    <div className="text-2xs space-x-1">
                      <span className="text-slate-400 dark:text-slate-200 font-semibold">
                        Start block:
                      </span>
                      <span className="font-bold">
                        {number_format(props.row.original.start_height, '0,0')}
                      </span>
                    </div>
                  )}
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: (
                <span className="flex items-center space-x-1">
                  <span>
                    Heartbeat [0.2]
                  </span>
                </span>
              ),
              accessor: 'heartbeats.percent',
              sortType: (a, b) => a.original.heartbeats?.percent > b.original.heartbeats?.percent ? 1 : -1,
              Cell: props => (
                <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                  {typeof props.value === 'number' ?
                    props.value > 0 ?
                      <div className="w-full mt-1">
                        <ProgressBarWithText
                          width={props.value}
                          text={<div className="text-white text-2xs font-bold mx-1">
                            {number_format(props.value, '0,0.00')}%
                          </div>}
                          color="bg-green-500 dark:bg-green-600 rounded"
                          backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 rounded"
                          className={`h-4 flex items-center justify-${props.value < 33 ? 'start' : 'end'}`}
                        />
                      </div>
                      :
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        No Heartbeats
                      </span>
                    :
                    <div className="mt-1">
                      <ThreeDots color={loader_color(theme)} width="32" height="16" />
                    </div>
                  }
                  {typeof props.row.original.start_proxy_height === 'number' && (
                    <div className="text-2xs space-x-1">
                      <span className="text-slate-400 dark:text-slate-200 font-semibold">
                        Registered block:
                      </span>
                      <span className="font-bold">
                        {number_format(props.row.original.start_proxy_height, '0,0')}
                      </span>
                    </div>
                  )}
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: (
                <span className="flex items-center space-x-1">
                  <span>
                    EVM votes [0.3]
                  </span>
                </span>
              ),
              accessor: 'votes',
              sortType: (a, b) => a.original.total_yes_votes > b.original.total_yes_votes ? 1 : a.original.total_yes_votes < b.original.total_yes_votes ? -1 : a.original.total_no_votes <= b.original.total_no_votes ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col justify-center space-y-0.5 mt-0.5">
                  {props.value ?
                    Object.keys({ ...props.value.chains }).length > 0 ?
                      Object.entries(props.value.chains).map(([k, v]) => (
                        <div
                          key={k}
                          className="min-w-max flex items-center justify-between space-x-2"
                        >
                          <div className="flex items-center space-x-2">
                            {chain_manager.image(k, evm_chains_data) && (
                              <Image
                                src={chain_manager.image(k, evm_chains_data)}
                                title={chain_manager.name(k, evm_chains_data)}
                                className="w-4 h-4 rounded-full"
                              />
                            )}
                            <span className={`${v?.votes?.true ? 'text-green-500 dark:text-green-600 font-bold' : 'text-slate-300 dark:text-slate-700 font-medium'} -mt-0.5`}>
                              {number_format(v?.votes?.true || 0, '0,0')} Y
                            </span>
                            <span className={`${v?.votes?.false ? 'text-red-500 dark:text-red-600 font-bold' : 'text-slate-300 dark:text-slate-700 font-medium'} -mt-0.5`}>
                              {number_format(v?.votes?.false || 0, '0,0')} N
                            </span>
                            {v?.total_polls - v?.total > 0 && (
                              <span className="text-slate-400 dark:text-slate-500 font-bold -mt-0.5">
                                {number_format(v.total_polls - v.total, '0,0')} UN
                              </span>
                            )}
                          </div>
                          <span className="text-blue-400 dark:text-blue-200 font-semibold -mt-0.5">
                            [{number_format(v?.total_polls || 0, '0,0')}]
                          </span>
                        </div>
                      ))
                      :
                      <span className="text-slate-400 dark:text-slate-600 font-semibold -mt-0.5">
                        No Votes
                      </span>
                    :
                    <Grid color={loader_color(theme)} width="32" height="32" />
                  }
                </div>
              ),
              headerClassName: 'whitespace-nowrap',
            },
            {
              Header: (
                <span className="flex items-center space-x-1">
                  <span>
                    Keygens [0.1]
                  </span>
                </span>
              ),
              accessor: 'keygens.percent',
              sortType: (a, b) => a.original.keygens?.percent > b.original.keygens?.percent ? 1 : -1,
              Cell: props => (
                <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                  {typeof props.value === 'number' ?
                    props.value > 0 ?
                      <div className="w-full mt-1">
                        <ProgressBarWithText
                          width={props.value}
                          text={<div className="text-white text-2xs font-bold mx-1">
                            {number_format(props.value, '0,0.00')}%
                          </div>}
                          color="bg-green-500 dark:bg-green-600 rounded"
                          backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 rounded"
                          className={`h-4 flex items-center justify-${props.value < 33 ? 'start' : 'end'}`}
                        />
                      </div>
                      :
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        No Participations
                      </span>
                    :
                    <div className="mt-1">
                      <ThreeDots color={loader_color(theme)} width="32" height="16" />
                    </div>
                  }
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: (
                <span className="flex items-center space-x-1">
                  <span>
                    Signs [0.1]
                  </span>
                </span>
              ),
              accessor: 'signs.percent',
              sortType: (a, b) => a.original.signs?.percent > b.original.signs?.percent ? 1 : -1,
              Cell: props => (
                <div className="w-32 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                  {typeof props.value === 'number' ?
                    props.value > 0 ?
                      <div className="w-full mt-1">
                        <ProgressBarWithText
                          width={props.value}
                          text={<div className="text-white text-2xs font-bold mx-1">
                            {number_format(props.value, '0,0.00')}%
                          </div>}
                          color="bg-green-500 dark:bg-green-600 rounded"
                          backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 rounded"
                          className={`h-4 flex items-center justify-${props.value < 33 ? 'start' : 'end'}`}
                        />
                      </div>
                      :
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        No Participations
                      </span>
                    :
                    <div className="mt-1">
                      <ThreeDots color={loader_color(theme)} width="32" height="16" />
                    </div>
                  }
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'tier',
              accessor: 'tier',
              sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
              Cell: props => (
                <div className={`max-w-min ${props.value === 1 ? 'bg-blue-600 font-bold' : props.value === 2 ? 'bg-blue-400 font-semibold' : 'bg-blue-300 font-medium'} rounded-lg text-white text-left sm:text-right sm:ml-auto py-0.5 px-1.5`}>
                  Tier {props.value}
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            }
          ]}
          data={_.orderBy(data_filtered, ['scores.total'], ['desc']).map((d, i) => { return { ...d, i, tier: i < 15 ? 1 : i < 35 ? 2 : 3 } })}
          noPagination={data_filtered.length <= 10}
          defaultPageSize={50}
          className="no-border"
        />
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}