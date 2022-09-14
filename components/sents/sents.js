import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { ProgressBar, ColorRing, Puff } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { token_sent } from '../../lib/api/gateway'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 100

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

  useEffect(() => {
    if (
      evm_chains_data &&
      cosmos_chains_data &&
      asPath
    ) {
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
        senderAddress,
        recipientAddress,
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
        senderAddress,
        recipientAddress,
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
      (address || ['/sent/search'].includes(pathname) ? 3 : 0.25) * 60 * 1000,
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
        const _data = !fetchTrigger ?
          [] :
          data || []
        const size = n ||
          LIMIT
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
            senderAddress,
            recipientAddress,
            time,
          } = { ...filters }

          let fromTime,
            toTime

          if (time?.length > 1) {
            fromTime = time[0].unix()
            toTime = time[1].unix()
          }

          params = {
            txHash,
            sourceChain,
            destinationChain,
            senderAddress,
            recipientAddress,
            fromTime,
            toTime,
          }
        }
        const response = await token_sent(
          {
            ...params,
            size,
            from,
          },
        )

        const {
          data,
          total,
        } = { ...response }

        if (response) {
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
              'event.transactionHash',
            ),
            ['event.block_timestamp'],
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

  const chains_data = _.concat(
    evm_chains_data,
    cosmos_chains_data,
  )

  return (
    data ?
      <div className="min-h-full grid gap-2 mt-2">
        <div className="flex items-center justify-between space-x-2 -mt-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold">
              {number_format(total, '0,0')}
            </span>
            <span className="text-base">
              Results
            </span>
          </div>
        </div>
        <Datatable
          columns={[
            {
              Header: 'Tx Hash',
              accessor: 'event.transactionHash',
              disableSortBy: true,
              Cell: props => {
                const { event } = { ...props.row.original }
                const { chain } = { ...event }
                const chain_data = getChain(chain, chains_data)
                const { explorer } = { ...chain_data }
                const { url, transaction_path, icon } = { ...explorer }
                return (
                  <div className="flex items-center space-x-1">
                    <Link href={`/sent/${props.value}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-white font-bold"
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
              accessor: 'event.event',
              disableSortBy: true,
              Cell: props => {
                const { event } = { ...props.row.original }
                const { chain, returnValues } = { ...event }
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
                      {props.value === 'TokenSent' ?
                        'sendToken' :
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
                  </div>
                )
              },
            },
            {
              Header: 'Source',
              accessor: 'event.chain',
              disableSortBy: true,
              Cell: props => {
                const { event } = { ...props.row.original }
                const { returnValues, transaction } = { ...event }
                const { sender } = { ...returnValues }
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
                    {sender && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Sender address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', sender)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={sender}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(sender, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(sender, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={sender}
                            size={18}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Destination',
              accessor: 'event.returnValues.destinationChain',
              disableSortBy: true,
              Cell: props => {
                const { event } = { ...props.row.original }
                const { returnValues } = { ...event }
                const { destinationAddress } = { ...returnValues }
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
                    {destinationAddress && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Recipient address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', destinationAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={destinationAddress}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(destinationAddress, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(destinationAddress, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={destinationAddress}
                            size={18}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Status',
              accessor: 'event.receipt.status',
              disableSortBy: true,
              Cell: props => {
                const { event } = { ...props.row.original }
                const { chain, returnValues } = { ...event }
                const { destinationChain } = { ...returnValues }
                const source_chain_data = getChain(chain, chains_data)
                const destination_chain_data = getChain(destinationChain, chains_data)
                const steps = [{
                  id: 'send',
                  title: 'Send Token',
                  chain_data: source_chain_data,
                  data: event,
                }].filter(s => s)
                let current_step
                switch (props.value) {
                  case 0:
                  case 1:
                    current_step = 1
                    break
                  default:
                    current_step = 0
                    break
                }
                return (
                  <div className="min-w-max flex flex-col space-y-1 mb-4">
                    {steps.map((s, i) => {
                      const text_color = s?.data?.receipt?.status ?
                        'text-green-400 dark:text-green-300' :
                        i === current_step ?
                          'text-blue-500 dark:text-white' :
                          s?.data?.receipt && !s.data.receipt.status ?
                            'text-red-500 dark:text-red-600' :
                            'text-slate-400 dark:text-slate-600'
                      const { explorer } = { ...s.chain_data }
                      const { url, transaction_path, icon } = { ...explorer }
                      return (
                        <div
                          key={i}
                          className="flex items-center space-x-1.5 pb-0.5"
                        >
                          {s?.data?.receipt?.status ?
                            <BiCheckCircle size={20} className="text-green-400 dark:text-green-300" /> :
                            i === current_step ?
                              <Puff color={loader_color(theme)} width="20" height="20" /> :
                              s?.data?.receipt && !s.data.receipt.status ?
                                <BiXCircle size={20} className="text-red-500 dark:text-red-600" /> :
                                <FiCircle size={20} className="text-slate-400 dark:text-slate-600" />
                          }
                          <div className="flex items-center space-x-1">
                            {s.data?.transactionHash ?
                              <Copy
                                value={s.data.transactionHash}
                                title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                  {s.title}
                                </span>}
                                size={18}
                              />
                              :
                              <span className={`uppercase ${text_color} text-xs font-medium`}>
                                {s.title}
                              </span>
                            }
                            {s.data?.transactionHash && url && (
                              <a
                                href={`${url}${transaction_path?.replace('{tx}', s.data.transactionHash)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
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
                        </div>
                      )
                    })}
                  </div>
                )
              },
            },
            {
              Header: 'Time',
              accessor: 'event.block_timestamp',
              disableSortBy: true,
              Cell: props => {
                return (
                  <div className="space-y-2">
                    <TimeAgo
                      time={props.value * 1000}
                      title="Time"
                      className="ml-auto"
                    />
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={data}
          noPagination={data.length <= 10 || (!n && !(address || ['/sent/search'].includes(pathname)))}
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
              <div className="flex justify-center p-1.5">
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
        color={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}