import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, providers, utils } from 'ethers'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import { token_sent } from '../../lib/api/gateway'
import { getChain } from '../../lib/object/chain'
import { number_format, name, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [data, setData] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (tx) {
        const response = await token_sent({
          txHash: tx,
        })
        setData({ ...response?.data?.[0] })
      }
    }
    getData()
  }, [tx])

  const {
    event,
    vote,
  } = { ...data }
  const { chain } = { ...event }
  const { sender, destinationChain, destinationAddress, symbol, amount } = { ...event?.returnValues }
  const chains_data = _.concat(
    evm_chains_data,
    cosmos_chains_data,
  )
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
  const asset_data = assets_data?.find(a => equals_ignore_case(a?.symbol, symbol) || a?.contracts?.findIndex(c => c?.chain_id === source_chain_data?.chain_id && equals_ignore_case(c.symbol, symbol)) > -1)
  const source_contract_data = asset_data?.contracts?.find(c => c.chain_id === source_chain_data?.chain_id)
  const decimals = source_contract_data?.decimals || asset_data?.decimals || 18
  const _symbol = source_contract_data?.symbol || asset_data?.symbol || symbol
  const asset_image = source_contract_data?.image || asset_data?.image

  const steps =
    [
      {
        id: 'sent',
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
    ]
    .filter(s => s)
    .map((s, i) => {
      return {
        ...s,
        i,
        finish: !!(
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
    ) + 1

  const detail_steps = steps

  const stepClassName = 'min-h-full bg-white dark:bg-slate-900 rounded-lg space-y-2 py-4 px-5'
  const titleClassName = 'whitespace-nowrap uppercase text-lg font-bold'

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      {data ?
        <div className="grid sm:grid-cols-6 gap-6">
          <div className={`${stepClassName} sm:col-span-6`}>
            <div className={`${titleClassName}`}>
              Send Token
            </div>
            {Object.keys(data).length > 0 ?
              <div className="overflow-x-auto flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex flex-col space-y-4">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Method
                  </div>
                  <div className="space-y-1.5">
                    <div className="max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg text-xs lg:text-sm font-semibold py-0.5 px-1.5">
                      {event?.event === 'TokenSent' ?
                        'sendToken' :
                        event?.event ||
                        '-'
                      }
                    </div>
                    {amount && _symbol && (
                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                        {asset_image && (
                          <Image
                            src={asset_image}
                            className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                          />
                        )}
                        <span className="text-base sm:text-sm lg:text-base font-semibold">
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
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Source
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {source_chain_data?.image && (
                      <Image
                        src={source_chain_data.image}
                        className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                      />
                    )}
                    <span className="text-base sm:text-sm lg:text-base font-bold">
                      {source_chain_data?.name || chain}
                    </span>
                  </div>
                  {sender && (
                    <div className="flex flex-col">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Sender address
                      </span>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', sender)}`}
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
                                  {ellipse(sender, 8, source_chain_data?.prefix_address)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(sender, 12, source_chain_data?.prefix_address)}
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
                <div className="flex flex-col space-y-2">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Destination
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {destination_chain_data?.image && (
                      <Image
                        src={destination_chain_data.image}
                        className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                      />
                    )}
                    <span className="text-base sm:text-sm lg:text-base font-bold">
                      {destination_chain_data?.name || destinationChain}
                    </span>
                  </div>
                  {destinationAddress && (
                    <div className="flex flex-col">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Recipient address
                      </span>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', destinationAddress)}`}
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
                                  {ellipse(destinationAddress, 8, destination_chain_data?.prefix_address)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(destinationAddress, 12, destination_chain_data?.prefix_address)}
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
                <div className="min-w-max flex flex-col space-y-0">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold pt-0.5 pb-1 px-2">
                    Status
                  </div>
                  {steps.map((s, i) => {
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
                                className="text-blue-600 dark:text-white"
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
                  })}
                </div>
              </div> :
              <span className="text-slate-400 dark:text-slate-200 text-base font-semibold">
                Data not found
              </span>
            }
          </div>
          {
            Object.keys(data).length > 0 &&
            detail_steps
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
                const {
                  explorer,
                } = { ...chain_data }
                const {
                  url,
                  transaction_path,
                  block_path,
                  address_path,
                  icon,
                } = { ...explorer }
                const {
                  id,
                  blockNumber,
                  type,
                  status,
                  chain,
                  created_at,
                  block_timestamp,
                  receipt,
                } = { ...data }
                let {
                  height,
                } = { ...data }

                height =
                  blockNumber ||
                  height

                const _id = data?.[id_field]

                const _data = data

                const {
                  contract_address,
                  returnValues,
                  transaction,
                } = { ..._data }
                const {
                  sender,
                  destinationAddress,
                } = { ...returnValues }

                const source_chain = chain
                const destination_chain = returnValues?.destinationChain
                const source_chain_data =
                  getChain(
                    source_chain,
                    chains_data,
                  )
                const destination_chain_data =
                  getChain(
                    destination_chain,
                    chains_data,
                  )

                const from =
                  sender ||
                  receipt?.from ||
                  transaction?.from

                const to = contract_address

                let _path =
                  (path || '')
                    .replace(
                      '{id}',
                      _id,
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

                const time = block_timestamp ?
                  block_timestamp * 1000 :
                  created_at?.ms

                const rowClassName = 'flex flex-col space-y-1'
                const rowTitleClassName = `text-black dark:text-slate-300 text-sm lg:text-base font-bold`

                return (
                  <div
                    key={i}
                    className={`${stepClassName} sm:col-span-3 lg:col-span-2`}
                  >
                    <div className={`${titleClassName}`}>
                      {title}
                    </div>
                    <div className="flex flex-col space-y-3">
                      {_id ?
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Transaction:
                          </span>
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              <div className="font-bold">
                                <span className="xl:hidden">
                                  {ellipse(
                                    _id,
                                    12,
                                  )}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(
                                    _id,
                                    16,
                                  )}
                                </span>
                              </div>
                            </a>
                            <Copy
                              value={_id}
                            />
                            <a
                              href={`${url}${_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
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
                          </div>
                        </div> :
                        <ColorRing
                          color={loader_color(theme)}
                          width="32"
                          height="32"
                        />
                      }
                      {
                        height &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Block:
                            </span>
                            <div className="flex items-center space-x-1">
                              <a
                                href={`${url}${block_path?.replace('{block}', height)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white font-bold"
                              >
                                {number_format(
                                  height,
                                  '0,0',
                                )}
                              </a>
                            </div>
                          </div>
                        )
                      }
                      {
                        type &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Type:
                            </span>
                            <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg capitalize text-sm lg:text-base font-semibold py-0.5 px-2">
                              {name(type)}
                            </div>
                          </div>
                        )
                      }
                      {
                        _data &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Status:
                            </span>
                            <div className={`${status === 'success' || receipt?.status ? 'text-green-400 dark:text-green-300' : 'text-red-500 dark:text-red-600'} uppercase flex items-center text-sm lg:text-base font-bold space-x-1`}>
                              {
                                status === 'success' ||
                                receipt?.status ?
                                  <BiCheckCircle
                                    size={20}
                                  /> :
                                  <BiXCircle
                                    size={20}
                                  />
                              }
                              <span>
                                {status ?
                                  status :
                                  receipt?.status ?
                                    'Success' :
                                    'Error'
                              }
                              </span>
                            </div>
                          </div>
                        )
                      }
                      {
                        time &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Time:
                            </span>
                            <span className="whitespace-pre-wrap text-slate-400 dark:text-slate-600 font-medium">
                              {
                                moment(time)
                                  .fromNow()
                              } ({
                                moment(time)
                                  .format('MMM D, YYYY h:mm:ss A')
                              })
                            </span>
                          </div>
                        )
                      }
                      {to && (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Gateway:
                          </span>
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', to)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              <EnsProfile
                                address={to}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-600 dark:text-white text-sm font-bold">
                                    <span className="xl:hidden">
                                      {ellipse(to, 10, chain_data?.prefix_address)}
                                    </span>
                                    <span className="hidden xl:block">
                                      {ellipse(to, 12, chain_data?.prefix_address)}
                                    </span>
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={to}
                              size={18}
                            />
                            <a
                              href={`${url}${address_path?.replace('{address}', to)}`}
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
                          </div>
                        </div>
                      )}
                      {from && (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Sender:
                          </span>
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', from)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              <EnsProfile
                                address={from}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-600 dark:text-white text-sm font-bold">
                                    <span className="xl:hidden">
                                      {ellipse(from, 10, chain_data?.prefix_address)}
                                    </span>
                                    <span className="hidden xl:block">
                                      {ellipse(from, 12, chain_data?.prefix_address)}
                                    </span>
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={from}
                              size={18}
                            />
                            <a
                              href={`${url}${address_path?.replace('{address}', from)}`}
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
                          </div>
                        </div>
                      )}
                      {destinationAddress && (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Recipient:
                          </span>
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', destinationAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              <EnsProfile
                                address={destinationAddress}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-600 dark:text-white text-sm font-bold">
                                    <span className="xl:hidden">
                                      {ellipse(destinationAddress, 10, destination_chain_data?.prefix_address)}
                                    </span>
                                    <span className="hidden xl:block">
                                      {ellipse(destinationAddress, 12, destination_chain_data?.prefix_address)}
                                    </span>
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={destinationAddress}
                              size={18}
                            />
                            {destination_chain_data?.explorer?.url && (
                              <a
                                href={`${destination_chain_data.explorer.url}${destination_chain_data.explorer.address_path?.replace('{address}', destinationAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {destination_chain_data.explorer.icon ?
                                  <Image
                                    src={destination_chain_data.explorer.icon}
                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={16} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
          }
        </div> :
        <ProgressBar
          borderColor={loader_color(theme)}
          width="36"
          height="36"
        />
      }
    </div>
  )
}