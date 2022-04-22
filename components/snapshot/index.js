import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { FiKey } from 'react-icons/fi'
import { BiDownload } from 'react-icons/bi'

import Summary from './summary'
import Datatable from '../datatable'
import { ProgressBarWithText } from '../progress-bars'
import Copy from '../copy'

import { historical } from '../../lib/api/opensearch'
import { chain_manager } from '../../lib/object/chain'
import { numberFormat, getName, ellipseAddress } from '../../lib/utils'

export default function Snapshot({ height }) {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const [snapshot, setSnapshot] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (height) {
        if (!controller.signal.aborted) {
          const response = await historical({
            query: {
              bool: {
                must: [
                  { match: { snapshot_block: height } },
                ],
              },
            },
            size: 10000,
          })

          setSnapshot({ data: Array.isArray(response?.data) ? response.data : [], height })
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [height])

  const downloadFile = async () => {
    const fileName = height

    const json = JSON.stringify(snapshot?.data)

    const blob = new Blob([json], { type:'application/json' })
    const href = await URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = href
    link.download = `${fileName}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full my-4 xl:my-6 mx-auto">
      <Summary data={snapshot && snapshot.height === height && snapshot.data} />
      {snapshot?.data && snapshot.height === height && (
        <div className="w=full flex items-center mb-2">
          <button
            onClick={() => downloadFile()}
            className="text-blue-600 dark:text-white font-semibold sm:ml-auto"
          >
            <div className="flex items-center space-x-1.5">
              <span>Export JSON</span>
              <BiDownload size={20} />
            </div>
          </button>
        </div>
      )}
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'i',
            sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                numberFormat((props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1, '0,0')
                :
                <div className="skeleton w-4 h-3" />
            ),
          },
          {
            Header: 'Validator',
            accessor: 'description.moniker',
            sortType: (rowA, rowB) => (rowA.original.description.moniker || rowA.original.i) > (rowB.original.description.moniker || rowB.original.i) ? 1 : -1,
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
                    <div className="skeleton w-32 h-3" />
                  </div>
                </div>
            ),
          },
          {
            Header: 'Power',
            accessor: 'tokens',
            sortType: (rowA, rowB) => (!rowA.original.jailed && !rowA.original.tombstoned ? rowA.original.tokens : 0) > (!rowB.original.jailed && !rowB.original.tombstoned ? rowB.original.tokens : 0) ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col justify-center text-left sm:text-right">
                  {!props.row.original.jailed && !props.row.original.tombstoned && props.value > 0 ?
                    <>
                      <span className="font-medium">{numberFormat(Math.floor(props.value), '0,0.00')}</span>
                      <span className="text-gray-400 dark:text-gray-600">{numberFormat(props.value * 100 / _.sumBy(snapshot?.data?.filter(validator => !validator.jailed && ['BOND_STATUS_BONDED'].includes(validator.status)), 'tokens'), '0,0.000')}%</span>
                    </>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="flex flex-col justify-center space-y-1">
                  <div className="skeleton w-16 h-4 ml-0 sm:ml-auto" />
                  <div className="skeleton w-8 h-4 ml-0 sm:ml-auto" />
                </div>
            ),
            headerClassName: 'min-w-max justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Uptime',
            accessor: 'uptime',
            sortType: (rowA, rowB) => rowA.original.uptime > rowB.original.uptime ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && typeof props.value === 'number' ?
                <>
                  {props.value > 0 ?
                    <div className="w-36 mt-0.5 ml-auto">
                      <ProgressBarWithText
                        width={props.value}
                        text={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
                          {numberFormat(props.value, '0,0.00')}%
                        </div>}
                        color="bg-green-500 dark:bg-green-600 rounded"
                        backgroundClassName="h-4 bg-gray-200 dark:bg-gray-800 rounded"
                        className={`h-4 flex items-center justify-${props.value < 20 ? 'start' : 'end'}`}
                      />
                    </div>
                    :
                    <div className="w-36 text-gray-400 dark:text-gray-600 text-right ml-auto">No Uptime</div>
                  }
                  {typeof props.row.original.missed_blocks === 'number' && (
                    <div className="text-3xs text-right space-x-1 mt-1.5">
                      <span className="text-gray-400 dark:text-gray-500 font-medium"># Missed Block:</span>
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.row.original.missed_blocks, '0,0')}</span>
                    </div>
                  )}
                </>
                :
                <>
                  <div className="skeleton w-36 h-4 mt-0.5 ml-auto" />
                  <div className="skeleton w-24 h-3.5 mt-1.5 ml-auto" />
                </>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Heartbeat',
            accessor: 'heartbeats_uptime',
            sortType: (rowA, rowB) => rowA.original.heartbeats_uptime > rowB.original.heartbeats_uptime ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && typeof props.value === 'number' ?
                <>
                  {props.value > 0 ?
                    <div className="w-36 mt-0.5 ml-auto">
                      <ProgressBarWithText
                        width={props.value}
                        text={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
                          {numberFormat(props.value, '0,0.00')}%
                        </div>}
                        color="bg-green-500 dark:bg-green-600 rounded"
                        backgroundClassName="h-4 bg-gray-200 dark:bg-gray-800 rounded"
                        className={`h-4 flex items-center justify-${props.value < 20 ? 'start' : 'end'}`}
                      />
                    </div>
                    :
                    <div className="w-36 text-gray-400 dark:text-gray-600 text-right ml-auto">No Heartbeat</div>
                  }
                  {typeof props.row.original.missed_heartbeats === 'number' && (
                    <div className="text-3xs text-right space-x-1 mt-1.5">
                      <span className="text-gray-400 dark:text-gray-500 font-medium"># Missed Heartbeats:</span>
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.row.original.missed_heartbeats, '0,0')}</span>
                    </div>
                  )}
                </>
                :
                <>
                  <div className="skeleton w-36 h-4 mt-0.5 ml-auto" />
                  <div className="skeleton w-24 h-3.5 mt-1.5 ml-auto" />
                </>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Broadcaster',
            accessor: 'broadcaster_registration',
            sortType: (rowA, rowB) => rowA.original.broadcaster_registration > rowB.original.broadcaster_registration ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <>
                  {typeof props.value === 'boolean' ?
                    <span className={`max-w-min ${props.value ? 'bg-green-500 dark:bg-green-700' : 'bg-red-500 dark:bg-red-700'} rounded-xl flex items-center text-white text-2xs font-semibold space-x-1 mb-1 ml-auto px-2 py-1`}>
                      {props.value ?
                        <FaCheckCircle size={14} />
                        :
                        <FaTimesCircle size={14} />
                      }
                      <span className="whitespace-nowrap capitalize">{getName(props.value ? 'proxy_registered' : 'no_proxy_registered')}</span>
                    </span>
                    :
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                  }
                  {typeof props.row.original.broadcaster_funded === 'object' && props.row.original.broadcaster_funded?.denom ?
                    <span className={`max-w-min ${props.row.original.broadcaster_funded?.amount >= Number(process.env.NEXT_PUBLIC_MIN_BROADCAST_FUND) ? 'bg-green-500 dark:bg-green-700' : 'bg-red-500 dark:bg-red-700'} rounded-xl flex items-center text-white text-2xs font-semibold space-x-1 mb-1 ml-auto px-2 py-1`}>
                      {props.row.original.broadcaster_funded?.amount >= Number(process.env.NEXT_PUBLIC_MIN_BROADCAST_FUND) ?
                        <FaCheckCircle size={14} />
                        :
                        <FaTimesCircle size={14} />
                      }
                      <span>{numberFormat(props.row.original.broadcaster_funded?.amount, '0,0.0000000')}</span>
                      <span className="uppercase">{props.row.original.broadcaster_funded?.denom}</span>
                    </span>
                    :
                    <span>{props.row.original.broadcaster_funded}</span>
                  }
                </>
                :
                <>
                  <div className="skeleton w-28 h-5 ml-auto" />
                  <div className="skeleton w- h-5 mt-1.5 ml-auto" />
                </>
            ),
            headerClassName: 'justify-end text-right',
          },
          // {
          //   Header: 'Ineligibilities',
          //   accessor: 'ineligibilities',
          //   sortType: (rowA, rowB) => _.sum(Object.values(rowA.original.ineligibilities || {})) > _.sum(Object.values(rowB.original.ineligibilities || {})) ? 1 : -1,
          //   Cell: props => (
          //     !props.row.original.skeleton ?
          //       <div className="flex flex-col items-end text-right space-y-1">
          //         {Object.keys(props.value).length > 0 ?
          //           Object.entries(props.value).map(([key, value]) => (
          //             <span key={key} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-lg capitalize text-gray-900 dark:text-gray-200 text-2xs font-semibold px-1.5 py-1">
          //               {getName(key)}: {numberFormat(value, '0,0')}
          //             </span>
          //           ))
          //           :
          //           <span className="text-gray-400 dark:text-gray-600">-</span>
          //         }
          //       </div>
          //       :
          //       <div className="flex flex-col items-end space-y-1 ml-auto">
          //         {[...Array(6).keys()].map(i => (
          //           <div key={i} className="skeleton w-24 h-4 ml-1" />
          //         ))}
          //       </div>
          //   ),
          //   headerClassName: 'justify-end text-right',
          // },
          {
            Header: 'Key Share',
            accessor: 'key_shares',
            sortType: (rowA, rowB) => rowA.original.key_shares?.length > rowB.original.key_shares?.length ? 1 : rowA.original.key_shares?.length < rowB.original.key_shares?.length ? -1 : _.sum(rowA.original.key_shares?.map(key_share => key_share.num_validator_shares / key_share.num_total_shares)) > _.sum(rowB.original.key_shares?.map(key_share => key_share.num_validator_shares / key_share.num_total_shares)) ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col items-end text-right space-y-2.5">
                  {props.value?.length > 0 ?
                    props.value.map((key_share, i) => (
                      <div key={i} className="flex flex-col space-y-1.5">
                        <div className="flex items-center text-2xs text-gray-900 dark:text-gray-100 space-x-1">
                          <FiKey size={12} />
                          <span className="font-semibold">{ellipseAddress(key_share.key_id, 12)}</span>
                        </div>
                        <div className="text-2xs text-gray-400 dark:text-gray-500 ml-auto">
                          Share: [{key_share.num_validator_shares} / {key_share.num_total_shares}]
                        </div>
                      </div>
                    ))
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="flex flex-col items-end space-y-2.5 ml-auto">
                  {[...Array(3).keys()].map(i => (
                    <div key={i} className="flex flex-col items-end space-y-1.5">
                      <div className="skeleton w-24 h-4" />
                      <div className="skeleton w-20 h-4" />
                    </div>
                  ))}
                </div>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Keygen',
            accessor: 'keygen_participated',
            sortType: (rowA, rowB) => rowA.original.keygen_participated > rowB.original.keygen_participated ? 1 : rowA.original.keygen_participated < rowB.original.keygen_participated ? -1 : rowA.original.keygen_not_participated <= rowB.original.keygen_not_participated ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && typeof props.value === 'number' ?
                <>
                  {typeof props.value === 'number' ?
                    <div className="w-36 mt-0.5 ml-auto">
                      <ProgressBarWithText
                        width={props.row.original.keygen_participated_rate * 100}
                        text={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
                          {numberFormat(props.row.original.keygen_participated_rate * 100, '0,0.00')}%
                        </div>}
                        color="bg-blue-500 dark:bg-blue-600 rounded"
                        backgroundClassName="h-4 bg-red-400 dark:bg-red-700 rounded"
                        className={`h-4 flex items-center justify-${props.row.original.keygen_participated_rate * 100 < 20 ? 'start' : 'end'}`}
                      />
                    </div>
                    :
                    <div className="w-36 text-gray-400 dark:text-gray-600 text-right ml-auto">-</div>
                  }
                  <div className="text-xs mt-1.5">
                    <span className="text-gray-400 dark:text-gray-500 font-medium">Participated:</span>
                    <div className="flex items-center">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.value, '0,0')}</span>
                      <span className="text-2xs ml-auto">{numberFormat(props.row.original.keygen_participated_rate * 100, '0,0.00')}%</span>
                    </div>
                  </div>
                  <div className="text-xs mt-1.5">
                    <span className="text-gray-400 dark:text-gray-500 font-medium">Not Participated:</span>
                    <div className="flex items-center">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.row.original.keygen_not_participated, '0,0')}</span>
                      <span className="text-2xs ml-auto">{numberFormat(props.row.original.keygen_not_participated_rate * 100, '0,0.00')}%</span>
                    </div>
                  </div>
                </>
                :
                <>
                  <div className="skeleton w-36 h-4 mt-0.5 ml-auto" />
                  <div className="skeleton w-20 h-3.5 mt-2" />
                  <div className="flex items-center mt-1">
                    <div className="skeleton w-6 h-3" />
                    <div className="skeleton w-6 h-3 ml-auto" />
                  </div>
                  <div className="skeleton w-20 h-3.5 mt-2" />
                  <div className="flex items-center mt-1">
                    <div className="skeleton w-6 h-3" />
                    <div className="skeleton w-6 h-3 ml-auto" />
                  </div>
                </>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Sign',
            accessor: 'sign_participated',
            sortType: (rowA, rowB) => rowA.original.sign_participated > rowB.original.sign_participated ? 1 : rowA.original.sign_participated < rowB.original.sign_participated ? -1 : rowA.original.sign_not_participated <= rowB.original.sign_not_participated ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && typeof props.value === 'number' ?
                <>
                  {typeof props.value === 'number' ?
                    <div className="w-36 mt-0.5 ml-auto">
                      <ProgressBarWithText
                        width={props.row.original.sign_participated_rate * 100}
                        text={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
                          {numberFormat(props.row.original.sign_participated_rate * 100, '0,0.00')}%
                        </div>}
                        color="bg-blue-500 dark:bg-blue-600 rounded"
                        backgroundClassName="h-4 bg-red-400 dark:bg-red-700 rounded"
                        className={`h-4 flex items-center justify-${props.row.original.sign_participated_rate * 100 < 20 ? 'start' : 'end'}`}
                      />
                    </div>
                    :
                    <div className="w-36 text-gray-400 dark:text-gray-600 text-right ml-auto">-</div>
                  }
                  <div className="text-xs mt-1.5">
                    <span className="text-gray-400 dark:text-gray-500 font-medium">Participated:</span>
                    <div className="flex items-center">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.value, '0,0')}</span>
                      <span className="text-2xs ml-auto">{numberFormat(props.row.original.sign_participated_rate * 100, '0,0.00')}%</span>
                    </div>
                  </div>
                  <div className="text-xs mt-1.5">
                    <span className="text-gray-400 dark:text-gray-500 font-medium">Not Participated:</span>
                    <div className="flex items-center">
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.row.original.sign_not_participated, '0,0')}</span>
                      <span className="text-2xs ml-auto">{numberFormat(props.row.original.sign_not_participated_rate * 100, '0,0.00')}%</span>
                    </div>
                  </div>
                </>
                :
                <>
                  <div className="skeleton w-36 h-4 mt-0.5 ml-auto" />
                  <div className="skeleton w-20 h-3.5 mt-2" />
                  <div className="flex items-center mt-1">
                    <div className="skeleton w-6 h-3" />
                    <div className="skeleton w-6 h-3 ml-auto" />
                  </div>
                  <div className="skeleton w-20 h-3.5 mt-2" />
                  <div className="flex items-center mt-1">
                    <div className="skeleton w-6 h-3" />
                    <div className="skeleton w-6 h-3 ml-auto" />
                  </div>
                </>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'EVM Votes',
            accessor: 'total_yes_votes',
            sortType: (rowA, rowB) => rowA.original.total_yes_votes > rowB.original.total_yes_votes ? 1 : rowA.original.total_yes_votes < rowB.original.total_yes_votes ? -1 : rowA.original.total_no_votes <= rowB.original.total_no_votes ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                typeof props.value === 'number' ?
                  <>
                    <div className="w-36 mt-0.5 ml-auto">
                      <ProgressBarWithText
                        width={(props.value / props.row.original.total_yes_votes) * 100}
                        text={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
                          {numberFormat((props.value / props.row.original.total_votes) * 100, '0,0.00')}%
                        </div>}
                        color="bg-blue-500 dark:bg-blue-600 rounded"
                        backgroundClassName="h-4 bg-red-400 dark:bg-red-700 rounded"
                        className={`h-4 flex items-center justify-${(props.value / props.row.original.total_votes) * 100 < 20 ? 'start' : 'end'}`}
                      />
                    </div>
                    <div className="text-xs mt-1.5">
                      <span className="text-gray-400 dark:text-gray-500 font-medium">Vote Yes:</span>
                      <div className="flex items-center">
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.value, '0,0')}</span>
                        <span className="text-2xs ml-auto">{numberFormat((props.value / props.row.original.total_votes) * 100, '0,0.00')}%</span>
                      </div>
                    </div>
                    <div className="text-xs mt-1.5">
                      <span className="text-gray-400 dark:text-gray-500 font-medium">Vote No:</span>
                      <div className="flex items-center">
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{numberFormat(props.row.original.total_no_votes, '0,0')}</span>
                        <span className="text-2xs ml-auto">{numberFormat((props.row.original.total_no_votes / props.row.original.total_votes) * 100, '0,0.00')}%</span>
                      </div>
                    </div>
                  </>
                  :
                  <div className="w-full font-mono text-gray-400 dark:text-gray-600 text-right">n/a</div>
                :
                <>
                  <div className="skeleton w-36 h-4 mt-0.5 ml-auto" />
                  <div className="skeleton w-20 h-3.5 mt-2" />
                  <div className="flex items-center mt-1">
                    <div className="skeleton w-6 h-3" />
                    <div className="skeleton w-6 h-3 ml-auto" />
                  </div>
                  <div className="skeleton w-20 h-3.5 mt-2" />
                  <div className="flex items-center mt-1">
                    <div className="skeleton w-6 h-3" />
                    <div className="skeleton w-6 h-3 ml-auto" />
                  </div>
                </>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Supported',
            accessor: 'supported_chains',
            sortType: (rowA, rowB) => rowA.original.supported_chains?.length > rowB.original.supported_chains?.length ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && props.value ?
                <div className="text-right">
                  {props.value.length > 0 ?
                    <div className="w-24 flex flex-wrap items-center justify-end">
                      {props.value.map((c, i) => (
                        chain_manager.image(c, chains_data) ?
                          <Img
                            key={i}
                            alt={chain_manager.title(c, chains_data)}
                            src={chain_manager.image(c, chains_data)}
                            className="w-6 h-6 rounded-full mb-1 ml-1"
                          />
                          :
                          <span key={i} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl text-gray-900 dark:text-gray-200 text-xs font-semibold mb-1 ml-1 px-1.5 py-0.5">
                            {chain_manager.title(c, chains_data)}
                          </span>
                      ))}
                    </div>
                    :
                    <span className="text-gray-400 dark:text-gray-600 mr-2">-</span>
                  }
                </div>
                :
                <div className="flex flex-wrap items-center justify-end">
                  {[...Array(3).keys()].map(i => (
                    <div key={i} className="skeleton w-6 h-6 rounded-full mb-1 ml-1" />
                  ))}
                </div>
            ),
            headerClassName: 'min-w-max justify-end text-right',
          },
          {
            Header: 'Status',
            accessor: 'status',
            sortType: (rowA, rowB) => rowA.original.status > rowB.original.status ? 1 : rowA.original.status < rowB.original.status ? -1 : Object.values(rowA.original.tss_illegibility_info || {}).filter(v => v).length < Object.values(rowB.original.tss_illegibility_info || {}).filter(v => v).length ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col items-end text-right space-y-1 my-1">
                  {props.value ?
                    <>
                      <div className={`max-w-min bg-${props.value.includes('UN') ? props.value.endsWith('ED') ? 'gray-400 dark:bg-gray-700' : 'yellow-400 dark:bg-yellow-500' : 'green-600 dark:bg-green-700'} rounded-xl capitalize text-white font-semibold px-2 py-1`}>
                        {props.value.replace('BOND_STATUS_', '')}
                      </div>
                      {props.row.original.deregistering && (
                        <div className="max-w-min text-gray-400 dark:text-gray-600 text-xs font-normal mt-2">
                          (De-registering)
                        </div>
                      )}
                      {props.row.original.tombstoned ?
                        <div className="max-w-min bg-red-600 rounded-xl capitalize text-white font-semibold px-2 py-1">
                          Tombstoned
                        </div>
                        :
                        props.row.original.jailed ?
                          <div className="max-w-min bg-red-600 rounded-xl capitalize text-white font-semibold px-2 py-1">
                            Jailed
                          </div>
                          :
                          null
                      }
                      {props.row.original.illegible && props.row.original.tss_illegibility_info && (
                        <div className="flex flex-col items-end space-y-1.5 mt-2">
                          {Object.values(props.row.original.tss_illegibility_info).filter(value => value).map((value, i) => (
                            <span key={i} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-lg capitalize text-gray-900 dark:text-gray-200 text-2xs font-semibold px-1.5 py-1">
                              {getName(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="skeleton w-24 h-6 my-0.5 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={height && snapshot?.height === height ?
          snapshot.data?.map((validator, i) => { return { ...validator, i } }) || []
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={snapshot?.data ? snapshot.data.length <= 10 : true}
        defaultPageSize={100}
        className="small no-border"
      />
      {snapshot && snapshot?.data?.length < 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Validators
        </div>
      )}
    </div>
  )
}