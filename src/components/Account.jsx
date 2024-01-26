'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight, MdArrowForwardIos } from 'react-icons/md'

import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import Image from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Spinner } from '@/components/Spinner'
import { Number } from '@/components/Number'
import { Profile, ChainProfile, AssetProfile } from '@/components/Profile'
import { TimeAgo } from '@/components/Time'
import { Transactions } from '@/components/Transactions'
import { useGlobalStore } from '@/app/providers'
import { getAccountAmounts } from '@/lib/api/axelarscan'
import { searchTransfers, searchDepositAddresses } from '@/lib/api/token-transfer'
import { getAssetData } from '@/lib/config'
import { getInputType, toArray } from '@/lib/parser'
import { includesStringList } from '@/lib/operator'
import { equalsIgnoreCase, ellipse } from '@/lib/string'
import { isNumber, toNumber } from '@/lib/number'

function DepositAddress({ data, address }) {
  const { depositAddressData, transferData } = { ...data }
  const { original_sender_chain, original_recipient_chain, sender_chain, recipient_chain, denom, sender_address, recipient_address } = { ...depositAddressData }
  const sourceChain = transferData?.send?.source_chain || sender_chain || original_sender_chain
  const destinationChain = recipient_chain || original_recipient_chain

  return (
    <div className="overflow-hidden h-fit bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          <Profile address={address} />
        </h3>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Source</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col">
                <ChainProfile value={sourceChain} />
                <Profile address={sender_address} chain={sender_chain} />
              </div>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Destination</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col">
                <ChainProfile value={destinationChain} />
                <Profile address={recipient_address} chain={recipient_chain} />
              </div>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Asset</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <AssetProfile value={denom} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Transfer</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {transferData ?
                <Copy value={transferData.send.txhash}>
                  <Link
                    href={`/transfer/${transferData.send.txhash}`}
                    target="_blank"
                    className="text-blue-600 dark:text-blue-500 font-medium"
                  >
                    {ellipse(transferData.send.txhash)}
                  </Link>
                </Copy> :
                '-'
              }
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function Info({ data, address }) {
  const { chains, validators } = useGlobalStore()

  const { rewards, commissions, delegations, redelegations, unbondings } = { ...data }
  const validatorData = toArray(validators).find(d => equalsIgnoreCase(d.delegator_address, address))

  return (
    <div className="overflow-hidden h-fit bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          <Profile address={address} />
        </h3>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {getInputType(address, chains) === 'axelarAddress' && (
            <>
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Rewards</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <div className="flex items-center">
                    {_.head(rewards?.total) && (
                      <Number
                        value={_.head(rewards.total).amount}
                        format="0,0.000000"
                        suffix=" AXL"
                        className="text-zinc-700 dark:text-zinc-300 font-medium"
                      />
                    )}
                  </div>
                </dd>
              </div>
              {validatorData && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Commissions</dt>
                  <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <div className="flex items-center">
                      {_.head(commissions) && (
                        <Number
                          value={_.head(commissions).amount}
                          format="0,0.000000"
                          suffix=" AXL"
                          className="text-zinc-700 dark:text-zinc-300 font-medium"
                        />
                      )}
                    </div>
                  </dd>
                </div>
              )}
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Delegations</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <div className="flex items-center">
                    {delegations?.data && (
                      <Number
                        value={_.sumBy(delegations.data, 'amount')}
                        format="0,0.000000"
                        suffix=" AXL"
                        className="text-zinc-700 dark:text-zinc-300 font-medium"
                      />
                    )}
                  </div>
                </dd>
              </div>
              {redelegations?.data && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Redelegations</dt>
                  <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <div className="flex items-center">
                      <Number
                        value={_.sumBy(redelegations.data, 'amount')}
                        format="0,0.000000"
                        suffix=" AXL"
                        className="text-zinc-700 dark:text-zinc-300 font-medium"
                      />
                    </div>
                  </dd>
                </div>
              )}
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Unstakings</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <div className="flex items-center">
                    {unbondings?.data && (
                      <Number
                        value={_.sumBy(unbondings.data, 'amount')}
                        format="0,0.000000"
                        suffix=" AXL"
                        className="text-zinc-700 dark:text-zinc-300 font-medium"
                      />
                    )}
                  </div>
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}

const size = 10

function Pagination({ data, maxPage = 5, sizePerPage = 25, onChange }) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (page && onChange) onChange(page)
  }, [page, onChange])

  const half = Math.floor(toNumber(maxPage) / 2)
  const totalPage = Math.ceil(toNumber(data.length) / sizePerPage)
  const pages = _.range(page - half, page + half + 1).filter(p => p > 0 && p <= totalPage)
  const prev = _.min(_.range(_.head(pages) - maxPage, _.head(pages)).filter(p => p > 0))
  const next = _.max(_.range(_.last(pages) + 1, _.last(pages) + maxPage + 1).filter(p => p <= totalPage))

  return (
    <div className="flex items-center justify-center gap-x-1">
      {isNumber(prev) && (
        <Button
          color="none"
          onClick={() => setPage(prev)}
          className="!px-1"
        >
          <MdKeyboardDoubleArrowLeft size={18} />
        </Button>
      )}
      {pages.map(p => (
        <Button
          key={p}
          color={p === page ? 'blue' : 'default'}
          onClick={() => setPage(p)}
          className="!text-2xs !px-3 !py-1"
        >
          <Number value={p} />
        </Button>
      ))}
      {isNumber(next) && (
        <Button
          color="none"
          onClick={() => setPage(next)}
          className="!px-1"
        >
          <MdKeyboardDoubleArrowRight size={18} />
        </Button>
      )}
    </div>
  )
}

function Balances({ data }) {
  const [page, setPage] = useState(1)
  const { assets } = useGlobalStore()

  const total = data.length
  return (
    <div className="bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg flex flex-col px-4 sm:px-6 pt-3 pb-6">
      <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0">
        <h3 className="text-sm font-semibold">Balances</h3>
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
          <thead className="sticky top-0 z-10">
            <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
              <th scope="col" className="pl-4 sm:pl-0 pr-3 py-2 text-left">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Asset
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Balance
              </th>
              <th scope="col" className="pl-3 pr-4 sm:pr-0 py-2 text-right">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.filter((d, i) => i >= (page - 1) * size && i < page * size).map((d, i) => {
              const { symbol, image, price } = { ...getAssetData(d.denom, assets) }
              return (
                <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                  <td className="pl-4 sm:pl-0 pr-3 py-4 text-left text-xs">
                    {((page - 1) * size) + i + 1}
                  </td>
                  <td className="px-3 py-4 text-left">
                    <div className="w-fit flex items-center gap-x-2">
                      {image && (
                        <Image
                          src={image}
                          width={16}
                          height={16}
                        />
                      )}
                      {(symbol || d.denom) && (
                        <div className="flex items-center gap-x-2">
                          <div className="flex items-center gap-x-1">
                            <span className="text-zinc-900 dark:text-zinc-100 text-xs font-medium">
                              {ellipse(symbol || d.denom, 6, 'ibc/')}
                            </span>
                            {!symbol && <Copy size={16} value={d.denom} />}
                          </div>
                          {price > 0 && (
                            <Number
                              value={price}
                              format="0,0.00"
                              maxDecimals={2}
                              prefix="$"
                              className="text-zinc-400 dark:text-zinc-500 text-xs"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex items-center justify-end">
                      <Number
                        value={d.amount}
                        format="0,0.00"
                        className="text-zinc-900 dark:text-zinc-100 text-xs font-semibold"
                      />
                    </div>
                  </td>
                  <td className="pl-3 pr-4 sm:pr-0 py-4 text-right">
                    <div className="flex items-center justify-end">
                      {price > 0 && (
                        <Number
                          value={d.amount * price}
                          format="0,0.00"
                          prefix="$"
                          noTooltip={true}
                          className="text-xs font-medium"
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
      {total > size && (
        <div className="flex items-center justify-center mt-4">
          <Pagination
            data={data}
            onChange={page => setPage(page)}
            sizePerPage={size}
          />
        </div>
      )}
    </div>
  )
}

function Delegations({ data }) {
  const tabs = ['delegations', 'redelegations', 'unstakings']
  const [tab, setTab] = useState(tabs[0])
  const [page, setPage] = useState(1)
  const { assets } = useGlobalStore()

  const { delegations, redelegations, unbondings } = { ...data }

  let _data
  switch (tab) {
    case 'delegations':
      _data = delegations?.data
      break
    case 'redelegations':
      _data = redelegations?.data
      break
    case 'unstakings':
      _data = unbondings?.data
      break
    default:
      break
  }

  const total = _data?.length
  return (
    <div className="bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg flex flex-col px-4 sm:px-6 pt-3 pb-6">
      <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0">
        <nav className="flex gap-x-4">
          {tabs.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                setTab(d)
                setPage(1)
              }}
              className={clsx('capitalize text-sm', d === tab ? 'text-zinc-900 dark:text-zinc-100 font-semibold underline' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 font-medium')}
            >
              {d}
            </button>
          ))}
        </nav>
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
          <thead className="sticky top-0 bg-zinc-50/75 dark:bg-zinc-800/25 z-10">
            <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
              <th scope="col" className="pl-4 sm:pl-0 pr-3 py-2 text-left">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Validator
              </th>
              <th scope="col" className={clsx('text-right', tab === 'unstakings' ? 'px-3 py-2' : 'pl-3 pr-4 sm:pr-0 py-2')}>
                Amount
              </th>
              {tab === 'unstakings' && (
                <th scope="col" className="pl-3 pr-4 sm:pr-0 py-2 text-right whitespace-nowrap">
                  Available at
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {toArray(_data).filter((d, i) => i >= (page - 1) * size && i < page * size).map((d, i) => {
              const { symbol, image, price } = { ...getAssetData(d.denom, assets) }
              return (
                <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                  <td className="pl-4 sm:pl-0 pr-3 py-4 text-left text-xs">
                    {((page - 1) * size) + i + 1}
                  </td>
                  <td className="px-3 py-4 text-left">
                    <div className="flex items-center gap-x-1.5">
                      <Profile i={i} address={tab === 'redelegations' ? d.validator_src_address : d.validator_address} width={16} height={16} className="text-xs" />
                      {tab === 'redelegations' && (
                        <>
                          <MdArrowForwardIos size={12} className="text-zinc-700 dark:text-zinc-300" />
                          <Profile i={i} address={d.validator_dst_address} width={16} height={16} className="text-xs" />
                        </>
                      )}
                    </div>
                  </td>
                  <td className={clsx('text-right', tab === 'unstakings' ? 'px-3 py-4' : 'pl-3 pr-4 sm:pr-0 py-4')}>
                    <div className="flex items-center justify-end">
                      <Number
                        value={d.amount}
                        format="0,0.00"
                        className="text-zinc-900 dark:text-zinc-100 text-xs font-semibold"
                      />
                    </div>
                  </td>
                  {tab === 'unstakings' && (
                    <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                      <TimeAgo timestamp={d.completion_time} className="text-xs" />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {total > size && (
        <div className="flex items-center justify-center mt-4">
          <Pagination
            data={_data}
            onChange={page => setPage(page)}
            sizePerPage={size}
          />
        </div>
      )}
    </div>
  )
}

export function Account({ address }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const { chains, assets, validators } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      if (address && chains && assets && validators) {
        if (['axelarvaloper', 'axelarvalcons'].findIndex(p => address.startsWith(p)) > -1) {
          const { operator_address } = { ...validators.find(d => includesStringList(address.toLowerCase(), [d.operator_address, d.consensus_address])) }
          router.push(`/validator/${operator_address}`)
        }
        else {
          const d = await getAccountAmounts({ address })

          if (d) {
            if (d.balances?.data) d.balances.data = _.orderBy(d.balances.data.map(d => {
              const { price } = { ...getAssetData(d.denom, assets) }
              return { ...d, value: price > 0 ? d.amount * price : 0 }
            }), ['value'], ['desc'])

            if (address.length >= 65 || getInputType(address, chains) === 'evmAddress') {
              const depositAddressData = _.head((await searchDepositAddresses({ address }))?.data)

              if (depositAddressData) {
                d.depositAddressData = depositAddressData
                const transferData = _.head((await searchTransfers({ depositAddress: address }))?.data)
                if (transferData) d.transferData = transferData
              }
            }

            console.log('[data]', d)
            setData(d)
          }
        }
      }
    }
    getData()
  }, [address, assets, validators, setData])

  const isDepositAddress = (address && (address.length >= 65 || getInputType(address, chains) === 'evmAddress')) || data?.depositAddressData

  return (
    <Container className={clsx('sm:mt-8', data ? 'max-w-full' : '')}>
      {!data ? <Spinner /> :
        <div className="grid sm:grid-cols-3 sm:gap-x-6 gap-y-8 sm:gap-y-12">
          {isDepositAddress ?
            <DepositAddress data={data} address={address} /> :
            <>
              <Info data={data} address={address} />
              <Balances data={data.balances?.data} />
              <Delegations data={data} />
            </>
          }
          <div className="sm:col-span-3 overflow-x-auto">
            <Transactions address={address} />
          </div>
        </div>
      }
    </Container>
  )
}
