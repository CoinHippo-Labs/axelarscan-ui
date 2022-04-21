import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import StackGrid from 'react-stack-grid'
import _ from 'lodash'
import moment from 'moment'
import Loader from 'react-loader-spinner'
import { IoRefreshCircle } from 'react-icons/io5'

import Widget from '../widget'
import Datatable from '../datatable'
import Copy from '../copy'

import { historical } from '../../lib/api/opensearch'
import { numberFormat, ellipseAddress } from '../../lib/utils'

const snapshot_block_size = Number(process.env.NEXT_PUBLIC_SNAPSHOT_BLOCK_SIZE)

const weight = {
  supported_chains_fraction: 0.3,
  vote_participation_fraction: 0.2,
  keygen_participation_fraction: 0.1,
  sign_participation_fraction: 0.1,
  heartbeats_fraction: 0.1,
  uptime_fraction: 0.1,
  jailed_fraction: 0.1,
}

export default function Leaderboard({ n = 100 }) {
  const { preferences, cosmos_chains, status } = useSelector(state => ({ preferences: state.preferences, cosmos_chains: state.cosmos_chains, status: state.status }), shallowEqual)
  const { theme } = { ...preferences }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { status_data } = { ...status }

  const router = useRouter()
  const { query } = { ...router }
  const { debug } = { ...query }

  const [snapshots, setSnapshots] = useState(null)
  const [fromSnapshot, setFromSnapshot] = useState(null)
  const [toSnapshot, setToSnapshot] = useState(null)
  const [readyToLoad, setReadyToLoad] = useState(null)
  const [loading, setLoading] = useState(null)
  const [snapshotsData, setSnapshotsData] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (status_data && (!snapshots || !status_data.is_interval)) {
        if (!controller.signal.aborted) {
          const latestBlock = Number(status_data.latest_block_height)
          const snapshot_block = latestBlock - (latestBlock % snapshot_block_size)

          let response

          if (latestBlock >= snapshot_block_size) {
            response = await historical({
              aggs: {
                historical: {
                  terms: { field: 'snapshot_block', size: n },
                },
              },
              query: {
                bool: {
                  must: [
                    { range: { snapshot_block: { gte: snapshot_block - (n * snapshot_block_size) + 1, lte: snapshot_block } } },
                  ],
                },
              },
            })
          }

          let data = _.orderBy(Object.entries(response?.data || {}).map(([key, value]) => {
            return {
              snapshot_block: Number(key),
              num_validators: value,
            }
          }), ['snapshot_block'], ['desc'])

          setSnapshots({ data })

          if (!fromSnapshot && !toSnapshot) {
            setFromSnapshot(_.last(_.slice(data, 0/*, 10*/))?.snapshot_block)
            setToSnapshot(_.head(data)?.snapshot_block)
            setLoading(true)
          }
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [status_data])

  useEffect(() => {
    if (fromSnapshot && toSnapshot) {
      if (fromSnapshot > toSnapshot) {
        setToSnapshot(fromSnapshot)
      }
      else {
        setReadyToLoad(true)
      }
      setLoading(true)
    }
  }, [fromSnapshot])

  useEffect(() => {
    if (fromSnapshot && toSnapshot) {
      if (toSnapshot < fromSnapshot) {
        setFromSnapshot(toSnapshot)
      }
      else {
        setReadyToLoad(true)
      }
      setLoading(true)
    }
  }, [toSnapshot])

  useEffect(() => {
    const getData = async () => {
      if (loading && fromSnapshot && toSnapshot) {
        setReadyToLoad(false)

        const response = await historical({
          query: {
            bool: {
              must: [
                { range: { snapshot_block: { gte: fromSnapshot - snapshot_block_size + 1, lte: toSnapshot } } },
              ],
            },
          },
          aggs: {
            validators: {
              terms: { field: 'operator_address.keyword', size: 1000 },
              aggs: {
                moniker: {
                  terms: {
                    field: 'description.moniker.keyword',
                  },
                },
                identity: {
                  terms: {
                    field: 'description.identity.keyword',
                  },
                },
                supported_chains: {
                  terms: {
                    field: 'supported_chains.keyword',
                    size: 100,
                  },
                },
                vote_participated: {
                  sum: {
                    field: 'total_yes_votes',
                  },
                },
                vote_not_participated: {
                  sum: {
                    field: 'total_no_votes',
                  },
                },
                keygen_participated: {
                  sum: {
                    field: 'keygen_participated',
                  },
                },
                keygen_not_participated: {
                  sum: {
                    field: 'keygen_not_participated',
                  },
                },
                sign_participated: {
                  sum: {
                    field: 'sign_participated',
                  },
                },
                sign_not_participated: {
                  sum: {
                    field: 'sign_not_participated',
                  },
                },
                up_heartbeats: {
                  sum: {
                    field: 'up_heartbeats',
                  },
                },
                missed_heartbeats: {
                  sum: {
                    field: 'missed_heartbeats',
                  },
                },
                ineligibilities_jailed: {
                  sum: {
                    field: 'ineligibilities.jailed',
                  },
                },
                ineligibilities_tombstoned: {
                  sum: {
                    field: 'ineligibilities.tombstoned',
                  },
                },
                ineligibilities_missed_too_many_blocks: {
                  sum: {
                    field: 'ineligibilities.missed_too_many_blocks',
                  },
                },
                ineligibilities_no_proxy_registered: {
                  sum: {
                    field: 'ineligibilities.no_proxy_registered',
                  },
                },
                ineligibilities_proxy_insuficient_funds: {
                  sum: {
                    field: 'ineligibilities.proxy_insuficient_funds',
                  },
                },
                ineligibilities_tss_suspended: {
                  sum: {
                    field: 'ineligibilities.tss_suspended',
                  },
                },
                up_blocks: {
                  sum: {
                    field: 'up_blocks',
                  },
                },
                missed_blocks: {
                  sum: {
                    field: 'missed_blocks',
                  },
                },
                num_blocks_jailed: {
                  sum: {
                    field: 'num_blocks_jailed',
                  },
                },
              },
            },
          },
        })

        const validators = response?.data || []

        const total_blocks = toSnapshot - (fromSnapshot - snapshot_block_size)
        const supported_chains = _.uniq(validators.flatMap(v => v.supported_chains.map(c => c.chain))).filter(c => !cosmos_chains_data?.find(_c => _c.id === c))
        const supported_chains_num_snapshots = Object.fromEntries(supported_chains.map(chain => {
          return [
            chain,
            _.max(validators.map(v => v.supported_chains.find(c => c.chain === chain)?.count || 0))
          ]
        }))

        const vote_participations = _.max(validators.map(v => v.vote_participated + v.vote_not_participated))
        const keygen_participations = _.max(validators.map(v => v.keygen_participated + v.keygen_not_participated))
        const sign_participations = _.max(validators.map(v => v.sign_participated + v.sign_not_participated))

        let data = _.orderBy(validators.map(v => {
          const ineligibilities = Object.entries(v).filter(([key, value]) => key?.startsWith('ineligibilities_')).map(([key, value]) => { return { key, value } })

          return {
            ...v,
            supported_chains_fraction: (_.sum(supported_chains.map(chain => (v.supported_chains.find(c => c.chain === chain)?.count / supported_chains_num_snapshots[chain]) || 0)) / supported_chains.length) || 0,
            vote_participation_fraction: (v.vote_participated / vote_participations) || 0,
            keygen_participation_fraction: (v.keygen_participated / keygen_participations) || 0,
            sign_participation_fraction: (v.sign_participated / sign_participations) || 0,
            heartbeats_fraction: 1 - (((v.missed_heartbeats/* + (_.sumBy(ineligibilities, 'value') / ineligibilities.length)*/) / (total_blocks / Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT))) || 0),
            uptime_fraction: (v.up_blocks / total_blocks) || 0,
            jailed_fraction: 1 - ((v.num_blocks_jailed / total_blocks) || 0),
            debug: {
              supported_chains_fraction: `(${supported_chains.map(chain => `(${v.supported_chains.find(c => c.chain === chain)?.count || 0} / ${supported_chains_num_snapshots[chain]} ${chain?.toUpperCase()})`).join(' +\n')})\n/ ${supported_chains.length} CHAINS`,
              vote_participation_fraction: `${v.vote_participated} PARTICIPATED / ${vote_participations} TOTAL_VOTE`,
              keygen_participation_fraction: `${v.keygen_participated} PARTICIPATED / ${keygen_participations} TOTAL_KEYGEN`,
              sign_participation_fraction: `${v.sign_participated} PARTICIPATED / ${sign_participations} TOTAL_SIGN`,
              // heartbeats_fraction: `1 - ((${v.missed_heartbeats} MISSED +\n((${ineligibilities.map(({ key, value}) => `${value} ${''/*key?.replace('ineligibilities_', '').toUpperCase()*/}`.trim()).join(' + ')}) / ${ineligibilities.length})) / (${total_blocks} / ${Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)}))`,
              heartbeats_fraction: `1 - (${v.missed_heartbeats} MISSED /\n(${total_blocks} / ${Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)}))`,
              uptime_fraction: `${v.up_blocks} / ${total_blocks}`,
              jailed_fraction: `1 - (${v.num_blocks_jailed} / ${total_blocks})`,
            },
          }
        }).map(v => {
          return {
            ...v,
            score: _.sum(Object.entries(weight).map(([key, value]) => value * v[key])) / 1
          }
        }),
          ['score', 'supported_chains_fraction', 'vote_participation_fraction', 'keygen_participation_fraction', 'sign_participation_fraction', 'heartbeats_fraction', 'uptime_fraction', 'jailed_fraction'],
          ['desc', 'desc', 'desc', 'desc', 'desc', 'desc', 'desc', 'desc']
        ).map((v, i) => {
          return {
            ...v,
            tier: i < 15 ? 1 : i < 35 ? 2 : 3,
            rank: i + 1,
          }
        })

        for (let i = 0; i < data.length; i++) {
          const v = data[i]

          if (i > 0 && typeof v?.score === 'number' && v.score === data[i - 1]?.score) {
            v.rank = data[i - 1].rank
          }

          data[i] = v
        }

        setSnapshotsData({ data, total: response?.total || data.length, fromSnapshot, toSnapshot })
        setLoading(false)
      }
    }

    getData()
  }, [loading])

  const latestBlock = status_data && Number(status_data.latest_block_height)

  return (
    <>
      {snapshots?.data?.length > 0 && (
        <>
          <div className="flex flex-wrap items-center mt-4 mb-2 -ml-0.5">
            <span
              onClick={() => {
                setFromSnapshot(_.last(snapshots.data)?.snapshot_block)
                setToSnapshot(_.head(snapshots.data)?.snapshot_block)
              }}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 cursor-pointer rounded-lg uppercase text-blue-600 dark:text-white font-medium mr-2 py-0.5 px-2"
            >
              All-Time
            </span>
            <span
              onClick={() => {
                setFromSnapshot(_.head(snapshots.data)?.snapshot_block)
                setToSnapshot(_.head(snapshots.data)?.snapshot_block)
              }}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 cursor-pointer rounded-lg uppercase text-blue-600 dark:text-white font-medium mr-2 py-0.5 px-2"
            >
              Latest
            </span>
          </div>
          <div className="flex items-center space-x-4 mb-4">
            <span className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <span>From Snapshot</span>
              {fromSnapshot && (
                <select
                  value={fromSnapshot}
                  onChange={e => setFromSnapshot(Number(e.target.value))}
                  className="max-w-min dark:bg-gray-900 outline-none border-gray-200 dark:border-gray-800 shadow-none focus:shadow-none rounded-lg text-xs"
                >
                  {snapshots.data.map((_snapshot, i) => (
                    <option key={i} value={_snapshot.snapshot_block}>
                      {numberFormat(_snapshot.snapshot_block, '0,0')} ({numberFormat((snapshots.data[i + 1]?.snapshot_block || 0) + 1, '0,0')} - {numberFormat(_snapshot.snapshot_block, '0,0')})
                    </option>
                  ))}
                </select>
              )}
            </span>
            <span className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <span>To Snapshot</span>
              {toSnapshot && (
                <select
                  value={toSnapshot}
                  onChange={e => setToSnapshot(Number(e.target.value))}
                  className="max-w-min dark:bg-gray-900 outline-none border-gray-200 dark:border-gray-800 shadow-none focus:shadow-none rounded-lg text-xs"
                >
                  {snapshots.data.map((_snapshot, i) => (
                    <option key={i} value={_snapshot.snapshot_block}>
                      {numberFormat(_snapshot.snapshot_block, '0,0')} ({numberFormat((snapshots.data[i + 1]?.snapshot_block || 0) + 1, '0,0')} - {numberFormat(_snapshot.snapshot_block, '0,0')})
                    </option>
                  ))}
                </select>
              )}
            </span>
            {readyToLoad && !loading && (
              <IoRefreshCircle
                size={24}
                onClick={() => setLoading(true)}
                className="cursor-pointer text-indigo-600 dark:text-gray-200"
              />
            )}
            {loading && (
              <Loader type="Puff" color={theme === 'dark' ? 'white' : '#3B82F6'} width="20" height="20" />
            )}
          </div>
        </>
      )}
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'rank',
            sortType: (rowA, rowB) => rowA.original.rank > rowB.original.rank ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="mt-0.5">
                  {/*numberFormat((props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1, '0,0')*/}
                  {numberFormat(props.value, '0,0')}
                </div>
                :
                <div className="skeleton w-4 h-3 mt-0.5" />
            ),
          },
          {
            Header: 'Validator',
            accessor: 'description.moniker',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2`}>
                  <div className="flex flex-col">
                    {props.value && (
                      <Link href={`/validator/${props.row.original.operator_address}`}>
                        <a className="text-blue-600 dark:text-white font-medium">
                          {ellipseAddress(props.value, 16) || props.row.original.operator_address}
                        </a>
                      </Link>
                    )}
                    <span className="flex items-center space-x-1">
                      <Link href={`/validator/${props.row.original.operator_address}`}>
                        <a className="text-2xs text-gray-500 font-light">
                          {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(props.row.original.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                        </a>
                      </Link>
                      <Copy text={props.row.original.operator_address} />
                    </span>
                  </div>
                </div>
                :
                <div className="flex items-start space-x-2">
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-24 h-4" />
                    <div className="skeleton w-56 h-3" />
                  </div>
                </div>
            ),
          },
          {
            Header: `Chains (${numberFormat(weight.supported_chains_fraction * 100, '0,0.00')}%)`,
            accessor: 'supported_chains_fraction',
            sortType: (rowA, rowB) => rowA.original.supported_chains_fraction > rowB.original.supported_chains_fraction ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                  <div className="w-28 whitespace-pre-wrap leading-4 text-gray-400 dark:text-gray-500 text-3xs font-medium text-right mt-0.5 ml-auto">{props.row.original.debug?.supported_chains_fraction}</div>
                </>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: `Vote (${numberFormat(weight.vote_participation_fraction * 100, '0,0.00')}%)`,
            accessor: 'vote_participation_fraction',
            sortType: (rowA, rowB) => rowA.original.vote_participation_fraction > rowB.original.vote_participation_fraction ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                  <div className="w-24 whitespace-pre-wrap leading-4 text-gray-400 dark:text-gray-500 text-3xs font-medium text-right mt-0.5 ml-auto">{props.row.original.debug?.vote_participation_fraction}</div>
                </>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: `Keygen (${numberFormat(weight.keygen_participation_fraction * 100, '0,0.00')}%)`,
            accessor: 'keygen_participation_fraction',
            sortType: (rowA, rowB) => rowA.original.keygen_participation_fraction > rowB.original.keygen_participation_fraction ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                  <div className="w-24 whitespace-pre-wrap leading-4 text-gray-400 dark:text-gray-500 text-3xs font-medium text-right mt-0.5 ml-auto">{props.row.original.debug?.keygen_participation_fraction}</div>
                </>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: `Sign (${numberFormat(weight.sign_participation_fraction * 100, '0,0.00')}%)`,
            accessor: 'sign_participation_fraction',
            sortType: (rowA, rowB) => rowA.original.sign_participation_fraction > rowB.original.sign_participation_fraction ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                  <div className="w-24 whitespace-pre-wrap leading-4 text-gray-400 dark:text-gray-500 text-3xs font-medium text-right mt-0.5 ml-auto">{props.row.original.debug?.sign_participation_fraction}</div>
                </>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: `Heartbeats (${numberFormat(weight.heartbeats_fraction * 100, '0,0.00')}%)`,
            accessor: 'heartbeats_fraction',
            sortType: (rowA, rowB) => rowA.original.heartbeats_fraction > rowB.original.heartbeats_fraction ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                  <div className="w-36 whitespace-pre-wrap leading-4 text-gray-400 dark:text-gray-500 text-3xs font-medium text-right mt-0.5 ml-auto">{props.row.original.debug?.heartbeats_fraction}</div>
                </>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: `Uptime (${numberFormat(weight.uptime_fraction * 100, '0,0.00')}%)`,
            accessor: 'uptime_fraction',
            sortType: (rowA, rowB) => rowA.original.uptime_fraction > rowB.original.uptime_fraction ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                  <div className="w-24 whitespace-pre-wrap leading-4 text-gray-400 dark:text-gray-500 text-3xs font-medium text-right mt-0.5 ml-auto">{props.row.original.debug?.uptime_fraction}</div>
                </>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: `Jailed (${numberFormat(weight.jailed_fraction * 100, '0,0.00')}%)`,
            accessor: 'jailed_fraction',
            sortType: (rowA, rowB) => rowA.original.jailed_fraction > rowB.original.jailed_fraction ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                  <div className="w-24 whitespace-pre-wrap leading-4 text-gray-400 dark:text-gray-500 text-3xs font-medium text-right mt-0.5 ml-auto">{props.row.original.debug?.jailed_fraction}</div>
                </>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Score',
            accessor: 'score',
            sortType: (rowA, rowB) => rowA.original.score > rowB.original.score ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right mt-0.5 ml-auto">{numberFormat(props.value, '0,0.00000000')}</div>
                :
                <div className="skeleton w-16 h-4 mt-0.5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Tier',
            accessor: 'tier',
            sortType: (rowA, rowB) => rowA.original.rank > rowB.original.rank ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`bg-${props.value < 2 ? 'indigo-600 dark:bg-indigo-700' : props.value < 3 ? 'blue-500 dark:bg-blue-600' : 'blue-300 dark:bg-blue-400'} rounded-lg flex items-center justify-center text-white space-x-1 ml-auto px-1.5 py-0.5`}>
                  <span className="capitalize font-semibold">Tier {numberFormat(props.value, '0,0')}</span>
                </div>
                :
                <div className="skeleton w-12 h-5 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
        ].filter(column => debug === 'true' || !(_.concat(['score'], Object.keys(weight)).includes(column.accessor)))}
        data={snapshotsData && snapshotsData?.fromSnapshot === fromSnapshot && snapshotsData?.toSnapshot === toSnapshot ?
          snapshotsData.data?.map((validator, i) => { return { ...validator, i } }) || []
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={snapshotsData?.data ? snapshotsData.data.length <= 10 : true}
        defaultPageSize={100}
        className="small no-border"
      />
      {snapshotsData && snapshotsData?.data?.length < 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Validators
        </div>
      )}
    </>
  )
}