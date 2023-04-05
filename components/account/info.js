import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'

import Datatable from '../datatable'
import Image from '../image'
import ValidatorProfile from '../validator-profile'
import EnsProfile from '../ens-profile'
import Copy from '../copy'
import { type } from '../../lib/object/id'
import { assetManager } from '../../lib/object/asset'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, remove_chars, ellipse, equalsIgnoreCase, loader_color } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    validators_data,
  } = { ...validators }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  let {
    address,
  } = { ...query }

  address = remove_chars(address)

  const {
    balances,
    delegations,
    redelegations,
    unbondings,
    rewards,
    commissions,
    depositAddresses,
  } = { ...data }

  const is_deposit_address =
    (
      address?.length >= 65 ||
      type(address) === 'evm_address'
    ) &&
    'depositAddresses' in data

  const validator_data =
    !is_deposit_address &&
    (validators_data || [])
      .find(v =>
        equalsIgnoreCase(
          v?.delegator_address,
          address,
        ) ||
        equalsIgnoreCase(
          v?.broadcaster_address,
          address,
        )
      )
  const {
    operator_address,
    description,
  } = { ...validator_data }
  const {
    moniker,
  } = { ...description }

  const reward =
    !is_deposit_address &&
    (rewards?.rewards || [])
      .find(r =>
        equalsIgnoreCase(
          r?.denom,
          'axl',
        )
      )

  const commission =
    !is_deposit_address &&
    (commissions || [])
      .find(c =>
        equalsIgnoreCase(
          c?.denom,
          'axl',
        )
      )

  const deposit_address =
    _.head(
      depositAddresses
    )

  const {
    sender_chain,
    recipient_chain,
    source_chain_data,
    destination_chain_data,
    sender_address,
    recipient_address,
    denom,
    asset_data,
    transfer_data,
  } = { ...deposit_address }

  const {
    send,
  } = { ...transfer_data }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = `w-40 lg:w-${is_deposit_address ? 64 : 56} tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium`

  return (
    is_deposit_address ?
      <div className="sm:col-span-3 bg-slate-100 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 w-fit rounded-lg flex flex-col space-y-4 py-6 px-5">
        <div className={rowClassName}>
          <span className={titleClassName}>
            Deposit Address:
          </span>
          {
            address &&
            (
              <Copy
                size={20}
                value={address}
                title={
                  <span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-medium">
                    {address}
                  </span>
                }
              />
            )
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>
            Source:
          </span>
          {depositAddresses ?
            source_chain_data ?
              <div className="min-w-max flex items-start space-x-2">
                {
                  source_chain_data.image &&
                  (
                    <Image
                      src={source_chain_data.image}
                      className="w-6 h-6 rounded-full"
                    />
                  )
                }
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {
                      source_chain_data.name ||
                      sender_chain
                    }
                  </span>
                </div>
              </div> :
              sender_address ?
                <div className="flex items-center space-x-1">
                  <Copy
                    value={sender_address}
                    title={
                      <span className="cursor-pointer text-slate-400 dark:text-slate-600 font-medium">
                        {ellipse(
                          sender_address,
                          8,
                          process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                        )}
                      </span>
                  }
                  />
                </div> :
                <span>
                  -
                </span> :
            <ProgressBar
              borderColor={loader_color(theme)}
              width="28"
              height="28"
            />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>
            Destination:
          </span>
          {depositAddresses ?
            destination_chain_data ?
              <div className="min-w-max flex items-start space-x-2">
                {
                  destination_chain_data.image &&
                  (
                    <Image
                      src={destination_chain_data.image}
                      className="w-6 h-6 rounded-full"
                    />
                  )
                }
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {
                      destination_chain_data.name ||
                      recipient_chain
                    }
                  </span>
                  {
                    recipient_address &&
                    (
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${destination_chain_data.explorer?.url}${destination_chain_data.explorer?.address_path?.replace('{address}', recipient_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                        >
                          <EnsProfile
                            address={recipient_address}
                            no_copy={true}
                            fallback={
                              <div className="h-6 flex items-center text-blue-600 dark:text-white font-medium">
                                <span className="xl:hidden">
                                  {ellipse(
                                    recipient_address,
                                    6,
                                    destination_chain_data.prefix_address,
                                  )}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(
                                    recipient_address,
                                    8,
                                    destination_chain_data.prefix_address,
                                  )}
                                </span>
                              </div>
                            }
                          />
                        </a>
                        <Copy
                          value={recipient_address}
                        />
                      </div>
                    )
                  }
                </div>
              </div> :
              recipient_address ?
                <div className="flex items-center space-x-1">
                  <Copy
                    value={recipient_address}
                    title={
                      <span className="cursor-pointer text-slate-400 dark:text-slate-600 font-medium">
                        {ellipse(
                          recipient_address,
                          8,
                          process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                        )}
                      </span>
                    }
                  />
                </div> :
                <span>
                  -
                </span> :
            <ProgressBar
              borderColor={loader_color(theme)}
              width="28"
              height="28"
            />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>
            Asset:
          </span>
          {depositAddresses ?
            asset_data ?
              <div className="min-w-max flex items-center space-x-2">
                {
                  asset_data.image &&
                  (
                    <Image
                      src={asset_data.image}
                      className="w-6 h-6 rounded-full"
                    />
                  )
                }
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {
                      asset_data.name ||
                      denom
                    }
                  </span>
                </div>
              </div> :
              denom ?
                <div className="flex items-center space-x-1">
                  <Copy
                    value={denom}
                    title={
                      <span className="cursor-pointer text-slate-400 dark:text-slate-600 font-medium">
                        {ellipse(
                          denom,
                          8,
                        )}
                      </span>
                    }
                  />
                </div> :
                <span>
                  -
                </span> :
            <ProgressBar
              borderColor={loader_color(theme)}
              width="28"
              height="28"
            />
          }
        </div>
        <div className={rowClassName}>
          <span className={titleClassName}>
            Transfer:
          </span>
          {depositAddresses ?
            send?.txhash ?
              <div className="h-6 flex items-center space-x-1">
                <a
                  href={`/transfer/${send.txhash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                >
                  {ellipse(
                    send.txhash,
                    16,
                  )}
                </a>
                <Copy
                  value={send.txhash}
                />
              </div> :
              <span>
                -
              </span> :
            <ProgressBar
              borderColor={loader_color(theme)}
              width="28"
              height="28"
            />
          }
        </div>
      </div> :
      <div className="grid sm:grid-cols-6 gap-4 sm:gap-4">
        <div className="sm:col-span-3 bg-slate-100 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 w-full rounded-lg flex flex-col space-y-4 py-6 px-5">
          <div className={rowClassName}>
            <span className={titleClassName}>
              Address:
            </span>
            {
              address &&
              (
                <Copy
                  size={20}
                  value={address}
                  title={
                    <span
                      title={address}
                      className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-medium"
                    >
                      {ellipse(
                        address,
                        24,
                        process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                      )}
                    </span>
                  }
                />
              )
            }
          </div>
          {
            validator_data &&
            (
              <div className={rowClassName}>
                <span className={titleClassName}>
                  Validator:
                </span>
                <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                  <Link href={`/validator/${operator_address}`}>
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
                        <Link href={`/validator/${operator_address}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {ellipse(
                              moniker,
                              16,
                            )}
                          </a>
                        </Link>
                      )
                    }
                    <div className="flex items-center space-x-1">
                      <Link href={`/validator/${operator_address}`}>
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 dark:text-slate-600"
                        >
                          {ellipse(
                            operator_address,
                            8,
                            process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                          )}
                        </a>
                      </Link>
                      <Copy
                        value={operator_address}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          }
          {
            type(address) === 'account' &&
            (
              <div className={rowClassName}>
                <span className={titleClassName}>
                  Rewards:
                </span>
                {rewards ?
                  <span className="whitespace-nowrap text-sm lg:text-base font-medium space-x-1">
                    {reward?.amount > -1 ?
                      <>
                        <span>
                          {number_format(
                            reward.amount,
                            '0,0.00000000',
                          )}
                        </span>
                        <span>
                          {reward?.denom}
                        </span>
                      </> :
                      <span className="text-slate-400 dark:text-slate-600 font-normal">
                        No Rewards
                      </span>
                    }
                  </span> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="28"
                    height="28"
                  />
                }
              </div>
            )
          }
          {
            equalsIgnoreCase(
              validator_data?.delegator_address,
              address,
            ) &&
            (
              <div className={rowClassName}>
                <span className={titleClassName}>
                  Commissions:
                </span>
                {commissions ?
                  <span className="whitespace-nowrap text-sm lg:text-base font-medium space-x-1">
                    {commission?.amount > -1 ?
                      <>
                        <span>
                          {number_format(
                            commission.amount,
                            '0,0.00000000',
                          )}
                        </span>
                        <span>
                          {commission?.denom}
                        </span>
                      </> :
                      <span className="text-slate-400 dark:text-slate-600 font-normal">
                        No Commissions
                      </span>
                    }
                  </span> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="28"
                    height="28"
                  />
                }
              </div>
            )
          }
          {
            type(address) === 'account' &&
            (
              <>
                <div className={rowClassName}>
                  <span className={titleClassName}>
                    Delegations:
                  </span>
                  {delegations ?
                    <span className="whitespace-nowrap text-sm lg:text-base font-medium space-x-1">
                      {
                        delegations
                          .findIndex(d =>
                            d?.amount
                          ) > -1 ?
                          <>
                            <span>
                              {number_format(
                                _.sumBy(
                                  delegations,
                                  'amount',
                                ),
                                '0,0.00000000',
                              )}
                            </span>
                            <span>
                              {_.head(delegations)?.denom}
                            </span>
                          </> :
                          <span className="text-slate-400 dark:text-slate-600 font-normal">
                            No Delegations
                          </span>
                      }
                    </span> :
                    <ProgressBar
                      borderColor={loader_color(theme)}
                      width="28"
                      height="28"
                    />
                  }
                </div>
                <div className={rowClassName}>
                  <span className={titleClassName}>
                    Redelegations:
                  </span>
                  {redelegations ?
                    <span className="whitespace-nowrap text-sm lg:text-base font-medium space-x-1">
                      {
                        redelegations
                          .findIndex(d =>
                            d?.amount
                          ) > -1 ?
                          <>
                            <span>
                              {number_format(
                                _.sumBy(
                                  redelegations,
                                  'amount',
                                ),
                                '0,0.00000000',
                              )}
                            </span>
                            <span>
                              {_.head(redelegations)?.denom}
                            </span>
                          </> :
                          <span className="text-slate-400 dark:text-slate-600 font-normal">
                            No Redelegations
                          </span>
                      }
                    </span> :
                    <ProgressBar
                      borderColor={loader_color(theme)}
                      width="28"
                      height="28"
                    />
                  }
                </div>
                <div className={rowClassName}>
                  <span className={titleClassName}>
                    Unstakings:
                  </span>
                  {unbondings ?
                    <span className="whitespace-nowrap text-sm lg:text-base font-medium space-x-1">
                      {
                        unbondings
                          .findIndex(d =>
                            d?.amount
                          ) > -1 ?
                          <>
                            <span>
                              {number_format(
                                _.sumBy(
                                  unbondings,
                                  'amount',
                                ),
                                '0,0.00000000',
                              )}
                            </span>
                            <span>
                              {_.head(unbondings)?.denom}
                            </span>
                          </> :
                          <span className="text-slate-400 dark:text-slate-600 font-normal">
                            No Unstakings
                          </span>
                      }
                    </span> :
                    <ProgressBar
                      borderColor={loader_color(theme)}
                      width="28"
                      height="28"
                    />
                  }
                </div>
              </>
            )
          }
        </div>
        <div className="sm:col-span-3 space-y-2">
          {balances ?
            <Datatable
              columns={
                [
                  {
                    Header: '#',
                    accessor: 'i',
                    sortType: (a, b) =>
                      a.original.i > b.original.i ?
                        1 :
                        -1,
                    Cell: props => (
                      <span className="font-medium">
                        {number_format(
                          (
                            props.flatRows?.indexOf(props.row) > -1 ?
                              props.flatRows.indexOf(props.row) :
                              props.value
                          ) + 1,
                          '0,0',
                        )}
                      </span>
                    ),
                  },
                  {
                    Header: 'Asset',
                    accessor: 'asset_data',
                    sortType: (a, b) =>
                      a.original.denom > b.original.denom ?
                        1 :
                        -1,
                    Cell: props => {
                      const {
                        value,
                      } = { ...props }
                      const {
                        denom,
                      } = { ...props.row.original }
                      const {
                        name,
                        image,
                        price,
                      } = { ...value }

                      return (
                        value ?
                          <div className="min-w-max flex items-start space-x-2">
                            {
                              image &&
                              (
                                <Image
                                  src={image}
                                  className="w-5 h-5 rounded-full"
                                />
                              )
                            }
                            <div className="flex flex-col">
                              {
                                denom &&
                                (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold">
                                      {ellipse(
                                        denom,
                                        6,
                                      )}
                                    </span>
                                    {
                                      price > 0 &&
                                      (
                                        <div className="max-w-min text-slate-400 dark:text-slate-200 text-xs font-medium">
                                          {currency_symbol}
                                          {number_format(
                                            price,
                                            '0,0.00',
                                            true,
                                          )}
                                        </div>
                                      )
                                    }
                                  </div>
                                )
                              }
                              <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                                {ellipse(
                                  name,
                                  16,
                                )}
                              </span>
                            </div>
                          </div> :
                          denom &&
                          (
                            <Copy
                              value={denom}
                              title={
                                <span className="cursor-pointer text-black dark:text-white font-medium">
                                  {ellipse(
                                    denom,
                                    6,
                                    'ibc/',
                                  )}
                                </span>
                              }
                            />
                          )
                      )
                    },
                  },
                  {
                    Header: 'Balance',
                    accessor: 'amount',
                    sortType: (a, b) =>
                      a.original.amount > b.original.amount ?
                        1 :
                        -1,
                    Cell: props => (
                      <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1.5">
                        {typeof props.value === 'number' ?
                          <span className="text-xs lg:text-sm font-medium">
                            {number_format(
                              props.value,
                              '0,0.00000000',
                              true,
                            )}
                          </span> :
                          <span>
                            -
                          </span>
                        }
                      </div>
                    ),
                    headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                  },
                  {
                    Header: 'Value',
                    accessor: 'value',
                    sortType: (a, b) =>
                      a.original.value > b.original.value ?
                        1 :
                        -1,
                    Cell: props => {
                      const {
                        value,
                      } = { ...props }
                      const {
                        asset_data,
                      } = { ...props.row.original }
                      const {
                        price,
                      } = { ...asset_data }

                      return (
                        <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1.5">
                          {
                            typeof value === 'number' &&
                            typeof price === 'number' ?
                              <span className="uppercase text-xs lg:text-sm font-semibold">
                                {currency_symbol}
                                {number_format(
                                  props.value,
                                  props.value > 100000 ?
                                    '0,0.00a' :
                                    props.value > 10000 ?
                                      '0,0.00' :
                                      '0,0.00000000',
                                  true,
                                )}
                              </span> :
                              <span>
                                -
                              </span>
                          }
                        </div>
                      )
                    },
                    headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                  },
                ]
              }
              size="small"
              data={balances}
              noPagination={balances.length <= 10}
              defaultPageSize={10}
              className="no-border"
            /> :
            type(address) === 'account' &&
            (
              <ProgressBar
                borderColor={loader_color(theme)}
                width="36"
                height="36"
              />
            )
          }
        </div>
        {
          type(address) === 'account' &&
          validators_data &&
          !equalsIgnoreCase(
            validator_data?.broadcaster_address,
            address,
          ) &&
          (
            <>
              <div className="sm:col-span-3 lg:col-span-2 space-y-2">
                <div className="tracking-wider text-sm lg:text-base font-semibold">
                  Delegations
                </div>
                {delegations ?
                  <Datatable
                    columns={
                      [
                        {
                          Header: '#',
                          accessor: 'i',
                          sortType: (a, b) =>
                            a.original.i > b.original.i ?
                              1 :
                              -1,
                          Cell: props => (
                            <span className="font-medium">
                              {number_format(
                                (
                                  props.flatRows?.indexOf(props.row) > -1 ?
                                    props.flatRows.indexOf(props.row) :
                                    props.value
                                ) + 1,
                                '0,0',
                              )}
                            </span>
                          ),
                        },
                        {
                          Header: 'Validator',
                          accessor: 'validator_address',
                          disableSortBy: true,
                          Cell: props => {
                            const {
                              value,
                            } = { ...props }
                            const {
                              validator_data,
                            } = { ...props.row.original }
                            const {
                              operator_address,
                              description,
                            } = { ...validator_data }
                            const {
                              moniker,
                            } = { ...description }

                            return (
                              validator_data ?
                                <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                                  <Link href={`/validator/${operator_address}`}>
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
                                        <Link href={`/validator/${operator_address}`}>
                                          <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                          >
                                            {ellipse(
                                              moniker,
                                              16,
                                            )}
                                          </a>
                                        </Link>
                                      )
                                    }
                                    <div className="flex items-center space-x-1">
                                      <Link href={`/validator/${operator_address}`}>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 dark:text-slate-600 text-xs"
                                        >
                                          {ellipse(
                                            operator_address,
                                            8,
                                            process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                          )}
                                        </a>
                                      </Link>
                                      <Copy
                                        value={operator_address}
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
                                        {ellipse(
                                          value,
                                          6,
                                          process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                        )}
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
                        },
                        {
                          Header: 'Amount',
                          accessor: 'amount',
                          sortType: (a, b) =>
                            a.original.amount > b.original.amount ?
                              1 :
                              -1,
                          Cell: props => {
                            const {
                              value,
                            } = { ...props }
                            const {
                              denom,
                            } = { ...props.row.original }

                            return (
                              <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1.5">
                                {typeof value === 'number' ?
                                  <span className="text-xs font-semibold space-x-2">
                                    <span>
                                      {number_format(
                                        value,
                                        '0,0.00000000',
                                        true,
                                      )}
                                    </span>
                                    <span>
                                      {denom}
                                    </span>
                                  </span> :
                                  <span>
                                    -
                                  </span>
                                }
                              </div>
                            )
                          },
                          headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                        },
                      ]
                    }
                    size="small"
                    data={delegations}
                    noPagination={delegations.length <= 10}
                    noRecordPerPage={true}
                    defaultPageSize={10}
                    className="no-border"
                  /> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="32"
                    height="32"
                  />
                }
              </div>
              <div className="sm:col-span-3 lg:col-span-2 space-y-2">
                <div className="tracking-wider text-sm lg:text-base font-semibold">
                  Redelegations
                </div>
                {redelegations ?
                  <Datatable
                    columns={
                      [
                        {
                          Header: '#',
                          accessor: 'i',
                          sortType: (a, b) =>
                            a.original.i > b.original.i ?
                              1 :
                              -1,
                          Cell: props => (
                            <span className="font-medium">
                              {number_format(
                                (
                                  props.flatRows?.indexOf(props.row) > -1 ?
                                    props.flatRows.indexOf(props.row) :
                                    props.value
                                ) + 1,
                                '0,0',
                              )}
                            </span>
                          ),
                        },
                        {
                          Header: 'Validator',
                          accessor: 'validator_src_address',
                          disableSortBy: true,
                          Cell: props => {
                            const {
                              value,
                            } = { ...props }
                            const {
                              source_validator_data,
                              destination_validator_data,
                              validator_dst_address,
                            } = { ...props.row.original }

                            const source_operator_address = source_validator_data?.operator_address
                            const source_description = source_validator_data?.description
                            const source_moniker = source_description?.moniker

                            const destination_operator_address = destination_validator_data?.operator_address
                            const destination_description = destination_validator_data?.description
                            const destination_moniker = destination_description?.moniker

                            return (
                              <div className="flex items-center space-x-1">
                                {source_validator_data ?
                                  <div className={`min-w-max flex items-${source_moniker ? 'start' : 'center'} space-x-2`}>
                                    <Link href={`/validator/${source_operator_address}`}>
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ValidatorProfile
                                          validator_description={source_description}
                                        />
                                      </a>
                                    </Link>
                                    <div className="flex flex-col">
                                      {
                                        source_moniker &&
                                        (
                                          <Link href={`/validator/${source_operator_address}`}>
                                            <a
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                            >
                                              {ellipse(
                                                source_moniker,
                                                16,
                                              )}
                                            </a>
                                          </Link>
                                        )
                                      }
                                      <div className="flex items-center space-x-1">
                                        <Link href={`/validator/${source_operator_address}`}>
                                          <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 dark:text-slate-600"
                                          >
                                            {ellipse(
                                              source_operator_address,
                                              10,
                                              process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                            )}
                                          </a>
                                        </Link>
                                        <Copy
                                          value={source_operator_address}
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
                                          {ellipse(
                                            value,
                                            6,
                                            process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                          )}
                                        </a>
                                      </Link>
                                      <Copy
                                        value={value}
                                      />
                                    </div> :
                                    <span>
                                      -
                                    </span>
                                }
                                {destination_validator_data ?
                                  <div className={`min-w-max flex items-${destination_moniker ? 'start' : 'center'} space-x-2`}>
                                    <Link href={`/validator/${destination_operator_address}`}>
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ValidatorProfile
                                          validator_description={destination_description}
                                        />
                                      </a>
                                    </Link>
                                    <div className="flex flex-col">
                                      {
                                        destination_moniker &&
                                        (
                                          <Link href={`/validator/${destination_operator_address}`}>
                                            <a
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                            >
                                              {ellipse(
                                                destination_moniker,
                                                16,
                                              )}
                                            </a>
                                          </Link>
                                        )
                                      }
                                      <div className="flex items-center space-x-1">
                                        <Link href={`/validator/${destination_operator_address}`}>
                                          <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 dark:text-slate-600"
                                          >
                                            {ellipse(
                                              destination_operator_address,
                                              10,
                                              process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                            )}
                                          </a>
                                        </Link>
                                        <Copy
                                          value={destination_operator_address}
                                        />
                                      </div>
                                    </div>
                                  </div> :
                                  validator_dst_address ?
                                    <div className="flex items-center space-x-1">
                                      <Link href={`/validator/${validator_dst_address}`}>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                        >
                                          {ellipse(
                                            validator_dst_address,
                                            6,
                                            process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                          )}
                                        </a>
                                      </Link>
                                      <Copy
                                        value={validator_dst_address}
                                      />
                                    </div> :
                                    <span>
                                      -
                                    </span>
                                }
                              </div>
                            )
                          },
                        },
                        {
                          Header: 'Amount',
                          accessor: 'amount',
                          sortType: (a, b) =>
                            a.original.amount > b.original.amount ?
                              1 :
                              -1,
                          Cell: props => {
                            const {
                              value,
                            } = { ...props }
                            const {
                              denom,
                            } = { ...props.row.original }

                            return (
                              <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1.5">
                                {typeof value === 'number' ?
                                  <span className="text-xs font-semibold space-x-2">
                                    <span>
                                      {number_format(
                                        value,
                                        '0,0.00000000',
                                        true,
                                      )}
                                    </span>
                                    <span>
                                      {denom}
                                    </span>
                                  </span> :
                                  <span>
                                    -
                                  </span>
                                }
                              </div>
                            )
                          },
                          headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                        },
                      ]
                    }
                    size="small"
                    data={redelegations}
                    noPagination={redelegations.length <= 10}
                    noRecordPerPage={true}
                    defaultPageSize={10}
                    className="no-border"
                  /> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="32"
                    height="32"
                  />
                }
              </div>
              <div className="sm:col-span-3 lg:col-span-2 space-y-2">
                <div className="tracking-wider text-sm lg:text-base font-semibold">
                  Unstakings
                </div>
                {unbondings ?
                  <Datatable
                    columns={
                      [
                        {
                          Header: '#',
                          accessor: 'i',
                          sortType: (a, b) =>
                            a.original.i > b.original.i ?
                              1 :
                              -1,
                          Cell: props => (
                            <span className="font-medium">
                              {number_format(
                                (
                                  props.flatRows?.indexOf(props.row) > -1 ?
                                    props.flatRows.indexOf(props.row) :
                                    props.value
                                ) + 1,
                                '0,0',
                              )}
                            </span>
                          ),
                        },
                        {
                          Header: 'Validator',
                          accessor: 'validator_address',
                          disableSortBy: true,
                          Cell: props => {
                            const {
                              value,
                            } = { ...props }
                            const {
                              validator_data,
                            } = { ...props.row.original }
                            const {
                              operator_address,
                              description,
                            } = { ...validator_data }
                            const {
                              moniker,
                            } = { ...description }

                            return (
                              validator_data ?
                                <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                                  <Link href={`/validator/${operator_address}`}>
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
                                        <Link href={`/validator/${operator_address}`}>
                                          <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                          >
                                            {ellipse(
                                              moniker,
                                              16,
                                            )}
                                          </a>
                                        </Link>
                                      )
                                    }
                                    <div className="flex items-center space-x-1">
                                      <Link href={`/validator/${operator_address}`}>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 dark:text-slate-600 text-xs"
                                        >
                                          {ellipse(
                                            operator_address,
                                            8,
                                            process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                          )}
                                        </a>
                                      </Link>
                                      <Copy
                                        value={operator_address}
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
                                        {ellipse(
                                          value,
                                          6,
                                          process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                        )}
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
                        },
                        {
                          Header: 'Amount',
                          accessor: 'amount',
                          sortType: (a, b) =>
                            a.original.amount > b.original.amount ?
                              1 :
                              -1,
                          Cell: props => {
                            const {
                              value,
                            } = { ...props }
                            const {
                              denom,
                            } = { ...props.row.original }

                            return (
                              <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1.5">
                                {typeof value === 'number' ?
                                  <span className="text-xs font-semibold space-x-2">
                                    <span>
                                      {number_format(
                                        value,
                                        '0,0.00000000',
                                        true,
                                      )}
                                    </span>
                                    <span>
                                      {denom}
                                    </span>
                                  </span> :
                                  <span>
                                    -
                                  </span>
                                }
                              </div>
                            )
                          },
                          headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                        },
                      ]
                    }
                    size="small"
                    data={unbondings}
                    noPagination={unbondings.length <= 10}
                    noRecordPerPage={true}
                    defaultPageSize={10}
                    className="no-border"
                  /> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="32"
                    height="32"
                  />
                }
              </div>
            </>
          )
        }
      </div>
  )
}