'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import moment from 'moment'
import { MdClose, MdCheck } from 'react-icons/md'
import { PiClock, PiWarningCircle } from 'react-icons/pi'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Spinner } from '@/components/Spinner'
import { Response } from '@/components/Response'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile } from '@/components/Profile'
import { TimeAgo, TimeSpent } from '@/components/Time'
import { ExplorerLink } from '@/components/ExplorerLink'
import { normalizeType } from '@/components/Transfers'
import { useGlobalStore } from '@/components/Global'
import { searchTransfers } from '@/lib/api/token-transfer'
import { getChainData, getAssetData } from '@/lib/config'
import { toCase, split, toArray } from '@/lib/parser'
import { getParams } from '@/lib/operator'
import { isString, equalsIgnoreCase, ellipse, toTitle } from '@/lib/string'
import { isNumber, formatUnits } from '@/lib/number'
import { TIME_FORMAT } from '@/lib/time'

export function getStep(data, chains) {
  const { link, send, wrap, unwrap, erc20_transfer, confirm, vote, command, ibc_send, axelar_transfer, type } = { ...data }

  const sourceChain = send?.source_chain || link?.source_chain
  const destinationChain = send?.destination_chain || unwrap?.destination_chain || link?.destination_chain

  const sourceChainData = getChainData(sourceChain, chains)
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)

  return toArray([
    type === 'deposit_address' && link && {
      id: 'link',
      title: 'Linked',
      status: 'success',
      data: link,
      chainData: axelarChainData,
    },
    {
      id: 'send',
      title: (type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send) ? 'Sent' : 'Send',
      status: (type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send) ? 'success' : 'pending',
      data: type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send,
      chainData: sourceChainData,
    },
    type === 'wrap' && {
      id: 'wrap',
      title: send ? 'Wrapped' : 'Wrap',
      status: send ? 'success' : 'pending',
      data: send,
      chainData: sourceChainData,
    },
    type === 'erc20_transfer' && {
      id: 'erc20_transfer',
      title: send ? 'ERC20 Transferred' : 'ERC20 Transfer',
      status: send ? 'success' : 'pending',
      data: send,
      chainData: sourceChainData,
    },
    !['send_token', 'wrap', 'erc20_transfer'].includes(type) && {
      id: 'confirm',
      title: confirm ? 'Deposit Confirmed' : sourceChainData?.chain_type === 'evm' ? 'Waiting for Finality' : 'Confirm Deposit',
      status: confirm ? 'success' : 'pending',
      data: confirm,
      chainData: axelarChainData,
    },
    sourceChainData?.chain_type === 'evm' && {
      id: 'vote',
      title: vote ? vote.success ? 'Confirmed' : 'Failed to Confirm' : confirm ? 'Confirming' : 'Confirm',
      status: vote ? vote.success ? 'success' : 'failed' : 'pending',
      data: vote,
      chainData: axelarChainData,
    },
    destinationChainData?.chain_type === 'evm' && {
      id: 'command',
      title: command?.executed || command?.transactionHash ? 'Received' : 'Approve',
      status: command?.executed || command?.transactionHash ? 'success' : 'pending',
      data: command,
      chainData: command?.transactionHash ? destinationChainData : axelarChainData,
    },
    destinationChainData?.chain_type === 'cosmos' && destinationChainData.id !== 'axelarnet' && {
      id: 'ibc_send',
      title: ibc_send?.ack_txhash || (ibc_send?.recv_txhash && !ibc_send.failed_txhash) ? 'Received' : ibc_send?.failed_txhash ? 'Error' : 'Execute',
      status: ibc_send?.ack_txhash || (ibc_send?.recv_txhash && !ibc_send.failed_txhash) ? 'success' : ibc_send?.failed_txhash ? 'failed' : 'pending',
      data: ibc_send,
      chainData: ibc_send?.recv_txhash ? destinationChainData : axelarChainData,
    },
    destinationChainData?.id === 'axelarnet' && {
      id: 'axelar_transfer',
      title: axelar_transfer ? 'Received' : 'Execute',
      status: axelar_transfer ? 'success' : 'pending',
      data: axelar_transfer,
      chainData: axelarChainData,
    },
    type === 'unwrap' && {
      id: 'unwrap',
      title: unwrap?.tx_hash_unwrap ? 'Unwrapped' : 'Unwrap',
      status: unwrap?.tx_hash_unwrap ? 'success' : 'pending',
      data: unwrap,
      chainData: destinationChainData,
    },
  ])
}

function Info({ data, tx }) {
  const { chains, assets } = useGlobalStore()

  const { link, send, wrap, unwrap, erc20_transfer, confirm, vote, command, type, simplified_status, time_spent } = { ...data }
  const txhash = send?.txhash || tx

  const sourceChain = send?.source_chain || link?.source_chain
  const destinationChain = send?.destination_chain || unwrap?.destination_chain || link?.destination_chain

  const senderAddress = wrap?.sender_address || erc20_transfer?.sender_address || send?.sender_address
  const recipientAddress = unwrap?.recipient_address || link?.recipient_address
  const depositAddress = wrap?.deposit_address || unwrap?.deposit_address_link || erc20_transfer?.deposit_address || send?.recipient_address || link?.deposit_address

  const commandID = command?.command_id
  const transferID = command?.transfer_id || vote?.transfer_id || confirm?.transfer_id || data.transfer_id

  const sourceChainData = getChainData(sourceChain, chains)
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)
  const depositChainData = getChainData(depositAddress?.startsWith('axelar') ? 'axelarnet' : sourceChain, chains)

  const { url, transaction_path } = { ...sourceChainData?.explorer }

  // asset data
  const assetData = getAssetData(send?.denom, assets)

  const { addresses } = { ...assetData }
  let { symbol, image } = { ...addresses?.[sourceChainData?.id] }

  if (!symbol) {
    symbol = assetData?.symbol || send?.denom
  }

  if (!image) {
    image = assetData?.image
  }

  if (symbol) {
    switch (type) {
      case 'wrap':
        const WRAP_PREFIXES = ['w', 'axl']
        const i = WRAP_PREFIXES.findIndex(p => toCase(symbol, 'lower').startsWith(p) && !equalsIgnoreCase(p, symbol))

        if (i > -1) {
          symbol = symbol.substring(WRAP_PREFIXES[i].length)

          if (image) {
            image = split(image, { delimiter: '/' }).map(s => {
              if (s?.includes('.')) {
                const i = WRAP_PREFIXES.findIndex(p => toCase(s, 'lower').startsWith(p))

                if (i > -1) {
                  s = s.substring(WRAP_PREFIXES[i].length)
                }
              }

              return s
            }).join('/')

            image = `${image.startsWith('/') ? '' : '/'}${image}`
          }
        }
        break
      default:
        break
    }
  }

  const steps = getStep(data, chains)

  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          Transfer
        </h3>
        <div className="max-w-2xl text-zinc-400 dark:text-zinc-500 text-sm leading-6 mt-1">
          {txhash && (
            <div className="flex items-center gap-x-1">
              <Copy value={txhash}>
                {url ?
                  <Link
                    href={`${url}${transaction_path?.replace('{tx}', txhash)}`}
                    target="_blank"
                    className="text-blue-600 dark:text-blue-500 font-semibold"
                  >
                    {ellipse(txhash)}
                  </Link> :
                  ellipse(txhash)
                }
              </Copy>
              <ExplorerLink value={txhash} chain={sourceChain} />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Type</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Tag className={clsx('w-fit capitalize')}>
                {toTitle(normalizeType(type))}
              </Tag>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col gap-y-1.5">
                <nav aria-label="Progress" className="h-16 sm:h-12 overflow-x-auto">
                  <ol role="list" className="flex items-center">
                    {steps.map((d, i) => {
                      const { txhash, poll_id, batch_id, transactionHash, recv_txhash, ack_txhash, failed_txhash, tx_hash_unwrap } = { ...d.data }
                      const { url, transaction_path } = { ...d.chainData?.explorer }

                      let stepURL

                      if (url && transaction_path) {
                        switch (d.id) {
                          case 'link':
                          case 'send':
                          case 'wrap':
                          case 'erc20_transfer':
                          case 'confirm':
                          case 'axelar_transfer':
                            if (txhash) {
                              stepURL = `${url}${transaction_path.replace('{tx}', txhash)}`
                            }
                            break
                          case 'vote':
                            if (txhash) {
                              stepURL = `/tx/${txhash}`
                            }
                            else if (poll_id) {
                              stepURL = `/evm-poll/${poll_id}`
                            }
                            break
                          case 'command':
                            if (transactionHash) {
                              stepURL = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                            }
                            else if (batch_id && destinationChainData) {
                              stepURL = `/evm-batch/${destinationChainData.id}/${batch_id}`
                            }
                            break
                          case 'ibc_send':
                            if (recv_txhash) {
                              stepURL = `${url}${transaction_path.replace('{tx}', recv_txhash)}`
                            }
                            else if (ack_txhash) {
                              stepURL = `${axelarChainData.explorer.url}${axelarChainData.explorer.transaction_path.replace('{tx}', ack_txhash)}`
                            }
                            else if (failed_txhash) {
                              stepURL = `${url}${transaction_path.replace('{tx}', failed_txhash)}`
                            }
                            break
                          case 'unwrap':
                            if (tx_hash_unwrap) {
                              stepURL = `${url}${transaction_path.replace('{tx}', tx_hash_unwrap)}`
                            }
                            break
                          default:
                            break
                        }
                      }

                      const element = (
                        <>
                          <div className={clsx('relative w-8 h-8 rounded-full flex items-center justify-center', d.status === 'failed' ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400')}>
                            {d.status === 'failed' ? <MdClose className="w-5 h-5 text-white" /> : <MdCheck className="w-5 h-5 text-white" />}
                          </div>
                          <span className={clsx('absolute text-2xs font-medium whitespace-nowrap mt-1', d.status === 'failed' ? 'text-red-600 dark:text-red-500' : 'text-blue-600 dark:text-blue-500', d.title?.length <= 5 ? 'ml-1' : '')}>
                            {d.title}
                          </span>
                        </>
                      )

                      return (
                        <li key={d.id} className={clsx('relative', i !== steps.length - 1 ? 'pr-16 sm:pr-24' : '')}>
                          {d.status === 'pending' ?
                            <>
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700" />
                              </div>
                              <div className={clsx('relative w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full border-2 flex items-center justify-center', steps[i - 1]?.status === 'pending' ? 'border-zinc-200 dark:border-zinc-700' : 'border-blue-600 dark:border-blue-500')} aria-current="step">
                                {steps[i - 1]?.status !== 'pending' && <PiClock className={clsx('w-5 h-5', steps[i - 1]?.status === 'pending' ? 'text-zinc-200 dark:text-zinc-700' : 'text-blue-600 dark:text-blue-500')} />}
                                <span className={clsx('absolute text-2xs font-medium whitespace-nowrap mt-12 pt-1', steps[i - 1]?.status !== 'pending' ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-400 dark:text-zinc-500', d.title?.length <= 5 ? 'ml-1' : '')}>
                                  {d.title}
                                </span>
                              </div>
                            </> :
                            <>
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className={clsx('w-full h-0.5', d.status === 'failed' ? 'bg-red-600 dark:bg-red-500' : 'bg-blue-600 dark:bg-blue-500')} />
                              </div>
                              {stepURL ?
                                <Link href={stepURL} target="_blank">
                                  {element}
                                </Link> :
                                element
                              }
                            </>
                          }
                        </li>
                      )
                    })}
                  </ol>
                </nav>
                {send?.insufficient_fee && (
                  <div className="flex items-center text-red-600 dark:text-red-500 gap-x-1">
                    <PiWarningCircle size={16} />
                    <span className="text-xs">
                      Insufficient Fee
                    </span>
                  </div>
                )}
              </div>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Source Chain</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <ChainProfile value={sourceChain} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Destination Chain</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <ChainProfile value={destinationChain} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Asset</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="min-w-max flex items-center gap-x-2">
                <Image
                  src={image}
                  alt=""
                  width={24}
                  height={24}
                />
                {isNumber(send?.amount) && assets ?
                  <Number
                    value={isString(send.amount) ? formatUnits(send.amount, assetData?.decimals) : send.amount}
                    format="0,0.000000"
                    suffix={` ${symbol}`}
                    className="text-zinc-900 dark:text-zinc-100 font-medium"
                  /> :
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                    {symbol}
                  </span>
                }
              </div>
            </dd>
          </div>
          {isNumber(send?.fee) && assets && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Transfer Fee</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="min-w-max flex items-center gap-x-2">
                  <Image
                    src={image}
                    alt=""
                    width={24}
                    height={24}
                  />
                  <Number
                    value={isString(send.fee) ? formatUnits(send.fee, assetData?.decimals) : send.fee}
                    format="0,0.000000"
                    suffix={` ${symbol}`}
                    className="text-zinc-900 dark:text-zinc-100 font-medium"
                  />
                </div>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Sender</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={senderAddress} chain={sourceChain} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Recipient</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={recipientAddress} chain={destinationChain} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{type === 'send_token' ? 'Gateway' : ['wrap', 'unwrap', 'erc20_transfer'].includes(type) ? 'Contract' : 'Deposit Address'}</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={depositAddress} chain={depositChainData?.id || sourceChain} />
            </dd>
          </div>
          {commandID && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Command ID</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Copy value={commandID}>
                  <span>{ellipse(commandID)}</span>
                </Copy>
              </dd>
            </div>
          )}
          {transferID && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Transfer ID</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Copy value={transferID}>
                  <span>{transferID}</span>
                </Copy>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Created</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {moment(send?.created_at?.ms).format(TIME_FORMAT)}
            </dd>
          </div>
          {time_spent?.total > 0 && ['received'].includes(simplified_status) && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time Spent</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <TimeSpent fromTimestamp={0} toTimestamp={time_spent.total * 1000} />
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

function Details({ data }) {
  const { chains } = useGlobalStore()

  const { link, send, unwrap } = { ...data }

  const destinationChain = send?.destination_chain || unwrap?.destination_chain || link?.destination_chain
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)

  const steps = getStep(data, chains)

  return steps.length > 0 && (
    <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-8">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
          <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
            <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
              Step
            </th>
            <th scope="col" className="px-3 py-3.5 text-left whitespace-nowrap">
              Tx Hash
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Height
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Status
            </th>
            <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {steps.filter(d => d.status !== 'pending' || (d.id === 'ibc_send' && d.data)).map((d, i) => {
            const { txhash, poll_id, batch_id, transactionHash, recv_txhash, ack_txhash, failed_txhash, tx_hash_unwrap, height, blockNumber, block_timestamp, received_at, created_at } = { ...d.data }
            const { url, block_path, transaction_path } = { ...d.chainData?.explorer }

            let stepTX
            let stepURL
            const stepMoreInfos = []

            if (url && transaction_path) {
              switch (d.id) {
                case 'link':
                case 'send':
                case 'wrap':
                case 'erc20_transfer':
                case 'confirm':
                case 'axelar_transfer':
                  if (txhash) {
                    stepTX = txhash
                    stepURL = `${url}${transaction_path.replace('{tx}', txhash)}`
                  }
                  break
                case 'vote':
                  if (txhash) {
                    stepTX = txhash
                    stepURL = `/tx/${txhash}`
                  }
                  else if (poll_id) {
                    stepTX = poll_id
                    stepURL = `/evm-poll/${poll_id}`
                  }
                  break
                case 'command':
                  if (transactionHash) {
                    stepTX = transactionHash
                    stepURL = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                  }

                  if (batch_id && destinationChainData) {
                    if (!stepTX) {
                      stepTX = batch_id
                    }

                    if (!stepURL) {
                      stepURL = `/evm-batch/${destinationChainData.id}/${batch_id}`
                    }

                    if (transactionHash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} size={16} value={batch_id}>
                          <Link
                            href={`/evm-batch/${destinationChainData.id}/${batch_id}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 text-xs underline"
                          >
                            Batch
                          </Link>
                        </Copy>
                      ))
                    }
                  }
                  break
                case 'ibc_send':
                  if (recv_txhash) {
                    stepTX = recv_txhash
                    stepURL = `${url}${transaction_path.replace('{tx}', recv_txhash)}`
                  }

                  if (ack_txhash) {
                    if (!stepTX) {
                      stepTX = ack_txhash
                    }

                    if (stepURL) {
                      stepURL = `${axelarChainData.explorer.url}${axelarChainData.explorer.transaction_path.replace('{tx}', ack_txhash)}`
                    }

                    if (recv_txhash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} size={16} value={ack_txhash}>
                          <Link
                            href={`${axelarChainData.explorer.url}${axelarChainData.explorer.transaction_path.replace('{tx}', ack_txhash)}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 text-xs underline"
                          >
                            Acknowledgement
                          </Link>
                        </Copy>
                      ))
                    }
                  }

                  if (failed_txhash) {
                    if (!stepTX) {
                      stepTX = failed_txhash
                    }

                    if (!stepURL) {
                      stepURL = `${url}${transaction_path.replace('{tx}', failed_txhash)}`
                    }

                    if (recv_txhash && !ack_txhash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} size={16} value={failed_txhash}>
                          <Link
                            href={`${url}${transaction_path.replace('{tx}', failed_txhash)}`}
                            target="_blank"
                            className="text-red-600 dark:text-red-500 text-xs whitespace-nowrap underline"
                          >
                            IBC Failed
                          </Link>
                        </Copy>
                      ))
                    }
                  }

                  if (txhash) {
                    if (!stepTX) {
                      stepTX = txhash
                    }

                    if (!stepURL) {
                      stepURL = `${url}${transaction_path.replace('{tx}', txhash)}`
                    }

                    if (recv_txhash || ack_txhash || failed_txhash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} size={16} value={txhash}>
                          <Link
                            href={`${axelarChainData.explorer.url}${axelarChainData.explorer.transaction_path.replace('{tx}', txhash)}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 text-xs whitespace-nowrap underline"
                          >
                            IBC Send
                          </Link>
                        </Copy>
                      ))
                    }
                  }
                  break
                case 'unwrap':
                  if (tx_hash_unwrap) {
                    stepTX = tx_hash_unwrap
                    stepURL = `${url}${transaction_path.replace('{tx}', tx_hash_unwrap)}`
                  }
                  break
                default:
                  break
              }
            }

            return (
              <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {d.title}
                  </span>
                </td>
                <td className="px-3 py-4 text-left">
                  <div className="flex flex-col gap-y-2">
                    {stepTX && (
                      <div className="flex items-center gap-x-1">
                        <Copy value={stepTX}>
                          <Link
                            href={stepURL}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 font-medium"
                          >
                            {ellipse(stepTX)}
                          </Link>
                        </Copy>
                        <ExplorerLink
                          value={stepTX}
                          chain={d.chainData?.id}
                          customURL={stepURL}
                        />
                      </div>
                    )}
                    {stepMoreInfos.length > 0 && (
                      <div className="flex items-center gap-x-3">
                        {stepMoreInfos}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-left">
                  {(height || blockNumber) && (url && block_path ?
                    <Link
                      href={`${height && d.id === 'ibc_send' ? axelarChainData.explorer.url : url}${(height && d.id === 'ibc_send' ? axelarChainData.explorer.block_path : block_path).replace('{block}', height || blockNumber)}`}
                      target="_blank"
                      className="text-blue-600 dark:text-blue-500 font-medium"
                    >
                      <Number value={height || blockNumber} />
                    </Link> :
                    <Number value={height || blockNumber} />
                  )}
                </td>
                <td className="px-3 py-4 text-left">
                  {d.status && (
                    <Tag className={clsx('w-fit capitalize', ['success'].includes(d.status) ? 'bg-green-600 dark:bg-green-500' : ['failed'].includes(d.status) ? 'bg-red-600 dark:bg-red-500' : '')}>
                      {d.status}
                    </Tag>
                  )}
                </td>
                <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                  <TimeAgo timestamp={block_timestamp * 1000 || received_at?.ms || created_at?.ms} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Transfer({ tx, lite }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(null)
  const [ended, setEnded] = useState(null)

  useEffect(() => {
    const getData = async () => {
      const { transferId } = { ...getParams(searchParams) }

      if (tx) {
        if (!ended) {
          const { data } = { ...await searchTransfers({ txHash: tx }) }
          const d = data?.[0]

          if (d) {
            if (['received', 'failed'].includes(d.simplified_status)) {
              setEnded(true)
            }

            console.log('[data]', d)
            setData(d)
          }
          else {
            setData({
              status: 'errorOnGetData',
              code: 404,
              message: `Transaction: ${tx} not found`,
            })
          }
        }
      }
      else if (transferId) {
        const { data } = { ...await searchTransfers({ transferId }) }
        const d = data?.[0]

        if (d) {
          if (d.send?.txhash) {
            router.push(`/transfer/${d.send.txhash}`)
          }
          else {
            setData(d)
          }
        }
        else {
          setData({
            status: 'errorOnGetData',
            code: 404,
            message: `Transfer ID: ${transferId} not found`,
          })
        }
      }
    }

    getData()

    const interval = !ended && setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tx, router, searchParams, setData, ended, setEnded])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        data.status === 'errorOnGetData' ? <Response data={data} /> :
        <div className="max-w-5xl flex flex-col gap-y-4">
          <Info data={data} tx={tx} />
          {!lite && <Details data={data} />}
        </div>
      }
    </Container>
  )
}
