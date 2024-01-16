'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import { MdOutlineCode, MdOutlineRefresh } from 'react-icons/md'

import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import Image from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile } from '@/components/Profile'
import { TimeAgo } from '@/components/Time'
import { getParams, getQueryString, Pagination } from '@/components/Pagination'
import { useGlobalStore } from '@/app/providers'
import { searchBatches } from '@/lib/api/token-transfer'
import { getChainData, getAssetData } from '@/lib/config'
import { split, toArray } from '@/lib/parser'
import { toBoolean, ellipse } from '@/lib/string'
import { toNumber, formatUnits } from '@/lib/number'

const size = 25
const NUM_COMMANDS_TRUNCATE = 10

function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = getParams(searchParams, size)

  return
}

export function EVMBatches() {
  const searchParams = useSearchParams()
  const [params, setParams] = useState(null)
  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [refresh, setRefresh] = useState(null)
  const { chains, assets } = useGlobalStore()

  useEffect(() => {
    const _params = getParams(searchParams, size)
    if (!_.isEqual(_params, params)) setParams(_params)
  }, [searchParams, params, setParams])

  useEffect(() => {
    const getData = async () => {
      if (params && toBoolean(refresh)) {
        const { data, total } = { ...await searchBatches({ ...params, size }) }
        setData(toArray(data))
        setTotal(total)
        setRefresh(false)
      }
    }
    getData()
  }, [params, setData, setTotal, refresh, setRefresh])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div>
          <div className="flex items-center justify-between gap-x-4">
            <div className="sm:flex-auto">
              <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">EVM Batches</h1>
              <p className="mt-2 text-zinc-400 dark:text-zinc-500 text-sm">
                <Number value={total} suffix={` result${total > 1 ? 's' : ''}`} /> 
              </p>
            </div>
            <div className="flex items-center gap-x-2">
              {refresh ? <Spinner /> :
                <Button
                  color="default"
                  circle
                  onClick={() => setRefresh(true)}
                >
                  <MdOutlineRefresh size={20} />
                </Button>
              }
            </div>
          </div>
          <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-4">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                  <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
                    ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Chain
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Commands
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right">
                    Status
                  </th>
                  <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.map(d => {
                  const chainData = getChainData(d.chain, chains)
                  const { url, transaction_path } = { ...chainData?.explorer }
                  const executed = toArray(d.commands).length === toArray(d.commands).filter(c => c.executed).length
                  const status = executed ? 'executed' : d.status?.replace('BATCHED_COMMANDS_STATUS_', '').toLowerCase()

                  return (
                    <tr key={d.batch_id} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                      <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                        <div className="flex flex-col gap-y-0.5">
                          <Copy value={d.batch_id}>
                            <Link
                              href={`/evm-batch/${d.chain}/${d.batch_id}`}
                              target="_blank"
                              className="text-blue-600 dark:text-blue-500 font-semibold"
                            >
                              {ellipse(d.batch_id)}
                            </Link>
                          </Copy>
                          <Copy value={d.key_id}>
                            {d.key_id}
                          </Copy>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        {chainData && (
                          <div className="min-w-max flex items-center gap-x-2">
                            <Image
                              src={chainData.image}
                              width={24}
                              height={24}
                            />
                            <span className="text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                              {chainData.name}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-3">
                          {_.slice(toArray(d.commands), 0, NUM_COMMANDS_TRUNCATE).map((c, i) => {
                            const { type, deposit_address } = { ...c }
                            const { amount, name, cap, account, salt, newOwners, newOperators, newWeights, newThreshold, sourceChain, sourceTxHash, contractAddress } = { ...c.params }
                            let { symbol, decimals } = { ...c.params }

                            const transferID = parseInt(c.id, 16)
                            const assetData = getAssetData(symbol, assets)
                            const tokenData = assetData?.addresses?.[d.chain]
                            symbol = tokenData?.symbol || assetData?.symbol || symbol
                            decimals = tokenData?.decimals || assetData?.decimals || decimals || 18
                            const image = tokenData?.image || assetData?.image

                            const sourceChainData = getChainData(sourceChain, chains)
                            const typeElement = (
                              <Tooltip content={c.executed ? 'Executed' : 'Unexecuted'}>
                                <Tag className={clsx('w-fit capitalize mr-2', c.executed ? 'bg-green-600 dark:bg-green-500' : 'bg-orange-500 dark:bg-orange-600')}>
                                  {type}
                                </Tag>
                              </Tooltip>
                            )

                            return (
                              <div key={i} className="flex lg:flex-wrap lg:items-center">
                                {url && c.transactionHash ?
                                  <Link href={`${url}${transaction_path?.replace('{tx}', c.transactionHash)}`} target="_blank">
                                    {typeElement}
                                  </Link> :
                                  typeElement
                                }
                                {symbol && !['approveContractCall'].includes(type) && (
                                  <div className="min-w-fit h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center gap-x-1.5 mr-2 px-2.5 py-1">
                                    {image && (
                                      <Image
                                        src={image}
                                        width={16}
                                        height={16}
                                      />
                                    )}
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
                                    <Tooltip content={sourceChainData.name} className="whitespace-nowrap">
                                      <Image
                                        src={sourceChainData.image}
                                        width={20}
                                        height={20}
                                      />
                                    </Tooltip>
                                    {sourceTxHash && (
                                      <Link
                                        href={`/gmp/${sourceTxHash}${sourceChainData.chain_type === 'cosmos' && c.id ? `?commandId=${c.id}` : ''}`}
                                        target="_blank"
                                        className="text-blue-600 dark:text-blue-500 font-medium"
                                      >
                                        GMP
                                      </Link>
                                    )}
                                    {contractAddress && (
                                      <>
                                        <MdOutlineCode size={20} className="text-zinc-700 dark:text-zinc-300" />
                                        <Profile
                                          address={contractAddress}
                                          chain={d.chain}
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
                                          chain={d.chain}
                                          width={20}
                                          height={20}
                                        />
                                      </>
                                    )}
                                  </div>
                                )}
                                {salt && (
                                  <div className="h-6 flex items-center gap-x-1.5 mr-2">
                                    <span className="text-slate-400 dark:text-slate-500">
                                      {deposit_address ? 'Deposit address' : 'Salt'}:
                                    </span>
                                    {deposit_address ?
                                      <Copy size={16} value={deposit_address}>
                                        <Link
                                          href={`/account/${deposit_address}`}
                                          target="_blank"
                                          className="text-slate-400 dark:text-slate-500"
                                        >
                                          {ellipse(deposit_address, 6, '0x')}
                                        </Link>
                                      </Copy> :
                                      <Copy size={16} value={salt}>
                                        <span className="text-slate-400 dark:text-slate-500">
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
                                      {decimals && (
                                        <Number
                                          value={decimals}
                                          prefix="Decimals: "
                                          className="text-zinc-400 dark:text-zinc-500 text-xs"
                                        />
                                      )}
                                      {cap && (
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
                            )
                          })}
                          {toArray(d.commands).length > NUM_COMMANDS_TRUNCATE && (
                            <Link
                              href={`/evm-batch/${d.chain}/${d.batch_id}`}
                              target="_blank"
                              className="w-fit bg-zinc-50 dark:bg-zinc-800 rounded text-blue-600 dark:text-blue-500 whitespace-nowrap px-2"
                            >
                              <Number
                                value={toArray(d.commands).length - NUM_COMMANDS_TRUNCATE}
                                prefix={'and '}
                                suffix={' more'}
                              />
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="flex flex-col items-end">
                          {status && (
                            <Tag className={clsx('w-fit capitalize', ['executed'].includes(status) ? 'bg-green-600 dark:bg-green-500' : ['signed'].includes(status) ? 'bg-orange-500 dark:bg-orange-600' : ['signing'].includes(status) ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-red-600 dark:bg-red-500')}>
                              {status}
                            </Tag>
                          )}
                        </div>
                      </td>
                      <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                        <TimeAgo timestamp={d.created_at?.ms} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {total > size && (
            <div className="flex items-center justify-center mt-8">
              <Pagination sizePerPage={size} total={total} />
            </div>
          )}
        </div>
      }
    </Container>
  )
}
