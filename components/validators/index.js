import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin, ThreeDots, Grid } from 'react-loader-spinner'
import { FiBox } from 'react-icons/fi'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import Image from '../image'
import { ProgressBarWithText } from '../progress-bars'
import { chain_manager } from '../../lib/object/chain'
import { denom_manager } from '../../lib/object/denom'
import { number_format, name, ellipse, loader_color } from '../../lib/utils'

const STATUSES = ['active', 'inactive', 'deregistering']

export default () => {
  const { preferences, evm_chains, assets, validators, validators_chains } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, assets: state.assets, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { ...validators_chains }

  const router = useRouter()
  const { query } = { ...router }
  const { status } = { ...query }

  const [validatorsData, setValidatorsData] = useState(null)

  useEffect(() => {
    if (validators_data) {
      setValidatorsData(validators_data.map(v => {
        return {
          ...v,
          supported_chains: Object.entries({ ...validators_chains_data }).filter(([k, _v]) => _v?.includes(v?.operator_address)).map(([k, _v]) => k),
        }
      }))
    }
  }, [validators_data, validators_chains_data])

  const filterData = status => validatorsData?.filter(v => status === 'inactive' ? !['BOND_STATUS_BONDED'].includes(v.status) : status === 'deregistering' ? v.deregistering : !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status))

  const data_filtered = filterData(status)

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <div className="flex items-center overflow-x-auto space-x-2">
        {STATUSES.map((s, i) => {
          const total = filterData(s)?.length
          const selected = s === status || (s === 'active' && !status)
          return (
            <Link
              key={i}
              href={`/validators${s !== 'active' ? `/${s}` : ''}`}
            >
              <a className={`${selected ? 'bg-blue-500 dark:bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded-lg flex items-center uppercase space-x-1 py-1 px-2`}>
                <span className={`whitespace-nowrap ${selected ? 'text-white' : 'text-black dark:text-white'}`}>
                  {s}
                </span>
                {typeof total === 'number' && (
                  <span className={`whitespace-nowrap font-mono ${selected ? 'text-white' : 'text-black dark:text-white'} font-bold`}>
                    ({number_format(total, '0,0')})
                  </span>
                )}
              </a>
            </Link>
          )
        })}
      </div>
      {data_filtered ?
        <Datatable
          columns={[
            {
              Header: '#',
              accessor: 'i',
              sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
              Cell: props => (
                <span className="font-mono font-semibold">
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
              Header: !status ? 'Voting Power' : 'Bonded Tokens',
              accessor: 'tokens',
              sortType: (a, b) => a.original.tokens > b.original.tokens ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end">
                    {props.value > 0 ?
                      <>
                        <span className="text-xs lg:text-sm font-bold">
                          {number_format(Math.floor(denom_manager.amount(props.value, assets_data[0]?.id, assets_data)), '0,0.00000000')}
                        </span>
                        <span className="text-slate-400 dark:text-slate-200 text-2xs lg:text-sm">
                          ({number_format(props.value * 100 / _.sumBy(filterData('active'), 'tokens'), '0,0.000000')}%)
                        </span>
                      </>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Comm.',
              accessor: 'commission.commission_rates.rate',
              sortType: (a, b) => Number(a.original.commission?.commission_rates?.rate) > Number(b.original.commission?.commission_rates?.rate) ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end space-y-1.5">
                    {!isNaN(props.value) ?
                      <span className="text-xs lg:text-sm font-semibold">
                        {number_format(props.value * 100, '0,0.00')}%
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: (
                <span className="flex items-center space-x-1">
                  <span>
                    Uptime
                  </span>
                  <span>
                    {number_format(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS, '0,0')}
                  </span>
                  <FiBox size={16} className="stroke-current" />
                </span>
              ),
              accessor: 'uptime',
              sortType: (a, b) => a.original.uptime > b.original.uptime ? 1 : -1,
              Cell: props => (
                <div className="w-40 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
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
                    Heartbeat
                  </span>
                  <span>
                    {number_format(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS, '0,0')}
                  </span>
                  <FiBox size={16} className="stroke-current" />
                </span>
              ),
              accessor: 'heartbeats_uptime',
              sortType: (a, b) => a.original.heartbeats_uptime > b.original.heartbeats_uptime ? 1 : -1,
              Cell: props => (
                <div className="w-40 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
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
                    EVM votes
                  </span>
                  <span>
                    {number_format(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS, '0,0')}
                  </span>
                  <FiBox size={16} className="stroke-current" />
                </span>
              ),
              accessor: 'votes',
              sortType: (a, b) => a.original.total_yes_votes > b.original.total_yes_votes ? 1 : a.original.total_yes_votes < b.original.total_yes_votes ? -1 : a.original.total_no_votes <= b.original.total_no_votes ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col justify-center space-y-0.5 mt-0.5 mx-3">
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
              headerClassName: 'whitespace-nowrap mx-3',
            },
            {
              Header: 'EVM Supported',
              accessor: 'supported_chains',
              sortType: (a, b) => a.original.supported_chains?.length > b.original.supported_chains?.length ? 1 : -1,
              Cell: props => (
                <div className="flex flex-wrap items-center mt-0.5">
                  {validators_chains_data ?
                    props.value?.length > 0 ?
                      props.value.filter(c => chain_manager.image(c, evm_chains_data)).map((c, i) => (
                        <Image
                          key={i}
                          src={chain_manager.image(c, evm_chains_data)}
                          title={chain_manager.name(c, evm_chains_data)}
                          className="w-5 h-5 rounded-full mb-1 mr-1"
                        />
                      ))
                      :
                      <span className="text-slate-400 dark:text-slate-600 font-semibold -mt-0.5">
                        No EVM Supported
                      </span>
                    :
                    <Grid color={loader_color(theme)} width="32" height="32" />
                  }
                </div>
              ),
              headerClassName: 'whitespace-nowrap',
            },
            {
              Header: 'Status',
              accessor: 'status',
              sortType: (a, b) => a.original.tombstoned > b.original.tombstoned ? -1 : a.original.tombstoned < b.original.tombstoned ? 1 :
                a.original.jailed > b.original.jailed ? -1 : a.original.jailed < b.original.jailed ? 1 :
                a.original.status > b.original.status ? 1 : a.original.status < b.original.status ? -1 :
                Object.values({ ...a.original.tss_illegibility_info }).filter(v => v).length < Object.values({ ...b.original.tss_illegibility_info }).filter(v => v).length ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end space-y-0.5 my-0.5">
                    {props.value ?
                      <>
                        {props.row.original.deregistering && (
                          <div className="bg-slate-100 dark:bg-slate-900 rounded-lg capitalize text-xs font-bold px-1.5 py-0.5">
                            Deregistering
                          </div>
                        )}
                        {props.row.original.tombstoned && (
                          <div className="bg-slate-400 dark:bg-slate-500 rounded-lg capitalize text-white text-xs font-bold px-1.5 py-0.5">
                            Tombstoned
                          </div>
                        )}
                        {props.row.original.jailed && (
                          <div className="bg-red-500 dark:bg-red-600 rounded-lg capitalize text-white text-xs font-bold px-1.5 py-0.5">
                            Jailed
                          </div>
                        )}
                        <div className={`${props.value.includes('UN') ? props.value.endsWith('ED') ? 'bg-red-500 dark:bg-red-600' : 'bg-yellow-400 dark:bg-yellow-500' : 'bg-green-500 dark:bg-green-600'} rounded-lg capitalize text-white text-xs font-bold px-1.5 py-0.5`}>
                          {props.value.replace('BOND_STATUS_', '').toLowerCase()}
                        </div>
                        {Object.entries({ ...props.row.original.tss_illegibility_info }).filter(([k, v]) => v).map(([k, v]) => (
                          <div
                            key={k}
                            className="bg-slate-100 dark:bg-slate-900 rounded-lg capitalize text-xs font-bold px-1.5 py-0.5"
                          >
                            {name(k)}
                          </div>
                        ))}
                      </>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            },
          ].filter(c => ['inactive'].includes(status) ?
            !['supported_chains'].includes(c.accessor) :
            ['deregistering'].includes(status) ?
              !['votes', 'supported_chains'].includes(c.accessor) :
              ![].includes(c.accessor)
          )}
          data={_.orderBy(data_filtered, ['tokens'], ['desc'])}
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