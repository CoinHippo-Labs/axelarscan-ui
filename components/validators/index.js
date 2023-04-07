import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar as ProgressBarSpinner, ColorRing } from 'react-loader-spinner'
import { IoMdCube } from 'react-icons/io'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import Image from '../image'
import { ProgressBar, ProgressBarWithText } from '../progress-bars'
import { inflation as getInflation } from '../../lib/api/inflation'
import { chainManager } from '../../lib/object/chain'
import { native_asset_id, assetManager } from '../../lib/object/asset'
import { number_format, name, ellipse, loader_color } from '../../lib/utils'

const STATUSES = ['active', 'inactive']

export default () => {
  const {
    preferences,
    evm_chains,
    assets,
    chain,
    validators,
    validators_chains,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        assets: state.assets,
        chain: state.chain,
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
    assets_data,
  } = { ...assets }
  const {
    chain_data,
  } = { ...chain }
  const {
    validators_data,
  } = { ...validators }
  const {
    validators_chains_data,
  } = { ...validators_chains }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    status,
  } = { ...query }

  const [inflationData, setInflationData] = useState(null)
  const [validatorsData, setValidatorsData] = useState(null)

  useEffect(
    () => {
      const getData = async () => setInflationData(await getInflation())

      getData()
    },
    [],
  )

  useEffect(
    () => {
      const {
        staking_pool,
        bank_supply,
      } = { ...chain_data }

      if (assets_data && validators_data && validators_chains_data && staking_pool && bank_supply && inflationData) {
        const {
          bonded_tokens,
        } = { ...staking_pool }

        const {
          amount,
        } = { ...bank_supply }

        const total_supply = amount;

        const {
          tendermintInflationRate,
          keyMgmtRelativeInflationRate,
          externalChainVotingInflationRate,
          communityTax,
        } = { ...inflationData }

        setValidatorsData(
          validators_data.map(v => {
            const {
              tokens,
              commission,
              uptime,
              heartbeats_uptime,
              votes,
            } = { ...v }
            let {
              supported_chains,
            } = { ...v }

            const {
              rate,
            } = { ...commission?.commission_rates }

            supported_chains = Object.entries({ ...validators_chains_data }).filter(([k, _v]) => _v?.includes(v?.operator_address)).map(([k, _v]) => k)

            const _tokens = assetManager.amount(tokens, native_asset_id, assets_data)

            const _inflation =
              parseFloat(
                (
                  ((uptime / 100) * (tendermintInflationRate || 0)) +
                  ((heartbeats_uptime / 100) * (keyMgmtRelativeInflationRate || 0) * (tendermintInflationRate || 0)) +
                  (
                    (externalChainVotingInflationRate || 0) *
                    _.sum(
                      supported_chains.map(c => {
                        const _votes = votes?.chains?.[c]

                        const {
                          total,
                          total_polls,
                        } = { ..._votes }

                        return 1 - (total_polls ? (total_polls - total) / total_polls : 0)
                      })
                    )
                  )
                )
                .toFixed(6)
              )

            return {
              ...v,
              tokens: _tokens,
              quadratic_voting_power: _tokens > 0 && Math.floor(Math.sqrt(_tokens)),
              inflation: _inflation,
              apr: (_inflation * 100) * total_supply * (1 - (communityTax || 0)) * (1 - (rate || 0)) / bonded_tokens,
              supported_chains,
              votes:
                votes &&
                {
                  ...votes,
                  chains:
                    Object.fromEntries(
                      Object.entries({ ...votes?.chains })
                        .filter(([k, v]) =>
                          supported_chains?.includes(k)
                        )
                    ),
                },
            }
          })
        )
      }
    },
    [assets_data, validators_data, validators_chains_data, inflationData],
  )

  const filterByStatus = status =>
    validatorsData &&
    validatorsData.filter(v =>
      status === 'inactive' ?
        !['BOND_STATUS_BONDED'].includes(v.status) :
        !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)
    )

  const data_filtered = filterByStatus(status)

  return (
    <div className="space-y-4 mb-4 mx-auto">
      <div className="flex items-center overflow-x-auto space-x-1">
        {STATUSES.map((s, i) => {
          const total = filterByStatus(s)?.length

          const selected = s === status || (s === 'active' && !status)

          return (
            <Link
              key={i}
              href={`/validators${s !== 'active' ? `/${s}` : ''}`}
            >
              <a
                className={`${selected ? 'bg-blue-500 dark:bg-blue-500 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-opacity-50 dark:hover:bg-opacity-50 text-slate-400 hover:text-blue-400 dark:text-slate-700 dark:hover:text-blue-600 hover:font-semibold'} shadow rounded-lg cursor-pointer uppercase space-x-1 mb-1 sm:mb-0 mr-1 py-1 px-2`}
              >
                <span className="whitespace-nowrap">
                  {s}
                </span>
                {
                  typeof total === 'number' &&
                  (
                    <span>
                      ({number_format(total, '0,0')})
                    </span>
                  )
                }
              </a>
            </Link>
          )
        })}
      </div>
      {data_filtered ?
        <div className="max-w-fit overflow-x-auto space-y-2 mx-auto p-0.5">
          <Datatable
            columns={
              [
                {
                  Header: '#',
                  accessor: 'i',
                  sortType: (a, b) =>
                    a.original.i > b.original.i ? 1 : -1,
                  Cell: props => (
                    <span className="font-medium">
                      {number_format((props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1, '0,0')}
                    </span>
                  ),
                },
                {
                  Header: 'Validator',
                  accessor: 'operator_address',
                  sortType: (a, b) => (a.original.description?.moniker || a.original.operator_address) > (b.original.description?.moniker || b.original.operator_address) ? 1 : -1,
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
                            {
                              moniker &&
                              (
                                <Link href={`/validator/${value}`}>
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                  >
                                    {ellipse(moniker, 10)}
                                  </a>
                                </Link>
                              )
                            }
                            <div className="flex items-center space-x-1">
                              <Link href={`/validator/${value}`}>
                                <a
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 dark:text-slate-600 text-xs"
                                >
                                  {ellipse(value, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
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
                                {ellipse(value, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
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
                  headerClassName: 'justify-center',
                },
                {
                  Header: (
                    <div className="flex flex-col items-center space-y-1">
                      <span>
                        Voting Power
                      </span>
                      <div className="flex items-center justify-between space-x-3 sm:space-x-8">
                        <span className="text-3xs -mr-4">
                          Consensus
                        </span>
                        <span className="text-3xs">
                          Quadratic
                        </span>
                      </div>
                    </div>
                  ),
                  accessor: 'voting_power',
                  sortType: (a, b) => a.original.quadratic_voting_power > b.original.quadratic_voting_power ? 1 : a.original.quadratic_voting_power < b.original.quadratic_voting_power ? -1 : a.original.tokens > b.original.tokens ? 1 : -1,
                  Cell: props => {
                    const {
                      tokens,
                      quadratic_voting_power,
                    } = { ...props.row.original }

                    const total_voting_power = _.sumBy(filterByStatus('active'), 'tokens')
                    const total_quadratic_voting_power = _.sumBy(filterByStatus('active'), 'quadratic_voting_power')

                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {tokens > 0 ?
                          <>
                            <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                              <span
                                title={number_format(tokens, '0,0')}
                                className="uppercase text-slate-600 dark:text-slate-200 text-xs lg:text-sm font-medium"
                              >
                                {number_format(tokens, '0,0.0a')}
                              </span>
                              <span className="text-slate-400 dark:text-slate-600 text-2xs lg:text-xs">
                                {number_format(tokens * 100 / total_voting_power, '0,0.00')}%
                              </span>
                            </div>
                            <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                              <span
                                title={number_format(quadratic_voting_power, '0,0')}
                                className="uppercase text-slate-600 dark:text-slate-200 text-xs lg:text-sm font-bold"
                              >
                                {number_format(quadratic_voting_power, '0,0.0a')}
                              </span>
                              <span className="text-slate-400 dark:text-slate-600 text-2xs lg:text-xs">
                                {number_format(quadratic_voting_power * 100 / total_quadratic_voting_power, '0,0.00')}%
                              </span>
                            </div>
                          </> :
                          <span>
                            -
                          </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
                },
                {
                  Header: !status ?
                    'Consensus Power' :
                    'Staked Tokens',
                  accessor: 'tokens',
                  sortType: (a, b) => a.original.tokens > b.original.tokens ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const total = _.sumBy(filterByStatus('active'), 'tokens')

                    return (
                      <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                        {value > 0 ?
                          <>
                            <span
                              title={number_format(value, '0,0')}
                              className="uppercase text-slate-600 dark:text-slate-200 text-xs lg:text-sm font-medium"
                            >
                              {number_format(value, '0,0.0a')}
                            </span>
                            <span className="text-slate-400 dark:text-slate-600 text-2xs lg:text-xs">
                              {number_format(value * 100 / total, '0,0.00')}%
                            </span>
                          </> :
                          <span>
                            -
                          </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-2xs text-left sm:text-right',
                },
                {
                  Header: 'Quadratic Voting Power',
                  accessor: 'quadratic_voting_power',
                  sortType: (a, b) => a.original.quadratic_voting_power > b.original.quadratic_voting_power ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const total = _.sumBy(filterByStatus('active'), 'quadratic_voting_power')

                    return (
                      <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                        {value > 0 ?
                          <>
                            <span
                              title={number_format(value, '0,0')}
                              className="uppercase text-slate-600 dark:text-slate-200 text-xs lg:text-sm font-semibold"
                            >
                              {number_format(value, '0,0.0a')}
                            </span>
                            <span className="text-slate-400 dark:text-slate-600 text-2xs lg:text-xs">
                              {number_format(value * 100 / total, '0,0.00')}%
                            </span>
                          </> :
                          <span>
                            -
                          </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-2xs text-left sm:text-right',
                },
                {
                  Header: (
                    <div className="flex flex-col items-center space-y-1">
                      <span className="-mr-4">
                        Cumulative
                      </span>
                      <span className="text-3xs mr-3">
                        Consensus
                      </span>
                    </div>
                  ),
                  accessor: 'cumulative_share',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      flatRows,
                      row,
                    } = { ...props }

                    const index = flatRows?.indexOf(row)

                    const total = _.sumBy(filterByStatus('active'), 'tokens')

                    const _data =
                      index > -1 ?
                        _.slice(
                          flatRows.map(d => {
                            const {
                              original,
                            } = { ...d }

                            const {
                              tokens,
                            } = { ...original }

                            return {
                              ...original,
                              tokens_share: tokens * 100 / total,
                            }
                          }),
                          0,
                          index + 1,
                        ) :
                        []

                    const {
                      tokens_share,
                    } = { ..._.last(_data) }

                    const total_share = _.sumBy(_data, 'tokens_share')

                    return (
                      <div className="flex items-start space-x-1.5 mt-0.5">
                        <div className="w-20 bg-zinc-100 dark:bg-zinc-900 mt-0.5">
                          <div style={{ width: `${total_share}%` }}>
                            <ProgressBar
                              width={(total_share - tokens_share) * 100 / total_share}
                              color="bg-blue-200 dark:bg-blue-500"
                              backgroundClassName="h-7 bg-blue-500 dark:bg-blue-200"
                              className="h-7"
                            />
                          </div>
                        </div>
                        <span className="text-slate-600 dark:text-slate-200 text-2xs font-medium">
                          {number_format(total_share, '0,0.0')}%
                        </span>
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-end',
                },
                {
                  Header: (
                    <div className="flex flex-col items-center space-y-1">
                      <span className="-ml-2.5">
                        Share %
                      </span>
                      <span className="text-3xs">
                        Quadratic
                      </span>
                    </div>
                  ),
                  accessor: 'quadratic_cumulative_share',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      flatRows,
                      row,
                    } = { ...props }

                    const index = flatRows?.indexOf(row)

                    const total = _.sumBy(filterByStatus('active'), 'quadratic_voting_power')

                    const _data =
                      index > -1 ?
                        _.slice(
                          flatRows.map(d => {
                            const {
                              original,
                            } = { ...d }

                            const {
                              quadratic_voting_power,
                            } = { ...original }

                            return {
                              ...original,
                              quadratic_voting_power_share: quadratic_voting_power * 100 / total,
                            }
                          }),
                          0,
                          index + 1,
                        ) :
                        []

                    const {
                      quadratic_voting_power_share,
                    } = { ..._.last(_data) }

                    const total_share = _.sumBy(_data, 'quadratic_voting_power_share')

                    return (
                      <div className="flex items-start space-x-1.5 mt-0.5">
                        <div className="w-20 bg-zinc-100 dark:bg-zinc-900 mt-0.5">
                          <div style={{ width: `${total_share}%` }}>
                            <ProgressBar
                              width={(total_share - quadratic_voting_power_share) * 100 / total_share}
                              color="bg-orange-200 dark:bg-orange-500"
                              backgroundClassName="h-7 bg-orange-500 dark:bg-orange-200"
                              className="h-7"
                            />
                          </div>
                        </div>
                        <span className="text-slate-600 dark:text-slate-200 text-2xs font-bold">
                          {number_format(total_share, '0,0.0')}%
                        </span>
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Commission',
                  accessor: 'commission.commission_rates.rate',
                  sortType: (a, b) => Number(a.original.commission?.commission_rates?.rate) > Number(b.original.commission?.commission_rates?.rate) ? 1 : -1,
                  Cell: props => (
                    <div className="text-left sm:text-right">
                      {!isNaN(props.value) ?
                        <div className="font-medium mt-0.5">
                          {number_format(props.value * 100, '0,0.0')}%
                        </div> :
                        <span>
                          -
                        </span>
                      }
                    </div>
                  ),
                  headerClassName: `${!status ? 'sm:w-8' : ''} justify-start sm:justify-end text-2xs text-left sm:text-right`,
                },
                {
                  Header: (
                    <span title="Approximate staking APR per validator">
                      Staking APR
                    </span>
                  ),
                  accessor: 'apr',
                  sortType: (a, b) => a.original.apr > b.original.apr ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const {
                      inflation,
                      uptime,
                    } = { ...props.row.original }

                    return (
                      <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                        {!isNaN(value) ?
                          <>
                            <div
                              title={`${number_format(value, '0,0.00')}%`}
                              className="font-medium mt-0.5"
                            >
                              {number_format(value, '0,0.0')}%
                            </div>
                            {
                              typeof inflation === 'number' &&
                              (
                                <div
                                  title={`${number_format(inflation * 100, '0,0.000')}%`}
                                  className="space-x-0.5"
                                >
                                  <span className="text-2xs text-slate-400 dark:text-slate-600 font-medium">
                                    Inflation:
                                  </span>
                                  <span className="text-2xs lg:text-2xs">
                                    {number_format(inflation * 100, '0,0.00')}%
                                  </span>
                                </div>
                              )
                            }
                          </> :
                          typeof heartbeats_uptime === 'number' ?
                            <span>
                              -
                            </span> :
                            <div className="w-full flex items-center justify-start sm:justify-end mt-0.5">
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
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-2xs text-left sm:text-right',
                },
                {
                  Header: (
                    <span
                      title={`No. of blocks signed off by the validator in the last ${number_format(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS, '0,0a')} blocks`}
                      className="flex items-center space-x-1"
                    >
                      <span>
                        Uptime
                      </span>
                      <span>
                        {number_format(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS, '0,0a')}
                      </span>
                      <IoMdCube
                        size={18}
                        className="stroke-current opacity-60"
                      />
                    </span>
                  ),
                  accessor: 'uptime',
                  sortType: (a, b) => a.original.uptime > b.original.uptime ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const {
                      start_height,
                    } = { ...props.row.original }

                    return (
                      <div className="w-28 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                        {typeof value === 'number' ?
                          value > 0 ?
                            <div className="w-full mt-1">
                              <ProgressBarWithText
                                width={value}
                                text={
                                  <div className="text-white text-2xs font-semibold mx-1.5">
                                    {number_format(value, '0,0.0')}%
                                  </div>
                                }
                                color={`${value < 95 ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-green-400 dark:bg-green-500'} rounded-lg`}
                                backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 hover:bg-opacity-50 rounded-lg"
                                className={`h-4 flex items-center justify-${value < 33 ? 'start' : 'end'}`}
                              />
                            </div> :
                            <span className="h-4 text-slate-300 dark:text-slate-600 mt-0.5">
                              No Uptimes
                            </span> :
                          <div className="w-full flex items-center justify-start sm:justify-end mt-0.5">
                            <ColorRing
                              color={loader_color(theme)}
                              width="24"
                              height="24"
                            />
                          </div>
                        }
                        {
                          typeof start_height === 'number' &&
                          (
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
                                  {number_format(start_height, '0,0')}
                                </a>
                              </Link>
                            </div>
                          )
                        }
                      </div>
                    )
                  },
                  headerClassName: `${!status ? 'text-2xs' : ''} whitespace-nowrap justify-start sm:justify-end text-left sm:text-right`,
                },
                {
                  Header: (
                    <span
                      title={`No. of heartbeats from validator in the last ${number_format(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS, '0,0a')} blocks`}
                      className="flex items-center uppercase space-x-1"
                    >
                      <span>
                        Heartbeat
                      </span>
                      <span>
                        {number_format(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS, '0,0a')}
                      </span>
                      <IoMdCube
                        size={18}
                        className="stroke-current opacity-60"
                      />
                    </span>
                  ),
                  accessor: 'heartbeats_uptime',
                  sortType: (a, b) => a.original.heartbeats_uptime > b.original.heartbeats_uptime ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const {
                      start_proxy_height,
                      stale_heartbeats,
                    } = { ...props.row.original }

                    return (
                      <div className="w-28 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                        {typeof value === 'number' ?
                          value > 0 ?
                            <div className="w-full mt-1">
                              <ProgressBarWithText
                                width={value}
                                text={
                                  <div className="text-white text-2xs font-semibold mx-1.5">
                                    {number_format(value, '0,0.0')}%
                                  </div>
                                }
                                color={`${value < 95 ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-green-400 dark:bg-green-500'} rounded-lg`}
                                backgroundClassName="h-4 bg-slate-200 dark:bg-slate-800 hover:bg-opacity-50 rounded-lg"
                                className={`h-4 flex items-center justify-${value < 33 ? 'start' : 'end'}`}
                              />
                            </div> :
                            <span className="h-4 text-slate-300 dark:text-slate-600 mt-0.5">
                              No Heartbeats
                            </span> :
                          <div className="w-full flex items-center justify-start sm:justify-end mt-0.5">
                            <ColorRing
                              color={loader_color(theme)}
                              width="24"
                              height="24"
                            />
                          </div>
                        }
                        {
                          typeof start_proxy_height === 'number' &&
                          (
                            <div className="text-2xs space-x-1">
                              <span className="text-slate-400 dark:text-slate-200 font-medium space-x-0.5">
                                <span>
                                  Started
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
                                  {number_format(start_proxy_height, '0,0')}
                                </a>
                              </Link>
                            </div>
                          )
                        }
                        {
                          stale_heartbeats &&
                          (
                            <div className="bg-red-200 dark:bg-red-400 text-red-500 dark:text-red-800 rounded-xl whitespace-nowrap text-xs font-semibold py-0.5 px-2">
                              Stale Heartbeats
                            </div>
                          )
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-2xs text-left sm:text-right',
                },
                {
                  Header: (
                    <span
                      title="Votes by the validator on cross-chain msgs on EVM chains"
                      className="flex items-center uppercase space-x-1"
                    >
                      <span>
                        EVM votes
                      </span>
                      <span>
                        {number_format(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS, '0,0a')}
                      </span>
                      <IoMdCube
                        size={18}
                        className="stroke-current opacity-60"
                      />
                    </span>
                  ),
                  accessor: 'votes',
                  sortType: (a, b) => a.original.total_yes_votes > b.original.total_yes_votes ? 1 : a.original.total_yes_votes < b.original.total_yes_votes ? -1 : a.original.total_no_votes < b.original.total_no_votes ? 1 : a.original.total_no_votes > b.original.total_no_votes ? 1 : a.original.total_unsubmitted_votes <= b.original.total_unsubmitted_votes ? 1 : -1,
                  Cell: props => (
                    <div className="flex flex-col justify-center space-y-0.5 mt-0.5 mx-3">
                      {props.value ?
                        Object.keys({ ...props.value.chains }).length > 0 ?
                          Object.entries(props.value.chains)
                            .map(([k, v]) => {
                              const image = chainManager.image(k, evm_chains_data)

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
                                    {
                                      image &&
                                      (
                                        <Image
                                          src={image}
                                          title={chainManager.name(k, evm_chains_data)}
                                          className="w-5 h-5 rounded-full"
                                        />
                                      )
                                    }
                                    <span className={`${votes?.true ? 'text-green-400 dark:text-green-300 font-semibold' : 'text-slate-300 dark:text-slate-700 font-normal'} text-xs -mt-0.5`}>
                                      {number_format(votes?.true || 0, '0,0')} Y
                                    </span>
                                    <span className={`${votes?.false ? 'text-red-500 dark:text-red-600 font-semibold' : 'text-slate-300 dark:text-slate-700 font-normal'} text-xs -mt-0.5`}>
                                      {number_format(votes?.false || 0, '0,0')} N
                                    </span>
                                    {
                                      votes?.unsubmitted > 0 &&
                                      (
                                        <span className="text-slate-400 dark:text-slate-500 text-xs font-normal -mt-0.5">
                                          {number_format(votes.unsubmitted, '0,0')} UN
                                        </span>
                                      )
                                    }
                                  </div>
                                  <span className="text-blue-400 dark:text-blue-200 text-xs font-medium -mt-0.5">
                                    [{number_format(total_polls || 0, '0,0')}]
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
                  headerClassName: 'whitespace-nowrap text-2xs mx-3',
                },
                {
                  Header: 'EVM Chains Supported',
                  accessor: 'supported_chains',
                  sortType: (a, b) => a.original.supported_chains?.length > b.original.supported_chains?.length ? 1 : -1,
                  Cell: props => (
                    <div className="max-w-fit flex flex-wrap items-center mt-0.5">
                      {validators_chains_data ?
                        props.value?.length > 0 ?
                          props.value
                            .filter(c => chainManager.image(c, evm_chains_data))
                            .map((c, i) => (
                              <Image
                                key={i}
                                src={chainManager.image(c, evm_chains_data)}
                                title={chainManager.name(c, evm_chains_data)}
                                className="w-6 h-6 rounded-full mb-1 mr-1"
                              />
                            )) :
                          <span className="text-slate-300 dark:text-slate-600">
                            No EVM Supported
                          </span> :
                        <ColorRing
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                      }
                    </div>
                  ),
                  headerClassName: 'whitespace-nowrap text-2xs',
                },
                {
                  Header: 'Status',
                  accessor: 'status',
                  sortType: (a, b) => a.original.tombstoned > b.original.tombstoned ? -1 : a.original.tombstoned < b.original.tombstoned ? 1 : a.original.jailed > b.original.jailed ? -1 : a.original.jailed < b.original.jailed ? 1 : a.original.status > b.original.status ? 1 : a.original.status < b.original.status ? -1 : -1,
                  Cell: props => {
                    const {
                      tombstoned,
                      jailed,
                    } = { ...props.row.original }

                    const status = props.value

                    return (
                      <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1 my-0.5">
                        {status ?
                          <>
                            <div className={`${status.includes('UN') ? status.endsWith('ED') ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-yellow-200 dark:bg-yellow-300 border-2 border-yellow-400 dark:border-yellow-600 text-yellow-500 dark:text-yellow-700' : 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700'} rounded-xl text-xs font-semibold py-0.5 px-2`}>
                              {status.replace('BOND_STATUS_', '')}
                            </div>
                            {
                              tombstoned &&
                              (
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl capitalize text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                                  Tombstoned
                                </div>
                              )
                            }
                            {
                              jailed &&
                              (
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl capitalize text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                                  Jailed
                                </div>
                              )
                            }
                          </> :
                          <span>
                            -
                          </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'justify-start sm:justify-end text-2xs text-left sm:text-right',
                },
              ]
              .filter(c =>
                ['inactive'].includes(status) ?
                  ![
                    'voting_power',
                    'quadratic_voting_power',
                    'cumulative_share',
                    'quadratic_cumulative_share',
                    'apr',
                  ]
                  .includes(c.accessor) :
                  ![
                    'tokens',
                    'quadratic_voting_power',
                    'status',
                  ]
                  .includes(c.accessor)
              )
            }
            data={_.orderBy(data_filtered, ['quadratic_voting_power', 'tokens'], ['desc', 'desc'])}
            noPagination={data_filtered.length <= 10}
            defaultPageSize={100}
            className="no-border"
          />
        </div> :
        <ProgressBarSpinner
          borderColor={loader_color(theme)}
          width="36"
          height="36"
        />
      }
    </div>
  )
}