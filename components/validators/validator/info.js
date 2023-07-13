import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import Linkify from 'react-linkify'
import { Chip, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import { IoCheckmarkCircleOutline, IoCloseCircleOutline } from 'react-icons/io5'
import { TbArrowBarToUp, TbPlusMinus } from 'react-icons/tb'

import Spinner from '../../spinner'
import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import Image from '../../image'
import Copy from '../../copy'
import ValidatorProfile from '../../profile/validator'
import AccountProfile from '../../profile/account'
import { ProgressBarWithText } from '../../progress-bars'
import { getChainData, getAssetData } from '../../../lib/config'
import { toArray, ellipse, equalsIgnoreCase } from '../../../lib/utils'

const PAGE_SIZE = 10
const MIN_BROADCASTER_BALANCE = 5

export default ({ data }) => {
  const { chains, assets, validators } = useSelector(state => ({ chains: state.chains, assets: state.assets, validators: state.validators }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const {
    operator_address,
    consensus_address,
    delegator_address,
    broadcaster_address,
    broadcaster_balance,
    description,
    tokens,
    quadratic_voting_power,
    commission,
    uptime,
    start_height,
    num_jailed,
    heartbeats_uptime,
    start_proxy_height,
    supported_chains,
    status,
    tombstoned,
    jailed,
    delegations,
  } = { ...data }
  const { symbol, amount } = { ...broadcaster_balance }
  const { moniker, details, website } = { ...description }
  const { rate, max_rate, max_change_rate } = { ...commission?.commission_rates }

  const _delegations = _.orderBy(
    toArray(delegations).map(d => {
      const { denom, amount } = { ...d }
      const { price } = { ...getAssetData(denom, assets_data) }
      return {
        ...d,
        self: equalsIgnoreCase(d.delegator_address, delegator_address),
        value: amount * (price || 0),
      }
    }),
    ['self', 'amount'], ['desc', 'desc'],
  )

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-48 lg:w-52 tracking-wider text-slate-600 dark:text-slate-400 text-sm lg:text-base font-medium'

  return (
    <div className="sm:grid xl:grid-cols-2 sm:gap-4 space-y-4 sm:space-y-0">
      <div className="w-fit sm:w-full bg-slate-50 dark:bg-slate-900 flex flex-col rounded-lg space-y-4 p-6">
        {description && (
          <div className="flex items-start space-x-2.5">
            <ValidatorProfile description={description} width={32} height={32} />
            <div className="flex flex-col space-y-0.5 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-0.5 sm:space-y-0">
                <span className="text-base lg:text-lg font-semibold sm:mr-3">
                  {ellipse(moniker, 16)}
                </span>
                <div className="flex items-center space-x-1">
                  {status && (
                    <Chip
                      color={status.includes('UN') ? status.endsWith('ED') ? 'red' : 'yellow' : 'green'}
                      value={status.replace('BOND_STATUS_', '')}
                      className="chip text-2xs font-semibold py-0.5 px-1.5"
                    />
                  )}
                  {tombstoned && (
                    <Chip
                      color="cyan"
                      value="Tombstoned"
                      className="chip text-2xs font-semibold py-0.5 px-1.5"
                    />
                  )}
                  {jailed && (
                    <Chip
                      color="cyan"
                      value="Jailed"
                      className="chip text-2xs font-semibold py-0.5 px-1.5"
                    />
                  )}
                </div>
              </div>
              {details && (
                <div className="linkify text-slate-400 dark:text-slate-500 text-sm lg:text-base">
                  <Linkify>
                    {details}
                  </Linkify>
                </div>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-500 text-sm lg:text-base"
                >
                  {website}
                </a>
              )}
            </div>
          </div>
        )}
        <div className={rowClassName}>
          <span className={titleClassName}>Operator Address:</span>
          {data ?
            operator_address && (
              <Copy
                size={20}
                value={operator_address}
                title={
                  <span className="text-sm lg:text-base font-medium">
                    {ellipse(operator_address, 10, 'axelarvaloper')}
                  </span>
                }
              />
            ) :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Consensus Address:</span>
          {data ?
            consensus_address && (
              <Copy
                size={20}
                value={consensus_address}
                title={
                  <span className="text-sm lg:text-base font-medium">
                    {ellipse(consensus_address, 10, 'axelarvalcons')}
                  </span>
                }
              />
            ) :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Delegator Address:</span>
          {data ?
            delegator_address && (
              <div className="flex items-center space-x-1">
                <Link
                  href={`/account/${delegator_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-500 text-sm lg:text-base font-medium"
                >
                  {ellipse(delegator_address, 14, 'axelar')}
                </Link>
                <Copy
                  size={20}
                  value={delegator_address}
                />
              </div>
            ) :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Broadcaster Address:</span>
          {data ?
            broadcaster_address && (
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-center space-x-1">
                  <Link
                    href={`/account/${broadcaster_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 dark:text-blue-500 text-sm lg:text-base font-medium"
                  >
                    {ellipse(broadcaster_address, 14, 'axelar')}
                  </Link>
                  <Copy
                    size={20}
                    value={broadcaster_address}
                  />
                </div>
                {typeof amount === 'number' && (
                  <div className={`flex items-center ${amount >= MIN_BROADCASTER_BALANCE ? 'text-green-500 dark:text-green-600' : 'text-red-500 dark:text-red-600'} space-x-1`}>
                    <NumberDisplay
                      value={amount}
                      format="0,0.00"
                      suffix={` ${symbol}`}
                      noTooltip={true}
                      className="whitespace-nowrap text-xs lg:text-sm font-medium"
                    />
                    {amount >= MIN_BROADCASTER_BALANCE ? <IoCheckmarkCircleOutline size={16} /> : <IoCloseCircleOutline size={16} />}
                  </div>
                )}
              </div>
            ) :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Voting Power:</span>
          {data ?
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-24 text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold">
                  Consensus:
                </span>
                <div className="flex items-center space-x-1">
                  <NumberDisplay
                    value={tokens}
                    format="0,0"
                    noTooltip={true}
                    className="text-sm lg:text-base font-medium"
                  />
                  {validators_data && (
                    <NumberDisplay
                      value={tokens * 100 / _.sumBy(validators_data, 'tokens')}
                      format="0,0.00"
                      prefix="("
                      suffix="%)"
                      noTooltip={true}
                      className="whitespace-nowrap text-sm lg:text-base font-medium"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-24 text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold">
                  Quadratic:
                </span>
                <div className="flex items-center space-x-1">
                  <NumberDisplay
                    value={quadratic_voting_power}
                    format="0,0"
                    noTooltip={true}
                    className="text-sm lg:text-base font-medium"
                  />
                  {validators_data && (
                    <NumberDisplay
                      value={quadratic_voting_power * 100 / _.sumBy(validators_data, 'quadratic_voting_power')}
                      format="0,0.00"
                      prefix="("
                      suffix="%)"
                      noTooltip={true}
                      className="whitespace-nowrap text-sm lg:text-base font-medium"
                    />
                  )}
                </div>
              </div>
            </div> :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Commission:</span>
          {data ?
            rate && (
              <div className="flex items-center space-x-2.5">
                <NumberDisplay
                  value={rate * 100}
                  format="0,0.00"
                  suffix="%"
                  noTooltip={true}
                  className="whitespace-nowrap text-sm lg:text-base font-medium"
                />
                <div className="flex items-center space-x-2">
                  <Tooltip content="Max Rate">
                    <div className="flex items-center space-x-0.5">
                      (<TbArrowBarToUp size={18} />
                      <NumberDisplay
                        value={max_rate * 100}
                        format="0,0.00"
                        suffix="%,"
                        noTooltip={true}
                        className="whitespace-nowrap text-sm lg:text-base font-medium"
                      />
                    </div>
                  </Tooltip>
                  <Tooltip content="Max Change Rate">
                    <div className="flex items-center space-x-0.5">
                      <TbPlusMinus size={18} />
                      <NumberDisplay
                        value={max_change_rate * 100}
                        format="0,0.00"
                        suffix="%"
                        noTooltip={true}
                        className="whitespace-nowrap text-sm lg:text-base font-medium"
                      />)
                    </div>
                  </Tooltip>
                </div>
              </div>
            ) :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Uptime:</span>
          {data ?
            <Tooltip content="No. of blocks signed off by the validator in the last 10k blocks">
              <div className="w-36 flex flex-col space-y-0.5">
                {typeof uptime === 'number' ?
                  uptime > 0 ?
                    <div className="w-full mt-1">
                      <ProgressBarWithText
                        width={uptime}
                        text={
                          <NumberDisplay
                            value={uptime}
                            format="0,0.0"
                            suffix="%"
                            noTooltip={true}
                            className="text-white text-2xs font-medium mx-1.5"
                          />
                        }
                        color={`${uptime < 95 ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-green-500 dark:bg-green-600'} rounded-lg`}
                        backgroundClassName="h-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        className={`h-4 flex items-center ${uptime < 33 ? 'justify-start' : 'justify-end'}`}
                      />
                    </div> :
                    <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                      No Uptimes
                    </span> :
                  <Spinner name="ProgressBar" />
                }
                {typeof start_height === 'number' && (
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/block/${start_height}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 dark:text-blue-500"
                    >
                      <NumberDisplay
                        value={start_height}
                        format="0,0"
                        prefix="Started at "
                        className="whitespace-nowrap text-xs font-medium"
                      />
                    </Link>
                    {num_jailed > 0 && (
                      <NumberDisplay
                        value={num_jailed}
                        format="0,0"
                        prefix="(Jailed: "
                        suffix={` time${num_jailed > 1 ? 's' : ''})`}
                        noTooltip={true}
                        className="whitespace-nowrap text-slate-400 text-xs font-medium"
                      />
                    )}
                  </div>
                )}
              </div>
            </Tooltip> :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Heartbeat:</span>
          {data ?
            <Tooltip content="No. of heartbeats from validator in the last 10k blocks">
              <div className="w-36 flex flex-col space-y-0.5">
                {typeof heartbeats_uptime === 'number' ?
                  heartbeats_uptime > 0 ?
                    <div className="w-full mt-1">
                      <ProgressBarWithText
                        width={heartbeats_uptime}
                        text={
                          <NumberDisplay
                            value={heartbeats_uptime}
                            format="0,0.0"
                            suffix="%"
                            noTooltip={true}
                            className="text-white text-2xs font-medium mx-1.5"
                          />
                        }
                        color={`${heartbeats_uptime < 95 ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-green-500 dark:bg-green-600'} rounded-lg`}
                        backgroundClassName="h-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        className={`h-4 flex items-center ${heartbeats_uptime < 33 ? 'justify-start' : 'justify-end'}`}
                      />
                    </div> :
                    <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                      No Heartbeats
                    </span> :
                  <Spinner name="ProgressBar" />
                }
                {typeof start_proxy_height === 'number' && (
                  <Link
                    href={`/block/${start_proxy_height}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 dark:text-blue-500"
                  >
                    <NumberDisplay
                      value={start_proxy_height}
                      format="0,0"
                      prefix="Started at "
                      className="whitespace-nowrap text-xs font-medium"
                    />
                  </Link>
                )}
              </div>
            </Tooltip> :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>EVM Supported:</span>
          {data ?
            <div className="max-w-fit flex flex-wrap items-center">
              {supported_chains ?
                toArray(supported_chains).length > 0 ?
                  _.orderBy(toArray(supported_chains).map(c => getChainData(c, chains_data)), ['i'], ['asc']).map((c, i) => {
                    const { name, image } = { ...c }
                    return (
                      <div key={i} className="mb-1 mr-1">
                        <Tooltip content={name}>
                          <div className="w-fit">
                            <Image
                              src={image}
                              width={24}
                              height={24}
                              className="3xl:w-8 3xl:h-8 rounded-full"
                            />
                          </div>
                        </Tooltip>
                      </div>
                    )
                  }) :
                  <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                    No Chains
                  </span> :
                <Spinner name="ProgressBar" />
              }
            </div> :
            <Spinner name="ProgressBar" />
          }
        </div>
      </div>
      <div className="sm:bg-slate-50 sm:dark:bg-slate-900 sm:flex sm:flex-col sm:rounded-lg sm:space-y-4 sm:p-6">
        {delegations ?
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
                Header: 'Delegator',
                accessor: 'delegator_address',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { self } = { ...row.original }
                  return value && (
                    <div className="flex items-center space-x-1.5">
                      {self && <ValidatorProfile description={description} />}
                      <AccountProfile address={value} noValidator={true} url={true} />
                    </div>
                  )
                },
              },
              {
                Header: 'Amount',
                accessor: 'amount',
                sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
                Cell: props => {
                  const { value } = { ...props }
                  return (
                    <div className="text-left sm:text-right">
                      <NumberDisplay
                        value={value}
                        format="0,0.00000000"
                      />
                    </div>
                  )
                },
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
              {
                Header: 'Value',
                accessor: 'value',
                sortType: (a, b) => a.original.value > b.original.value ? 1 : -1,
                Cell: props => {
                  const { value } = { ...props }
                  return (
                    <div className="text-left sm:text-right">
                      <NumberDisplay
                        value={value}
                        format="0,0.00a"
                        prefix="$"
                        noTooltip={true}
                      />
                    </div>
                  )
                },
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
            ]}
            size="small"
            data={_delegations}
            defaultPageSize={PAGE_SIZE}
            noPagination={_delegations.length < PAGE_SIZE}
            className={`${_delegations.length >= PAGE_SIZE ? 'delegations-table' : ''} no-border no-shadow`}
          /> :
          <Spinner name="ProgressBar" width={36} height={36} />
        }
      </div>
    </div>
  )
}