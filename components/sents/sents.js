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
import { token_sent } from '../../lib/api/gateway'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, total_time_string, params_to_obj, loader_color } from '../../lib/utils'

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
            fromTime = time[0]
              .unix()
            toTime = time[1]
              .unix()
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
                        {destinationAddress.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', destinationAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={destinationAddress}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(
                                      destinationAddress,
                                      12,
                                      prefix_address,
                                    )}
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={destinationAddress}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={destinationAddress}
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
              accessor: 'event.receipt.status',
              disableSortBy: true,
              Cell: props => {
                const {
                  event,
                  vote,
                  sign_batch,
                  ibc_send,
                  axelar_transfer,
                } = { ...props.row.original }
                const {
                  chain,
                  returnValues,
                  amount,
                  fee,
                  insufficient_fee,
                } = { ...event }
                const {
                  destinationChain,
                } = { ...returnValues }

                const source_chain_data =
                  getChain(
                    chain,
                    chains_data,
                  )
                const destination_chain_data =
                  getChain(
                    destinationChain,
                    chains_data,
                  )
                const axelar_chain_data =
                  getChain(
                    'axelarnet',
                    chains_data,
                  )

                const steps =
                  [
                    {
                      id: 'send',
                      title: 'Send Token',
                      chain_data: source_chain_data,
                      data: event,
                      id_field: 'transactionHash',
                    },
                    {
                      id: 'vote',
                      title: 'Approved',
                      chain_data: axelar_chain_data,
                      data: vote,
                      id_field: 'poll_id',
                      path: '/evm-poll/{id}',
                    },
                    (evm_chains_data || [])
                      .findIndex(c =>
                        c?.id === destination_chain_data?.id
                      ) > -1 &&
                    {
                      id: 'sign_batch',
                      title: 'Signed',
                      chain_data: axelar_chain_data,
                      data: sign_batch,
                      id_field: 'batch_id',
                      path: '/batch/{chain}/{id}',
                      params: {
                        chain: destination_chain_data?.id,
                      },
                    },
                    (evm_chains_data || [])
                      .findIndex(c =>
                        c?.id === destination_chain_data?.id
                      ) > -1 &&
                    {
                      id: 'executed',
                      title: 'Received',
                      ...(
                        sign_batch?.transactionHash ?
                          {
                            chain_data: destination_chain_data,
                            id_field: 'transactionHash',
                          } :
                          {
                            chain_data: axelar_chain_data,
                            id_field: 'batch_id',
                            path: '/batch/{chain}/{id}',
                            params: {
                              chain: destination_chain_data?.id,
                            },
                          },
                      ),
                      data: sign_batch,
                    },
                    (cosmos_chains_data || [])
                      .filter(c =>
                        c?.id !== 'axelarnet'
                      )
                      .findIndex(c =>
                        c?.id === destination_chain_data?.id ||
                        destination_chain_data?.overrides?.[c?.id]
                      ) > -1 &&
                    {
                      id: 'ibc_send',
                      title: 'Received',
                      chain_data: ibc_send?.recv_txhash ?
                        destination_chain_data :
                        axelar_chain_data,
                      data: ibc_send,
                      id_field: ibc_send?.ack_txhash ?
                        'ack_txhash' :
                        ibc_send?.failed_txhash ?
                          'failed_txhash' :
                          ibc_send?.recv_txhash ?
                            'recv_txhash' :
                            'id',
                    },
                    [
                      axelar_chain_data,
                    ].findIndex(c =>
                      c?.id === destination_chain_data?.id ||
                      destination_chain_data?.overrides?.[c?.id]
                    ) > -1 &&
                    {
                      id: 'axelar_transfer',
                      title: 'Received',
                      chain_data: axelar_chain_data,
                      data: axelar_transfer,
                      id_field: 'id',
                    },
                  ]
                  .filter(s => s)
                  .map((s, i) => {
                    return {
                      ...s,
                      i,
                      finish: !!(
                        s.id === 'executed' ?
                          s.data?.executed :
                          s.id === 'ibc_send' ?
                            s.data?.ack_txhash ||
                            (
                              s.data?.recv_txhash &&
                              !s.data.failed_txhash
                            ) :
                            s.data
                      ),
                    }
                  })

                const current_step = steps.findIndex(s => s.finish) < 0 ?
                  -1 :
                  (
                    _.maxBy(
                      steps.filter(s => s.finish),
                      'i',
                    )?.i ||
                    0
                  ) +
                  (
                    !insufficient_fee &&
                    (
                      amount > fee ||
                      !fee
                    ) &&
                    (
                      ibc_send?.ack_txhash ||
                      !ibc_send?.failed_txhash
                    ) ?
                      1 :
                      0
                  )

                const time_spent = _.last(steps)?.finish &&
                  total_time_string(
                    _.head(steps)?.data?.created_at?.ms / 1000,
                    _.last(steps)?.data?.block_timestamp ||
                    (_.last(steps)?.data?.received_at?.ms / 1000) ||
                    (_.last(steps)?.data?.created_at?.ms / 1000),
                  )

                return (
                  <div className="min-w-max flex flex-col space-y-0 mb-4">
                    {steps
                      .map((s, i) => {
                        const {
                          title,
                          chain_data,
                          data,
                          id_field,
                          path,
                          params,
                          finish,
                        } = { ...s }

                        const id = data?.[id_field]

                        const {
                          explorer,
                        } = { ...chain_data }
                        const {
                          url,
                          transaction_path,
                          icon,
                        } = { ...explorer }
                        const {
                          receipt,
                        } = { ...data }

                        let _path =
                          (path || '')
                            .replace(
                              '{id}',
                              id,
                            ) ||
                          (transaction_path || '')
                            .replace(
                              '{tx}',
                              id,
                            )

                        Object.entries({ ...params })
                          .forEach(([k, v]) => {
                            _path =
                              (_path || '')
                                .replace(
                                  `{${k}}`,
                                  v,
                                )
                          })

                        const text_color =
                          finish &&
                          receipt?.status !== 0 ?
                            'text-green-400 dark:text-green-300' :
                            i === current_step ?
                              'text-yellow-500 dark:text-yellow-400' :
                              data?.status === 'failed' ||
                              receipt?.status === 0 ?
                                'text-red-500 dark:text-red-600' :
                                'text-slate-300 dark:text-slate-700'

                        return (
                          <div
                            key={i}
                            className="flex items-center space-x-1.5 pb-0.5"
                          >
                            {
                              finish &&
                              receipt?.status !== 0 ?
                                <BiCheckCircle
                                  size={20}
                                  className="text-green-400 dark:text-green-300"
                                /> :
                                i === current_step ?
                                  <ProgressBar
                                    borderColor="#ca8a04"
                                    barColor="#facc15"
                                    width="20"
                                    height="20"
                                  /> :
                                  data?.status === 'failed' ||
                                  receipt?.status === 0 ?
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
                              {id ?
                                <Copy
                                  value={id}
                                  title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                    {title}
                                  </span>}
                                /> :
                                <span className={`uppercase ${text_color} text-xs font-medium`}>
                                  {title}
                                </span>
                              }
                              {
                                id &&
                                url &&
                                (
                                  <a
                                    href={`${url}${_path}`}
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
                                )
                              }
                            </div>
                          </div>
                        )
                      })
                    }
                    {
                      ibc_send?.failed_txhash &&
                      !ibc_send.ack_txhash
                      (
                        <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-medium py-0.5 px-2">
                          Timeout
                        </div>
                      )
                    }
                    {
                      time_spent &&
                      (
                        <div className="flex items-center space-x-1 mx-1 pt-0.5">
                          <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-medium">
                            Time spent:
                          </span>
                          <span className="whitespace-nowrap font-bold">
                            {time_spent}
                          </span>
                        </div>
                      )
                    }
                  </div>
                )
              },
            },
            {
              Header: 'Created at',
              accessor: 'event.created_at.ms',
              disableSortBy: true,
              Cell: props => (
                <TimeAgo
                  time={props.value}
                  title="Created Time"
                  className="ml-auto"
                />
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={data}
          noPagination={
            data.length <= 10 ||
            (
              !n &&
              !(
                address ||
                [
                  '/sent/search',
                ].includes(pathname)
              )
            )
          }
          defaultPageSize={
            n ?
              10 :
              25
          }
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