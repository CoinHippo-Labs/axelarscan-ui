import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin } from 'react-loader-spinner'

import Datatable from '../datatable'
import Image from '../image'
import ValidatorProfile from '../validator-profile'
import EnsProfile from '../ens-profile'
import Copy from '../copy'
import { chainName } from '../../lib/object/chain'
import { denom_manager } from '../../lib/object/denom'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences, validators } = useSelector(state => ({ preferences: state.preferences, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  const { balances, delegations, redelegations, unbondings, rewards, commissions, depositAddresses } = { ...data }
  const is_deposit_address = address?.length >= 65
  const validator_data = !is_deposit_address && validators_data?.find(v => equals_ignore_case(v?.delegator_address, address) || equals_ignore_case(v?.broadcaster_address, address))
  const reward = !is_deposit_address && rewards?.rewards?.find(r => equals_ignore_case(r?.denom, 'axl'))
  const commission = !is_deposit_address && commissions?.find(c => equals_ignore_case(c?.denom, 'axl'))
  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = `w-40 lg:w-${is_deposit_address ? 64 : 56} text-sm lg:text-base font-bold`

  return (
    is_deposit_address ?
      <div className="sm:col-span-3 w-full flex flex-col space-y-4">
        <div className={rowClassName}>
          <span className={titleClassName}>
            Deposit Address:
          </span>
          {address && (
            <Copy
              value={address}
              title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-semibold">
                {address}
              </span>}
              size={20}
            />
          )}
        </div>
        {validator_data && (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Validator:
            </span>
            <div className="min-w-max flex items-start space-x-2">
              <Link href={`/validator/${validator_data.operator_address}`}>
                <a>
                  <ValidatorProfile validator_description={validator_data.description} />
                </a>
              </Link>
              <div className="flex flex-col">
                {validator_data.description?.moniker && (
                  <Link href={`/validator/${validator_data.operator_address}`}>
                    <a className="text-blue-600 dark:text-white font-bold">
                      {ellipse(validator_data.description.moniker, 16)}
                    </a>
                  </Link>
                )}
                <div className="flex items-center space-x-1">
                  <Link href={`/validator/${validator_data.operator_address}`}>
                    <a className="text-slate-400 dark:text-slate-600 font-medium">
                      {ellipse(validator_data.operator_address, 12, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                    </a>
                  </Link>
                  <Copy value={validator_data.operator_address} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className={rowClassName}>
          <span className={titleClassName}>
            Rewards:
          </span>
          {rewards ?
            <span className="text-sm lg:text-base font-semibold">
              {reward?.amount > -1 ?
                `${number_format(reward.amount, '0,0.00000000')} ${reward.denom || ''}` :
                'No Rewards'
              }
            </span>
            :
            <div className="skeleton w-40 h-6 mt-1" />
          }
        </div>
      </div>
      :
      <div className="grid grid-flow-row sm:grid-cols-6 gap-6">
        <div className="sm:col-span-3 w-full flex flex-col space-y-4">
          <div className={rowClassName}>
            <span className={titleClassName}>
              Address:
            </span>
            {address && (
              <Copy
                value={address}
                title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-semibold">
                  {address}
                </span>}
                size={20}
              />
            )}
          </div>
          {validator_data && (
            <div className={rowClassName}>
              <span className={titleClassName}>
                Validator:
              </span>
              <div className="min-w-max flex items-start space-x-2">
                <Link href={`/validator/${validator_data.operator_address}`}>
                  <a>
                    <ValidatorProfile validator_description={validator_data.description} />
                  </a>
                </Link>
                <div className="flex flex-col">
                  {validator_data.description?.moniker && (
                    <Link href={`/validator/${validator_data.operator_address}`}>
                      <a className="text-blue-600 dark:text-white font-bold">
                        {ellipse(validator_data.description.moniker, 16)}
                      </a>
                    </Link>
                  )}
                  <div className="flex items-center space-x-1">
                    <Link href={`/validator/${validator_data.operator_address}`}>
                      <a className="text-slate-400 dark:text-slate-600 font-medium">
                        {ellipse(validator_data.operator_address, 12, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                      </a>
                    </Link>
                    <Copy value={validator_data.operator_address} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className={rowClassName}>
            <span className={titleClassName}>
              Rewards:
            </span>
            {rewards ?
              <span className="text-sm lg:text-base font-semibold">
                {reward?.amount > -1 ?
                  `${number_format(reward.amount, '0,0.00000000')} ${reward.denom || ''}` :
                  'No Rewards'
                }
              </span>
              :
              <div className="skeleton w-40 h-6 mt-1" />
            }
          </div>
          {equals_ignore_case(validator_data?.delegator_address, address) && (
            <div className={rowClassName}>
              <span className={titleClassName}>
                Commissions:
              </span>
              {commissions ?
                <span className="text-sm lg:text-base font-semibold">
                  {commission?.amount > -1 ?
                    `${number_format(commission.amount, '0,0.00000000')} ${commission.denom || ''}` :
                    'No Commissions'
                  }
                </span>
                :
                <div className="skeleton w-40 h-6 mt-1" />
              }
            </div>
          )}
        </div>
        <div className="sm:col-span-3 space-y-2">
          {balances ?
            <Datatable
              columns={[
                {
                  Header: '#',
                  accessor: 'i',
                  sortType: (a, b) => a.original.value > b.original.value ? 1 : -1,
                  Cell: props => (
                    <span className="font-mono font-semibold">
                      {number_format((props.flatRows?.indexOf(props.row) > -1 ?
                        props.flatRows.indexOf(props.row) : props.value
                      ) + 1, '0,0')}
                    </span>
                  ),
                },
                {
                  Header: 'Asset',
                  accessor: 'asset_data',
                  sortType: (a, b) => a.original.denom > b.original.denom ? 1 : -1,
                  Cell: props => (
                    props.value ?
                      <div className="min-w-max flex items-start space-x-2">
                        {props.value.image && (
                          <Image
                            src={props.value.image}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <div className="flex flex-col">
                          {props.row.original.denom && (
                            <div className="flex items-start space-x-1">
                              <span className="font-bold">
                                {ellipse(props.row.original.denom, 6)}
                              </span>
                              {props.value.price && (
                                <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg font-mono text-xs font-bold py-0.5 px-2">
                                  {currency_symbol}
                                  {number_format(props.value.price, '0,0.00000000')}
                                </div>
                              )}
                            </div>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">
                            {ellipse(props.value.name, 16)}
                          </span>
                        </div>
                      </div>
                      :
                      props.row.original.denom && (
                        <Copy
                          value={props.row.original.denom}
                          title={<span className="cursor-pointer text-black dark:text-white font-semibold">
                            {ellipse(props.row.original.denom, 6, 'ibc/')}
                          </span>}
                          size={18}
                        />
                      )
                  ),
                },
                {
                  Header: 'Balance',
                  accessor: 'amount',
                  sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
                  Cell: props => (
                    <div className="flex flex-col text-left sm:text-right">
                      <div className="flex flex-col items-start sm:items-end space-y-1.5">
                        {typeof props.value === 'number' ?
                          <span className="text-xs lg:text-sm font-semibold">
                            {number_format(props.value, '0,0.00000000')}
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
                  Header: 'Value',
                  accessor: 'value',
                  sortType: (a, b) => a.original.value > b.original.value ? 1 : -1,
                  Cell: props => (
                    <div className="flex flex-col text-left sm:text-right">
                      <div className="flex flex-col items-start sm:items-end space-y-1.5">
                        {typeof props.value === 'number' ?
                          <span className="font-mono text-xs lg:text-sm font-bold">
                            {currency_symbol}
                            {number_format(props.value, props.value > 100000 ? '0,0.00a' : props.value > 10000 ? '0,0.00' : '0,0.00000000')}
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
              ]}
              data={balances}
              noPagination={balances.length <= 10}
              defaultPageSize={10}
              className="no-border"
            />
            :
            <TailSpin color={loader_color(theme)} width="32" height="32" />
          }
        </div>
        {validators_data && !equals_ignore_case(validator_data?.broadcaster_address, address) && (
          <>
            <div className="sm:col-span-3 lg:col-span-2 space-y-2">
              <div className="text-sm lg:text-base font-bold">
                Delegations
              </div>
              {delegations ?
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
                      accessor: 'validator_address',
                      disableSortBy: true,
                      Cell: props => {
                        const { validator_data } = { ...props.row.original }
                        const { operator_address, description } = { ...validator_data }
                        const { moniker } = { ...description }
                        return validator_data ?
                          <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                            <Link href={`/validator/${operator_address}`}>
                              <a>
                                <ValidatorProfile validator_description={description} />
                              </a>
                            </Link>
                            <div className="flex flex-col">
                              {moniker && (
                                <Link href={`/validator/${operator_address}`}>
                                  <a className="text-blue-600 dark:text-white font-bold">
                                    {ellipse(moniker, 10)}
                                  </a>
                                </Link>
                              )}
                              <div className="flex items-center space-x-1">
                                <Link href={`/validator/${operator_address}`}>
                                  <a className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                                    {ellipse(operator_address, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                  </a>
                                </Link>
                                <Copy value={operator_address} />
                              </div>
                            </div>
                          </div>
                          :
                          props.value ?
                            <div className="flex items-center space-x-1">
                              <Link href={`/validator/${props.value}`}>
                                <a className="text-blue-600 dark:text-white text-xs font-medium">
                                  {ellipse(props.value, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                </a>
                              </Link>
                              <Copy value={props.value} />
                            </div>
                            :
                            <span>
                              -
                            </span>
                      },
                    },
                    {
                      Header: 'Amount',
                      accessor: 'amount',
                      sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
                      Cell: props => (
                        <div className="flex flex-col text-left sm:text-right">
                          <div className="flex flex-col items-start sm:items-end space-y-1.5">
                            {typeof props.value === 'number' ?
                              <span className="text-xs lg:text-sm font-semibold">
                                {number_format(props.value, '0,0.00000000')} {props.row.original.denom}
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
                  ]}
                  data={delegations}
                  noPagination={delegations.length <= 10}
                  defaultPageSize={10}
                  className="no-border"
                />
                :
                <TailSpin color={loader_color(theme)} width="32" height="32" />
              }
            </div>
            <div className="sm:col-span-3 lg:col-span-2 space-y-2">
              <div className="text-sm lg:text-base font-bold">
                Redelegations
              </div>
              {redelegations ?
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
                      accessor: 'validator_src_address',
                      disableSortBy: true,
                      Cell: props => {
                        const { source_validator_data, destination_validator_data, validator_dst_address } = { ...props.row.original }
                        let source_operator_address, source_description, source_moniker,
                          destination_operator_address, destination_description, destination_moniker
                        source_operator_address = source_validator_data?.operator_address
                        source_description = source_validator_data?.description
                        source_moniker = source_description?.moniker
                        destination_operator_address = destination_validator_data?.operator_address
                        destination_description = destination_validator_data?.description
                        destination_moniker = destination_description?.moniker
                        return (
                          <div className="flex items-center space-x-1">
                            {source_validator_data ?
                              <div className="min-w-max flex items-center space-x-2">
                                <Link href={`/validator/${source_operator_address}`}>
                                  <a>
                                    <ValidatorProfile validator_description={source_description} />
                                  </a>
                                </Link>
                                <div className="flex flex-col">
                                  {source_moniker && (
                                    <Link href={`/validator/${source_operator_address}`}>
                                      <a className="text-blue-600 dark:text-white font-bold">
                                        {ellipse(source_moniker, 10)}
                                      </a>
                                    </Link>
                                  )}
                                </div>
                              </div>
                              :
                              props.value ?
                                <div className="flex items-center space-x-1">
                                  <Link href={`/validator/${props.value}`}>
                                    <a className="text-blue-600 dark:text-white text-xs font-medium">
                                      {ellipse(props.value, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                    </a>
                                  </Link>
                                  <Copy value={props.value} />
                                </div>
                                :
                                <span>
                                  -
                                </span>
                            }
                            {destination_validator_data ?
                              <div className="min-w-max flex items-center space-x-2">
                                <Link href={`/validator/${destination_operator_address}`}>
                                  <a>
                                    <ValidatorProfile validator_description={destination_description} />
                                  </a>
                                </Link>
                                <div className="flex flex-col">
                                  {destination_moniker && (
                                    <Link href={`/validator/${destination_operator_address}`}>
                                      <a className="text-blue-600 dark:text-white font-bold">
                                        {ellipse(destination_moniker, 10)}
                                      </a>
                                    </Link>
                                  )}
                                </div>
                              </div>
                              :
                              validator_dst_address ?
                                <div className="flex items-center space-x-1">
                                  <Link href={`/validator/${validator_dst_address}`}>
                                    <a className="text-blue-600 dark:text-white text-xs font-medium">
                                      {ellipse(validator_dst_address, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                    </a>
                                  </Link>
                                  <Copy value={validator_dst_address} />
                                </div>
                                :
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
                      sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
                      Cell: props => (
                        <div className="flex flex-col text-left sm:text-right">
                          <div className="flex flex-col items-start sm:items-end space-y-1.5">
                            {typeof props.value === 'number' ?
                              <span className="text-xs lg:text-sm font-semibold">
                                {number_format(props.value, '0,0.00000000')} {props.row.original.denom}
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
                  ]}
                  data={redelegations}
                  noPagination={redelegations.length <= 10}
                  defaultPageSize={10}
                  className="no-border"
                />
                :
                <TailSpin color={loader_color(theme)} width="32" height="32" />
              }
            </div>
            <div className="sm:col-span-3 lg:col-span-2 space-y-2">
              <div className="text-sm lg:text-base font-bold">
                Unbondings
              </div>
              {unbondings ?
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
                      accessor: 'validator_address',
                      disableSortBy: true,
                      Cell: props => {
                        const { validator_data } = { ...props.row.original }
                        const { operator_address, description } = { ...validator_data }
                        const { moniker } = { ...description }
                        return validator_data ?
                          <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                            <Link href={`/validator/${operator_address}`}>
                              <a>
                                <ValidatorProfile validator_description={description} />
                              </a>
                            </Link>
                            <div className="flex flex-col">
                              {moniker && (
                                <Link href={`/validator/${operator_address}`}>
                                  <a className="text-blue-600 dark:text-white font-bold">
                                    {ellipse(moniker, 10)}
                                  </a>
                                </Link>
                              )}
                              <div className="flex items-center space-x-1">
                                <Link href={`/validator/${operator_address}`}>
                                  <a className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                                    {ellipse(operator_address, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                  </a>
                                </Link>
                                <Copy value={operator_address} />
                              </div>
                            </div>
                          </div>
                          :
                          props.value ?
                            <div className="flex items-center space-x-1">
                              <Link href={`/validator/${props.value}`}>
                                <a className="text-blue-600 dark:text-white text-xs font-medium">
                                  {ellipse(props.value, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                </a>
                              </Link>
                              <Copy value={props.value} />
                            </div>
                            :
                            <span>
                              -
                            </span>
                      },
                    },
                    {
                      Header: 'Amount',
                      accessor: 'amount',
                      sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
                      Cell: props => (
                        <div className="flex flex-col text-left sm:text-right">
                          <div className="flex flex-col items-start sm:items-end space-y-1.5">
                            {typeof props.value === 'number' ?
                              <span className="text-xs lg:text-sm font-semibold">
                                {number_format(props.value, '0,0.00000000')} {props.row.original.denom}
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
                  ]}
                  data={unbondings}
                  noPagination={unbondings.length <= 10}
                  defaultPageSize={10}
                  className="no-border"
                />
                :
                <TailSpin color={loader_color(theme)} width="32" height="32" />
              }
            </div>
          </>
        )}
      </div>
  )
}

{/*<>
            <Datatable
              columns={[
                {
                  Header: 'Tx Hash',
                  accessor: 'txhash',
                  disableSortBy: true,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <div className="flex items-center space-x-1">
                        <Link href={`/tx/${props.value}`}>
                          <a className="uppercase text-xs text-blue-600 dark:text-white font-medium">
                            {ellipse(props.value, 8)}
                          </a>
                        </Link>
                        <Copy value={props.value} />
                      </div>
                      :
                      <div className="skeleton w-32 h-4" />
                  ),
                },
                {
                  Header: 'Height',
                  accessor: 'height',
                  disableSortBy: true,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <Link href={`/block/${props.value}`}>
                        <a className="text-xs text-blue-500 dark:text-gray-400 font-medium">
                          {number_format(props.value, '0,0')}
                        </a>
                      </Link>
                      :
                      <div className="skeleton w-12 h-4" />
                  ),
                },
                {
                  Header: 'Sender',
                  accessor: 'sender_address',
                  disableSortBy: true,
                  Cell: props => {
                    const chain = props.row.original.from_chain

                    return !props.row.original.skeleton ?
                      props.value ?
                        <div className="min-w-max">
                          <div className="flex items-center space-x-1">
                            <Copy
                              value={props.value}
                              copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                                {ellipse(props.value, 8)}
                              </span>}
                            />
                            {chain?.explorer?.url && (
                              <a
                                href={`${chain.explorer.url}${chain.explorer.address_path?.replace('{address}', props.value)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {chain.explorer.icon ?
                                  <Img
                                    src={chain.explorer.icon}
                                    alt=""
                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={16} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </div>
                          {chain && (
                            <div className="flex items-center space-x-2 mt-0.5">
                              <Img
                                src={chain.image}
                                alt=""
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-gray-900 dark:text-white text-xs font-semibold">{chainTitle(chain)}</span>
                            </div>
                          )}
                        </div>
                        :
                        <span className="text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                      :
                      <div className="space-y-1.5">
                        <div className="skeleton w-32 h-4" />
                        <div className="skeleton w-24 h-3.5" />
                      </div>
                  },
                },
                {
                  Header: 'Recipient',
                  accessor: 'recipient_address',
                  disableSortBy: true,
                  Cell: props => {
                    const chain = props.row.original.to_chain

                    return !props.row.original.skeleton ?
                      props.value ?
                        <div className="min-w-max">
                          <div className="flex items-center space-x-1">
                            <Copy
                              value={props.value}
                              copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                                {ellipse(props.value, 8)}
                              </span>}
                            />
                            {chain?.explorer?.url && (
                              <a
                                href={`${chain.explorer.url}${chain.explorer.address_path?.replace('{address}', props.value)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {chain.explorer.icon ?
                                  <Img
                                    src={chain.explorer.icon}
                                    alt=""
                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={16} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </div>
                          {chain && (
                            <div className="flex items-center space-x-2 mt-0.5">
                              <Img
                                src={chain.image}
                                alt=""
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-gray-900 dark:text-white text-xs font-semibold">{chainTitle(chain)}</span>
                            </div>
                          )}
                        </div>
                        :
                        <span className="text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                      :
                      <div className="space-y-1.5">
                        <div className="skeleton w-32 h-4" />
                        <div className="skeleton w-24 h-3.5" />
                      </div>
                  },
                },
                {
                  Header: 'Asset',
                  accessor: 'denom',
                  disableSortBy: true,
                  Cell: props => {
                    return !props.row.original.skeleton ?
                      <div className="min-w-max max-w-min bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center space-x-1 ml-auto -mr-2 py-1 px-2.5">
                        <Img
                          src={props.row.original.asset?.image}
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="flex items-center text-gray-700 dark:text-gray-300 text-sm font-semibold">
                          <span className="normal-case">{props.row.original.asset?.symbol || ellipse(props.value, 8)}</span>
                        </span>
                      </div>
                      :
                      <div className="skeleton w-14 h-5 ml-auto" />
                  },
                  headerClassName: 'justify-end text-right',
                },
              ]}
              data={data ?
                (data.linked_addresses?.map((linked, i) => { return { ...linked, i } })) || []
                :
                [...Array(3).keys()].map(i => { return { i, skeleton: true } })
              }
              noPagination={data?.linked_addresses?.length > 10 ? false : true}
              defaultPageSize={10}
              className="no-border mt-4"
            />
        }
    </>*/}