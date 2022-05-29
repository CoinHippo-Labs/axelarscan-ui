import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { FiBox } from 'react-icons/fi'
import { TailSpin } from 'react-loader-spinner'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
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
  const { pathname, query, asPath } = { ...router }
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
          return (
            <Link
              key={i}
              href={`/validators${s !== 'active' ? `/${s}` : ''}`}
            >
              <a className={`${s === status || (s === 'active' && !status) ? 'bg-blue-500 dark:bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded-lg flex items-center uppercase space-x-1 py-1 px-2`}>
                <span className="whitespace-nowrap">
                  {s}
                </span>
                {typeof total === 'number' && (
                  <span className="font-mono font-bold">
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
            // {
            //   Header: 'Validator',
            //   accessor: 'description.moniker',
            //   sortType: (rowA, rowB) => (rowA.original.description?.moniker || rowA.original.i) > (rowB.original.description?.moniker || rowB.original.i) ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton ?
            //       <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2`}>
            //         <Link href={`/validator/${props.row.original.operator_address}`}>
            //           <a>
            //             {props.row.original.description.image ?
            //               <img
            //                 src={props.row.original.description.image}
            //                 alt=""
            //                 className="w-6 h-6 rounded-full"
            //               />
            //               :
            //               <div className="skeleton w-6 h-6 rounded-full" />
            //             }
            //           </a>
            //         </Link>
            //         <div className="flex flex-col">
            //           {props.value && (
            //             <Link href={`/validator/${props.row.original.operator_address}`}>
            //               <a className="text-blue-600 dark:text-white font-medium">
            //                 {ellipse(props.value, 16) || props.row.original.operator_address}
            //               </a>
            //             </Link>
            //           )}
            //           <span className="flex items-center space-x-1">
            //             <Link href={`/validator/${props.row.original.operator_address}`}>
            //               <a className="text-gray-400 dark:text-gray-600 font-light">
            //                 {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipse(props.row.original.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
            //               </a>
            //             </Link>
            //             <Copy value={props.row.original.operator_address} />
            //           </span>
            //         </div>
            //       </div>
            //       :
            //       <div className="flex items-start space-x-2">
            //         <div className="skeleton w-6 h-6 rounded-full" />
            //         <div className="flex flex-col space-y-1.5">
            //           <div className="skeleton w-24 h-4" />
            //           <div className="skeleton w-32 h-3" />
            //         </div>
            //       </div>
            //   ),
            // },
            // {
            //   Header: ['active'].includes(status) ? 'Voting Power' : 'Bonded Tokens',
            //   accessor: 'tokens',
            //   sortType: (rowA, rowB) => rowA.original.tokens > rowB.original.tokens ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton ?
            //       <div className="flex flex-col justify-center text-left sm:text-right">
            //         {props.value > 0 ?
            //           <>
            //             <span className="font-medium">{number_format(Math.floor(denom_manager.amount(props.value, assets_data?.[0]?.id, assets_data)), '0,0.00')}</span>
            //             <span className="text-gray-400 dark:text-gray-600">{number_format(props.value * 100 / _.sumBy(validatorsData.filter(v => !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)), 'tokens'), '0,0.000')}%</span>
            //           </>
            //           :
            //           <span className="text-gray-400 dark:text-gray-600">-</span>
            //         }
            //       </div>
            //       :
            //       <div className="flex flex-col justify-center space-y-1">
            //         <div className="skeleton w-16 h-4 ml-0 sm:ml-auto" />
            //         <div className="skeleton w-8 h-4 ml-0 sm:ml-auto" />
            //       </div>
            //   ),
            //   headerClassName: 'min-w-max justify-start sm:justify-end text-left sm:text-right',
            // },
            // {
            //   Header: 'Self Delegation',
            //   accessor: 'self_delegation',
            //   sortType: (rowA, rowB) => rowA.original.self_delegation / rowA.original.delegator_shares > rowB.original.self_delegation / rowB.original.delegator_shares ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton && typeof props.value === 'number' ?
            //       <div className="flex flex-col justify-center text-left sm:text-right">
            //         {props.value > 0 ?
            //           <span className="text-gray-400 dark:text-gray-600">{number_format(props.value * 100 / props.row.original.delegator_shares, '0,0.000')}%</span>
            //           :
            //           <span className="text-gray-400 dark:text-gray-600">-</span>
            //         }
            //       </div>
            //       :
            //       <div className="flex flex-col justify-center space-y-1">
            //         <div className="skeleton w-8 h-4 ml-0 sm:ml-auto" />
            //       </div>
            //   ),
            //   headerClassName: 'min-w-max justify-start sm:justify-end text-left sm:text-right',
            // },
            // {
            //   Header: 'Comm.',
            //   accessor: 'commission.commission_rates.rate',
            //   sortType: (rowA, rowB) => Number(rowA.original.commission?.commission_rates?.rate) > Number(rowB.original.commission?.commission_rates?.rate) ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton ?
            //       <div className="text-right">
            //         {!isNaN(props.value) ?
            //           <span>{number_format(props.value * 100, '0,0.00')}%</span>
            //           :
            //           <span className="text-gray-400 dark:text-gray-600">-</span>
            //         }
            //       </div>
            //       :
            //       <div className="skeleton w-8 h-4 ml-auto" />
            //   ),
            //   headerClassName: 'justify-end text-right',
            // },
            // {
            //   Header: (
            //     <span className="flex items-center space-x-1">
            //       <span>Uptime</span>
            //       <span>{number_format(Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS), '0,0')}</span>
            //       <FiBox size={16} className="stroke-current" />
            //     </span>
            //   ),
            //   accessor: 'uptime',
            //   sortType: (rowA, rowB) => rowA.original.uptime > rowB.original.uptime ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton && typeof props.value === 'number' ?
            //       <>
            //         {props.value > 0 ?
            //           <div className="w-40 mt-0.5 ml-auto">
            //             <ProgressBarWithText
            //               width={props.value}
            //               value={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
            //                 {number_format(props.value, '0,0.00')}%
            //               </div>}
            //               color="bg-green-500 dark:bg-green-700 rounded"
            //               backgroundClassName="h-4 bg-gray-200 dark:bg-gray-800 rounded"
            //               className={`h-4 flex items-center justify-${props.value < 20 ? 'start' : 'end'}`}
            //             />
            //           </div>
            //           :
            //           <div className="w-40 text-gray-400 dark:text-gray-600 text-right ml-auto">No Uptime</div>
            //         }
            //         {typeof props.row.original.start_height === 'number' && (
            //           <div className="text-3xs text-right space-x-1 mt-1.5">
            //             <span className="text-gray-400 dark:text-gray-600 font-medium">Validator Since Block:</span>
            //             <span className="text-gray-600 dark:text-gray-100 font-semibold">{number_format(props.row.original.start_height, '0,0')}</span>
            //           </div>
            //         )}
            //       </>
            //       :
            //       <>
            //         <div className="skeleton w-40 h-4 mt-0.5 ml-auto" />
            //         <div className="skeleton w-24 h-3.5 mt-1.5 ml-auto" />
            //       </>
            //   ),
            //   headerClassName: 'justify-end text-right',
            // },
            // {
            //   Header: (
            //     <span className="flex items-center space-x-1">
            //       <span>Heartbeat</span>
            //       <span>{number_format(Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS), '0,0')}</span>
            //       <FiBox size={16} className="stroke-current" />
            //     </span>
            //   ),
            //   accessor: 'heartbeats_uptime',
            //   sortType: (rowA, rowB) => rowA.original.heartbeats_uptime > rowB.original.heartbeats_uptime ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton && typeof props.value === 'number' ?
            //       <>
            //         {props.value > 0 ?
            //           <div className="w-40 mt-0.5 ml-auto">
            //             <ProgressBarWithText
            //               width={props.value}
            //               value={<div className="text-white mx-1" style={{ fontSize: '.55rem' }}>
            //                 {number_format(props.value, '0,0.00')}%
            //               </div>}
            //               color="bg-green-500 dark:bg-green-700 rounded"
            //               backgroundClassName="h-4 bg-gray-200 dark:bg-gray-800 rounded"
            //               className={`h-4 flex items-center justify-${props.value < 20 ? 'start' : 'end'}`}
            //             />
            //           </div>
            //           :
            //           <div className="w-40 text-gray-400 dark:text-gray-600 text-right ml-auto">No Heartbeat</div>
            //         }
            //         {typeof props.row.original.start_proxy_height === 'number' && (
            //           <div className="text-3xs text-right space-x-1 mt-1.5">
            //             <span className="text-gray-400 dark:text-gray-600 font-medium">Proxy Registered Block:</span>
            //             <span className="text-gray-600 dark:text-gray-100 font-semibold">{number_format(props.row.original.start_proxy_height, '0,0')}</span>
            //           </div>
            //         )}
            //       </>
            //       :
            //       <>
            //         <div className="skeleton w-40 h-4 mt-0.5 ml-auto" />
            //         <div className="skeleton w-24 h-3.5 mt-1.5 ml-auto" />
            //       </>
            //   ),
            //   headerClassName: 'justify-end text-right',
            // },
            // {
            //   Header: (
            //     <span className="flex items-center space-x-1">
            //       <span className="whitespace-nowrap">EVM Votes</span>
            //       <span>{number_format(Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS), '0,0')}</span>
            //       <FiBox size={16} className="stroke-current" />
            //     </span>
            //   ),
            //   accessor: 'votes',
            //   sortType: (rowA, rowB) => rowA.original.total_yes_votes > rowB.original.total_yes_votes ? 1 : rowA.original.total_yes_votes < rowB.original.total_yes_votes ? -1 : rowA.original.total_no_votes <= rowB.original.total_no_votes ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton && props.value ?
            //       Object.keys(props.value.chains || {}).length > 0 ?
            //         <div className="min-w-max grid grid-flow-row grid-cols-2 gap-y-2 gap-x-3 ml-auto">
            //           {Object.entries(props.value.chains).map(([key, value]) => (
            //             <div key={key} className="flex items-start justify-between space-x-2">
            //               <img
            //                 src={chain_manager.image(key, evm_chains_data)}
            //                 alt={chain_manager.title(key, evm_chains_data)}
            //                 className="w-4 h-4 rounded-full"
            //               />
            //               <div className="flex flex-col items-end space-y-1">
            //                 <div className="flex items-center uppercase text-3xs space-x-1">
            //                   <div className="text-green-500 font-semibold space-x-0.5">
            //                     <span className="font-mono">
            //                       {number_format(value?.confirms?.true || 0, '0,0')}
            //                     </span>
            //                     <span>Yes</span>
            //                   </div>
            //                   <span className="text-gray-400 dark:text-gray-600 font-semibold">:</span>
            //                   <div className={`${value?.confirms?.false > 0 ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-gray-600 font-semibold'} font-semibold space-x-0.5`}>
            //                     <span className="font-mono">
            //                       {number_format(value?.confirms?.false || 0, '0,0')}
            //                     </span>
            //                     <span>No</span>
            //                   </div>
            //                 </div>
            //                 <div className={`flex items-center ${(props.row.original.total_polls?.[key] || 0) > (value?.confirms?.true || 0) ? 'text-yellow-500 dark:text-yellow-400 font-bold' : 'text-gray-500 dark:text-gray-300 font-semibold'} text-3xs space-x-1`}>
            //                   <span className="capitalize">Total:</span>
            //                   <span className="font-mono">
            //                     {number_format(props.row.original.total_polls?.[key] || 0, '0,0')}
            //                   </span>
            //                 </div>
            //               </div>
            //             </div>
            //           ))}
            //         </div>
            //         :
            //         <div className="w-full font-mono text-gray-400 dark:text-gray-600 text-right">-</div>
            //       :
            //       <div className="min-w-max max-w-min grid grid-flow-row grid-cols-2 gap-y-2 gap-x-3 ml-auto">
            //         {[...Array(4).keys()].map(i => (
            //           <div key={i} className="max-w-min flex items-center justify-between space-x-2">
            //             <div className="skeleton w-4 h-4 rounded-full" />
            //             <div className="skeleton w-12 h-4" />
            //           </div>
            //         ))}
            //       </div>
            //   ),
            //   headerClassName: 'justify-end text-right',
            // },
            // {
            //   Header: 'Supported',
            //   accessor: 'supported_chains',
            //   sortType: (rowA, rowB) => rowA.original.supported_chains?.length > rowB.original.supported_chains?.length ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton && validators_chains_data && props.value ?
            //       <div className="text-right">
            //         {props.value.length > 0 ?
            //           <div className="w-24 flex flex-wrap items-center justify-end">
            //             {props.value.map((c, i) => (
            //               chain_manager.image(c, evm_chains_data) ?
            //                 <img
            //                   key={i}
            //                   src={chain_manager.image(c, evm_chains_data)}
            //                   alt={chain_manager.title(c, evm_chains_data)}
            //                   className="w-5 h-5 rounded-full mb-1 ml-1"
            //                 />
            //                 :
            //                 <span key={i} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl text-gray-800 dark:text-gray-200 text-xs font-semibold mb-1 ml-1 px-1.5 py-0.5">
            //                   {chain_manager.title(c, evm_chains_data)}
            //                 </span>
            //             ))}
            //           </div>
            //           :
            //           <span className="text-gray-400 dark:text-gray-600 mr-2">-</span>
            //         }
            //       </div>
            //       :
            //       <div className="flex flex-wrap items-center justify-end">
            //         {[...Array(3).keys()].map(i => (
            //           <div key={i} className="skeleton w-5 h-5 rounded-full mb-1 ml-1" />
            //         ))}
            //       </div>
            //   ),
            //   headerClassName: 'min-w-max justify-end text-right',
            // },
            // {
            //   Header: 'Status',
            //   accessor: 'status',
            //   sortType: (rowA, rowB) => rowA.original.status > rowB.original.status ? 1 : rowA.original.status < rowB.original.status ? -1 : Object.values(rowA.original.tss_illegibility_info || {}).filter(v => v).length < Object.values(rowB.original.tss_illegibility_info || {}).filter(v => v).length ? 1 : -1,
            //   Cell: props => (
            //     !props.row.original.skeleton ?
            //       <div className="text-right my-1">
            //         {props.value ?
            //           <>
            //             <span className={`bg-${props.value.includes('UN') ? props.value.endsWith('ED') ? 'gray-400 dark:bg-gray-900' : 'yellow-400 dark:bg-yellow-500' : 'green-600 dark:bg-green-700'} rounded-xl capitalize text-white font-semibold px-2 py-1`}>
            //               {props.value.replace('BOND_STATUS_', '')}
            //             </span>
            //             {props.row.original.illegible && props.row.original.tss_illegibility_info && (
            //               <div className="flex flex-col items-end space-y-1.5 mt-2">
            //                 {Object.entries(props.row.original.tss_illegibility_info).filter(([key, value]) => value).map(([key, value]) => (
            //                   <span key={key} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl capitalize text-gray-900 dark:text-gray-200 text-xs font-semibold px-1.5 py-0.5">
            //                     {name(key)}
            //                   </span>
            //                 ))}
            //               </div>
            //             )}
            //             {props.row.original.deregistering && (
            //               <div className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-2">
            //                 (De-registering)
            //               </div>
            //             )}
            //           </>
            //           :
            //           <span className="text-gray-400 dark:text-gray-600">-</span>
            //         }
            //       </div>
            //       :
            //       <div className="skeleton w-24 h-6 my-0.5 ml-auto" />
            //   ),
            //   headerClassName: 'justify-end text-right',
            // },
            // {
            //   Header: 'Jailed',
            //   accessor: 'jailed',
            //   disableSortBy: true,
            //   Cell: props => (
            //     !props.row.original.skeleton ?
            //       <div className="text-right my-1">
            //         {props.row.original.tombstoned ?
            //           <span className="bg-red-600 rounded-xl capitalize text-white font-semibold px-2 py-1">
            //             Tombstoned
            //           </span>
            //           :
            //           props.value ?
            //             <span className="bg-red-600 rounded-xl capitalize text-white font-semibold px-2 py-1">
            //               Jailed
            //             </span>
            //             :
            //             <span className="text-gray-400 dark:text-gray-600">-</span>
            //         }
            //       </div>
            //       :
            //       <div className="skeleton w-16 h-6 my-0.5 ml-auto" />
            //   ),
            //   headerClassName: 'justify-end text-right',
            // },
          ].filter(c => ['inactive'].includes(status) ?
            !['self_delegation', 'supported_chains'].includes(c.accessor) :
            ['deregistering'].includes(status) ?
              !['self_delegation', 'votes', 'supported_chains', 'jailed'].includes(c.accessor) :
              !['self_delegation', 'jailed'].includes(c.accessor)
          )}
          data={data_filtered}
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