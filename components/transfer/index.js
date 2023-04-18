import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { utils } from 'ethers'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { BiCheckCircle, BiXCircle, BiCircle, BiTime } from 'react-icons/bi'
import { TiArrowRight } from 'react-icons/ti'

import EnsProfile from '../ens-profile'
import AccountProfile from '../account-profile'
import Image from '../image'
import Copy from '../copy'
import { transactions_by_events, getTransaction } from '../../lib/api/lcd'
import { transfers as getTransfers, transfers_status as getTransfersStatus } from '../../lib/api/transfer'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { type as getType } from '../../lib/object/id'
import { number_format, name, ellipse, equalsIgnoreCase, total_time_string, loader_color, sleep } from '../../lib/utils'

export default () => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    tx,
    transfer_id,
  } = { ...query }

  const [transfer, setTransfer] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (tx && assets_data) {
          const response =
            await getTransfers(
              {
                txHash: tx,
                size: 1,
              },
            )

          let data = _.head(response?.data)

          const {
            send,
            link,
            confirm,
            vote,
            command,
            ibc_send,
            axelar_transfer,
            unwrap,
          } = { ...data }

          const {
            source_chain,
            destination_chain,
            amount,
            value,
            fee,
            insufficient_fee,
          } = { ...send }
          let {
            recipient_address,
          } = { ...send }

          recipient_address = link?.deposit_address || recipient_address

          let _response

          if (
            (
              !link?.recipient_address || !confirm ||
              (!command?.executed && (evm_chains_data || []).findIndex(c => equalsIgnoreCase(c?.id, destination_chain)) > -1)
            ) &&
            (recipient_address?.length >= 65 || getType(recipient_address) === 'evm_address')
          ) {
            if (recipient_address) {
              switch (getType(recipient_address)) {
                case 'account':
                  _response =
                    await transactions_by_events(
                      `transfer.sender='${recipient_address}'`,
                      _response?.data,
                      true,
                      assets_data,
                    )

                  _response =
                    await transactions_by_events(
                      `message.sender='${recipient_address}'`,
                      _response?.data,
                      true,
                      assets_data,
                    )
                  break
                case 'evm_address':
                  recipient_address = utils.getAddress(recipient_address)
                  break
                default:
                  break
              }

              _response =
                await transactions_by_events(
                  `link.depositAddress='${recipient_address}'`,
                  _response?.data,
                  true,
                  assets_data,
                )

              _response =
                await transactions_by_events(
                  `transfer.recipient='${recipient_address}'`,
                  _response?.data,
                  true,
                  assets_data,
                )
            }

            if (
              (
                !link?.recipient_address ||
                (!command?.executed && (evm_chains_data || []).findIndex(c => equalsIgnoreCase(c?.id, destination_chain)) > -1)
              ) &&
              confirm?.txhash
            ) {
              _response = {
                ..._response,
                data:
                  _.uniqBy(
                    _.concat(
                      _response?.data || [],
                      {
                        txhash: confirm.txhash,
                      },
                    ),
                    'txhash',
                  ),
              }
            }

            if (
              !command?.executed && vote?.txhash &&
              (evm_chains_data || []).findIndex(c => equalsIgnoreCase(c?.id, destination_chain)) > -1
            ) {
              _response = {
                ..._response,
                data:
                  _.uniqBy(
                    _.concat(
                      _response?.data || [],
                      {
                        txhash: vote.txhash,
                      },
                    ),
                    'txhash',
                  ),
              }
            }

            if (_response?.data?.length > 0) {
              _response.data.forEach(d => getTransaction(d?.txhash))

              await sleep(2 * 1000)

              _response =
                await getTransfers(
                  {
                    txHash: tx,
                    size: 1,
                  },
                )

              data = _.head(_response?.data) || data
            }
          }

          if (
            !(
              source_chain && destination_chain &&
              typeof amount === 'number' && typeof value === 'number' && typeof fee === 'number'
            ) ||
            (
              (evm_chains_data || []).findIndex(c => equalsIgnoreCase(c?.id, destination_chain)) > -1 &&
              !insufficient_fee && (vote || confirm) && !command?.executed
            ) ||
            (
              (cosmos_chains_data || []).findIndex(c => equalsIgnoreCase(c?.id, destination_chain)) > -1 &&
              !['axelarnet'].includes(destination_chain) &&
              !insufficient_fee && (vote || confirm) &&
              !(ibc_send?.failed_txhash || ibc_send?.ack_txhash || ibc_send?.recv_txhash)
            ) ||
            (
              ['axelarnet'].includes(destination_chain) &&
              !insufficient_fee && !axelar_transfer
            ) ||
            !(vote?.transfer_id || confirm?.transfer_id) ||
            (unwrap && !unwrap.tx_hash_unwrap) ||
            (
              (evm_chains_data || []).findIndex(c => equalsIgnoreCase(c?.id, source_chain)) > -1 &&
              !insufficient_fee && !vote &&
              (command || ibc_send || axelar_transfer)
            )
          ) {
            await getTransfersStatus(
              {
                txHash: send?.txhash || tx,
                sourceChain: source_chain,
              },
            )

            await sleep(2 * 1000)

            _response =
              await getTransfers(
                {
                  txHash: tx,
                  size: 1,
                },
              )

            data = _.head(_response?.data) || data
          }

          if (response || data) {
            setTransfer(
              {
                data,
                tx,
              }
            )
          }
        }
        else if (transfer_id) {
          const response =
            await getTransfers(
              {
                transferId: transfer_id,
                size: 1,
              },
            )

          const {
            send,
          } = { ..._.head(response?.data) }

          const {
            txhash,
          } = { ...send }

          if (txhash) {
            router.push(`/transfer/${txhash}`)
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          0.5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [tx, transfer_id, assets_data],
  )

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

  const {
    data,
  } = { ...transfer }

  const {
    send,
    link,
    confirm,
    vote,
    command,
    ibc_send,
    axelar_transfer,
    wrap,
    unwrap,
    erc20_transfer,
  } = { ...data }
  let {
    type,
  } = { ...data }

  type = data ? wrap ? 'wrap' : unwrap ? 'unwrap' : erc20_transfer ? 'erc20_transfer' : type || 'deposit_address' : type

  const {
    source_chain,
    denom,
    amount,
    fee,
    insufficient_fee,
    status,
  } = { ...send }
  let {
    destination_chain,
    sender_address,
  } = { ...send }

  destination_chain = unwrap?.destination_chain || destination_chain || link?.destination_chain
  sender_address = wrap?.sender_address || erc20_transfer?.sender_address || sender_address

  let {
    original_source_chain,
    original_destination_chain,
    deposit_address,
    recipient_address,
  } = { ...link }

  original_source_chain = send?.original_source_chain || original_source_chain
  original_destination_chain = send?.original_destination_chain || original_destination_chain
  deposit_address = wrap?.deposit_address || unwrap?.deposit_address_link || erc20_transfer?.deposit_address || send?.recipient_address || deposit_address
  recipient_address = unwrap?.recipient_address || recipient_address

  const source_chain_data = getChain(original_source_chain, chains_data) || getChain(source_chain, chains_data)
  const destination_chain_data = getChain(original_destination_chain, chains_data) || getChain(destination_chain, chains_data)
  const axelar_chain_data = getChain('axelarnet', chains_data)
  const deposit_chain_data = getChain(deposit_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? axelar_chain_data?.id : original_source_chain || source_chain, chains_data)
  const asset_data = getAsset(denom, assets_data)

  const {
    contracts,
    ibc,
  } = { ...asset_data }

  const contract_data = (contracts || []).find(c => c?.chain_id === source_chain_data?.chain_id)
  const ibc_data = (ibc || []).find(c => c?.chain_id === source_chain_data?.id)

  let symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom
  let image = contract_data?.image || ibc_data?.image || asset_data?.image

  if (['wrap', 'unwrap'].includes(type) || wrap || unwrap) {
    if (['W', 'axlW'].findIndex(p => symbol?.startsWith(p)) > -1) {
      symbol = symbol.substring(symbol.indexOf('W') + 1)

      if (image) {
        image = image.split('/').map(p => p.substring(p?.includes('.') && p.startsWith('w') ? 1 : 0)).join('/')
      }
    }
  }

  const steps = [
    ['deposit_address'].includes(type) &&
    {
      id: 'link',
      title: 'Linked',
      chain_data: axelar_chain_data,
      data: link,
      id_field: 'txhash',
    },
    {
      id: 'send',
      title: 'Sent',
      chain_data: source_chain_data,
      data: type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send,
      id_field: 'txhash',
    },
    ['wrap'].includes(type) &&
    {
      id: 'wrap',
      title: 'Wrapped',
      chain_data: source_chain_data,
      data: send,
      // id_field: 'tx_hash_wrap',
      id_field: 'txhash',
    },
    ['erc20_transfer'].includes(type) &&
    {
      id: 'erc20_transfer',
      title: 'ERC20 Transferred',
      chain_data: source_chain_data,
      data: send,
      // id_field: 'tx_hash_transfer',
      id_field: 'txhash',
    },
    !['send_token', 'wrap', 'erc20_transfer'].includes(type) &&
    {
      id: 'confirm',
      title: 'Confirmed',
      chain_data: axelar_chain_data,
      data: confirm,
      id_field: 'txhash',
    },
    (evm_chains_data || []).findIndex(c => c?.id === source_chain_data?.id) > -1 &&
    {
      id: 'vote',
      title: 'Approved',
      chain_data: axelar_chain_data,
      data: vote,
      id_field: 'poll_id',
      path: '/evm-poll/{id}',
    },
    (evm_chains_data || []).findIndex(c => c?.id === destination_chain_data?.id) > -1 &&
    {
      id: 'command',
      title: 'Received',
      data: command,
      ...(
        command?.transactionHash ?
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
    },
    (cosmos_chains_data || []).filter(c => c?.id !== axelar_chain_data.id).findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
    {
      id: 'ibc_send',
      title: 'Received',
      chain_data: ibc_send?.recv_txhash ? destination_chain_data : axelar_chain_data,
      data: ibc_send,
      id_field: ibc_send?.recv_txhash ? 'recv_txhash' : ibc_send?.ack_txhash ? 'ack_txhash' : ibc_send?.failed_txhash ? 'failed_txhash' : 'txhash',
    },
    [axelar_chain_data].findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
    {
      id: 'axelar_transfer',
      title: 'Received',
      chain_data: axelar_chain_data,
      data: axelar_transfer,
      id_field: 'txhash',
    },
    ['unwrap'].includes(type) &&
    {
      id: 'unwrap',
      title: 'Unwrapped',
      chain_data: destination_chain_data,
      data: unwrap,
      id_field: 'tx_hash_unwrap',
      // id_field: 'txhash',
    },
  ]
  .filter(s => s)
  .map((s, i) => {
    const {
      id,
      data,
    } = { ...s }

    return {
      ...s,
      i,
      finish:
        !!(
          id === 'command' ?
            data?.executed || data?.transactionHash :
            id === 'ibc_send' ?
              data?.ack_txhash || (data?.recv_txhash && !data.failed_txhash) :
              id === 'send' ?
                status !== 'failed' :
                id === 'unwrap' ?
                  data?.tx_hash_unwrap :
                  data
        ),
    }
  })

  const current_step =
    steps.findIndex(s => s.finish) < 0 ?
      -1 :
      (_.maxBy(steps.filter(s => s.finish), 'i')?.i || 0) +
      (!insufficient_fee && status !== 'failed' && (amount > fee || !fee) && (ibc_send?.ack_txhash || !ibc_send?.failed_txhash) ? 1 : 0)

  const detail_steps = _.slice(steps, 0, current_step > -1 ? steps.length : 1)

  const time_spent =
    _.last(steps)?.finish &&
    total_time_string(
      steps.find(s => s?.id === 'send')?.data?.created_at?.ms / 1000,
      _.last(steps)?.data?.block_timestamp || (_.last(steps)?.data?.received_at?.ms / 1000) || (_.last(steps)?.data?.created_at?.ms / 1000),
    )

  const stepClassName = 'min-h-full bg-white dark:bg-slate-900 dark:bg-opacity-75 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 py-6 px-5'
  const titleClassName = 'w-fit bg-slate-100 dark:bg-slate-800 bg-opacity-75 dark:bg-opacity-75 rounded whitespace-nowrap uppercase text-base font-semibold py-1 px-2'

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      {tx && equalsIgnoreCase(transfer?.tx, tx) ?
        <div className="grid sm:grid-cols-6 gap-6">
          <div className={`${stepClassName} sm:col-span-6`}>
            {
              type &&
              (
                <div className={`${titleClassName}`}>
                  {['deposit_address', 'send_token', 'wrap', 'unwrap', 'erc20_transfer'].includes(type) ?
                    <span className="normal-case">
                      Transfer via {['wrap', 'unwrap', 'erc20_transfer'].includes(type) ? 'Deposit Service' : name(type)}
                    </span> :
                    type
                  }
                </div>
              )
            }
            {data ?
              <div className="overflow-x-auto flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex flex-col space-y-3">
                  <div className="text-lg font-bold">
                    Source
                  </div>
                  <div className="h-8 sm:h-6 lg:h-8 flex items-center space-x-3 sm:space-x-2 lg:space-x-3">
                    {
                      source_chain_data?.image &&
                      (
                        <Image
                          src={source_chain_data.image}
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )
                    }
                    <span className="text-base sm:text-sm lg:text-lg font-semibold">
                      {source_chain_data?.name || source_chain}
                    </span>
                  </div>
                  {
                    sender_address &&
                    (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-200 font-medium">
                          Sender address
                        </span>
                        {sender_address.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', sender_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={sender_address}
                                no_copy={true}
                                fallback={
                                  <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(sender_address, 12, source_chain_data?.prefix_address)}
                                  </div>
                                }
                              />
                            </a>
                            <Copy
                              value={sender_address}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={sender_address}
                              prefix={source_chain_data?.prefix_address}
                            />
                          </div>
                        }
                      </div>
                    )
                  }
                </div>
                <div className="flex flex-col space-y-3">
                  <div className="text-lg font-bold">
                    Asset
                  </div>
                  {
                    typeof amount === 'number' &&
                    (
                      <div className="flex items-center space-x-3 sm:space-x-2 lg:space-x-3">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                            />
                          )
                        }
                        <div className="flex flex-col">
                          <span className="text-base sm:text-sm lg:text-xs font-semibold">
                            <span className="mr-1">
                              {number_format(amount, '0,0.000', true)}
                            </span>
                            <span>
                              {ellipse(symbol)}
                            </span>
                          </span>
                          {
                            fee > 0 &&
                            (
                              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                                (
                                <span className="mr-1">
                                  Fee:
                                </span>
                                <span>
                                  {number_format(fee, '0,0.000000', true)}
                                </span>
                                )
                              </span>
                            )
                          }
                        </div>
                      </div>
                    )
                  }
                  {
                    deposit_address &&
                    (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-200 font-medium">
                          {['send_token'].includes(type) ? 'Gateway address' : ['wrap', 'erc20_transfer'].includes(type) ? 'Contract address' : 'Deposit address'}
                        </span>
                        {deposit_address.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${deposit_chain_data?.explorer?.url}${deposit_chain_data?.explorer?.address_path?.replace('{address}', deposit_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={deposit_address}
                                no_copy={true}
                                fallback={
                                  <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(deposit_address, 12, deposit_chain_data?.prefix_address)}
                                  </div>
                                }
                              />
                            </a>
                            <Copy
                              value={deposit_address}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={deposit_address}
                              prefix={deposit_chain_data?.prefix_address}
                            />
                          </div>
                        }
                      </div>
                    )
                  }
                </div>
                <div className="flex flex-col space-y-3">
                  <div className="text-lg font-bold">
                    Destination
                  </div>
                  <div className="h-8 sm:h-6 lg:h-8 flex items-center space-x-3 sm:space-x-2 lg:space-x-3">
                    {
                      destination_chain_data?.image &&
                      (
                        <Image
                          src={destination_chain_data.image}
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )
                    }
                    <span className="text-base sm:text-sm lg:text-lg font-semibold">
                      {destination_chain_data?.name || destination_chain}
                    </span>
                  </div>
                  {
                    recipient_address &&
                    (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-200 font-medium">
                          Recipient address
                        </span>
                        {recipient_address.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', recipient_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={recipient_address}
                                no_copy={true}
                                fallback={
                                  <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(recipient_address, 12, destination_chain_data?.prefix_address)}
                                  </div>
                                }
                              />
                            </a>
                            <Copy
                              value={recipient_address}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={recipient_address}
                              prefix={destination_chain_data?.prefix_address}
                            />
                          </div>
                        }
                      </div>
                    )
                  }
                </div>
                <div className="w-fit flex flex-col">
                  <div className="text-lg font-bold">
                    Status
                  </div>
                  {steps
                    .map((s, i) => {
                      const {
                        chain_data,
                        data,
                        id_field,
                        path,
                        params,
                        finish,
                      } = { ...s }
                      let {
                        title,
                      } = { ...s }

                      title = ['Approved'].includes(title) ? 'Confirmed' : s?.id === 'confirm' && !data ? 'Waiting for Finality' : title

                      const id = data?.[id_field]

                      const {
                        explorer,
                      } = { ...chain_data }

                      const {
                        url,
                        transaction_path,
                        icon,
                      } = { ...explorer }

                      let _path = (path || '').replace('{id}', id) || (transaction_path || '').replace('{tx}', id)

                      if (_path) {
                        Object.entries({ ...params })
                          .forEach(([k, v]) => {
                            _path = _path.replace(`{${k}}`, v)
                          })
                      }

                      const text_color =
                        finish ?
                          'text-green-500 dark:text-green-400' :
                          data?.status === 'failed' ?
                            'text-red-500 dark:text-red-400' :
                            i === current_step ?
                              'text-yellow-500 dark:text-yellow-400' :
                              'text-slate-300 dark:text-slate-700'

                      const hidden = ['confirm'].includes(s?.id) && data && ['vote'].includes(steps[i + 1]?.id)

                      return (
                        !hidden &&
                        (
                          <div
                            key={i}
                            className="min-w-max flex items-center space-x-1 pb-0.5"
                          >
                            {finish ?
                              <BiCheckCircle
                                size={18}
                                className="text-green-500 dark:text-green-400"
                              /> :
                              data?.status === 'failed' ?
                                <BiXCircle
                                  size={18}
                                  className="text-red-500 dark:text-red-400"
                                /> :
                                i === current_step ?
                                  <ProgressBar
                                    borderColor="#ca8a04"
                                    barColor="#facc15"
                                    width="18"
                                    height="18"
                                  /> :
                                  <BiCircle
                                    size={18}
                                    className="text-slate-300 dark:text-slate-700"
                                  />
                            }
                            <div className="flex items-center space-x-0.5">
                              {id ?
                                <Copy
                                  value={id}
                                  title={
                                    <span className={`cursor-pointer uppercase ${text_color} text-xs font-semibold`}>
                                      {title}
                                    </span>
                                  }
                                /> :
                                <span className={`uppercase ${text_color} text-xs font-medium`}>
                                  {title}
                                </span>
                              }
                              {
                                id && url &&
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
                      )
                    })
                    .filter(s => s)
                  }
                  {
                    insufficient_fee &&
                    (['deposit_address', 'unwrap'].includes(type) ?
                      <Tooltip
                        placement="top"
                        content={`Send more ${ellipse(symbol)} to the same recipient to cover the min fee`}
                        className="w-56 z-50 bg-black bg-opacity-75 text-white text-xs"
                      >
                        <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 cursor-pointer border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                          Insufficient Fee
                        </div>
                      </Tooltip> :
                      <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                        Insufficient Fee
                      </div>
                    )
                  }
                  {
                    ibc_send?.failed_txhash && !ibc_send.ack_txhash &&
                    (
                      <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                        Timeout
                      </div>
                    )
                  }
                  {
                    time_spent &&
                    (
                      <Tooltip
                        placement="bottom"
                        content="Time spent"
                        className="z-50 bg-black bg-opacity-75 text-white text-xs -ml-7"
                      >
                        <div className="flex items-center space-x-1">
                          <BiTime
                            size={18}
                            className="text-green-500 dark:text-green-400"
                          />
                          <span className="whitespace-nowrap text-xs font-bold">
                            {time_spent}
                          </span>
                        </div>
                      </Tooltip>
                    )
                  }
                </div>
              </div> :
              <span className="text-slate-400 dark:text-slate-500 text-base">
                Transaction not found
              </span>
            }
          </div>
          {data && detail_steps
            .map((s, i) => {
              const {
                chain_data,
                data,
                id_field,
                path,
                params,
                finish,
              } = { ...s }
              let {
                title,
              } = { ...s }

              const {
                txhash,
                status,
                height,
                deposit_address,
                created_at,
                chain,
                command_id,
                transfer_id,
                batch_id,
                executed,
                block_timestamp,
                ack_txhash,
                recv_txhash,
                failed_txhash,
                received_at,
              } = { ...data }

              title = ['Approved'].includes(title) ? 'Confirmed' : ['Confirmed'].includes(title) ? 'Confirm Deposit' : title

              const explorer = ['ibc_send'].includes(s.id) ? axelar_chain_data?.explorer : chain_data?.explorer

              const {
                url,
                transaction_path,
                block_path,
                address_path,
                icon,
              } = { ...explorer }

              const id = data?.[id_field]

              let _path = (path || '').replace('{id}', id) || (transaction_path || '').replace('{tx}', id)

              if (_path) {
                Object.entries({ ...params })
                  .forEach(([k, v]) => {
                    _path = _path.replace(`{${k}}`, v)
                  })
              }

              const time = block_timestamp ?  block_timestamp * 1000 : received_at?.ms || created_at?.ms

              const rowClassName = 'flex flex-col space-y-0.5'
              const rowTitleClassName = `text-sm lg:text-base font-bold`

              return (
                <div
                  key={i}
                  className={`${stepClassName} sm:col-span-3 lg:col-span-2`}
                >
                  <div className={`${titleClassName}`}>
                    {title}
                  </div>
                  <div className="flex flex-col space-y-3">
                    {id ?
                      ['ibc_send'].includes(s.id) ?
                        [txhash, recv_txhash, ack_txhash || failed_txhash]
                          .filter(id => id)
                          .map((id, j) => {
                            const {
                              explorer,
                            } = { ...(id === recv_txhash ? destination_chain_data : axelar_chain_data) }

                            const {
                              url,
                              transaction_path,
                              icon,
                            } = { ...explorer }

                            return (
                              <div
                                key={j}
                                className={rowClassName}
                              >
                                <span className={rowTitleClassName}>
                                  {id === ack_txhash ? 'Acknowledge' : id === failed_txhash ? 'Timeout' : id === recv_txhash ? 'Receive' : 'Send'}
                                </span>
                                <div className="flex items-center space-x-0.5">
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', id)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 dark:text-blue-500 font-medium"
                                  >
                                    <div>
                                      <span className="xl:hidden">
                                        {ellipse(id, 12)}
                                      </span>
                                      <span className="hidden xl:block">
                                        {ellipse(id, 16)}
                                      </span>
                                    </div>
                                  </a>
                                  <Copy
                                    value={id}
                                  />
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', id)}`}
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
                                </div>
                              </div>
                            )
                          }) :
                        !_path.includes('/batch') &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              {_path.includes('/evm-poll') ? 'Poll' : _path.includes('/batch') ? 'Batch' : 'Transaction'}
                            </span>
                            <div className="flex items-center space-x-0.5">
                              <a
                                href={`${url}${_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-500 font-medium"
                              >
                                <div>
                                  <span className="xl:hidden">
                                    {ellipse(id, 12)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(id, 16)}
                                  </span>
                                </div>
                              </a>
                              <Copy
                                value={id}
                              />
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
                            </div>
                          </div>
                        ) :
                      current_step === i ?
                        <ColorRing
                          color={loader_color(theme)}
                          width="32"
                          height="32"
                        /> :
                        i < current_step ?
                          <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm font-medium">
                            The data will be updated shortly.
                          </span> :
                          null
                    }
                    {
                      ['command'].includes(s.id) && chain &&  batch_id && executed &&
                      (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Batch
                          </span>
                          <div className="flex items-center space-x-0.5">
                            <a
                              href={`/batch/${chain}/${batch_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 dark:text-blue-500 font-medium"
                            >
                              <div>
                                <span className="xl:hidden">
                                  {ellipse(batch_id, 12)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(batch_id, 16)}
                                </span>
                              </div>
                            </a>
                            <Copy
                              value={batch_id}
                            />
                            <a
                              href={`/batch/${chain}/${batch_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 dark:text-blue-500"
                            >
                              {axelar_chain_data?.explorer?.icon ?
                                <Image
                                  src={axelar_chain_data.explorer.icon}
                                  className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                /> :
                                <TiArrowRight
                                  size={16}
                                  className="transform -rotate-45"
                                />
                              }
                            </a>
                          </div>
                        </div>
                      )
                    }
                    {
                      height &&
                      (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Block
                          </span>
                          <a
                            href={`${url}${block_path?.replace('{block}', height)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 dark:text-blue-500 font-medium"
                          >
                            {number_format(height, '0,0')}
                          </a>
                        </div>
                      )
                    }
                    {
                      (status || executed) &&
                      (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Status
                          </span>
                          <div className={`${status === 'success' || executed ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'} flex items-center space-x-1`}>
                            {status === 'success' || executed ?
                              <BiCheckCircle
                                size={18}
                              /> :
                              <BiXCircle
                                size={18}
                              />
                            }
                            <span className="uppercase text-xs font-semibold">
                              {executed ? 'Executed' : status}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    {
                      deposit_address &&
                      (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Deposit address
                          </span>
                          <div className="flex items-center space-x-0.5">
                            <a
                              href={`${url}${address_path?.replace('{address}', deposit_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 dark:text-blue-500 font-medium"
                            >
                              {ellipse(deposit_address, 12)}
                            </a>
                            <Copy
                              value={deposit_address}
                            />
                            <a
                              href={`${url}${address_path?.replace('{address}', deposit_address)}`}
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
                          </div>
                        </div>
                      )
                    }
                    {
                      time &&
                      (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Time
                          </span>
                          <span className="flex flex-wrap text-slate-400 dark:text-slate-500 font-medium">
                            <span className="whitespace-nowrap mr-0.5">
                              {moment(time).fromNow()}
                            </span>
                            <span className="whitespace-nowrap">
                              ({moment(time).format('MMM D, YYYY h:mm:ss A')})
                            </span>
                          </span>
                        </div>
                      )
                    }
                    {
                      command_id &&
                      (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Command ID
                          </span>
                          <Copy
                            value={command_id}
                            title={
                              <span className="cursor-pointer break-all font-medium">
                                {ellipse(command_id, 16)}
                              </span>
                            }
                          />
                        </div>
                      )
                    }
                    {
                      transfer_id &&
                      (
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Transfer ID
                          </span>
                          <Copy
                            value={transfer_id}
                            title={
                              <span className="cursor-pointer break-all font-medium">
                                {transfer_id}
                              </span>
                            }
                          />
                        </div>
                      )
                    }
                  </div>
                </div>
              )
            })
          }
        </div> :
        !tx && transfer_id ?
          null :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="36"
            height="36"
          />
      }
    </div>
  )
}