'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import toast, { Toaster } from 'react-hot-toast'
import { MdOutlineCode, MdOutlineArrowBack } from 'react-icons/md'
import { PiCheckCircleFill, PiXCircleFill } from 'react-icons/pi'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile } from '@/components/Profile'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useEVMWalletStore, EVMWallet } from '@/components/Wallet'
import { useGlobalStore } from '@/components/Global'
import { getBatch } from '@/lib/api/token-transfer'
import { getChainData, getAssetData } from '@/lib/config'
import { toCase, split, toArray, parseError } from '@/lib/parser'
import { ellipse } from '@/lib/string'
import { toNumber, formatUnits } from '@/lib/number'
import { timeDiff, TIME_FORMAT } from '@/lib/time'

function Info({ data, chain, id, executeButton }) {
  const { chains, assets } = useGlobalStore()

  const { key_id, commands, created_at, execute_data, prev_batched_commands_id } = { ...data }
  let { signatures } = { ...data?.proof }

  signatures = toArray(signatures || data?.signature)

  const { gateway, explorer } = { ...getChainData(chain, chains) }
  const { url, address_path, transaction_path } = { ...explorer }

  const executed = commands && commands.length === commands.filter(c => c.executed).length
  const status = executed ? 'executed' : toCase(data?.status?.replace('BATCHED_COMMANDS_STATUS_', ''), 'lower')

  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          <Copy value={id}>
            <span>{ellipse(id, 16)}</span>
          </Copy>
          {key_id && (
            <Copy size={16} value={key_id}>
              <span className="text-zinc-400 dark:text-zinc-500 text-sm font-normal leading-6">
                {key_id}
              </span>
            </Copy>
          )}
        </h3>
        <div className="max-w-2xl mt-3">
          {prev_batched_commands_id && (
            <Link
              href={`/evm-batch/${chain}/${prev_batched_commands_id}`}
              className="flex items-center text-blue-600 dark:text-blue-500 font-medium gap-x-1"
            >
              <MdOutlineArrowBack size={18} />
              <span>Previous Batch ({ellipse(prev_batched_commands_id, 8)})</span>
            </Link>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Chain</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {url && gateway?.ddress ?
                <Link href={`${url}${address_path?.replace('{address}', gateway.ddress)}`} target="_blank">
                  <ChainProfile value={chain} />
                </Link> :
                <ChainProfile value={chain} />
              }
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {status && (
                <div className="flex items-center space-x-3">
                  <Tag className={clsx('w-fit capitalize', ['executed'].includes(status) ? 'bg-green-600 dark:bg-green-500' : ['signed'].includes(status) ? 'bg-orange-500 dark:bg-orange-600' : ['signing'].includes(status) ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-red-600 dark:bg-red-500')}>
                    {status}
                  </Tag>
                  {executeButton}
                </div>
              )}
            </dd>
          </div>
          {commands && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{`Command${commands.length > 1 ? `s (${commands.length})` : ''}`}</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                      <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                        <th scope="col" className="pl-4 sm:pl-3 pr-3 py-2.5 text-left">
                          ID
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-left">
                          Command
                        </th>
                        <th scope="col" className="pl-3 pr-4 sm:pr-3 px-3 py-2.5 text-left">
                          Parameters
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                      {commands.map((c, i) => {
                        const { type, deposit_address } = { ...c }
                        const { amount, name, cap, account, salt, newOwners, newOperators, newWeights, newThreshold, sourceChain, sourceTxHash, contractAddress } = { ...c.params }
                        let { symbol, decimals } = { ...c.params }

                        const transferID = parseInt(c.id, 16)
                        const assetData = getAssetData(symbol, assets)

                        symbol = assetData?.addresses?.[chain]?.symbol || assetData?.symbol || symbol
                        decimals = assetData?.addresses?.[chain]?.decimals || assetData?.decimals || decimals || 18
                        const image = assetData?.addresses?.[chain]?.image || assetData?.image

                        const sourceChainData = getChainData(sourceChain, chains)
                        const destinationChainData = getChainData(chain, chains)

                        const IDElement = (
                          <span className="font-medium">
                            {ellipse(c.id, 6)}
                          </span>
                        )

                        const typeElement = (
                          <div className="flex">
                            <Tooltip content={c.executed ? 'Executed' : 'Unexecuted'}>
                              <Tag className={clsx('w-fit capitalize text-2xs', c.executed ? 'bg-green-600 dark:bg-green-500' : 'bg-orange-500 dark:bg-orange-600')}>
                                {type}
                              </Tag>
                            </Tooltip>
                          </div>
                        )

                        return (
                          <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-xs">
                            <td className="pl-4 sm:pl-3 pr-3 py-3 text-left">
                              {url && c.transactionHash ?
                                <Copy size={16} value={c.id}>
                                  <Link
                                    href={`${url}${transaction_path?.replace('{tx}', c.transactionHash)}`}
                                    target="_blank"
                                    className="text-blue-600 dark:text-blue-500"
                                  >
                                    {IDElement}
                                  </Link>
                                </Copy> :
                                <Copy size={16} value={c.id}>
                                  {IDElement}
                                </Copy>
                              }
                            </td>
                            <td className="px-3 py-3 text-left">
                              {url && c.transactionHash ?
                                <Link href={`${url}${transaction_path?.replace('{tx}', c.transactionHash)}`} target="_blank">
                                  {typeElement}
                                </Link> :
                                typeElement
                              }
                            </td>
                            <td className="pl-3 pr-4 sm:pr-3 py-3 text-left">
                              <div className="flex lg:flex-wrap lg:items-center">
                                {symbol && !['approveContractCall'].includes(type) && (
                                  <div className="min-w-fit h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center gap-x-1.5 mr-2 px-2.5 py-1">
                                    <Image
                                      src={image}
                                      alt=""
                                      width={16}
                                      height={16}
                                    />
                                    {amount && assets ?
                                      <Number
                                        value={formatUnits(amount, decimals)}
                                        format="0,0.000000"
                                        suffix={` ${symbol}`}
                                        className="text-zinc-900 dark:text-zinc-100 text-xs font-medium"
                                      /> :
                                      <span className="text-zinc-900 dark:text-zinc-100 text-xs font-medium">
                                        {symbol}
                                      </span>
                                    }
                                  </div>
                                )}
                                {sourceChainData && (
                                  <div className="min-w-fit h-6 flex items-center gap-x-1.5 mr-2">
                                    {sourceTxHash && (
                                      <Link
                                        href={`/gmp/${sourceTxHash}${sourceChainData.chain_type === 'cosmos' && c.id ? `?commandId=${c.id}` : ''}`}
                                        target="_blank"
                                        className="text-blue-600 dark:text-blue-500 font-medium"
                                      >
                                        GMP
                                      </Link>
                                    )}
                                    <Tooltip content={sourceChainData.name} className="whitespace-nowrap">
                                      <Image
                                        src={sourceChainData.image}
                                        alt=""
                                        width={20}
                                        height={20}
                                      />
                                    </Tooltip>
                                    {contractAddress && (
                                      <>
                                        <MdOutlineCode size={20} className="text-zinc-700 dark:text-zinc-300" />
                                        {destinationChainData && (
                                          <Tooltip content={destinationChainData.name} className="whitespace-nowrap">
                                            <Image
                                              src={destinationChainData.image}
                                              alt=""
                                              width={20}
                                              height={20}
                                            />
                                          </Tooltip>
                                        )}
                                        <Profile
                                          address={contractAddress}
                                          chain={chain}
                                          width={20}
                                          height={20}
                                        />
                                      </>
                                    )}
                                  </div>
                                )}
                                {type === 'mintToken' && (
                                  <div className="min-w-fit h-6 flex items-center gap-x-1.5 mr-2">
                                    <Link
                                      href={`/transfer?transferId=${transferID}`}
                                      target="_blank"
                                      className="text-blue-600 dark:text-blue-500 font-medium"
                                    >
                                      Transfer
                                    </Link>
                                    {account && (
                                      <>
                                        <MdOutlineCode size={20} className="text-zinc-700 dark:text-zinc-300" />
                                        <Profile
                                          address={account}
                                          chain={chain}
                                          width={20}
                                          height={20}
                                        />
                                      </>
                                    )}
                                  </div>
                                )}
                                {salt && (
                                  <div className="h-6 flex items-center gap-x-1.5 mr-2">
                                    <span className="text-zinc-400 dark:text-zinc-500">
                                      {deposit_address ? 'Deposit address' : 'Salt'}:
                                    </span>
                                    {deposit_address ?
                                      <Copy size={16} value={deposit_address}>
                                        <Link
                                          href={`/account/${deposit_address}`}
                                          target="_blank"
                                          className="text-zinc-400 dark:text-zinc-500"
                                        >
                                          {ellipse(deposit_address, 6, '0x')}
                                        </Link>
                                      </Copy> :
                                      <Copy size={16} value={salt}>
                                        <span className="text-zinc-400 dark:text-zinc-500">
                                          {ellipse(salt, 6, '0x')}
                                        </span>
                                      </Copy>
                                    }
                                  </div>
                                )}
                                {name && (
                                  <div className="flex flex-col mr-2">
                                    <span className="text-zinc-900 dark:text-zinc-100 text-xs font-medium">
                                      {name}
                                    </span>
                                    <div className="flex items-center gap-x-2">
                                      {decimals > 0 && (
                                        <Number
                                          value={decimals}
                                          prefix="Decimals: "
                                          className="text-zinc-400 dark:text-zinc-500 text-xs"
                                        />
                                      )}
                                      {cap > 0 && (
                                        <Number
                                          value={cap}
                                          prefix="Cap: "
                                          className="text-zinc-400 dark:text-zinc-500 text-xs"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                                {newOwners && (
                                  <Number
                                    value={split(newOwners, { delimiter: ';' }).length}
                                    suffix={' New Owners'}
                                    className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 text-xs font-medium mr-2 px-2.5 py-1"
                                  />
                                )}
                                {newOperators && (
                                  <div className="flex items-center mr-2">
                                    <Number
                                      value={split(newOperators, { delimiter: ';' }).length}
                                      suffix={' New Operators'}
                                      className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 text-xs font-medium mr-2 px-2.5 py-1"
                                    />
                                    {newWeights && (
                                      <Number
                                        value={_.sum(split(newWeights, { delimiter: ';' }).map(w => toNumber(w)))}
                                        prefix="["
                                        suffix="]"
                                        className="text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                                      />
                                    )}
                                  </div>
                                )}
                                {newThreshold && (
                                  <Number
                                    value={newThreshold}
                                    prefix={'Threshold: '}
                                    className="text-xs font-medium mr-2"
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {created_at?.ms && moment(created_at.ms).format(TIME_FORMAT)}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{executed ? 'Signed Commands' : 'Execute Data'}</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {execute_data && (
                <div className="flex items-start gap-x-2">
                  <Tag className="bg-white dark:bg-zinc-800 break-all text-zinc-500 dark:text-zinc-500 font-sans px-3 py-3">
                    {ellipse(execute_data, 256)}
                  </Tag>
                  <Copy value={execute_data} className="mt-3" />
                </div>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Data</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {data?.data && (
                <div className="flex items-start gap-x-2">
                  <Tag className="bg-white dark:bg-zinc-800 break-all text-zinc-500 dark:text-zinc-500 font-sans px-3 py-3">
                    {ellipse(data.data, 256)}
                  </Tag>
                  <Copy value={data.data} className="mt-3" />
                </div>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{`Signature${signatures.length > 1 ? `s (${signatures.length})` : ''}`}</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                {signatures.map((d, i) => (
                  <Copy key={i} size={14} value={d}>
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs">
                      {ellipse(d, 8)}
                    </span>
                  </Copy>
                ))}
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

const EXECUTE_PERIOD_SECONDS = 5 * 60

export function EVMBatch({ chain, id }) {
  const [data, setData] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState(null)
  const { chains } = useGlobalStore()
  const { chainId, signer } = useEVMWalletStore()

  const { chain_id, gateway } = { ...getChainData(chain, chains) }

  const { commands, created_at, execute_data } = { ...data }
  const executed = commands && commands.length === commands.filter(c => c.executed).length

  useEffect(() => {
    const getData = async () => {
      const data = await getBatch(chain, id)

      console.log('[data]', data)
      setData(data)
    }

    getData()
  }, [chain, id, setData])

  // toast
  useEffect(() => {
    const { status, message, hash } = { ...response }
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
              <span className="text-zinc-700">
                {message}
              </span>
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
  }, [chain, response, chains])

  const execute = async () => {
    if (execute_data && signer) {
      setExecuting(true)
      setResponse({ status: 'pending', message: 'Executing...' })

      try {
        const { hash } = { ...await signer.sendTransaction({ to: gateway?.address, data: `0x${execute_data}` }) }

        setResponse({
          status: 'pending',
          message: 'Wait for Confirmation',
          hash,
        })

        const { status } = { ...hash && await signer.provider.waitForTransaction(hash) }

        setResponse({
          status: status ? 'success' : 'failed',
          message: status ? 'Execute successful' : 'Failed to execute',
          hash,
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }

      setExecuting(false)
    }
  }

  const executeButton = data?.status === 'BATCHED_COMMANDS_STATUS_SIGNED' && execute_data && !executed && timeDiff(created_at?.ms) > EXECUTE_PERIOD_SECONDS && (
    <div className="flex items-center gap-x-2">
      {signer && chain_id === chainId && (
        <button
          disabled={executing}
          onClick={() => execute()}
          className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', executing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
        >
          Execut{executing ? 'ing...' : 'e'}
        </button>
      )}
      {!executing && <EVMWallet connectChainId={chain_id} />}
    </div>
  )

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="max-w-5xl">
          <Toaster />
          <Info
            data={data}
            chain={chain}
            id={id}
            executeButton={executeButton}
          />
        </div>
      }
    </Container>
  )
}
