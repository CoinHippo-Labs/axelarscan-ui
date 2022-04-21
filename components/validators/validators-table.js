import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { FiBox } from 'react-icons/fi'

import Datatable from '../datatable'
import { ProgressBarWithText } from '../progress-bars'
import Copy from '../copy'

import { chain_manager } from '../../lib/object/chain'
import { denomer } from '../../lib/object/denom'
import { numberFormat, getName, ellipseAddress } from '../../lib/utils'

export default function ValidatorsTable({ status }) {
  const { chains, denoms, validators, validators_chains } = useSelector(state => ({ chains: state.chains, denoms: state.denoms, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
  const { chains_data } = { ...chains }
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { ...validators_chains }

  const [validatorsData, setValidatorsData] = useState(null)

  useEffect(() => {
    if (validators_data) {
      setValidatorsData(validators_data.map(v => {
        return {
          ...v,
          supported_chains: Object.entries(validators_chains_data || {}).filter(([key, value]) => value?.includes(v?.operator_address)).map(([key, value]) => key),
        }
      }))
    }
  }, [validators_data, validators_chains_data])

  return (
    <div className="max-w-8xl my-2 xl:my-4 mx-auto">
      <div className="flex flex-row items-center overflow-x-auto space-x-1 my-2">
        {['active', 'inactive'/*, 'illegible'*/, 'deregistering'].map((_status, i) => (
          <Link key={i} href={`/validators${i > 0 ? `/${_status}` : ''}`}>
            <a className={`min-w-max btn btn-default btn-rounded ${_status === status ? 'bg-gray-700 dark:bg-gray-900 text-white' : 'bg-trasparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-100'}`}>
              {_status}
              {validatorsData && _status === status ? ` (${validatorsData.filter(v => status === 'inactive' ? !(['BOND_STATUS_BONDED'].includes(v.status)) : status === 'illegible' ? v.illegible : status === 'deregistering' ? v.deregistering : ['BOND_STATUS_BONDED'].includes(v.status)).length})` : ''}
            </a>
          </Link>
        ))}
      </div>
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
                <div className="skeleton w-4 h-4" />
            ),
          },
          {
            Header: 'Validator',
            accessor: 'description.moniker',
            sortType: (rowA, rowB) => (rowA.original.description?.moniker || rowA.original.i) > (rowB.original.description?.moniker || rowB.original.i) ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2`}>
                  <Link href={`/validator/${props.row.original.operator_address}`}>
                    <a>
                      {props.row.original.description.image ?
                        <img
                          src={props.row.original.description.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        :
                        <div className="skeleton w-6 h-6 rounded-full" />
                      }
                    </a>
                  </Link>
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
                        <a className="text-gray-400 dark:text-gray-600 font-light">
                          {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(props.row.original.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                        </a>
                      </Link>
                      <Copy text={props.row.original.operator_address} />
                    </span>
                  </div>
                </div>
                :
                <div className="flex items-start space-x-2">
                  <div className="skeleton w-6 h-6 rounded-full" />
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-24 h-4" />
                    <div className="skeleton w-32 h-3" />
                  </div>
                </div>
            ),
          },
          {
            Header: ['active'].includes(status) ? 'Voting Power' : 'Bonded Tokens',
            accessor: 'tokens',
            sortType: (rowA, rowB) => rowA.original.tokens > rowB.original.tokens ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col justify-center text-left sm:text-right">
                  {props.value > 0 ?
                    <>
                      <span className="font-medium">{numberFormat(Math.floor(denomer.amount(props.value, denoms_data?.[0]?.id, denoms_data)), '0,0.00')}</span>
                      <span className="text-gray-400 dark:text-gray-600">{numberFormat(props.value * 100 / _.sumBy(validatorsData.filter(v => !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)), 'tokens'), '0,0.000')}%</span>
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
            Header: 'Self Delegation',
            accessor: 'self_delegation',
            sortType: (rowA, rowB) => rowA.original.self_delegation / rowA.original.delegator_shares > rowB.original.self_delegation / rowB.original.delegator_shares ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && typeof props.value === 'number' ?
                <div className="flex flex-col justify-center text-left sm:text-right">
                  {props.value > 0 ?
                    <span className="text-gray-400 dark:text-gray-600">{numberFormat(props.value * 100 / props.row.original.delegator_shares, '0,0.000')}%</span>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="flex flex-col justify-center space-y-1">
                  <div className="skeleton w-8 h-4 ml-0 sm:ml-auto" />
                </div>
            ),
            headerClassName: 'min-w-max justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Comm.',
            accessor: 'commission.commission_rates.rate',
            sortType: (rowA, rowB) => Number(rowA.original.commission?.commission_rates?.rate) > Number(rowB.original.commission?.commission_rates?.rate) ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right">
                  {!isNaN(props.value) ?
                    <span>{numberFormat(props.value * 100, '0,0.00')}%</span>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="skeleton w-8 h-4 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: (
              <span className="flex items-center space-x-1">
                <span>Uptime</span>
                <span>{numberFormat(Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS), '0,0')}</span>
                <FiBox size={16} className="stroke-current" />
              </span>
            ),
            accessor: 'uptime',
            sortType: (rowA, rowB) => rowA.original.uptime > rowB.original.uptime ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && typeof props.value === 'number' ?
                <>
                  {props.value > 0 ?
                    <div className="w-40 mt-0.5 ml-auto">
                      <ProgressBarWithText
                        width={props.value}
                        text={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
                          {numberFormat(props.value, '0,0.00')}%
                        </div>}
                        color="bg-green-500 dark:bg-green-700 rounded"
                        backgroundClassName="h-4 bg-gray-200 dark:bg-gray-800 rounded"
                        className={`h-4 flex items-center justify-${props.value < 20 ? 'start' : 'end'}`}
                      />
                    </div>
                    :
                    <div className="w-40 text-gray-400 dark:text-gray-600 text-right ml-auto">No Uptime</div>
                  }
                  {typeof props.row.original.start_height === 'number' && (
                    <div className="text-3xs text-right space-x-1 mt-1.5">
                      <span className="text-gray-400 dark:text-gray-600 font-medium">Validator Since Block:</span>
                      <span className="text-gray-600 dark:text-gray-100 font-semibold">{numberFormat(props.row.original.start_height, '0,0')}</span>
                    </div>
                  )}
                </>
                :
                <>
                  <div className="skeleton w-40 h-4 mt-0.5 ml-auto" />
                  <div className="skeleton w-24 h-3.5 mt-1.5 ml-auto" />
                </>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: (
              <span className="flex items-center space-x-1">
                <span>Heartbeat</span>
                <span>{numberFormat(Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS), '0,0')}</span>
                <FiBox size={16} className="stroke-current" />
              </span>
            ),
            accessor: 'heartbeats_uptime',
            sortType: (rowA, rowB) => rowA.original.heartbeats_uptime > rowB.original.heartbeats_uptime ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && typeof props.value === 'number' ?
                <>
                  {props.value > 0 ?
                    <div className="w-40 mt-0.5 ml-auto">
                      <ProgressBarWithText
                        width={props.value}
                        text={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
                          {numberFormat(props.value, '0,0.00')}%
                        </div>}
                        color="bg-green-500 dark:bg-green-700 rounded"
                        backgroundClassName="h-4 bg-gray-200 dark:bg-gray-800 rounded"
                        className={`h-4 flex items-center justify-${props.value < 20 ? 'start' : 'end'}`}
                      />
                    </div>
                    :
                    <div className="w-40 text-gray-400 dark:text-gray-600 text-right ml-auto">No Heartbeat</div>
                  }
                  {typeof props.row.original.start_proxy_height === 'number' && (
                    <div className="text-3xs text-right space-x-1 mt-1.5">
                      <span className="text-gray-400 dark:text-gray-600 font-medium">Proxy Registered Block:</span>
                      <span className="text-gray-600 dark:text-gray-100 font-semibold">{numberFormat(props.row.original.start_proxy_height, '0,0')}</span>
                    </div>
                  )}
                </>
                :
                <>
                  <div className="skeleton w-40 h-4 mt-0.5 ml-auto" />
                  <div className="skeleton w-24 h-3.5 mt-1.5 ml-auto" />
                </>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: (
              <span className="flex items-center space-x-1">
                <span className="whitespace-nowrap">EVM Votes</span>
                <span>{numberFormat(Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS), '0,0')}</span>
                <FiBox size={16} className="stroke-current" />
              </span>
            ),
            accessor: 'votes',
            sortType: (rowA, rowB) => rowA.original.total_yes_votes > rowB.original.total_yes_votes ? 1 : rowA.original.total_yes_votes < rowB.original.total_yes_votes ? -1 : rowA.original.total_no_votes <= rowB.original.total_no_votes ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && props.value ?
                Object.keys(props.value.chains || {}).length > 0 ?
                  <div className="min-w-max grid grid-flow-row grid-cols-2 gap-y-2 gap-x-3 ml-auto">
                    {Object.entries(props.value.chains).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between space-x-2">
                        <img
                          src={chain_manager.image(key, chains_data)}
                          alt={chain_manager.title(key, chains_data)}
                          className="w-4 h-4 rounded-full"
                        />
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex items-center uppercase text-3xs space-x-1">
                            <div className="text-green-500 font-semibold space-x-0.5">
                              <span className="font-mono">
                                {numberFormat(value?.confirms?.true || 0, '0,0')}
                              </span>
                              <span>Yes</span>
                            </div>
                            <span className="text-gray-400 dark:text-gray-600 font-semibold">:</span>
                            <div className={`${value?.confirms?.false > 0 ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-gray-600 font-semibold'} font-semibold space-x-0.5`}>
                              <span className="font-mono">
                                {numberFormat(value?.confirms?.false || 0, '0,0')}
                              </span>
                              <span>No</span>
                            </div>
                          </div>
                          <div className={`flex items-center ${(props.row.original.total_polls?.[key] || 0) > (value?.confirms?.true || 0) ? 'text-yellow-500 dark:text-yellow-400 font-bold' : 'text-gray-500 dark:text-gray-300 font-semibold'} text-3xs space-x-1`}>
                            <span className="capitalize">Total:</span>
                            <span className="font-mono">
                              {numberFormat(props.row.original.total_polls?.[key] || 0, '0,0')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  :
                  <div className="w-full font-mono text-gray-400 dark:text-gray-600 text-right">-</div>
                :
                <div className="min-w-max max-w-min grid grid-flow-row grid-cols-2 gap-y-2 gap-x-3 ml-auto">
                  {[...Array(4).keys()].map(i => (
                    <div key={i} className="max-w-min flex items-center justify-between space-x-2">
                      <div className="skeleton w-4 h-4 rounded-full" />
                      <div className="skeleton w-12 h-4" />
                    </div>
                  ))}
                </div>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Supported',
            accessor: 'supported_chains',
            sortType: (rowA, rowB) => rowA.original.supported_chains?.length > rowB.original.supported_chains?.length ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && validators_chains_data && props.value ?
                <div className="text-right">
                  {props.value.length > 0 ?
                    <div className="w-24 flex flex-wrap items-center justify-end">
                      {props.value.map((c, i) => (
                        chain_manager.image(c, chains_data) ?
                          <img
                            key={i}
                            src={chain_manager.image(c, chains_data)}
                            alt={chain_manager.title(c, chains_data)}
                            className="w-5 h-5 rounded-full mb-1 ml-1"
                          />
                          :
                          <span key={i} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl text-gray-800 dark:text-gray-200 text-xs font-semibold mb-1 ml-1 px-1.5 py-0.5">
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
                    <div key={i} className="skeleton w-5 h-5 rounded-full mb-1 ml-1" />
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
                <div className="text-right my-1">
                  {props.value ?
                    <>
                      <span className={`bg-${props.value.includes('UN') ? props.value.endsWith('ED') ? 'gray-400 dark:bg-gray-900' : 'yellow-400 dark:bg-yellow-500' : 'green-600 dark:bg-green-700'} rounded-xl capitalize text-white font-semibold px-2 py-1`}>
                        {props.value.replace('BOND_STATUS_', '')}
                      </span>
                      {/*props.row.original.jailed_until > 0 && (
                        <div className="text-3xs text-right space-y-1 mt-2">
                          <div className="text-gray-400 dark:text-gray-600 font-medium">Latest Jailed Until</div>
                          <div className="text-gray-600 dark:text-gray-400 font-semibold">{moment(props.row.original.jailed_until).format('MMM D, YYYY h:mm:ss A')}</div>
                        </div>
                      )*/}
                      {props.row.original.illegible && props.row.original.tss_illegibility_info && (
                        <div className="flex flex-col items-end space-y-1.5 mt-2">
                          {Object.entries(props.row.original.tss_illegibility_info).filter(([key, value]) => value).map(([key, value]) => (
                            <span key={key} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl capitalize text-gray-900 dark:text-gray-200 text-xs font-semibold px-1.5 py-0.5">
                              {getName(key)}
                            </span>
                          ))}
                        </div>
                      )}
                      {props.row.original.deregistering && (
                        <div className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-2">
                          (De-registering)
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
          {
            Header: 'Jailed',
            accessor: 'jailed',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.row.original.tombstoned ?
                    <span className="bg-red-600 rounded-xl capitalize text-white font-semibold px-2 py-1">
                      Tombstoned
                    </span>
                    :
                    props.value ?
                      <span className="bg-red-600 rounded-xl capitalize text-white font-semibold px-2 py-1">
                        Jailed
                      </span>
                      :
                      <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="skeleton w-16 h-6 my-0.5 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ].filter(column => ['inactive'].includes(status) ? !(['self_delegation'/*, 'uptime', 'heartbeats_uptime'*/, 'supported_chains'].includes(column.accessor)) : ['illegible', 'deregistering'].includes(status) ? !(['self_delegation', /*'uptime', */, 'votes', 'supported_chains', 'jailed'].includes(column.accessor)) : !(['self_delegation', 'jailed'].includes(column.accessor)))}
        data={validatorsData ?
          validatorsData.filter(v => status === 'inactive' ? !(['BOND_STATUS_BONDED'].includes(v.status)) : status === 'illegible' ? v.illegible : status === 'deregistering' ? v.deregistering : !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)).map((v, i) => { return { ...v, i } })
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={validatorsData ? validatorsData.filter(v => status === 'inactive' ? !(['BOND_STATUS_BONDED'].includes(v.status)) : status === 'illegible' ? v.illegible : status === 'deregistering' ? v.deregistering : !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)).length <= 10 : true}
        defaultPageSize={100}
        className={`${validatorsData && ['active'].includes(status) ? 'small' : ''} no-border`}
      />
      {validatorsData?.filter(v => status === 'inactive' ? !(['BOND_STATUS_BONDED'].includes(v.status)) : status === 'illegible' ? v.illegible : status === 'deregistering' ? v.deregistering : !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)).length < 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Validators
        </div>
      )}
    </div>
  )
}