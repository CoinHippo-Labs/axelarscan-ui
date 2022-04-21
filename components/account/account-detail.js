import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'

import Widget from '../widget'
import Datatable from '../datatable'
import Copy from '../copy'

import { chainTitle } from '../../lib/object/chain'
import { currency, currency_symbol } from '../../lib/object/currency'
import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function AccountDetail({ address, data }) {
  const { env } = useSelector(state => ({ env: state.env }), shallowEqual)
  const { env_data } = { ...env }

  const isDepositAddress = address?.length >= 65

  return (
    <>
      {!isDepositAddress && (
        <div className="w-full flex flex-wrap items-center justify-start md:justify-end space-x-2">
          <div className="text-base font-semibold">Total:</div>
          {data ?
            <div className="flex flex-wrap items-center justify-end text-gray-900 dark:text-gray-100 space-x-2">
              {data.total?.length > 0 ?
                data.total.map((total, i) => (
                  <span key={i} className="bg-gray-100 dark:bg-gray-900 rounded font-medium space-x-1 my-1 px-2 py-1">
                    <span>{numberFormat(total.amount, '0,0.00000000')}</span>
                    <span className="whitespace-nowrap uppercase font-light">{ellipseAddress(total.denom, 12)}</span>
                    {env_data?.token_data && env_data.staking_params?.bond_denom === total.denom && (
                      <span className="text-gray-500">
                        ({currency_symbol}{numberFormat(total.amount * env_data.token_data[currency], '0,0.00000000')})
                      </span>
                    )}
                  </span>
                ))
                :
                '-'
              }
            </div>
            :
            <div className="skeleton w-16 h-7 ml-0 md:ml-auto" />
          }
        </div>
      )}
      <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 my-4">
        <Widget
          title={<span className="text-gray-900 dark:text-white text-lg font-semibold">Balances</span>}
          className="dark:border-gray-900"
        >
          <Datatable
            columns={[
              {
                Header: '#',
                accessor: 'i',
                sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
                Cell: props => (
                  !props.row.original.skeleton ?
                    numberFormat(props.value + 1, '0,0')
                    :
                    <div className="skeleton w-4 h-3" />
                ),
              },
              {
                Header: 'Token',
                accessor: 'denom',
                sortType: (rowA, rowB) => rowA.original.denom > rowB.original.denom ? 1 : -1,
                Cell: props => (
                  !props.row.original.skeleton ?
                    <div className={`min-w-max flex items-${props.row.original.contract_address ? 'start' : 'center'} space-x-2`}>
                      <div className="flex flex-col">
                        <span className="flex items-center space-x-1">
                          <span className="uppercase font-semibold">{ellipseAddress(props.value, 8)}</span>
                          {props.row.original.symbol && (
                            <span className="uppercase text-gray-400 dark:text-gray-600">{props.row.original.symbol}</span>
                          )}
                        </span>
                        {props.row.original.contract_address && (
                          <span className="flex items-center space-x-1">
                            <span className="font-light">{ellipseAddress(props.row.original.contract_address)}</span>
                            <Copy text={props.row.original.contract_address} />
                          </span>
                        )}
                        {env_data?.token_data && env_data.staking_params?.bond_denom === props.value && (
                          <span className="text-gray-400 dark:text-gray-600">
                            {currency_symbol}
                            {numberFormat(env_data.token_data[currency], '0,0.00000000')}
                          </span>
                        )}
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
                Header: 'Balance',
                accessor: 'amount',
                sortType: (rowA, rowB) => rowA.original.amount > rowB.original.amount ? 1 : -1,
                Cell: props => (
                  !props.row.original.skeleton ?
                    <div className="flex flex-col justify-center text-left sm:text-right">
                      {props.value > -1 ?
                        <>
                          <span className="font-medium">{numberFormat(props.value, '0,0.00000000')}</span>
                          {env_data?.token_data && env_data.staking_params?.bond_denom === props.row.original.denom && (
                            <span className="text-gray-400 dark:text-gray-600">
                              {currency_symbol}
                              {numberFormat(props.value * env_data.token_data[currency], '0,0.00000000')}
                            </span>
                          )}
                        </>
                        :
                        '-'
                      }
                    </div>
                    :
                    <div className="flex flex-col justify-center space-y-1">
                      <div className="skeleton w-20 h-4 ml-0 sm:ml-auto" />
                      <div className="skeleton w-8 h-3 ml-0 sm:ml-auto" />
                    </div>
                ),
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
            ]}
            data={data ?
              (data.balances?.map((balance, i) => { return { ...balance, i } })) || []
              :
              [...Array(3).keys()].map(i => { return { i, skeleton: true } })
            }
            noPagination={data?.balances?.length > 10 ? false : true}
            defaultPageSize={10}
            className="no-border mt-4"
          />
          {data && !(data.balances?.length > 0) && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-300 dark:text-gray-500 text-sm font-medium italic text-center my-2 py-2">
              No Balances
            </div>
          )}
        </Widget>
        {!isDepositAddress ?
          <>
            <Widget
              title={<span className="text-gray-900 dark:text-white text-lg font-semibold">Rewards</span>}
              className="dark:border-gray-900"
            >
              <Datatable
                columns={[
                  {
                    Header: '#',
                    accessor: 'i',
                    sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
                    Cell: props => (
                      !props.row.original.skeleton ?
                        numberFormat(props.value + 1, '0,0')
                        :
                        <div className="skeleton w-4 h-3" />
                    ),
                  },
                  {
                    Header: 'Token',
                    accessor: 'denom',
                    sortType: (rowA, rowB) => rowA.original.denom > rowB.original.denom ? 1 : -1,
                    Cell: props => (
                      !props.row.original.skeleton ?
                        <div className={`min-w-max flex items-${props.row.original.contract_address ? 'start' : 'center'} space-x-2`}>
                          <div className="flex flex-col">
                            <span className="flex items-center space-x-1">
                              <span className="uppercase font-semibold">{ellipseAddress(props.value, 8)}</span>
                              {props.row.original.symbol && (
                                <span className="uppercase text-gray-400 dark:text-gray-600">{props.row.original.symbol}</span>
                              )}
                            </span>
                            {props.row.original.contract_address && (
                              <span className="flex items-center space-x-1">
                                <span className="font-light">{ellipseAddress(props.row.original.contract_address)}</span>
                                <Copy text={props.row.original.contract_address} />
                              </span>
                            )}
                            {env_data?.token_data && env_data.staking_params?.bond_denom === props.value && (
                              <span className="text-gray-400 dark:text-gray-600">
                                {currency_symbol}
                                {numberFormat(env_data.token_data[currency], '0,0.00000000')}
                              </span>
                            )}
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
                    Header: 'Amount',
                    accessor: 'amount',
                    sortType: (rowA, rowB) => rowA.original.amount > rowB.original.amount ? 1 : -1,
                    Cell: props => (
                      !props.row.original.skeleton ?
                        <div className="flex flex-col justify-center text-left sm:text-right">
                          {props.value > -1 ?
                            <>
                              <span className="font-medium">{numberFormat(props.value, '0,0.00000000')}</span>
                              {env_data?.token_data && env_data.staking_params?.bond_denom === props.row.original.denom && (
                                <span className="text-gray-400 dark:text-gray-600">
                                  {currency_symbol}
                                  {numberFormat(props.value * env_data.token_data[currency], '0,0.00000000')}
                                </span>
                              )}
                            </>
                            :
                            '-'
                          }
                        </div>
                        :
                        <div className="flex flex-col justify-center space-y-1">
                          <div className="skeleton w-20 h-4 ml-0 sm:ml-auto" />
                          <div className="skeleton w-8 h-3 ml-0 sm:ml-auto" />
                        </div>
                    ),
                    headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                  },
                ]}
                data={data ?
                  (data.rewards?.rewards?.map((reward, i) => { return { ...reward, i } })) || []
                  :
                  [...Array(3).keys()].map(i => { return { i, skeleton: true } })
                }
                noPagination={data?.rewards?.rewards?.length > 10 ? false : true}
                defaultPageSize={10}
                className="no-border mt-4"
              />
              {data && !(data.rewards?.rewards?.length > 0) && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-300 dark:text-gray-500 text-sm font-medium italic text-center my-2 py-2">
                  No Rewards
                </div>
              )}
            </Widget>
            <Widget
              title={<span className="text-gray-900 dark:text-white text-lg font-semibold">Commissions</span>}
              className="dark:border-gray-900"
            >
              <Datatable
                columns={[
                  {
                    Header: '#',
                    accessor: 'i',
                    sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
                    Cell: props => (
                      !props.row.original.skeleton ?
                        numberFormat(props.value + 1, '0,0')
                        :
                        <div className="skeleton w-4 h-3" />
                    ),
                  },
                  {
                    Header: 'Token',
                    accessor: 'denom',
                    sortType: (rowA, rowB) => rowA.original.denom > rowB.original.denom ? 1 : -1,
                    Cell: props => (
                      !props.row.original.skeleton ?
                        <div className={`min-w-max flex items-${props.row.original.contract_address ? 'start' : 'center'} space-x-2`}>
                          <div className="flex flex-col">
                            <span className="flex items-center space-x-1">
                              <span className="uppercase font-semibold">{ellipseAddress(props.value, 8)}</span>
                              {props.row.original.symbol && (
                                <span className="uppercase text-gray-400 dark:text-gray-600">{props.row.original.symbol}</span>
                              )}
                            </span>
                            {props.row.original.contract_address && (
                              <span className="flex items-center space-x-1">
                                <span className="font-light">{ellipseAddress(props.row.original.contract_address)}</span>
                                <Copy text={props.row.original.contract_address} />
                              </span>
                            )}
                            {env_data?.token_data && env_data.staking_params?.bond_denom === props.value && (
                              <span className="text-gray-400 dark:text-gray-600">
                                {currency_symbol}
                                {numberFormat(env_data.token_data[currency], '0,0.00000000')}
                              </span>
                            )}
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
                    Header: 'Amount',
                    accessor: 'amount',
                    sortType: (rowA, rowB) => rowA.original.amount > rowB.original.amount ? 1 : -1,
                    Cell: props => (
                      !props.row.original.skeleton ?
                        <div className="flex flex-col justify-center text-left sm:text-right">
                          {props.value > -1 ?
                            <>
                              <span className="font-medium">{numberFormat(props.value, '0,0.00000000')}</span>
                              {env_data?.token_data && env_data.staking_params?.bond_denom === props.row.original.denom && (
                                <span className="text-gray-400 dark:text-gray-600">
                                  {currency_symbol}
                                  {numberFormat(props.value * env_data.token_data[currency], '0,0.00000000')}
                                </span>
                              )}
                            </>
                            :
                            '-'
                          }
                        </div>
                        :
                        <div className="flex flex-col justify-center space-y-1">
                          <div className="skeleton w-20 h-4 ml-0 sm:ml-auto" />
                          <div className="skeleton w-8 h-3 ml-0 sm:ml-auto" />
                        </div>
                    ),
                    headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                  },
                ]}
                data={data ?
                  (data.commission?.map((commission, i) => { return { ...commission, i } })) || []
                  :
                  [...Array(3).keys()].map(i => { return { i, skeleton: true } })
                }
                noPagination={data?.commission?.length > 10 ? false : true}
                defaultPageSize={10}
                className="no-border mt-4"
              />
              {data && !(data.commission?.length > 0) && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-300 dark:text-gray-500 text-sm font-medium italic text-center my-2 py-2">
                  No Commissions
                </div>
              )}
            </Widget>
          </>
          :
          <Widget
            title={<span className="text-gray-900 dark:text-white text-lg font-semibold">Linked Addresses</span>}
            className="sm:col-span-2 dark:border-gray-900"
          >
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
                            {ellipseAddress(props.value, 8)}
                          </a>
                        </Link>
                        <Copy text={props.value} />
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
                          {numberFormat(props.value, '0,0')}
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
                              text={props.value}
                              copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                                {ellipseAddress(props.value, 8)}
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
                              text={props.value}
                              copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                                {ellipseAddress(props.value, 8)}
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
                          <span className="normal-case">{props.row.original.asset?.symbol || ellipseAddress(props.value, 8)}</span>
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
            {data && !(data.linked_addresses?.length > 0) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-300 dark:text-gray-500 text-sm font-medium italic text-center my-2 py-2">
                No Linked Addresses
              </div>
            )}
          </Widget>
        }
      </div>
      {!isDepositAddress && (
        <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 my-4">
          <Widget
            title={<span className="text-gray-900 dark:text-white text-lg font-semibold">Delegations</span>}
            className="dark:border-gray-900"
          >
            <Datatable
              columns={[
                {
                  Header: '#',
                  accessor: 'i',
                  sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      numberFormat(props.value + 1, '0,0')
                      :
                      <div className="skeleton w-4 h-3" />
                  ),
                },
                {
                  Header: 'Validator',
                  accessor: 'validator_data.description.moniker',
                  sortType: (rowA, rowB) => (rowA.original.validator_data?.description?.moniker || rowA.original.i) > (rowB.original.validator_data?.description?.moniker || rowB.original.i) ? 1 : -1,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2`}>
                        {props.row.original.validator_data?.description && (
                          <Link href={`/validator/${props.row.original.validator_address}`}>
                            <a>
                              {props.row.original.validator_data.description.image ?
                                <Img
                                  src={props.row.original.validator_data.description.image}
                                  alt=""
                                  className="w-6 h-6 rounded-full"
                                />
                                :
                                <div className="skeleton w-6 h-6 rounded-full" />
                              }
                            </a>
                          </Link>
                        )}
                        <div className="flex flex-col">
                          {props.value && (
                            <Link href={`/validator/${props.row.original.validator_address}`}>
                              <a className="text-blue-600 dark:text-white font-medium">
                                {props.value || props.row.original.validator_address}
                              </a>
                            </Link>
                          )}
                          <span className="flex items-center space-x-1">
                            <Link href={`/validator/${props.row.original.validator_address}`}>
                              <a className="text-gray-500 font-light">
                                {ellipseAddress(props.row.original.validator_address, 16)}
                              </a>
                            </Link>
                            <Copy text={props.row.original.validator_address} />
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
                  Header: 'Token',
                  accessor: 'denom',
                  sortType: (rowA, rowB) => rowA.original.denom > rowB.original.denom ? 1 : -1,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <div className={`min-w-max flex items-${props.row.original.contract_address ? 'start' : 'center'} space-x-2`}>
                        <div className="flex flex-col">
                          <span className="flex items-center space-x-1">
                            <span className="uppercase font-semibold">{ellipseAddress(props.value, 8)}</span>
                            {props.row.original.symbol && (
                              <span className="uppercase text-gray-400 dark:text-gray-600">{props.row.original.symbol}</span>
                            )}
                          </span>
                          {props.row.original.contract_address && (
                            <span className="flex items-center space-x-1">
                              <span className="font-light">{ellipseAddress(props.row.original.contract_address)}</span>
                              <Copy text={props.row.original.contract_address} />
                            </span>
                          )}
                          {env_data?.token_data && env_data.staking_params?.bond_denom === props.value && (
                            <span className="text-gray-400 dark:text-gray-600">
                              {currency_symbol}
                              {numberFormat(env_data.token_data[currency], '0,0.00000000')}
                            </span>
                          )}
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
                  Header: 'Balance',
                  accessor: 'amount',
                  sortType: (rowA, rowB) => rowA.original.amount > rowB.original.amount ? 1 : -1,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <div className="flex flex-col justify-center text-left sm:text-right">
                        {props.value > -1 ?
                          <>
                            <span className="font-medium">{numberFormat(props.value, '0,0.00000000')}</span>
                            {env_data?.token_data && env_data.staking_params?.bond_denom === props.row.original.denom && (
                              <span className="text-gray-400 dark:text-gray-600">
                                {currency_symbol}
                                {numberFormat(props.value * env_data.token_data[currency], '0,0.00000000')}
                              </span>
                            )}
                          </>
                          :
                          '-'
                        }
                      </div>
                      :
                      <div className="flex flex-col justify-center space-y-1">
                        <div className="skeleton w-20 h-4 ml-0 sm:ml-auto" />
                        <div className="skeleton w-8 h-3 ml-0 sm:ml-auto" />
                      </div>
                  ),
                  headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                },
              ]}
              data={data ?
                (data.stakingDelegations?.map((delegation, i) => { return { ...delegation, i } })) || []
                :
                [...Array(3).keys()].map(i => { return { i, skeleton: true } })
              }
              noPagination={data?.stakingDelegations?.length > 10 ? false : true}
              defaultPageSize={10}
              className="no-border mt-4"
            />
            {data && !(data.stakingDelegations?.length > 0) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-2 py-2">
                No Delegations
              </div>
            )}
          </Widget>
          <Widget
            title={<span className="text-gray-900 dark:text-white text-lg font-semibold">Unbonding</span>}
            className="dark:border-gray-900"
          >
            <Datatable
              columns={[
                {
                  Header: '#',
                  accessor: 'i',
                  sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      numberFormat(props.value + 1, '0,0')
                      :
                      <div className="skeleton w-4 h-3" />
                  ),
                },
                {
                  Header: 'Validator',
                  accessor: 'validator_data.description.moniker',
                  sortType: (rowA, rowB) => (rowA.original.validator_data?.description?.moniker || rowA.original.i) > (rowB.original.validator_data?.description?.moniker || rowB.original.i) ? 1 : -1,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2`}>
                        {props.row.original.validator_data?.description && (
                          <Link href={`/validator/${props.row.original.validator_address}`}>
                            <a>
                              {props.row.original.validator_data.description.image ?
                                <Img
                                  src={props.row.original.validator_data.description.image}
                                  alt=""
                                  className="w-6 h-6 rounded-full"
                                />
                                :
                                <div className="skeleton w-6 h-6 rounded-full" />
                              }
                            </a>
                          </Link>
                        )}
                        <div className="flex flex-col">
                          {props.value && (
                            <Link href={`/validator/${props.row.original.validator_address}`}>
                              <a className="text-blue-600 dark:text-white font-medium">
                                {props.value || props.row.original.validator_address}
                              </a>
                            </Link>
                          )}
                          <span className="flex items-center space-x-1">
                            <Link href={`/validator/${props.row.original.validator_address}`}>
                              <a className="text-gray-500 font-light">
                                {ellipseAddress(props.row.original.validator_address, 16)}
                              </a>
                            </Link>
                            <Copy text={props.row.original.validator_address} />
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
                  Header: 'Height',
                  accessor: 'creation_height',
                  disableSortBy: true,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <Link href={`/block/${props.value}`}>
                        <a className="text-blue-600 dark:text-white font-medium">
                          {numberFormat(props.value, '0,0')}
                        </a>
                      </Link>
                      :
                      <div className="skeleton w-16 h-4" />
                  ),
                },
                {
                  Header: 'Balance',
                  accessor: 'balance',
                  sortType: (rowA, rowB) => rowA.original.balance > rowB.original.balance ? 1 : -1,
                  Cell: props => (
                    !props.row.original.skeleton ?
                      <div className="text-left sm:text-right">
                        <span className="font-medium">
                          {props.value > -1 ?
                            numberFormat(props.value, '0,0.00000000')
                            :
                            '-'
                          }
                          /
                          {props.row.original.initial_balance > -1 ?
                            numberFormat(props.row.original.initial_balance, '0,0.00000000')
                            :
                            '-'
                          }
                        </span>
                      </div>
                      :
                      <div className="flex flex-col justify-center space-y-1">
                        <div className="skeleton w-20 h-4 ml-0 sm:ml-auto" />
                        <div className="skeleton w-8 h-3 ml-0 sm:ml-auto" />
                      </div>
                  ),
                  headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
                },
              ]}
              data={data ?
                (data.stakingUnbonding?.map((unbonding, i) => { return { ...unbonding, i } })) || []
                :
                [...Array(3).keys()].map(i => { return { i, skeleton: true } })
              }
              noPagination={data?.stakingUnbonding?.length > 10 ? false : true}
              defaultPageSize={10}
              className="no-border mt-4"
            />
            {data && !(data.stakingUnbonding?.length > 0) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-2 py-2">
                No Unbonding
              </div>
            )}
          </Widget>
        </div>
      )}
    </>
  )
}