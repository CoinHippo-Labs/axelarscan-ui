import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip, Tabs, TabsHeader, TabsBody, Tab, TabPanel, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Image from '../image'
import Copy from '../copy'
import ValidatorProfile from '../profile/validator'
import { ProgressBar, ProgressBarWithText } from '../progress-bars'
import { getInflation } from '../../lib/api/axelar'
import { getChainData } from '../../lib/config'
import { toArray, ellipse, fixDecimals } from '../../lib/utils'

const PAGE_SIZE = 100
const STATUSES = ['active', 'inactive']

export default () => {
  const { chains, chain, maintainers, validators } = useSelector(state => ({ chains: state.chains, chain: state.chain, maintainers: state.maintainers, validators: state.validators }), shallowEqual)
  const { chains_data } = { ...chains }
  const { chain_data } = { ...chain }
  const { maintainers_data } = { ...maintainers }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, query } = { ...router }

  const [status, setStatus] = useState(query.status || _.head(STATUSES))
  const [inflationData, setInflationData] = useState(null)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      switch (pathname) {
        case '/validators':
          if (status && status !== _.head(STATUSES)) {
            router.push(`/validators/${status}`)
          }
          break
        default:
          if (status) {
            router.push(`/validators${status !== _.head(STATUSES) ? `/${status}` : ''}`)
          }
          break
      }
    },
    [pathname, status],
  )

  useEffect(
    () => {
      const getData = async () => setInflationData(await getInflation())
      getData()
    },
    [],
  )

  useEffect(
    () => {
      const { staking_pool, bank_supply } = { ...chain_data }
      if (validators_data && staking_pool && bank_supply && inflationData && chains_data && maintainers_data && chains_data.filter(c => c.chain_type === 'evm' && !c.deprecated && !c.no_inflation).length <= Object.keys(maintainers_data).length) {
        const { bonded_tokens } = { ...staking_pool }
        const total_supply = bank_supply.amount;
        const { tendermintInflationRate, keyMgmtRelativeInflationRate, externalChainVotingInflationRate, communityTax } = { ...inflationData }
        setData(
          _.orderBy(
            validators_data.map(v => {
              const {
                operator_address,
                commission,
                uptime,
                heartbeats_uptime,
                votes,
              } = { ...v }
              const { rate } = { ...commission?.commission_rates }

              const supported_chains = Object.entries(maintainers_data).filter(([k, _v]) => _v.includes(operator_address)).map(([k, _v]) => k)
              const inflation = fixDecimals(
                ((uptime / 100) * (tendermintInflationRate || 0)) +
                ((heartbeats_uptime / 100) * (keyMgmtRelativeInflationRate || 0) * (tendermintInflationRate || 0)) +
                (
                  (externalChainVotingInflationRate || 0) *
                  _.sum(
                    supported_chains.map(c => {
                      const { total, total_polls } = { ...votes?.chains?.[c] }
                      return 1 - (total_polls ? (total_polls - total) / total_polls : 0)
                    })
                  )
                ),
                6,
              )

              return {
                ...v,
                inflation,
                apr: (inflation * 100) * total_supply * (1 - (communityTax || 0)) * (1 - (rate || 0)) / bonded_tokens,
                supported_chains,
                votes: votes && { ...votes, chains: Object.fromEntries(Object.entries({ ...votes.chains }).filter(([k, v]) => supported_chains.includes(k))) },
              }
            }),
            ['quadratic_voting_power', 'tokens'], ['desc', 'desc'],
          )
        )
      }
    },
    [chains_data, maintainers_data, validators_data, inflationData],
  )

  const { staking_params, slashing_params } = { ...chain_data }
  const { max_validators, unbonding_time } = { ...staking_params }
  const { slash_fraction_downtime, downtime_jail_duration } = { ...slashing_params }

  const filterByStatus = status => toArray(data || validators_data).filter(v => status === 'inactive' ? v.status !== 'BOND_STATUS_BONDED' : v.status === 'BOND_STATUS_BONDED' && !v.jailed)

  const render = status => {
    const _data = filterByStatus(status)
    return (
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'i',
            disableSortBy: true,
            Cell: props => (
              <span className="text-black dark:text-white font-medium">
                {props.flatRows?.indexOf(props.row) + 1}
              </span>
            ),
          },
          {
            Header: 'Validator',
            accessor: 'operator_address',
            sortType: (a, b) => a.original.description?.moniker > b.original.description?.moniker ? 1 : -1,
            Cell: props => {
              const { value, row } = { ...props }
              const { description, commission } = { ...row.original }
              const { moniker } = { ...description }
              const { rate } = { ...commission?.commission_rates }
              return (
                <div>
                  {description ?
                    <div className="min-w-max flex items-start space-x-2">
                      <Link
                        href={`/validator/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ValidatorProfile description={description} />
                      </Link>
                      <div className="flex flex-col">
                        <Link
                          href={`/validator/${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-sm font-medium"
                        >
                          {ellipse(moniker, 12)}
                        </Link>
                        <div className="flex items-center space-x-1">
                          <Link
                            href={`/validator/${value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 dark:text-slate-500 text-sm"
                          >
                            {ellipse(value, 6, 'axelarvaloper')}
                          </Link>
                          <Copy value={value} />
                        </div>
                      </div>
                    </div> :
                    value ?
                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/validator/${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-sm font-medium"
                        >
                          {ellipse(value, 6, 'axelarvaloper')}
                        </Link>
                        <Copy value={value} />
                      </div> :
                      '-'
                  }
                  {Number(rate) > 0 && (
                    <div className="leading-3 mt-0.5 ml-8">
                      <NumberDisplay
                        value={rate * 100}
                        format="0,0.0"
                        maxDecimals={2}
                        prefix="Commission: "
                        suffix="%"
                        noTooltip={true}
                        className="text-black dark:text-white text-xs font-semibold"
                      />
                    </div>
                  )}
                </div>
              )
            },
          },
          {
            Header: (
              <div className="flex flex-col items-center space-y-0.5">
                <span>
                  Voting Power
                </span>
                <div className="w-32 grid grid-cols-2 gap-2">
                  <span className="text-slate-400 dark:text-slate-500 text-3xs font-medium text-center">
                    Consensus
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-3xs font-medium text-center">
                    Quadratic
                  </span>
                </div>
              </div>
            ),
            accessor: 'voting_power',
            sortType: (a, b) => a.original.quadratic_voting_power > b.original.quadratic_voting_power ? 1 : a.original.quadratic_voting_power < b.original.quadratic_voting_power ? -1 : a.original.tokens > b.original.tokens ? 1 : -1,
            Cell: props => {
              const { tokens, quadratic_voting_power } = { ...props.row.original }
              const total_voting_power = _.sumBy(filterByStatus('active'), 'tokens')
              const total_quadratic_voting_power = _.sumBy(filterByStatus('active'), 'quadratic_voting_power')
              return (
                <div className="w-32 grid grid-cols-2 gap-2 sm:ml-auto">
                  <div className="flex flex-col items-center text-center">
                    <NumberDisplay
                      value={tokens}
                      format="0,0.0a"
                      noTooltip={true}
                      className="text-slate-600 dark:text-slate-200 text-xs lg:text-sm font-medium"
                    />
                    <NumberDisplay
                      value={tokens * 100 / total_voting_power}
                      format="0,0.00"
                      maxDecimals={2}
                      suffix="%"
                      noTooltip={true}
                      className="text-slate-400 dark:text-slate-500 text-2xs lg:text-xs"
                    />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <NumberDisplay
                      value={quadratic_voting_power}
                      format="0,0.0a"
                      noTooltip={true}
                      className="text-black dark:text-white text-xs lg:text-sm font-semibold"
                    />
                    <NumberDisplay
                      value={quadratic_voting_power * 100 / total_quadratic_voting_power}
                      format="0,0.00"
                      maxDecimals={2}
                      suffix="%"
                      noTooltip={true}
                      className="text-slate-400 dark:text-slate-500 text-2xs lg:text-xs"
                    />
                  </div>
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: status === 'inactive' ? 'Staked Tokens' : 'Consensus Power',
            accessor: 'tokens',
            sortType: (a, b) => a.original.tokens > b.original.tokens ? 1 : -1,
            Cell: props => {
              const { value } = { ...props }
              const total_voting_power = _.sumBy(filterByStatus('active'), 'tokens')
              return (
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                  <NumberDisplay
                    value={value}
                    format="0,0.0a"
                    noTooltip={true}
                    className="text-black dark:text-white text-xs lg:text-sm font-semibold"
                  />
                  <NumberDisplay
                    value={value * 100 / total_voting_power}
                    format="0,0.00"
                    maxDecimals={2}
                    suffix="%"
                    noTooltip={true}
                    className="text-slate-400 dark:text-slate-500 text-2xs lg:text-xs"
                  />
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: (
              <div className="flex flex-col items-center space-y-0.5">
                <span>
                  Cumulative Share %
                </span>
                <div className="w-60 grid grid-cols-2 gap-2">
                  <span className="text-slate-400 dark:text-slate-500 text-3xs font-medium text-center">
                    Consensus
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-3xs font-medium text-center">
                    Quadratic
                  </span>
                </div>
              </div>
            ),
            accessor: 'cumulative_share',
            disableSortBy: true,
            Cell: props => {
              const { flatRows, row } = { ...props }
              const { tokens, quadratic_voting_power } = { ...row.original }
              const index = flatRows?.indexOf(row)
              const total_voting_power = _.sumBy(filterByStatus('active'), 'tokens')
              const total_quadratic_voting_power = _.sumBy(filterByStatus('active'), 'quadratic_voting_power')

              const _data = toArray(
                index > -1 && _.slice(
                  flatRows.map(d => {
                    const { original } = { ...d }
                    const { tokens, quadratic_voting_power } = { ...original }
                    return {
                      ...original,
                      consensus_share: tokens * 100 / total_voting_power,
                      quadratic_share: quadratic_voting_power * 100 / total_quadratic_voting_power,
                    }
                  }),
                  0,
                  index + 1,
                )
              )

              const { consensus_share, quadratic_share } = { ..._.last(_data) }
              const total_consensus_share = _.sumBy(_data, 'consensus_share')
              const total_quadratic_share = _.sumBy(_data, 'quadratic_share')

              return (
                <div className="w-60 grid grid-cols-2 gap-2 sm:ml-auto">
                  <div className="flex items-start space-x-1.5">
                    <div className="w-20 bg-slate-50 dark:bg-slate-900">
                      <div style={{ width: `${fixDecimals(total_consensus_share)}%` }}>
                        <ProgressBar
                          width={(total_consensus_share - consensus_share) * 100 / total_consensus_share}
                          color="bg-blue-100 dark:bg-blue-400"
                          backgroundClassName="h-7 bg-blue-600 dark:bg-blue-800"
                          className="h-7"
                        />
                      </div>
                    </div>
                    <NumberDisplay
                      value={total_consensus_share}
                      format="0,0.0"
                      maxDecimals={1}
                      suffix="%"
                      noTooltip={true}
                      className="text-black dark:text-white text-2xs font-semibold"
                    />
                  </div>
                  <div className="flex items-start space-x-1.5">
                    <div className="w-20 bg-slate-50 dark:bg-slate-900">
                      <div style={{ width: `${fixDecimals(total_quadratic_share)}%` }}>
                        <ProgressBar
                          width={(total_quadratic_share - quadratic_share) * 100 / total_quadratic_share}
                          color="bg-red-100 dark:bg-red-400"
                          backgroundClassName="h-7 bg-red-600 dark:bg-red-800"
                          className="h-7"
                        />
                      </div>
                    </div>
                    <NumberDisplay
                      value={total_quadratic_share}
                      format="0,0.0"
                      maxDecimals={1}
                      suffix="%"
                      noTooltip={true}
                      className="text-black dark:text-white text-2xs font-semibold"
                    />
                  </div>
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Commission',
            accessor: 'commission.commission_rates.rate',
            sortType: (a, b) => Number(a.original.commission?.commission_rates?.rate) > Number(b.original.commission?.commission_rates?.rate) ? 1 : -1,
            Cell: props => (
              <div className="leading-3 text-left sm:text-right">
                <NumberDisplay
                  value={props.value * 100}
                  format="0,0.0"
                  maxDecimals={2}
                  suffix="%"
                  noTooltip={true}
                  className="text-black dark:text-white text-sm font-semibold"
                />
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: (
              <Tooltip content="Approximate staking APR per validator">
                <span>APR</span>
              </Tooltip>
            ),
            accessor: 'apr',
            sortType: (a, b) => a.original.apr > b.original.apr ? 1 : -1,
            Cell: props => {
              const { value, row } = { ...props }
              const { inflation } = { ...row.original }
              return inflation > 0 && (
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                  <NumberDisplay
                    value={value}
                    format="0,0.0"
                    maxDecimals={1}
                    suffix="%"
                    noTooltip={true}
                    className="text-black dark:text-white text-xs lg:text-sm font-semibold"
                  />
                  <Tooltip placement="bottom" content="Inflation">
                    <div className="leading-3">
                      <NumberDisplay
                        value={inflation * 100}
                        format="0,0.00"
                        maxDecimals={2}
                        suffix="%"
                        noTooltip={true}
                        className="text-slate-400 dark:text-slate-500 text-2xs lg:text-xs"
                      />
                    </div>
                  </Tooltip>
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: (
              <Tooltip content="No. of blocks signed off by the validator in the last 10k blocks">
                <span>Uptime</span>
              </Tooltip>
            ),
            accessor: 'uptime',
            sortType: (a, b) => a.original.uptime > b.original.uptime ? 1 : -1,
            Cell: props => {
              const { value, row } = { ...props }
              const { start_height } = { ...row.original }
              return (
                <div className="w-28 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                  {typeof value === 'number' ?
                    value > 0 ?
                      <div className="w-full mt-0.5">
                        <ProgressBarWithText
                          width={value}
                          text={
                            <NumberDisplay
                              value={value}
                              format="0,0.0"
                              suffix="%"
                              noTooltip={true}
                              className="text-white text-2xs font-medium mx-1.5"
                            />
                          }
                          color={`${value < 95 ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-green-500 dark:bg-green-600'} rounded-lg`}
                          backgroundClassName="h-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                          className={`h-4 flex items-center ${value < 33 ? 'justify-start' : 'justify-end'}`}
                        />
                      </div> :
                      <span className="h-4 text-slate-400 dark:text-slate-500 text-xs font-medium mt-0.5">
                        No Uptimes
                      </span> :
                    <div className="-my-0.5">
                      <Spinner name="ProgressBar" />
                    </div>
                  }
                  {typeof start_height === 'number' && (
                    <Link
                      href={`/block/${start_height}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="leading-3 text-blue-400 dark:text-blue-500"
                    >
                      <NumberDisplay
                        value={start_height}
                        format="0,0"
                        prefix="Started: "
                        className="text-2xs font-medium"
                      />
                    </Link>
                  )}
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: (
              <Tooltip content="No. of heartbeats from validator in the last 10k blocks">
                <span>Heartbeat</span>
              </Tooltip>
            ),
            accessor: 'heartbeats_uptime',
            sortType: (a, b) => a.original.heartbeats_uptime > b.original.heartbeats_uptime ? 1 : -1,
            Cell: props => {
              const { value, row } = { ...props }
              const { start_proxy_height, stale_heartbeats } = { ...row.original }
              return (
                <div className="w-28 flex flex-col items-start sm:items-end text-left sm:text-right space-y-0.5 sm:ml-auto">
                  {typeof value === 'number' ?
                    value > 0 ?
                      <div className="w-full mt-0.5">
                        <ProgressBarWithText
                          width={value}
                          text={
                            <NumberDisplay
                              value={value}
                              format="0,0.0"
                              suffix="%"
                              noTooltip={true}
                              className="text-white text-2xs font-medium mx-1.5"
                            />
                          }
                          color={`${value < 95 ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-green-500 dark:bg-green-600'} rounded-lg`}
                          backgroundClassName="h-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                          className={`h-4 flex items-center ${value < 33 ? 'justify-start' : 'justify-end'}`}
                        />
                      </div> :
                      <span className="h-4 text-slate-400 dark:text-slate-500 text-xs font-medium mt-0.5">
                        No Heartbeats
                      </span> :
                    <div className="-my-0.5">
                      <Spinner name="ProgressBar" />
                    </div>
                  }
                  {typeof start_proxy_height === 'number' && (
                    <Link
                      href={`/block/${start_proxy_height}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="leading-3 text-blue-400 dark:text-blue-500"
                    >
                      <NumberDisplay
                        value={start_proxy_height}
                        format="0,0"
                        prefix="Started: "
                        className="text-2xs font-medium"
                      />
                    </Link>
                  )}
                  {stale_heartbeats && (
                    <span className="h-4 text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Stale Heartbeats
                    </span>
                  )}
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: (
              <Tooltip content="Votes by the validator on cross-chain msgs on EVM chains in the last 10k blocks">
                <span>EVM Votes</span>
              </Tooltip>
            ),
            accessor: 'votes',
            sortType: (a, b) => a.original.total_yes_votes > b.original.total_yes_votes ? 1 : a.original.total_yes_votes < b.original.total_yes_votes ? -1 : a.original.total_no_votes < b.original.total_no_votes ? 1 : a.original.total_no_votes > b.original.total_no_votes ? 1 : a.original.total_unsubmitted_votes <= b.original.total_unsubmitted_votes ? 1 : -1,
            Cell: props => {
              const { value } = { ...props }
              return (
                <div className="flex flex-col space-y-0.5 mb-6">
                  {value ?
                    Object.keys({ ...value.chains }).length > 0 ?
                      Object.entries(value.chains).map(([k, v]) => {
                        const { name, image } = { ...getChainData(k, chains_data) }
                        const { votes, total_polls, total } = { ...v }
                        return (
                          <div key={k} className="min-w-max flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2">
                              <Tooltip content={name}>
                                <div className="w-fit">
                                  <Image
                                    src={image}
                                    width={20}
                                    height={20}
                                    className="3xl:w-6 3xl:h-6 rounded-full"
                                  />
                                </div>
                              </Tooltip>
                              <Tooltip content="Yes Votes">
                                <div className="leading-3">
                                  <NumberDisplay
                                    value={votes?.true || 0}
                                    format="0,0"
                                    suffix=" Y"
                                    className={`${votes?.true ? 'text-green-400 dark:text-green-500 font-medium' : 'text-slate-400 dark:text-slate-500 font-normal'} text-xs`}
                                  />
                                </div>
                              </Tooltip>
                              <Tooltip content="No Votes">
                                <div className="leading-3">
                                  <NumberDisplay
                                    value={votes?.false || 0}
                                    format="0,0"
                                    suffix=" N"
                                    className={`${votes?.false ? 'text-red-400 dark:text-red-500 font-medium' : 'text-slate-400 dark:text-slate-500 font-normal'} text-xs`}
                                  />
                                </div>
                              </Tooltip>
                              {votes?.unsubmitted > 0 && (
                                <Tooltip content="Unsubmitted Votes">
                                  <div className="leading-3">
                                    <NumberDisplay
                                      value={votes.unsubmitted}
                                      format="0,0"
                                      suffix=" UN"
                                      className="text-slate-400 dark:text-slate-500 text-xs font-medium"
                                    />
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                            <Tooltip content="Total EVM Polls">
                              <div className="leading-3">
                                <NumberDisplay
                                  value={total_polls || 0}
                                  format="0,0"
                                  prefix="["
                                  suffix="]"
                                  className="text-blue-400 dark:text-blue-500 text-xs font-medium"
                                />
                              </div>
                            </Tooltip>
                          </div>
                        )
                      }) :
                      '-' :
                    <div className="-my-0.5">
                      <Spinner name="ProgressBar" />
                    </div>
                  }
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'EVM Supported',
            accessor: 'supported_chains',
            sortType: (a, b) => toArray(a.original.supported_chains).length > toArray(b.original.supported_chains).length ? 1 : -1,
            Cell: props => {
              const { value } = { ...props }
              return (
                <div className="max-w-fit flex flex-wrap items-center">
                  {maintainers_data && data ?
                    toArray(value).length > 0 ?
                      _.orderBy(toArray(value).map(c => getChainData(c, chains_data)), ['i'], ['asc']).map((c, i) => {
                        const { name, image } = { ...c }
                        return (
                          <div key={i} className="mb-1 mr-0.5">
                            <Tooltip content={name}>
                              <div className="w-fit">
                                <Image
                                  src={image}
                                  width={20}
                                  height={20}
                                  className="3xl:w-6 3xl:h-6 rounded-full"
                                />
                              </div>
                            </Tooltip>
                          </div>
                        )
                      }) :
                      '-' :
                    <div className="-my-0.5">
                      <Spinner name="ProgressBar" />
                    </div>
                  }
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Status',
            accessor: 'status',
            sortType: (a, b) => a.original.tombstoned > b.original.tombstoned ? -1 : a.original.tombstoned < b.original.tombstoned ? 1 : a.original.jailed > b.original.jailed ? -1 : a.original.jailed < b.original.jailed ? 1 : a.original.status > b.original.status ? 1 : a.original.status < b.original.status ? -1 : -1,
            Cell: props => {
              const { value, row } = { ...props }
              const { tombstoned, jailed } = { ...row.original }
              return (
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1">
                  {value ?
                    <>
                      <Chip
                        color={value.includes('UN') ? value.endsWith('ED') ? 'red' : 'yellow' : 'green'}
                        value={value.replace('BOND_STATUS_', '')}
                        className="chip text-xs font-medium py-1 px-2.5"
                      />
                      {tombstoned && (
                        <Chip
                          color="cyan"
                          value="Tombstoned"
                          className="chip text-xs font-medium py-1 px-2.5"
                        />
                      )}
                      {jailed && (
                        <Chip
                          color="cyan"
                          value="Jailed"
                          className="chip text-xs font-medium py-1 px-2.5"
                        />
                      )}
                    </> :
                    '-'
                  }
                </div>
              )
            },
            headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
          },
        ]
        .filter(c => status === 'inactive' ? !['voting_power', 'cumulative_share', 'commission.commission_rates.rate', 'apr'].includes(c.accessor) : !['tokens', 'commission.commission_rates.rate', 'status'].includes(c.accessor))}
        data={_data}
        defaultPageSize={PAGE_SIZE}
        noPagination={_data.length <= PAGE_SIZE}
        className="no-border no-shadow"
      />
    )
  }

  return status && (
    <div className="children">
      {data ?
        <Tabs value={status} className="tabs pt-8 px-2 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 space-x-3">
            <TabsHeader className="max-w-xs">
              {STATUSES.map(s => (
                <Tab
                  key={s}
                  value={s}
                  onClick={() => setStatus(s)}
                  className="capitalize"
                >
                  {s} ({filterByStatus(s).length})
                </Tab>
              ))}
            </TabsHeader>
            <div className="flex items-center space-x-3 sm:space-x-6">
              <div className="flex flex-col space-y-0.5">
                {max_validators && (
                  <NumberDisplay
                    value={max_validators}
                    format="0,0"
                    prefix="Max Validators: "
                  />
                )}
                {unbonding_time && (
                  <NumberDisplay
                    value={Math.floor(Number(unbonding_time.replace('s', '')) / 86400)}
                    format="0,0"
                    prefix="Undelegate Period: "
                    suffix=" Days"
                  />
                )}
              </div>
              <div className="flex flex-col space-y-0.5">
                {slash_fraction_downtime && (
                  <NumberDisplay
                    value={slash_fraction_downtime * 100}
                    format="0,0.00"
                    prefix="Jail Penalty: "
                    suffix="%"
                  />
                )}
                {downtime_jail_duration && (
                  <NumberDisplay
                    value={Math.floor(Number(downtime_jail_duration.replace('s', '')) / 3600)}
                    format="0,0"
                    prefix="Jail Duration: "
                    suffix=" Hrs"
                  />
                )}
              </div>
            </div>
          </div>
          <TabsBody>
            {STATUSES.filter(s => s === status).map(s => (
              <TabPanel key={s} value={s}>
                {render(s)}
              </TabPanel>
            ))}
          </TabsBody>
        </Tabs> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}