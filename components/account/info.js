import Link from 'next/link'
import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Tabs, TabsHeader, TabsBody, Tab, TabPanel } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { BsArrowRightShort } from 'react-icons/bs'

import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Image from '../image'
import Copy from '../copy'
import ValidatorProfile from '../profile/validator'
import AccountProfile from '../profile/account'
import ExplorerLink from '../explorer/link'
import TimeAgo from '../time/timeAgo'
import { getAssetData } from '../../lib/config'
import { getKeyType } from '../../lib/key'
import { toArray, includesStringList, ellipse, equalsIgnoreCase } from '../../lib/utils'

const PAGE_SIZE = 10
const STAKING_FIELDS = [
  { id: 'delegations', title: 'Delegations' },
  { id: 'redelegations', title: 'Redelegations' },
  { id: 'unbondings', title: 'Unstakings' },
]

export default ({ address, data }) => {
  const { assets, validators } = useSelector(state => ({ assets: state.assets, validators: state.validators }), shallowEqual )
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const [stakingField, setStakingField] = useState(_.head(STAKING_FIELDS)?.id)

  const {
    balances,
    delegations,
    redelegations,
    unbondings,
    rewards,
    commissions,
    depositAddressData,
  } = { ...data }
  const {
    sender_chain,
    recipient_chain,
    source_chain_data,
    destination_chain_data,
    sender_address,
    recipient_address,
    denom,
    symbol,
    asset_data,
    transfer_data,
  } = { ...depositAddressData }
  const { txhash } = { ...transfer_data?.send }

  const isDepositAddress = (address && (address.length >= 65 || getKeyType(address) === 'evmAddress')) || depositAddressData
  const reward = !isDepositAddress && toArray(rewards?.rewards).find(d => equalsIgnoreCase(d.denom, 'uaxl'))
  const commission = !isDepositAddress && toArray(commissions).find(d => equalsIgnoreCase(d.denom, 'uaxl'))
  const validator_data = !isDepositAddress && toArray(validators_data).find(v => includesStringList(address, toArray([v.broadcaster_address, v.delegator_address], 'lower')))

  const {
    operator_address,
    delegator_address,
    broadcaster_address,
    description,
  } = { ...validator_data }
  const { moniker } = { ...description }

  const renderStaking = stakingField => {
    switch (stakingField) {
      case 'delegations':
        return (
          delegations ?
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
                  accessor: 'validator_data',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { operator_address, description } = { ...value }
                    const { moniker } = { ...description }
                    return (
                      description ?
                        <div className="min-w-max flex items-start space-x-2">
                          <Link
                            href={`/validator/${operator_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ValidatorProfile description={description} />
                          </Link>
                          <div className="flex flex-col">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 font-medium"
                            >
                              {ellipse(moniker, 16)}
                            </Link>
                            <div className="hidden sm:flex items-center space-x-1">
                              <Link
                                href={`/validator/${operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 dark:text-slate-500"
                              >
                                {ellipse(operator_address, 10, 'axelarvaloper')}
                              </Link>
                              <Copy value={operator_address} />
                            </div>
                          </div>
                        </div> :
                        operator_address ?
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 text-xs sm:text-sm font-medium"
                            >
                              {ellipse(operator_address, 6, 'axelarvaloper')}
                            </Link>
                            <Copy value={operator_address} />
                          </div> :
                          '-'
                    )
                  },
                },
                {
                  Header: 'Amount',
                  accessor: 'amount',
                  sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { symbol } = { ...row.original }
                    return (
                      <div className="text-left sm:text-right">
                        <NumberDisplay
                          value={value}
                          format="0,0.00000000"
                          suffix={` ${symbol}`}
                          className="text-black dark:text-white font-semibold"
                        />
                      </div>
                    )
                  },
                  headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                },
              ]}
              size="small"
              data={delegations}
              defaultPageSize={PAGE_SIZE}
              noPagination={delegations.length < PAGE_SIZE}
              className="no-border no-shadow"
            /> :
            <Spinner name="ProgressBar" width={36} height={36} />
        )
      case 'redelegations':
        return (
          redelegations ?
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
                  accessor: 'validator_src_address',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { source_validator_data, destination_validator_data, validator_dst_address } = { ...row.original }

                    const source_operator_address = source_validator_data?.operator_address
                    const source_description = source_validator_data?.description
                    const source_moniker = source_description?.moniker

                    const destination_operator_address = destination_validator_data?.operator_address
                    const destination_description = destination_validator_data?.description
                    const destination_moniker = destination_description?.moniker

                    return (
                      <div className="min-w-max flex items-center space-x-2">
                        {source_description ?
                          <div className="min-w-max flex items-center space-x-2">
                            <Link
                              href={`/validator/${source_operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ValidatorProfile description={source_description} />
                            </Link>
                            <div className="flex flex-col">
                              <Link
                                href={`/validator/${source_operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-xs sm:text-sm font-medium"
                              >
                                {ellipse(source_moniker, 12)}
                              </Link>
                            </div>
                          </div> :
                          source_operator_address ?
                            <div className="flex items-center space-x-1">
                              <Link
                                href={`/validator/${source_operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-xs sm:text-sm font-medium"
                              >
                                {ellipse(source_operator_address, 6, 'axelarvaloper')}
                              </Link>
                              <Copy value={source_operator_address} />
                            </div> :
                            <span>-</span>
                        }
                        <BsArrowRightShort size={18} />
                        {destination_description ?
                          <div className="min-w-max flex items-center space-x-2">
                            <Link
                              href={`/validator/${destination_operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ValidatorProfile description={destination_description} />
                            </Link>
                            <div className="flex flex-col">
                              <Link
                                href={`/validator/${destination_operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-xs sm:text-sm font-medium"
                              >
                                {ellipse(destination_moniker, 12)}
                              </Link>
                            </div>
                          </div> :
                          destination_operator_address ?
                            <div className="flex items-center space-x-1">
                              <Link
                                href={`/validator/${destination_operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-xs sm:text-sm font-medium"
                              >
                                {ellipse(destination_operator_address, 6, 'axelarvaloper')}
                              </Link>
                              <Copy value={destination_operator_address} />
                            </div> :
                            <span>-</span>
                        }
                      </div>
                    )
                  },
                },
                {
                  Header: 'Amount',
                  accessor: 'amount',
                  sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { symbol } = { ...row.original }
                    return (
                      <div className="text-left sm:text-right">
                        <NumberDisplay
                          value={value}
                          format="0,0.00000000"
                          suffix={` ${symbol}`}
                          className="text-black dark:text-white font-semibold"
                        />
                      </div>
                    )
                  },
                  headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                },
              ]}
              size="small"
              data={redelegations}
              defaultPageSize={PAGE_SIZE}
              noPagination={redelegations.length < PAGE_SIZE}
              className="no-border no-shadow"
            /> :
            <Spinner name="ProgressBar" width={36} height={36} />
        )
      case 'unbondings':
        return (
          unbondings ?
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
                  accessor: 'validator_data',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { operator_address, description } = { ...value }
                    const { moniker } = { ...description }
                    return (
                      description ?
                        <div className="min-w-max flex items-start space-x-2">
                          <Link
                            href={`/validator/${operator_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ValidatorProfile description={description} />
                          </Link>
                          <div className="flex flex-col">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 font-medium"
                            >
                              {ellipse(moniker, 16)}
                            </Link>
                            <div className="hidden sm:flex items-center space-x-1">
                              <Link
                                href={`/validator/${operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 dark:text-slate-500"
                              >
                                {ellipse(operator_address, 8, 'axelarvaloper')}
                              </Link>
                              <Copy value={operator_address} />
                            </div>
                          </div>
                        </div> :
                        operator_address ?
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 text-xs sm:text-sm font-medium"
                            >
                              {ellipse(operator_address, 6, 'axelarvaloper')}
                            </Link>
                            <Copy value={operator_address} />
                          </div> :
                          '-'
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
                          suffix=" AXL"
                          className="text-black dark:text-white font-medium"
                        />
                      </div>
                    )
                  },
                  headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                },
                {
                  Header: 'Available At',
                  accessor: 'completion_time',
                  disableSortBy: true,
                  Cell: props => props.value && (
                    <div className="flex justify-end">
                      <TimeAgo time={moment(props.value).unix()} className="text-slate-400 dark:text-slate-500 font-medium" />
                    </div>
                  ),
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
              ]}
              size="small"
              data={unbondings}
              defaultPageSize={PAGE_SIZE}
              noPagination={unbondings.length < PAGE_SIZE}
              className="no-border no-shadow"
            /> :
            <Spinner name="ProgressBar" width={36} height={36} />
        )
      default:
        return null
    }
  }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-52 text-slate-600 dark:text-slate-400 text-sm lg:text-base font-medium'

  return (
    isDepositAddress ?
      <div className="bg-slate-50 dark:bg-slate-900 w-fit flex flex-col rounded-lg space-y-4 p-6">
        <div className={rowClassName}>
          <span className={titleClassName}>Deposit Address:</span>
          {data ?
            address && (
              <Copy
                size={20}
                value={address}
                title={
                  <span className="text-sm lg:text-base font-medium">
                    {ellipse(address, 12)}
                  </span>
                }
              />
            ) :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Source:</span>
          {data ?
            source_chain_data ?
              <div className="flex items-center space-x-2">
                {source_chain_data.image && (
                  <Image
                    src={source_chain_data.image}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="text-sm lg:text-base font-medium">
                  {source_chain_data.name || sender_chain}
                </span>
              </div> :
              sender_address ?
                <Copy
                  value={sender_address}
                  title={
                    <span className="cursor-pointer text-slate-600 dark:text-slate-200 text-sm lg:text-base font-medium">
                      {ellipse(sender_address, 8, getKeyType(sender_address) === 'evmAddress' ? '0x' : 'axelar')}
                    </span>
                  }
                /> :
                '-' :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Destination:</span>
          {data ?
            destination_chain_data ?
              <div className="flex items-start space-x-2">
                {destination_chain_data.image && (
                  <Image
                    src={destination_chain_data.image}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-sm lg:text-base font-medium">
                    {destination_chain_data.name || recipient_chain}
                  </span>
                  {recipient_address && (
                    <div className="flex items-center space-x-1">
                      <AccountProfile address={recipient_address} explorer={destination_chain_data.explorer} />
                      <ExplorerLink value={recipient_address} explorer={destination_chain_data.explorer} />
                    </div>
                  )}
                </div>
              </div> :
              recipient_address ?
                <Copy
                  value={recipient_address}
                  title={
                    <span className="cursor-pointer text-slate-600 dark:text-slate-200 text-sm lg:text-base font-medium">
                      {ellipse(recipient_address, 8, getKeyType(recipient_address) === 'evmAddress' ? '0x' : 'axelar')}
                    </span>
                  }
                /> :
                '-' :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Asset:</span>
          {data ?
            asset_data ?
              <div className="flex items-center space-x-2">
                {asset_data.image && (
                  <Image
                    src={asset_data.image}
                    width={24}
                    height={24}
                  />
                )}
                <span className="text-sm lg:text-base font-medium">
                  {asset_data.name || symbol || denom}
                </span>
              </div> :
              denom ?
                <Copy
                  value={denom}
                  title={
                    <span className="cursor-pointer text-slate-600 dark:text-slate-200 font-medium">
                      {ellipse(denom, 8)}
                    </span>
                  }
                /> :
                '-' :
            <Spinner name="ProgressBar" />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>Transfer:</span>
          {data ?
            txhash ?
              <div className="flex items-center space-x-1">
                <Link
                  href={`/transfer/${txhash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-500 text-sm lg:text-base font-medium"
                >
                  {ellipse(txhash, 16)}
                </Link>
                <Copy value={txhash} />
              </div> :
              '-' :
            <Spinner name="ProgressBar" />
          }
        </div>
      </div> :
      <div className="sm:grid xl:grid-cols-2 sm:gap-4 space-y-4 sm:space-y-0">
        <div className="w-fit sm:w-full bg-slate-50 dark:bg-slate-900 flex flex-col rounded-lg space-y-4 p-6">
          <div className={rowClassName}>
            <span className={titleClassName}>Address:</span>
            {data ?
              address && (
                <Copy
                  size={20}
                  value={address}
                  title={
                    <span className="text-sm lg:text-base font-medium">
                      {ellipse(address, 12, 'axelar')}
                    </span>
                  }
                />
              ) :
              <Spinner name="ProgressBar" />
            }
          </div>
          {validator_data && (
            <div className={rowClassName}>
              <span className={titleClassName}>Validator:</span>
              <div className="text-sm lg:text-base">
                {description ?
                  <div className="min-w-max flex items-start space-x-2">
                    <Link
                      href={`/validator/${operator_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ValidatorProfile description={description} />
                    </Link>
                    <div className="flex flex-col">
                      <Link
                        href={`/validator/${operator_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 font-medium"
                      >
                        {ellipse(moniker, 16)}
                      </Link>
                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/validator/${operator_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm"
                        >
                          {ellipse(operator_address, 6, 'axelarvaloper')}
                        </Link>
                        <Copy value={operator_address} />
                      </div>
                    </div>
                  </div> :
                  operator_address ?
                    <div className="flex items-center space-x-1">
                      <Link
                        href={`/validator/${operator_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs sm:text-sm font-medium"
                      >
                        {ellipse(operator_address, 6, 'axelarvaloper')}
                      </Link>
                      <Copy value={operator_address} />
                    </div> :
                    address ?
                      <AccountProfile address={address} url={true} /> :
                      '-'
                }
              </div>
            </div>
          )}
          {getKeyType(address) === 'axelarAddress' && (
            <>
              <div className={rowClassName}>
                <span className={titleClassName}>Rewards:</span>
                {rewards ?
                  reward?.amount ?
                    <NumberDisplay
                      value={reward.amount}
                      format="0,0.00000000"
                      suffix={` ${reward.symbol}`}
                      className="text-sm lg:text-base font-medium"
                    /> :
                    <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                      No Rewards
                    </span> :
                  <Spinner name="ProgressBar" />
                }
              </div>
              {equalsIgnoreCase(address, delegator_address) && (
                <div className={rowClassName}>
                  <span className={titleClassName}>Commissions:</span>
                  {commissions ?
                    commission?.amount ?
                      <NumberDisplay
                        value={commission.amount}
                        format="0,0.00000000"
                        suffix={` ${commission.symbol}`}
                        className="text-sm lg:text-base font-medium"
                      /> :
                      <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                        No Commissions
                      </span> :
                    <Spinner name="ProgressBar" />
                  }
                </div>
              )}
              <div className={rowClassName}>
                <span className={titleClassName}>Delegations:</span>
                {delegations ?
                  delegations.findIndex(d => d.amount > 0) > -1 ?
                    <NumberDisplay
                      value={_.sumBy(delegations, 'amount')}
                      format="0,0.00000000"
                      suffix={` ${_.head(delegations).symbol}`}
                      className="text-sm lg:text-base font-medium"
                    /> :
                    <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                      No Delegations
                    </span> :
                  <Spinner name="ProgressBar" />
                }
              </div>
              <div className={rowClassName}>
                <span className={titleClassName}>Redelegations:</span>
                {redelegations ?
                  redelegations.findIndex(d => d.amount > 0) > -1 ?
                    <NumberDisplay
                      value={_.sumBy(redelegations, 'amount')}
                      format="0,0.00000000"
                      suffix={` ${_.head(redelegations).symbol}`}
                      className="text-sm lg:text-base font-medium"
                    /> :
                    <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                      No Redelegations
                    </span> :
                  <Spinner name="ProgressBar" />
                }
              </div>
              <div className={rowClassName}>
                <span className={titleClassName}>Unstakings:</span>
                {unbondings ?
                  unbondings.findIndex(d => d.amount > 0) > -1 ?
                    <NumberDisplay
                      value={_.sumBy(unbondings, 'amount')}
                      format="0,0.00000000"
                      suffix=" AXL"
                      className="text-sm lg:text-base font-medium"
                    /> :
                    <span className="text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
                      No Unstakings
                    </span> :
                  <Spinner name="ProgressBar" />
                }
              </div>
            </>
          )}
        </div>
        <div className="sm:bg-slate-50 sm:dark:bg-slate-900 sm:flex sm:flex-col sm:rounded-lg sm:space-y-4 sm:p-6">
          {balances ?
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
                  Header: 'Asset',
                  accessor: 'denom',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { symbol, name, image, price } = { ...getAssetData(value, assets_data) }
                    return (
                      <div className="min-w-max flex items-start space-x-2">
                        {image && (
                          <Image
                            src={image}
                            width={20}
                            height={20}
                          />
                        )}
                        <div className="flex flex-col">
                          {(symbol || value) && (
                            <div className="flex items-center space-x-1">
                              <div className="flex items-center">
                                <span className="sm:hidden font-semibold">
                                  {ellipse(symbol || value, 4, 'ibc/')}
                                </span>
                                <span className="hidden sm:block font-semibold">
                                  {ellipse(symbol || value, 10, 'ibc/')}
                                </span>
                              </div>
                              {price > 0 && (
                                <NumberDisplay
                                  value={price}
                                  format="0,0.00"
                                  maxDecimals={2}
                                  prefix="$"
                                  className="text-slate-400 dark:text-slate-500"
                                />
                              )}
                              {!symbol && (
                                <Copy value={value} />
                              )}
                            </div>
                          )}
                          <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                            {ellipse(name, 16)}
                          </span>
                        </div>
                      </div>
                    )
                  },
                },
                {
                  Header: 'Balance',
                  accessor: 'amount',
                  disableSortBy: true,
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
              data={balances}
              defaultPageSize={PAGE_SIZE}
              noPagination={balances.length < PAGE_SIZE}
              className="no-border no-shadow"
            /> :
            <Spinner name="ProgressBar" width={36} height={36} />
          }
        </div>
        {!equalsIgnoreCase(address, broadcaster_address) && (
          <Tabs value={stakingField} className="tabs pt-8">
            <TabsHeader className="max-w-xs sm:max-w-md">
              {STAKING_FIELDS.map(f => (
                <Tab
                  key={f.id}
                  value={f.id}
                  onClick={() => setStakingField(f.id)}
                  className="capitalize text-xs sm:text-base"
                >
                  {f.title}
                </Tab>
              ))}
            </TabsHeader>
            <TabsBody>
              {STAKING_FIELDS.filter(f => f.id === stakingField).map(f => (
                <TabPanel key={f.id} value={f.id}>
                  {renderStaking(f.id)}
                </TabPanel>
              ))}
            </TabsBody>
          </Tabs>
        )}
      </div>
  )
}