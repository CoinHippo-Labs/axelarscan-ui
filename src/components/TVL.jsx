'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import { PiInfo } from 'react-icons/pi'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
import { Switch } from '@/components/Switch'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { ChainProfile, AssetProfile } from '@/components/Profile'
import { useGlobalStore } from '@/components/Global'
import { getChainData, getAssetData, getITSAssetData } from '@/lib/config'
import { toArray } from '@/lib/parser'
import { isNumber, toNumber } from '@/lib/number'

export function TVL() {
  const [data, setData] = useState(null)
  const [includeITS, setIncludeITS] = useState(true)
  const { chains, assets, itsAssets, tvl } = useGlobalStore()

  useEffect(() => {
    if (chains && assets && itsAssets && tvl?.data && tvl.data.length > (assets.length + itsAssets.length) / 2) {
      setData(_.orderBy(tvl.data.map((d, j) => {
        const { asset, assetType, total_on_evm, total_on_cosmos, total_on_contracts, total_on_tokens, total } = { ...d }
        let { price } = { ...d }

        const assetData = assetType === 'its' ? getITSAssetData(asset, itsAssets) : getAssetData(asset, assets) || (total_on_contracts > 0 || total_on_tokens > 0 ? { ...Object.values({ ...d.tvl }).find(d => d.contract_data?.is_custom)?.contract_data } : undefined)
        price = toNumber(isNumber(price) ? price : isNumber(assetData?.price) ? assetData.price : -1)

        return {
          ...d,
          i: asset === 'uaxl' ? -1 : 0,
          j,
          assetData,
          value_on_evm: toNumber(total_on_evm) * price,
          value_on_cosmos: toNumber(total_on_cosmos) * price,
          value: toNumber(total) * price,
          nativeChain: _.head(Object.entries({ ...d.tvl }).filter(([k, v]) => toArray([v.contract_data, v.denom_data]).findIndex(d => d.is_native || d.native_chain === k) > -1).map(([k, v]) => ({ chain: k, chainData: getChainData(k, chains), ...v }))),
        }
      }), ['i', 'value', 'total', 'j'], ['asc', 'desc', 'desc', 'asc']))
    }
  }, [chains, assets, itsAssets, tvl, setData])

  const loading = !(data && assets && data.length >= assets.filter(d => !d.no_tvl).length - 3)
  const filteredData = toArray(data).filter(d => includeITS || d.assetType !== 'its')

  const chainsTVL = !loading && _.orderBy(_.uniqBy(chains.filter(d => !d.no_inflation && !d.no_tvl && (d.chain_type !== 'vm' || filteredData.filter(_d => _d.tvl?.[d.id]).length > 0)).map(d => ({
    ...d,
    total_value: _.sumBy(filteredData.map(_d => {
      const { supply, total } = { ..._d.tvl?.[d.id] }
      const isLockUnlock = _d.assetType === 'its' && Object.values({ ..._d.tvl }).findIndex(d => d.contract_data.token_manager_type?.startsWith('lockUnlock')) < 0

      let { price } = { ..._d }

      if (!isLockUnlock && !price) {
        const assetData = _d.assetType === 'its' ? getITSAssetData(_d.asset, itsAssets) : getAssetData(_d.asset, assets)
        price = toNumber(isNumber(assetData?.price) ? assetData.price : 0)
      }

      return {
        ..._d,
        value: isLockUnlock ? 0 : toNumber((supply || total) * price),
      }
    }).filter(d => d.value > 0), 'value'),
  })), 'id'), ['total_value'], ['desc'])

  return (
    <Container className={clsx(!loading ? 'max-w-none sm:mt-0 lg:-mt-4' : 'sm:mt-8')}>
      {loading ? <Spinner /> :
        <div className="overflow-x-auto lg:overflow-x-visible -mx-4">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="sticky top-0 z-20 bg-white dark:bg-zinc-900">
              <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                <th scope="col" className="px-3 py-4 text-left">
                  <div className="flex flex-col gap-y-0.5">
                    <span className="whitespace-nowrap">
                      Asset
                    </span>
                    <Switch
                      value={includeITS}
                      onChange={v => setIncludeITS(v)}
                      title="Including ITS"
                      groupClassName="!gap-x-1.5"
                      outerClassName="!h-4 !w-8"
                      innerClassName="!h-3 !w-3"
                      labelClassName="h-4 flex items-center"
                      titleClassName={clsx('text-xs !font-normal', !includeITS && '!text-zinc-400 dark:!text-zinc-500')}
                    />
                  </div>
                </th>
                <th scope="col" className="whitespace-nowrap px-3 py-4 text-left">
                  <div className="flex flex-col gap-y-0.5">
                    <span className="whitespace-nowrap">
                      Native Chain
                    </span>
                    <div className="h-4" />
                  </div>
                </th>
                <th scope="col" className="px-3 py-4 text-right">
                  <div className="flex flex-col items-end gap-y-0.5">
                    <span className="whitespace-nowrap">
                      Total Locked
                    </span>
                    <Number
                      value={_.sumBy(filteredData.filter(d => d.value > 0), 'value')}
                      format="0,0.00a"
                      prefix="$"
                      noTooltip={true}
                      className="text-green-600 dark:text-green-500 text-xs"
                    />
                  </div>
                </th>
                <th scope="col" className="px-3 py-4 text-right">
                  <div className="flex flex-col items-end gap-y-0.5">
                    <span className="whitespace-nowrap">
                      Moved to EVM
                    </span>
                    <Number
                      value={_.sumBy(filteredData.filter(d => d.value_on_evm > 0), 'value_on_evm')}
                      format="0,0.00a"
                      prefix="$"
                      noTooltip={true}
                      className="text-green-600 dark:text-green-500 text-xs"
                    />
                  </div>
                </th>
                <th scope="col" className="px-3 py-4 text-right">
                  <div className="flex flex-col items-end gap-y-0.5">
                    <span className="whitespace-nowrap">
                      Moved to Cosmos
                    </span>
                    <Number
                      value={_.sumBy(filteredData.filter(d => d.value_on_cosmos > 0), 'value_on_cosmos')}
                      format="0,0.00a"
                      prefix="$"
                      noTooltip={true}
                      className="text-green-600 dark:text-green-500 text-xs"
                    />
                  </div>
                </th>
                {chainsTVL.map(d => (
                  <th key={d.id} scope="col" className="px-3 py-4 text-right">
                    <div className="flex flex-col items-end gap-y-0.5">
                      <div className="min-w-max flex items-center gap-x-1.5">
                        <Image
                          src={d.image}
                          alt=""
                          width={18}
                          height={18}
                        />
                        <span className="whitespace-nowrap">
                          {d.name}
                        </span>
                      </div>
                      <Number
                        value={d.total_value}
                        format="0,0.0a"
                        prefix="$"
                        noTooltip={true}
                        className="text-zinc-400 dark:text-zinc-500 text-xs font-medium"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredData.filter(d => d.assetData).map(d => (
                <tr key={d.asset} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                  <td className="sticky left-0 z-10 backdrop-blur backdrop-filter px-3 py-4 text-left">
                    <div className="flex flex-items-center gap-x-2">
                      <AssetProfile
                        value={d.asset}
                        customAssetData={d.assetData}
                        ITSPossible={d.assetType === 'its'}
                        titleClassName="font-bold"
                      />
                      {d.assetType === 'its' && (
                        <Tooltip content={Object.values({ ...d.tvl }).findIndex(d => d.token_manager_type?.startsWith('lockUnlock')) > -1 && !d.assetData.type?.includes('custom') ? 'canonical ITS token' : 'custom ITS token'} className="whitespace-nowrap">
                          <Tag className="w-fit bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                            ITS
                          </Tag>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-left">
                    <ChainProfile value={d.nativeChain?.chainData?.id} />
                  </td>
                  <td className="px-3 py-4 text-right">
                    {[d].map(d => {
                      const { url } = { ...d.nativeChain }

                      const element = (
                        <Number
                          value={d.total}
                          format="0,0.0a"
                          suffix={` ${d.assetData.symbol}`}
                          className={clsx('leading-4 text-sm font-semibold', !url && 'text-zinc-700 dark:text-zinc-300')}
                        />
                      )

                      const isLockUnlock = d.assetType === 'its' && Object.values({ ...d.tvl }).findIndex(d => d.contract_data.token_manager_type?.startsWith('lockUnlock')) < 0

                      return (
                        <div key={d.asset} className="flex flex-col items-end gap-y-1">
                          <div className="flex items-center space-x-1">
                            {url ?
                              <Link
                                href={url}
                                target="_blank"
                                className="contents text-blue-600 dark:text-blue-500"
                              >
                                {element}
                              </Link> :
                              element
                            }
                            {isLockUnlock && (
                              <Tooltip content="The circulating supply retrieved from CoinGecko used for TVL tracking." className="w-56 text-xs text-left">
                                <PiInfo className="text-zinc-400 dark:text-zinc-500 mb-0.5" />
                              </Tooltip>
                            )}
                          </div>
                          {d.value > 0 && (
                            <Number
                              value={d.value}
                              format="0,0.0a"
                              prefix="$"
                              className="leading-4 text-zinc-400 dark:text-zinc-500 text-sm font-medium"
                            />
                          )}
                        </div>
                      )
                    })}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex flex-col items-end gap-y-1">
                      <Number
                        value={d.total_on_evm}
                        format="0,0.0a"
                        suffix={` ${d.assetData.symbol}`}
                        className="leading-4 text-zinc-700 dark:text-zinc-300 text-sm font-semibold"
                      />
                      {d.value_on_evm > 0 && (
                        <Number
                          value={d.value_on_evm}
                          format="0,0.0a"
                          prefix="$"
                          className="leading-4 text-zinc-400 dark:text-zinc-500 text-sm font-medium"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex flex-col items-end gap-y-1">
                      <Number
                        value={d.total_on_cosmos}
                        format="0,0.0a"
                        suffix={` ${d.assetData.symbol}`}
                        className="leading-4 text-zinc-700 dark:text-zinc-300 text-sm font-semibold"
                      />
                      {d.value_on_cosmos > 0 && (
                        <Number
                          value={d.value_on_cosmos}
                          format="0,0.0a"
                          prefix="$"
                          className="leading-4 text-zinc-400 dark:text-zinc-500 text-sm font-medium"
                        />
                      )}
                    </div>
                  </td>
                  {chainsTVL.map(c => {
                    const { escrow_balance, supply, total, url, custom_contracts_balance, custom_tokens_supply } = { ...d.tvl?.[c.id] }
                    const amount = (isNumber(escrow_balance) && c.id !== 'axelarnet' ? escrow_balance : supply) || total
                    const value = amount * d.price

                    const element = (
                      <Number
                        value={amount}
                        format="0,0.0a"
                        className={clsx('text-xs font-semibold', !url && 'text-zinc-700 dark:text-zinc-300')}
                      />
                    )

                    return (
                      <td key={c.id} className="px-3 py-4 text-right">
                        <div className="flex flex-col items-end gap-y-1">
                          <div className="flex flex-col items-end gap-y-0.5">
                            {url ?
                              <Link
                                href={url}
                                target="_blank"
                                className="contents text-blue-600 dark:text-blue-500"
                              >
                                {element}
                              </Link> :
                              element
                            }
                            {value > 0 && (
                              <Number
                                value={value}
                                format="0,0.0a"
                                prefix="$"
                                className="text-zinc-400 dark:text-zinc-500 text-xs font-medium"
                              />
                            )}
                          </div>
                          {toArray(_.concat(custom_contracts_balance, custom_tokens_supply)).map((c, i) => {
                            const { balance, supply, url } = { ...c }
                            const amount = isNumber(balance) ? balance : supply
                            const value = amount * d.price

                            const element = (
                              <Number
                                value={value}
                                format="0,0.0a"
                                prefix="+$"
                                className={clsx('!text-2xs font-semibold', !url && 'text-zinc-700 dark:text-zinc-300')}
                              />
                            )

                            return (
                              <div key={i} className="flex flex-col items-end">
                                {url ?
                                  <Link
                                    href={url}
                                    target="_blank"
                                    className="contents text-green-600 dark:text-green-500"
                                  >
                                    {element}
                                  </Link> :
                                  element
                                }
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </Container>
  )
}
