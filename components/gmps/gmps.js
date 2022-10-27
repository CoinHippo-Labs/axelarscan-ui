import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import AccountProfile from '../account-profile'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { search as searchGMP } from '../../lib/api/gmp'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, total_time_string, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 25

export default ({ n }) => {
  const { preferences, evm_chains, cosmos_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, query, asPath } = { ...router }
  const { address } = { ...query }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)

  useEffect(() => {
    if (evm_chains_data && cosmos_chains_data && asPath) {
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(asPath.indexOf('?') + 1)
      )

      const chains_data = _.concat(
        evm_chains_data,
        cosmos_chains_data,
      )

      const {
        txHash,
        sourceChain,
        destinationChain,
        method,
        status,
        senderAddress,
        sourceAddress,
        contractAddress,
        relayerAddress,
        fromTime,
        toTime,
      } = { ...params }

      setFilters({
        txHash,
        sourceChain: getChain(
          sourceChain,
          chains_data,
        )?._id ||
          sourceChain,
        destinationChain: getChain(
          destinationChain,
          chains_data,
        )?._id ||
          destinationChain,
        method: [
          'callContract',
          'callContractWithToken',
        ].includes(method) ?
          method :
          undefined,
        status: [
          'approving',
          'called',
          'forecalled',
          'approved',
          'executing',
          'executed',
          'error',
          'insufficient_fee',
          'no_created_at',
        ].includes(status?.toLowerCase()) ?
          status.toLowerCase() :
          undefined,
        senderAddress,
        sourceAddress,
        contractAddress,
        relayerAddress,
        time: fromTime &&
          toTime &&
          [
            moment(Number(fromTime)),
            moment(Number(toTime)),
          ],
      })
    }
  }, [evm_chains_data, cosmos_chains_data, asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(
        is_interval ?
          moment().valueOf() :
          typeof fetchTrigger === 'number' ?
            null :
            0
      )
    }

    if (
      pathname &&
      filters
    ) {
      triggering()
    }

    const interval = setInterval(() =>
      triggering(true),
      (address || ['/gmp/search'].includes(pathname) ? 0.33 : 0.25) * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [pathname, address, filters])

  useEffect(() => {
    const getData = async () => {
      if (
        filters &&
        (
          !pathname?.includes('/[address]') ||
          address
        )
      ) {
        setFetching(true)

        if (!fetchTrigger) {
          setTotal(null)
          setData(null)
          setOffet(0)
        }

        const {
          status,
        } = { ...filters }

        const size = n ||
          LIMIT
        const _data = !fetchTrigger ||
          (
            [
              'executing',
            ].includes(status) &&
            fetchTrigger > 1 &&
            (
              !data ||
              data.length < size
            )
          ) ?
            [] :
            data || []
        const from = fetchTrigger === true || fetchTrigger === 1 ?
          _data.length :
          0
        let params

        if (address) {
          params = {
            senderAddress: address,
          }
        }
        else if (filters) {
          const {
            txHash,
            sourceChain,
            destinationChain,
            method,
            status,
            senderAddress,
            sourceAddress,
            contractAddress,
            relayerAddress,
            time,
          } = { ...filters }

          let event,
            fromTime,
            toTime

          switch (method) {
            case 'callContract':
              event = 'ContractCall'
              break
            case 'callContractWithToken':
              event = 'ContractCallWithToken'
              break
            default:
              event = undefined
              break
          }

          if (time?.length > 1) {
            fromTime = time[0].unix()
            toTime = time[1].unix()
          }

          params = {
            txHash,
            sourceChain,
            destinationChain,
            event,
            status,
            senderAddress,
            sourceAddress,
            contractAddress,
            relayerAddress,
            fromTime,
            toTime,
          }
        }

        let response = await searchGMP(
          {
            ...params,
            size,
            from,
          },
        )

        if (response) {
          const {
            data,
            total,
          } = { ...response }

          setTotal(total)

          response = _.orderBy(
            _.uniqBy(
              _.concat(
                (data || [])
                  .map(d => {
                    return {
                      ...d,
                    }
                  }),
                _data,
              ),
              'call.id',
            ),
            ['call.block_timestamp'],
            ['desc'],
          )

          setData(response)
        }
        else if (!fetchTrigger) {
          setTotal(0)
          setData([])
        }

        setFetching(false)
      }
    }

    getData()
  }, [fetchTrigger])

  useEffect(() => {
    if (data) {
      setTypes(
        _.countBy(
          _.uniqBy(
            data,
            'call.id',
          )
          .map(t => t?.call?.event)
          .filter(t => t)
        )
      )
    }
  }, [data])

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  const chains_data = _.concat(
    evm_chains_data,
    cosmos_chains_data,
  )
  const data_filtered = _.slice(
    data?.filter(d =>
      !(filterTypes?.length > 0) ||
      filterTypes.includes(d?.call?.event) ||
      (filterTypes.includes('undefined') && !d?.call?.event)
    ),
    0,
    n || undefined,
  )

  return (
    data ?
      <div className="grid gap-2 mt-2">
        <div className="flex items-center justify-between space-x-2 -mt-2">
          {typeof total === 'number' && (
            <div className="flex items-center space-x-1.5 sm:mb-1 ml-2 sm:ml-0">
              <span className="tracking-wider text-sm font-semibold">
                {number_format(
                  total,
                  '0,0',
                )}
              </span>
              <span className="tracking-wider text-sm">
                Results
              </span>
            </div>
          )}
          <div className="block sm:flex sm:flex-wrap items-center justify-end overflow-x-auto space-x-1">
            {Object.entries({ ...types })
              .map(([k, v]) => (
                <div
                  key={k}
                  onClick={() => setFilterTypes(_.uniq(filterTypes?.includes(k) ? filterTypes.filter(t => !equals_ignore_case(t, k)) : _.concat(filterTypes || [], k)))}
                  className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'bg-slate-200 dark:bg-slate-800 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium'} rounded-lg cursor-pointer whitespace-nowrap flex items-center text-xs space-x-1.5 ml-1 mb-1 py-0.5 px-1.5`}
                  style={{ textTransform: 'none' }}
                >
                  <span>
                    {k === 'undefined' ?
                      'Failed' : k
                    }
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {number_format(
                      v,
                      '0,0',
                    )}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
        <Datatable
          columns={[
            {
              Header: 'Tx Hash',
              accessor: 'call.transactionHash',
              disableSortBy: true,
              Cell: props => {
                const { call } = { ...props.row.original }
                const { chain } = { ...call }
                const chain_data = getChain(chain, chains_data)
                const { explorer } = { ...chain_data }
                const { url, transaction_path, icon } = { ...explorer }
                return (
                  <div className="flex items-center space-x-1">
                    <Link href={`/gmp/${call?.transactionHash}:${call?.logIndex}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-500 font-medium"
                      >
                        {ellipse(props.value)}
                      </a>
                    </Link>
                    <Copy
                      value={props.value}
                      size={18}
                    />
                    {url && (
                      <a
                        href={`${url}${transaction_path?.replace('{tx}', props.value)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-max text-blue-600 dark:text-white"
                      >
                        {icon ?
                          <Image
                            src={icon}
                            className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={16} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Method',
              accessor: 'call.event',
              disableSortBy: true,
              Cell: props => {
                const { call, gas, fees, is_insufficient_minimum_amount } = { ...props.row.original }
                const { chain, returnValues } = { ...call }
                const { symbol, amount } = { ...returnValues }
                const chain_data = getChain(chain, chains_data)
                const asset_data = assets_data?.find(a => equals_ignore_case(a?.symbol, symbol) || a?.contracts?.findIndex(c => c?.chain_id === chain_data?.chain_id && equals_ignore_case(c.symbol, symbol)) > -1)
                const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
                const decimals = contract_data?.decimals || asset_data?.decimals || 18
                const _symbol = contract_data?.symbol || asset_data?.symbol || symbol
                const image = contract_data?.image || asset_data?.image
                return (
                  <div className="flex flex-col space-y-2 mb-3">
                    <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg text-xs lg:text-sm font-semibold -mt-0.5 py-0.5 px-1.5">
                      {props.value === 'ContractCall' ?
                        'callContract' :
                        props.value === 'ContractCallWithToken' ?
                          'callContractWithToken' :
                          props.value || '-'
                      }
                    </div>
                    {amount && _symbol && (
                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                        {image && (
                          <Image
                            src={image}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="text-sm font-semibold">
                          {asset_data && (
                            <span className="mr-1">
                              {number_format(utils.formatUnits(BigNumber.from(amount), decimals), '0,0.000', true)}
                            </span>
                          )}
                          <span>
                            {_symbol}
                          </span>
                        </span>
                      </div>
                    )}
                    {is_insufficient_minimum_amount && (
                      <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap text-xs lg:text-sm font-semibold py-0.5 px-2">
                        Insufficient Amount
                      </div>
                    )}
                    {(fees?.destination_base_fee || fees?.base_fee) > 0 && (
                      <div className="flex flex-col">
                        <div className="max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg whitespace-nowrap text-2xs font-semibold space-x-1 py-0.5 px-1.5">
                          <span>
                            Fees:
                          </span>
                          <span>
                            {number_format(
                              fees?.destination_base_fee || fees?.base_fee,
                              '0,0.000000',
                            )}
                          </span>
                          <span>
                            {fees.destination_native_token?.symbol}
                          </span>
                        </div>
                        {typeof gas?.gas_base_fee_amount === 'number' && (
                          <>
                            <span className="text-xs font-medium mx-2">
                              =
                            </span>
                            <div className="max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg whitespace-nowrap py-0.5 px-1.5">
                              <span className="text-2xs font-semibold">
                                <span className="mr-1">
                                  {number_format(
                                    gas.gas_base_fee_amount,
                                    '0,0.00000000',
                                    true,
                                  )}
                                </span>
                                <span>
                                  {fees.source_token?.symbol || _.head(chain_data?.provider_params)?.nativeCurrency?.symbol}
                                </span>
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Source',
              accessor: 'call.chain',
              disableSortBy: true,
              Cell: props => {
                const { call } = { ...props.row.original }
                const { returnValues, transaction } = { ...call }
                const { sender } = { ...returnValues }
                const { from } = { ...transaction }
                const chain_data = getChain(props.value, chains_data)
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path } = { ...explorer }
                return (
                  <div className="flex flex-col space-y-2 mb-3">
                    <div className="flex items-center space-x-1.5">
                      {image && (
                        <Image
                          src={image}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="font-bold">
                        {name || props.value}
                      </span>
                    </div>
                    {from && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Sender address
                        </span>
                        {from.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', from)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={from}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(
                                      from,
                                      12,
                                      prefix_address,
                                    )}
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={from}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={from}
                              prefix={prefix_address}
                            />
                          </div>
                        }
                      </div>
                    )}
                    {sender && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Source address
                        </span>
                        {sender.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', sender)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={sender}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(
                                      sender,
                                      12,
                                      prefix_address,
                                    )}
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={sender}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={sender}
                              prefix={prefix_address}
                            />
                          </div>
                        }
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Destination',
              accessor: 'call.returnValues.destinationChain',
              disableSortBy: true,
              Cell: props => {
                const { call, executed, status, is_invalid_destination_chain } = { ...props.row.original }
                const { returnValues } = { ...call }
                const { destinationContractAddress } = { ...returnValues }
                const { transaction } = { ...executed }
                const { from } = { ...transaction }
                const chain_data = getChain(props.value, chains_data)
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path } = { ...explorer }
                return (
                  <div className="flex flex-col space-y-2 mb-3">
                    <div className="flex items-center space-x-1.5">
                      {image && (
                        <Image
                          src={image}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="font-bold">
                        {name || props.value}
                      </span>
                    </div>
                    {is_invalid_destination_chain && (
                      <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-semibold py-0.5 px-2">
                        Invalid Chain
                      </div>
                    )}
                    {destinationContractAddress && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Contract address
                        </span>
                        {destinationContractAddress.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', destinationContractAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={destinationContractAddress}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(
                                      destinationContractAddress,
                                      12,
                                      prefix_address,
                                    )}
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={destinationContractAddress}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={destinationContractAddress}
                              prefix={prefix_address}
                            />
                          </div>
                        }
                      </div>
                    )}
                    {equals_ignore_case(status, 'executed') && from && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Relayer address
                        </span>
                        {from.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', from)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={from}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(
                                      from,
                                      12,
                                      prefix_address,
                                    )}
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={from}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={from}
                              prefix={prefix_address}
                            />
                          </div>
                        }
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Status',
              accessor: 'status',
              disableSortBy: true,
              Cell: props => {
                const { call, gas_paid, gas_paid_to_callback, forecalled, approved, executed, is_executed, error, refunded, status, is_invalid_destination_chain, is_invalid_call, is_insufficient_minimum_amount, is_insufficient_fee, is_call_from_relayer } = { ...props.row.original }
                const { chain, returnValues } = { ...call }
                const { destinationChain } = { ...returnValues }
                const source_chain_data = getChain(chain, chains_data)
                const destination_chain_data = getChain(destinationChain, chains_data)
                const steps = [
                  {
                    id: 'call',
                    title: staging ?
                      'Called' :
                      'Contract Call',
                    chain_data: source_chain_data,
                    data: call,
                  },
                  {
                    id: 'gas_paid',
                    title: 'Gas Paid',
                    chain_data: source_chain_data,
                    data: gas_paid,
                  },
                  forecalled &&
                    {
                      id: 'forecalled',
                      title: 'Forecalled',
                      chain_data: destination_chain_data,
                      data: forecalled,
                    },
                  {
                    id: 'approved',
                    title: staging ?
                      'Approved' :
                      'Call Approved',
                    chain_data: destination_chain_data,
                    data: approved,
                  },
                  {
                    id: 'executed',
                    title: 'Executed',
                    chain_data: destination_chain_data,
                    data: executed,
                  },
                  refunded &&
                    {
                      id: 'refunded',
                      title: 'Gas Refunded',
                      chain_data: source_chain_data,
                      data: refunded,
                    },
                ]
                .filter(s => s)

                let current_step

                switch (status) {
                  case 'called':
                    current_step = steps.findIndex(s =>
                      s.id === (
                        gas_paid || gas_paid_to_callback ?
                          'gas_paid' :
                          'call'
                      )
                    ) + (
                      !is_invalid_destination_chain &&
                      !is_invalid_call &&
                      !is_insufficient_minimum_amount &&
                      !is_insufficient_fee &&
                      (
                        gas_paid ||
                        gas_paid_to_callback ||
                        equals_ignore_case(call?.transactionHash, gas_paid?.transactionHash)
                      ) ?
                        1 :
                        0
                    ) - (
                      data_filtered.filter(d =>
                        equals_ignore_case(d?.call?.transactionHash, call?.transactionHash)
                      ).length > 1 &&
                      data_filtered.filter(d =>
                        equals_ignore_case(d?.call?.transactionHash, call?.transactionHash) &&
                        !d?.gas_paid
                      ).length > 0 ?
                        1 :
                        0
                    )
                    break
                  case 'forecalled':
                    current_step = steps.findIndex(s => s.id === 'forecalled') + 1
                    break
                  case 'approved':
                  case 'executing':
                    current_step = steps.findIndex(s =>
                      s.id === (
                        gas_paid || gas_paid_to_callback ?
                          'approved' :
                          'call'
                      )
                    ) + 1
                    break
                  case 'executed':
                  case 'error':
                    current_step = steps.findIndex(s => s.id === 'executed') +
                      (
                        executed ||
                        (
                          error &&
                          (
                            error?.block_timestamp ||
                            approved?.block_timestamp
                          ) &&
                          moment().diff(moment((error?.block_timestamp || approved.block_timestamp) * 1000), 'seconds') >= 240
                        ) ?
                          1 :
                          0
                      )
                    break
                  default:
                    break
                }

                const forecall_time_spent = total_time_string(
                  call?.block_timestamp,
                  forecalled?.block_timestamp,
                )
                const time_spent = total_time_string(
                  call?.block_timestamp,
                  executed?.block_timestamp,
                )

                return (
                  <div className="min-w-max flex flex-col space-y-0 mb-4">
                    {steps
                      .filter(s => !['refunded'].includes(s.id) || s.data?.receipt?.status)
                      .map((s, i) => {
                        const _error = error &&
                          (
                            error?.block_timestamp ||
                            approved?.block_timestamp
                          ) ?
                            moment().diff(moment((error?.block_timestamp || approved.block_timestamp) * 1000), 'seconds') >= 45 ?
                              error :
                              null :
                            error

                        const text_color = (!['refunded'].includes(s.id) && s.data) ||
                          (['gas_paid'].includes(s.id) && (gas_paid_to_callback || (is_call_from_relayer && approved))) ||
                          (['executed'].includes(s.id) && is_executed) ||
                          (['refunded'].includes(s.id) && s?.data?.receipt?.status) ?
                            'text-green-400 dark:text-green-300' :
                            i === current_step && !['refunded'].includes(s.id) ?
                              'text-yellow-500 dark:text-yellow-400' :
                              (['executed'].includes(s.id) && _error) ||
                              (['refunded'].includes(s.id) && !s?.data?.receipt?.status) ?
                                'text-red-500 dark:text-red-600' :
                                'text-slate-300 dark:text-slate-700'

                        const {
                          explorer,
                        } = { ...s.chain_data }
                        const {
                          url,
                          transaction_path,
                          icon,
                        } = { ...explorer }

                        return (
                          <div
                            key={i}
                            className="flex items-center space-x-1.5 pb-0.5"
                          >
                            {(!['refunded'].includes(s.id) && s.data) ||
                              (['gas_paid'].includes(s.id) && (gas_paid_to_callback || (is_call_from_relayer && approved))) ||
                              (['executed'].includes(s.id) && is_executed) ||
                              (['refunded'].includes(s.id) && s?.data?.receipt?.status) ?
                                <BiCheckCircle
                                  size={20}
                                  className="text-green-400 dark:text-green-300"
                                /> :
                                i === current_step && !['refunded'].includes(s.id) ?
                                  <ProgressBar
                                    borderColor="#ca8a04"
                                    barColor="#facc15"
                                    width="20"
                                    height="20"
                                  /> :
                                  (['executed'].includes(s.id) && _error) ||
                                  (['refunded'].includes(s.id) && !s?.data?.receipt?.status) ?
                                    <BiXCircle
                                      size={20}
                                      className="text-red-500 dark:text-red-600"
                                    /> :
                                    <FiCircle
                                      size={20}
                                      className="text-slate-300 dark:text-slate-700"
                                    />
                            }
                            <div className="flex items-center space-x-1">
                              {s.data?.transactionHash ?
                                <Copy
                                  value={s.data.transactionHash}
                                  title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                    {s.title}
                                  </span>}
                                  size={18}
                                /> :
                                <span className={`uppercase ${text_color} text-xs font-medium`}>
                                  {s.title}
                                </span>
                              }
                              {s.data?.transactionHash && url && (
                                <a
                                  href={`${url}${transaction_path?.replace('{tx}', s.data.transactionHash)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 dark:text-blue-500"
                                >
                                  {icon ?
                                    <Image
                                      src={icon}
                                      className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                    /> :
                                    <TiArrowRight
                                      size={16}
                                      className="transform -rotate-45"
                                    />
                                  }
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })
                    }
                    {is_invalid_call && (
                      <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-semibold py-0.5 px-2">
                        Invalid Call
                      </div>
                    )}
                    {is_insufficient_fee && (
                      <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-semibold py-0.5 px-2">
                        Insufficient Fee
                      </div>
                    )}
                    {forecall_time_spent && (
                      <div className="flex items-center space-x-1 mx-1 pt-0.5">
                        <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-medium">
                          Forecall time:
                        </span>
                        <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium">
                          {forecall_time_spent}
                        </span>
                      </div>
                    )}
                    {time_spent && (
                      <div className="flex items-center space-x-1 mx-1 pt-0.5">
                        <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-medium">
                          Time spent:
                        </span>
                        <span className="whitespace-nowrap font-bold">
                          {time_spent}
                        </span>
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Contract Call Time',
              accessor: 'call.block_timestamp',
              disableSortBy: true,
              Cell: props => {
                const { call, gas_paid, forecalled, approved, executed, error } = { ...props.row.original }
                const updated_at = executed?.block_timestamp || error?.block_timestamp || approved?.block_timestamp || forecalled?.block_timestamp
                return (
                  <div className="space-y-2">
                    <TimeAgo
                      time={props.value * 1000}
                      title="Contract Call Time"
                      className="ml-auto"
                    />
                    {updated_at && (
                      <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg flex flex-col items-end py-1 px-2 ml-auto -mr-1">
                        <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                          Updated at
                        </span>
                        <TimeAgo
                          time={updated_at * 1000}
                          title="Updated Time"
                          className="text-xs ml-auto"
                        />
                      </div>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={data_filtered}
          noPagination={data_filtered.length <= 10 || (!n && !(address || ['/gmp/search'].includes(pathname)))}
          defaultPageSize={n ? 10 : 25}
          className="min-h-full no-border"
        />
        {
          data.length > 0 &&
          (
            typeof total !== 'number' ||
            data.length < total
          ) &&
          (
            !fetching ?
              <button
                onClick={() => {
                  setOffet(data.length)
                  setFetchTrigger(
                    typeof fetchTrigger === 'number' ?
                      true :
                      1
                  )
                }}
                className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-500 font-normal hover:font-medium mx-auto"
              >
                Load more
              </button> :
              <div className="flex justify-center">
                <ColorRing
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              </div>
          )
        }
      </div> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}