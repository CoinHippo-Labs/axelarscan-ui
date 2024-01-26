'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AxelarGMPRecoveryAPI } from '@axelar-network/axelarjs-sdk'
import { Contract } from 'ethers'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import toast, { Toaster } from 'react-hot-toast'
import { MdClose, MdCheck, MdOutlineTimer } from 'react-icons/md'
import { PiClock, PiWarningCircle, PiCheckCircleFill, PiXCircleFill } from 'react-icons/pi'
import { RiTimerFlashLine } from 'react-icons/ri'

import { Container } from '@/components/Container'
import Image from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile } from '@/components/Profile'
import { TimeAgo, TimeSpent } from '@/components/Time'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useEVMWalletStore, EVMWallet, useCosmosWalletStore, CosmosWallet } from '@/components/Wallet'
import { getEvent, normalizeEvent } from '@/components/GMPs'
import { useGlobalStore } from '@/app/providers'
import { searchGMP, estimateTimeSpent } from '@/lib/api/gmp'
import { getProvider } from '@/lib/chain/evm'
import { ENVIRONMENT, getChainData, getAssetData } from '@/lib/config'
import { split, toArray, parseError } from '@/lib/parser'
import { sleep } from '@/lib/operator'
import { equalsIgnoreCase, ellipse, toTitle } from '@/lib/string'
import { isNumber, toBigNumber } from '@/lib/number'
import { timeDiff } from '@/lib/time'
import IAxelarExecutable from '@/data/contract/interfaces/gmp/IAxelarExecutable.json'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A z'

export const getStep = data => {
  const { chains } = useGlobalStore()
  const { call, gas_paid, gas_paid_to_callback, express_executed, confirm, confirm_failed, confirm_failed_event, approved, executed, error, refunded, is_executed, is_invalid_call, proposal_id } = { ...data }

  const sourceChain = call?.chain
  const destinationChain = call?.returnValues?.destinationChain

  const sourceChainData = getChainData(sourceChain, chains)
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)

  const errored = error && timeDiff((error?.block_timestamp || approved?.block_timestamp || confirm?.block_timestamp) * 1000) > 120
  return toArray([
    {
      id: 'send',
      title: call ? 'Sent' : 'Send',
      status: call ? 'success' : 'pending',
      data: call,
      chainData: sourceChainData,
    },
    (!proposal_id || (gas_paid || gas_paid_to_callback)) && {
      id: 'pay_gas',
      title: gas_paid || gas_paid_to_callback ? 'Gas Paid' : timeDiff(call?.block_timestamp * 1000) < 30 ? 'Checking Gas Paid' : 'Pay Gas',
      status: gas_paid || gas_paid_to_callback ? 'success' : 'pending',
      data: gas_paid || gas_paid_to_callback,
      chain_data: gas_paid_to_callback ? destinationChainData : sourceChainData,
    },
    express_executed && {
      id: 'express',
      title: 'Express Executed',
      status: 'success',
      data: express_executed,
      chain_data: destinationChainData,
    },
    sourceChainData?.chain_type === 'evm' && (confirm || !approved || !(executed || is_executed || error)) && {
      id: 'confirm',
      title: (confirm && confirm.poll_id !== confirm_failed_event?.poll_id) || approved || executed || is_executed || error ? 'Confirmed' : is_invalid_call ? 'Invalid Call' : confirm_failed ? 'Fail to Confirm' : gas_paid || gas_paid_to_callback || express_executed ? 'Waiting for Finality' : 'Confirm',
      status: (confirm && confirm.poll_id !== confirm_failed_event?.poll_id) || approved || executed || is_executed || error ? 'success' : is_invalid_call || confirm_failed ? 'failed' : 'pending',
      data: confirm || confirm_failed_event,
      chain_data: axelarChainData,
    },
    destinationChainData?.chain_type === 'evm' && {
      id: 'approve',
      title: approved ? 'Approved' : confirm && confirm.poll_id !== confirm_failed_event?.poll_id ? 'Approving' : 'Approve',
      status: approved ? 'success' : 'pending',
      data: approved,
      chain_data: destinationChainData,
    },
    {
      id: 'execute',
      title: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'Executed' : errored ? 'Error' : executed?.axelarTransactionHash && timeDiff((confirm?.block_timestamp || call?.block_timestamp) * 1000) > 60 ? 'Waiting for IBC' : 'Execute',
      status: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'success' : errored ? 'failed' : 'pending',
      data: executed || is_executed || error,
      chain_data: executed?.axelarTransactionHash && !executed.transactionHash ? axelarChainData : destinationChainData,
    },
    refunded?.receipt?.status && {
      id: 'refund',
      title: 'Refunded',
      status: 'success',
      data: refunded,
      chain_data: sourceChainData,
    },
  ])
}

function Info({ data, tx }) {
  const { chains, assets } = useGlobalStore()

  const { send, wrap, unwrap, erc20_transfer, confirm, vote, command, simplified_status } = { ...data }

  const { call, approved, status, time_spent } = { ...data }
  const txhash = call?.transactionHash || tx

  const sourceChain = call?.chain
  const destinationChain = call?.returnValues?.destinationChain || approved?.chain

  const senderAddress = call?.transaction?.from
  const contractAddress = approved?.returnValues?.contractAddress || call?.returnValues?.destinationContractAddress

  const sourceChainData = getChainData(sourceChain, chains)
  const { url, transaction_path } = { ...sourceChainData?.explorer }
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)

  const assetData = getAssetData(send?.denom, assets)
  const { addresses } = { ...assetData }
  let { symbol, image } = { ...addresses?.[sourceChainData?.id] }
  symbol = symbol || assetData?.symbol || send?.denom
  image = image || assetData?.image

  if (symbol) {
    switch (type) {
      case 'wrap':
        const WRAP_PREFIXES = ['w', 'axl']
        const index = WRAP_PREFIXES.findIndex(p => symbol.toLowerCase().startsWith(p) && !equalsIgnoreCase(p, symbol))
        if (index > -1) {
          symbol = symbol.substring(WRAP_PREFIXES[index].length)
          if (image) {
            image = split(image, { delimiter: '/' }).map(s => {
              if (s?.includes('.')) {
                const index = WRAP_PREFIXES.findIndex(p => s.toLowerCase().startsWith(p))
                if (index > -1) s = s.substring(WRAP_PREFIXES[index].length)
              }
              return s
            }).join('/')
            image = image.startsWith('/') ? image : `/${image}`
          }
        }
        break
      default:
        break
    }
  }

  const steps = getStep(data)
  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          General Message Passing
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
                    {ellipse(txhash)}{call.chain_type === 'evm' && call.receipt && isNumber(call.logIndex) ? `:${call.logIndex}` : call.chain_type === 'cosmos' && isNumber(call.messageIdIndex) ? `:${call.messageIdIndex}` : ''}
                  </Link> :
                  `${ellipse(txhash)}${call.chain_type === 'evm' && call.receipt && isNumber(call.logIndex) ? `:${call.logIndex}` : call.chain_type === 'cosmos' && isNumber(call.messageIdIndex) ? `:${call.messageIdIndex}` : ''}`
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
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Method</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Tag className={clsx('w-fit capitalize')}>
                {toTitle(normalizeEvent(getEvent(data)))}
              </Tag>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col gap-y-1.5">
                <nav aria-label="Progress">
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
                            if (txhash) stepURL = `${url}${transaction_path.replace('{tx}', txhash)}`
                            break
                          case 'vote':
                            if (txhash) stepURL = `/tx/${txhash}`
                            else if (poll_id) stepURL = `/evm-poll/${poll_id}`
                            break
                          case 'command':
                            if (transactionHash) stepURL = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                            else if (batch_id && destinationChainData) stepURL = `/evm-batch/${destinationChainData.id}/${batch_id}`
                            break
                          case 'ibc_send':
                            if (recv_txhash) stepURL = `${url}${transaction_path.replace('{tx}', recv_txhash)}`
                            else if (ack_txhash) stepURL = `${url}${transaction_path.replace('{tx}', ack_txhash)}`
                            else if (failed_txhash) stepURL = `${url}${transaction_path.replace('{tx}', failed_txhash)}`
                            break
                          case 'unwrap':
                            if (tx_hash_unwrap) stepURL = `${url}${transaction_path.replace('{tx}', tx_hash_unwrap)}`
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
                          <span className={clsx('absolute text-2xs font-medium mt-1', d.status === 'failed' ? 'text-red-600 dark:text-red-500' : 'text-blue-600 dark:text-blue-500', d.title?.length < 5 ? 'ml-1' : '')}>{d.title}</span>
                        </>
                      )

                      return (
                        <li key={d.id} className={clsx('relative', i !== steps.length - 1 ? 'pr-8 sm:pr-20' : '')}>
                          {d.status === 'pending' ?
                            <>
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700" />
                              </div>
                              <div className={clsx('relative w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full border-2 flex items-center justify-center', steps[i - 1]?.status === 'pending' ? 'border-zinc-200 dark:border-zinc-700' : 'border-blue-600 dark:border-blue-500')} aria-current="step">
                                {steps[i - 1]?.status !== 'pending' && <PiClock className={clsx('w-5 h-5', steps[i - 1]?.status === 'pending' ? 'text-zinc-200 dark:text-zinc-700' : 'text-blue-600 dark:text-blue-500')} />}
                                <span className={clsx('absolute text-2xs font-medium mt-12 pt-1', steps[i - 1]?.status !== 'pending' ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-400 dark:text-zinc-500', d.title?.length < 5 ? 'ml-1' : '')}>{d.title}</span>
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
                    <span className="text-xs">Insufficient Fee</span>
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
                  width={24}
                  height={24}
                />
                {isNumber(send?.amount) && assets ?
                  <Number
                    value={send.amount}
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
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Sender</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={senderAddress} chain={sourceChain} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Contract</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={contractAddress} chain={destinationChain} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Created</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {moment(call?.block_timestamp * 1000).format(TIME_FORMAT)}
            </dd>
          </div>
          {((time_spent?.call_express_executed > 0 && ['express_executed', 'executed'].includes(status)) || (time_spent?.total > 0 && ['executed'].includes(status))) && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time Spent</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex flex-col gap-y-2">
                  {time_spent.call_express_executed > 0 && ['express_executed', 'executed'].includes(status) && (
                    <div className="flex items-center text-green-600 dark:text-green-500 gap-x-1">
                      <RiTimerFlashLine size={20} />
                      <TimeSpent fromTimestamp={0} toTimestamp={time_spent.call_express_executed * 1000} />
                    </div>
                  )}
                  {time_spent.total > 0 && ['executed'].includes(status) && (
                    <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                      <MdOutlineTimer size={20} />
                      <TimeSpent fromTimestamp={0} toTimestamp={time_spent.total * 1000} />
                    </div>
                  )}
                </div>
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
  const destinationChain = send?.original_destination_chain || link?.original_destination_chain || unwrap?.destination_chain || send?.destination_chain || link?.destination_chain
  const destinationChainData = getChainData(destinationChain, chains)

  const steps = getStep(data)

  return steps.length > 0 && (
    <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-8">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
          <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
            <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
              Step
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
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
          {steps.filter(d => d.status !== 'pending').map((d, i) => {
            const { txhash, poll_id, batch_id, transactionHash, recv_txhash, ack_txhash, failed_txhash, tx_hash_unwrap, height, block_timestamp, received_at, created_at } = { ...d.data }
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
                    stepTX = stepTX || batch_id
                    stepURL = stepURL || `/evm-batch/${destinationChainData.id}/${batch_id}`

                    if (transactionHash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} value={batch_id}>
                          <Link
                            href={`/evm-batch/${destinationChainData.id}/${batch_id}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 underline"
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
                    stepTX = stepTX || ack_txhash
                    stepURL = stepURL || `${url}${transaction_path.replace('{tx}', ack_txhash)}`

                    if (recv_txhash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} value={ack_txhash}>
                          <Link
                            href={`${url}${transaction_path.replace('{tx}', ack_txhash)}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 underline"
                          >
                            Acknowledgement
                          </Link>
                        </Copy>
                      ))
                    }
                  }
                  if (failed_txhash) {
                    stepTX = stepTX || failed_txhash
                    stepURL = stepURL || `${url}${transaction_path.replace('{tx}', failed_txhash)}`

                    if (recv_txhash && !ack_txhash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} value={failed_txhash}>
                          <Link
                            href={`${url}${transaction_path.replace('{tx}', failed_txhash)}`}
                            target="_blank"
                            className="text-red-600 dark:text-red-500 whitespace-nowrap underline"
                          >
                            IBC Failed
                          </Link>
                        </Copy>
                      ))
                    }
                  }
                  if (txhash) {
                    stepTX = stepTX || txhash
                    stepURL = stepURL || `${url}${transaction_path.replace('{tx}', txhash)}`

                    if (recv_txhash || ack_txhash || failed_txhash) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} value={txhash}>
                          <Link
                            href={`${url}${transaction_path.replace('{tx}', txhash)}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 whitespace-nowrap underline"
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
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{d.title}</span>
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
                        <ExplorerLink value={stepTX} chain={d.chainData?.id} />
                      </div>
                    )}
                    {stepMoreInfos.length > 0 && (
                      <div className="flex items-center gap-x-1.5">
                        {stepMoreInfos}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-left">
                  {height && (url && block_path ?
                    <Link
                      href={`${url}/${block_path.replace('{block}', height)}`}
                      target="_blank"
                      className="text-blue-600 dark:text-blue-500 font-medium"
                    >
                      <Number value={height} />
                    </Link> :
                    <Number value={height} />
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

const MIN_GAS_REMAIN_AMOUNT = 0.000001

export function GMP({ tx, commandId }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [ended, setEnded] = useState(null)
  const [estimatedTimeSpent, setEstimatedTimeSpent] = useState(null)
  const [executeData, setExecuteData] = useState(null)
  const [sdk, setSDK] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [response, setResponse] = useState(null)
  const { chains, assets } = useGlobalStore()
  const { chainId, signer } = useEVMWalletStore()
  const cosmosWalletStore = useCosmosWalletStore()

  const getData = async () => {
    if (commandId) {
      const { data } = { ...await searchGMP({ commandId }) }
      const d = _.head(data)

      if (d?.call?.transactionHash) router.push(`/gmp/${d.call.transactionHash}`)
      else setData({ ...d })
    }
    else if (tx) {
      if (!ended) {
        const { data } = { ...await searchGMP({ txHash: tx }) }
        const d = _.head(data)

        if (d) {
          if (['received', 'failed'].includes(d.simplified_status) && (d.executed || d.error) && (d.refunded || d.not_to_refund)) setEnded(true)

          // callback
          if (d.callback?.transactionHash) {
            const { data } = { ...await searchGMP({ txHash: d.callback.transactionHash, txIndex: d.callback.transactionIndex, txLogIndex: d.callback.logIndex }) }
            d.callback_data = toArray(data).find(_d => equalsIgnoreCase(_d.call?.transactionHash, d.callback.transactionHash))
          }
          else if (d.executed?.transactionHash) {
            const { data } = { ...await searchGMP({ txHash: d.executed.transactionHash }) }
            d.callback_data = toArray(data).find(_d => equalsIgnoreCase(_d.call?.transactionHash, d.executed.transactionHash))
          }

          // origin
          if (d.call && (d.gas_paid_to_callback || d.is_call_from_relayer)) {
            const { data } = { ...await searchGMP({ txHash: d.call.transactionHash }) }
            d.origin_data = toArray(data).find(_d => toArray([_d.express_executed?.transactionHash, _d.executed?.transactionHash]).findIndex(tx => equalsIgnoreCase(tx, d.call.transactionHash)) > -1)
          }

          if (d.call) {
            // estimated time spent
            if (d.call.chain && !estimatedTimeSpent) {
              const response = await estimateTimeSpent({ sourceChain: d.call.chain, destinationChain: d.call.returnValues?.destinationChain })
              setEstimatedTimeSpent(toArray(response).find(_d => _d.key === d.call.chain))
            }

            // execute data
            if (!executeData) {
              try {
                const { addresses } = { ...getAssetData(d.call.returnValues?.symbol, assets) }
                const symbol = d.approved?.returnValues?.symbol || addresses?.[d.call.returnValues?.destinationChain?.toLowerCase()]?.symbol || d.call.returnValues?.symbol
                const commandId = d.approved?.returnValues?.commandId || d.command_id
                const sourceChain = d.approved?.returnValues?.sourceChain || getChainData(d.call.chain, chains)?.chain_name
                const sourceAddress = d.approved?.returnValues?.sourceAddress || d.call.returnValues?.sender
                const contractAddress = d.approved?.returnValues?.contractAddress || d.call.returnValues?.destinationContractAddress
                const payload = d.call.returnValues?.payload
                const amount = toBigNumber(d.approved?.returnValues?.amount || d.call.returnValues?.amount)

                const contract = new Contract(contractAddress, IAxelarExecutable.abi, getProvider(d.call.returnValues?.destinationChain, chains))
                const { data } = { ...(symbol ? await contract/*.executeWithToken*/.populateTransaction.executeWithToken(commandId, sourceChain, sourceAddress, payload, symbol, amount) : await contract/*.execute*/.populateTransaction.execute(commandId, sourceChain, sourceAddress, payload)) }
                setExecuteData(data)
              } catch (error) {}
            }
          }

          console.log('[data]', d)
          setData(d)
          return d
        }
      }
    }
    return
  }

  useEffect(() => {
    getData()
    const interval = !ended && setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tx, commandId, ended, setData, setEnded])

  useEffect(() => {
    try {
      setSDK(new AxelarGMPRecoveryAPI({ environment: ENVIRONMENT, axelarRpcUrl: process.env.NEXT_PUBLIC_RPC_URL, axelarLcdUrl: process.env.NEXT_PUBLIC_LCD_URL }))
    } catch (error) {
      setAPI(undefined)
    }
  }, [])

  useEffect(() => {
    const { status, message, hash, chain } = { ...response }
    const chainData = getChainData(chain, chains)

    toast.remove()
    if (message) {
      if (hash && chainData?.explorer) {
        let icon
        switch (status) {
          case 'success':
            icon = <PiCheckCircleFill size={20} className="text-green-600" />
            break
          case 'failed':
            icon = <PiXCircleFill size={20} className="text-red-600" />
            break
          default:
            break
        }

        toast.custom((
          <div className="bg-white rounded-lg shadow-lg flex flex-col gap-y-1 sm:gap-y-0 px-3 py-2.5">
            <div className="flex items-center gap-x-1.5 sm:gap-x-2">
              {icon}
              <span className="text-zinc-700">{message}</span>
            </div>
            <div className="flex items-center justify-between gap-x-4 ml-6 sm:ml-7 pl-0.5 sm:pl-0">
              <ExplorerLink
                value={hash}
                chain={chain}
                iconOnly={false}
                nonIconClassName="text-zinc-700 text-xs sm:text-sm"
              />
              <button onClick={() => setResponse(null)} className="underline text-zinc-400 text-xs sm:text-sm font-light">
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 60000 })
      }
      else {
        const duration = 10000
        switch (status) {
          case 'pending':
            toast.loading(message)
            break
          case 'success':
            toast.success(message, { duration })
            break
          case 'failed':
            toast.error(message, { duration })
            break
          default:
            break
        }
      }
    }
  }, [response])

  const addGas = async data => {
    if (data?.call && sdk && (data.call.chain_type === 'cosmos' ? cosmosWalletStore?.signer : signer)) {
      setProcessing(true)
      setResponse({ status: 'pending', message: 'Adding gas...' })
      try {
        const { chain, chain_type, destination_chain_type, transactionHash, logIndex } = { ...data.call }
        const { destinationChain, messageId } = { ...data.call.returnValues }

        const token = 'autocalculate'
        const sendOptions = chain_type === 'cosmos' && {
          environment: ENVIRONMENT,
          offlineSigner: cosmosWalletStore.signer,
          txFee: { gas: '250000', amount: [{ denom: getChainData(chain, chains)?.native_token?.denom, amount: '30000' }] },
        }

        console.log('[addGas request]', { chain, transactionHash, logIndex, messageId, refundAddress: address, token, sendOptions })
        const response = chain_type === 'cosmos' ? await sdk.addGasToCosmosChain({ txHash: transactionHash, messageId, chain, token, sendOptions }) : await sdk.addNativeGas(chain, transactionHash/*, logIndex*/, { useWindowEthereum: true, signer, refundAddress: address })
        console.log('[addGas response]', response)

        const { success, error, transaction, broadcastResult } = { ...response }
        if (success) await sleep(1 * 1000)
        setResponse({
          status: success ? 'success' : 'failed',
          message: error?.message || error || 'Pay gas successful',
          hash: (chain_type === 'cosmos' ? broadcastResult : transaction)?.transactionHash,
          chain,
        })

        const _data = success && await getData()
        if (_data && success && !broadcastResult?.code && !_data.is_insufficient_fee && (destination_chain_type === 'cosmos' ? !data.executed && !_data.executed : !data.approved && !_data.approved)) approve(_data, true)
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const approve = async (data, afterPayGas = false) => {
    if (data?.call && sdk) {
      setProcessing(true)
      if (!afterPayGas) setResponse({ status: 'pending', message: data.call.chain_type !== 'cosmos' && !data.confirm ? 'Confirming...' : data.call.destination_chain_type === 'cosmos' ? 'Executing...' : 'Approving...' })
      try {
        const { destination_chain_type, transactionHash, logIndex, _logIndex } = { ...data.call }
        let { messageId } = { ...data.call.returnValues }
        const eventIndex = _logIndex
        messageId = messageId || (transactionHash && isNumber(_logIndex) ? `${transactionHash}-${_logIndex}` : undefined)

        const escapeAfterConfirm = false

        console.log('[manualRelayToDestChain request]', { transactionHash, logIndex, eventIndex, escapeAfterConfirm, messageId })
        const response = await sdk.manualRelayToDestChain(transactionHash, logIndex, eventIndex, { useWindowEthereum: true, signer }, escapeAfterConfirm, messageId)
        console.log('[manualRelayToDestChain response]', response)

        const { success, error, confirmTx, signCommandTx, routeMessageTx } = { ...response }
        if (success) await sleep(15 * 1000)
        if (success || !afterPayGas) {
          setResponse({
            status: success || !error ? 'success' : 'failed',
            message: error?.message || error || `${destination_chain_type === 'cosmos' ? 'Execute' : 'Approve'} successful`,
            hash: routeMessageTx?.transactionHash || signCommandTx?.transactionHash || confirmTx?.transactionHash,
            chain: 'axelarnet',
          })
        }
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const execute = async data => {
    if (data?.approved && sdk && signer) {
      setProcessing(true)
      setResponse({ status: 'pending', message: 'Executing...' })
      try {
        const { transactionHash, logIndex } = { ...data.call }
        const gasLimitBuffer = '200000'

        console.log('[execute request]', { transactionHash, logIndex, gasLimitBuffer })
        const response = await sdk.execute(transactionHash, logIndex, { useWindowEthereum: true, signer, gasLimitBuffer })
        console.log('[execute response]', response)

        const { success, error, transaction } = { ...response }
        setResponse({
          status: success && transaction ? 'success' : 'failed',
          message: error?.message || error || (transaction ? 'Execute successful' : 'Error Execution. Please see the error on console.'),
          hash: transaction?.transactionHash,
          chain: data.approved.chain,
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const needSwitchChain = (id, type) => id !== (type === 'cosmos' ? cosmosWalletStore?.chainId : chainId)

  const { call, gas_paid, gas_paid_to_callback, confirm, confirm_failed, confirm_failed_event, approved, executed, error, gas, is_executed, is_insufficient_fee, is_call_from_relayer, is_invalid_destination_chain, is_invalid_call, is_not_enough_gas, not_enough_gas_to_execute, proposal_id } = { ...data }
  const sourceChainData = getChainData(call?.chain, chains)
  const destinationChainData = getChainData(call?.returnValues?.destinationChain, chains)

  const addGasButton = call && !executed && !is_executed && (call.chain_type !== 'cosmos' || timeDiff(call.block_timestamp * 1000) >= 60) && (!(gas_paid || gas_paid_to_callback) || is_insufficient_fee || is_not_enough_gas || not_enough_gas_to_execute || gas?.gas_remain_amount < MIN_GAS_REMAIN_AMOUNT) && (
    <div key="addGas" className="flex items-center gap-x-1">
      {(call.chain_type === 'cosmos' ? cosmosWalletStore?.signer : signer) && !needSwitchChain(sourceChainData?.chain_id, call.chain_type) && (
        <button
          disabled={processing}
          onClick={() => addGas(data)}
          className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
        >
          {gas_paid ? 'Add' : 'Pay'}{processing ? 'ing' : ''} gas{processing ? '...' : ''}
        </button>
      )}
      {call.chain_type === 'cosmos' ? <CosmosWallet connectChainId={sourceChainData?.chain_id} /> : <EVMWallet connectChainId={sourceChainData?.chain_id} />}
    </div>
  )

  const finalityTime = estimatedTimeSpent?.confirm ? estimatedTimeSpent.confirm + 15 : 600
  const approveButton = call && !confirm_failed && !(call.destination_chain_type === 'cosmos' ? confirm && confirm.poll_id !== confirm_failed_event?.poll_id : approved) && (!executed || (error && executed.axelarTransactionHash && !executed.transactionHash)) && !is_executed && (confirm || timeDiff(call.block_timestamp * 1000) >= finalityTime) && timeDiff((confirm || call).block_timestamp * 1000) >= 60 && !(is_invalid_destination_chain || is_invalid_call || is_insufficient_fee || (!gas?.gas_remain_amount && !gas_paid_to_callback && !is_call_from_relayer && !proposal_id)) && (
    <div key="approve" className="flex items-center gap-x-1">
      <button
        disabled={processing}
        onClick={() => approve(data)}
        className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
      >
        {call.chain_type !== 'cosmos' && !confirm ? 'Confirm' : 'Approv'}{processing ? 'ing...' : call.chain_type !== 'cosmos' && !confirm ? '' : 'e'}
      </button>
    </div>
  )

  const executeButton = call && (call.destination_chain_type === 'cosmos' ? confirm || call.chain_type !== 'evm' : approved) && !executed && !is_executed && (error || timeDiff(((call.destination_chain_type === 'cosmos' ? confirm.block_timestamp : approved.block_timestamp) || call.block_timestamp) * 1000) >= (call.destination_chain_type === 'cosmos' ? 300 : 120)) && payload && (
    <div key="execute" className="flex items-center gap-x-1">
      {call.destination_chain_type === 'cosmos' || (signer && !needSwitchChain(destinationChainData?.chain_id, call.destination_chain_type)) && (
        <button
          disabled={processing}
          onClick={() => call.destination_chain_type === 'cosmos' ? approve(data) : execute(data)}
          className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
        >
          Execut{processing ? 'ing...' : 'e'}
        </button>
      )}
      {call.destination_chain_type === 'evm' && <EVMWallet connectChainId={destinationChainData?.chain_id} />}
    </div>
  )

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="max-w-5xl flex flex-col gap-y-4">
          <Toaster />
          <Info data={data} tx={tx} />
          <Details data={data} />
        </div>
      }
    </Container>
  )
}
