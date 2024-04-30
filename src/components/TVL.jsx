'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
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
  const { chains, assets, itsAssets, tvl } = useGlobalStore()

  useEffect(() => {
    if (chains && assets && itsAssets && tvl?.data && tvl.data.length > (assets.length + itsAssets.length) / 2) {
      setData(_.orderBy(tvl.data.map((d, j) => {
        const { asset, assetType, total_on_evm, total_on_cosmos, total } = { ...d }
        let { price } = { ...d }

        const assetData = assetType === 'its' ? getITSAssetData(asset, itsAssets) : getAssetData(asset, assets)
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
  const chainsTVL = !loading && _.orderBy(_.uniqBy(chains.filter(d => !d.no_inflation && !d.no_tvl).map(d => {
    return {
      ...d,
      total_value: _.sumBy(data.map(_d => {
        const { supply, total } = { ..._d.tvl?.[d.id] }
        return { ..._d, value: toNumber((supply || total) * _d.price) }
      }).filter(d => d.value > 0), 'value'),
    }
  }), 'id'), ['total_value'], ['desc'])

  return (
    <Container className={clsx(!loading ? 'max-w-none sm:mt-0 lg:-mt-4' : 'sm:mt-8')}>
      {loading ? <Spinner /> :
        <div className="overflow-x-auto lg:overflow-x-visible -mx-4">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="sticky top-0 z-20 bg-white dark:bg-zinc-900">
              <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                <th scope="col" className="px-3 py-4 text-left">
                  Asset
                </th>
                <th scope="col" className="px-3 py-4 text-left whitespace-nowrap">
                  Native Chain
                </th>
                <th scope="col" className="px-3 py-4 text-right">
                  <div className="flex flex-col items-end gap-y-0.5">
                    <span className="whitespace-nowrap">Total Locked</span>
                    <Number
                      value={_.sumBy(data.filter(d => d.value > 0), 'value')}
                      format="0,0.00a"
                      prefix="$"
                      noTooltip={true}
                      className="text-green-600 dark:text-green-500 text-xs"
                    />
                  </div>
                </th>
                <th scope="col" className="px-3 py-4 text-right">
                  <div className="flex flex-col items-end gap-y-0.5">
                    <span className="whitespace-nowrap">Moved to EVM</span>
                    <Number
                      value={_.sumBy(data.filter(d => d.value_on_evm > 0), 'value_on_evm')}
                      format="0,0.00a"
                      prefix="$"
                      noTooltip={true}
                      className="text-green-600 dark:text-green-500 text-xs"
                    />
                  </div>
                </th>
                <th scope="col" className="px-3 py-4 text-right">
                  <div className="flex flex-col items-end gap-y-0.5">
                    <span className="whitespace-nowrap">Moved to Cosmos</span>
                    <Number
                      value={_.sumBy(data.filter(d => d.value_on_cosmos > 0), 'value_on_cosmos')}
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
                        <span className="whitespace-nowrap">{d.name}</span>
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
              {data.filter(d => d.assetData).map(d => (
                <tr key={d.asset} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                  <td className="sticky left-0 z-10 backdrop-blur backdrop-filter px-3 py-4 text-left">
                    <div className="flex flex-items-center gap-x-2">
                      <AssetProfile value={d.asset} ITSPossible={d.assetType === 'its'} titleClassName="font-bold" />
                      {d.assetType === 'its' && <Tag className="w-fit bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">ITS</Tag>}
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
                          className={clsx('text-xs font-semibold', !url && 'text-zinc-700 dark:text-zinc-300')}
                        />
                      )

                      return (
                        <div key={d.asset} className="flex flex-col items-end gap-y-0.5">
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
                          {d.value > 0 && (
                            <Number
                              value={d.value}
                              format="0,0.0a"
                              prefix="$"
                              className="text-zinc-400 dark:text-zinc-500 text-xs font-medium"
                            />
                          )}
                        </div>
                      )
                    })}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex flex-col items-end gap-y-0.5">
                      <Number
                        value={d.total_on_evm}
                        format="0,0.0a"
                        suffix={` ${d.assetData.symbol}`}
                        className="text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                      />
                      {d.value_on_evm > 0 && (
                        <Number
                          value={d.value_on_evm}
                          format="0,0.0a"
                          prefix="$"
                          className="text-zinc-400 dark:text-zinc-500 text-xs font-medium"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex flex-col items-end gap-y-0.5">
                      <Number
                        value={d.total_on_cosmos}
                        format="0,0.0a"
                        suffix={` ${d.assetData.symbol}`}
                        className="text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                      />
                      {d.value_on_cosmos > 0 && (
                        <Number
                          value={d.value_on_cosmos}
                          format="0,0.0a"
                          prefix="$"
                          className="text-zinc-400 dark:text-zinc-500 text-xs font-medium"
                        />
                      )}
                    </div>
                  </td>
                  {chainsTVL.map(c => {
                    const { supply, total, url } = { ...d.tvl?.[c.id] }
                    const amount = supply || total
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
