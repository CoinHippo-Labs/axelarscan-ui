'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import { MdLocalGasStation } from 'react-icons/md'
import { PiRadioButtonFill } from 'react-icons/pi'

import { Container } from '@/components/Container'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Summary, SankeyChart } from '@/components/Interchain'
import { NetworkGraph } from '@/components/NetworkGraph'
import { useGlobalStore } from '@/components/Global'
import { getRPCStatus } from '@/lib/api/validator'
import { GMPStatsByChains, GMPStatsByContracts, GMPTotalVolume } from '@/lib/api/gmp'
import { transfersStats, transfersTotalVolume } from '@/lib/api/token-transfer'
import { getChainData } from '@/lib/config'
import { toArray } from '@/lib/parser'
import { find } from '@/lib/string'
import { isNumber, toNumber, formatUnits } from '@/lib/number'

function Metrics() {
  const [blockData, setBlockData] = useState(null)
  const { chains, validators, inflationData, networkParameters } = useGlobalStore()

  useEffect(() => {
    const getData = async () => setBlockData(await getRPCStatus({ avg_block_time: true }))

    getData()

    const interval = setInterval(() => getData(), 6 * 1000)
    return () => clearInterval(interval)
  }, [setBlockData])

  const { externalChainVotingInflationRate } = { ...inflationData }
  const evmRewardPercent = isNumber(externalChainVotingInflationRate) ? externalChainVotingInflationRate * 100 : 0.2

  const { symbol } = { ...getChainData('axelarnet', chains)?.native_token }

  return blockData && (
    <div className="w-full overflow-x-auto border border-zinc-100 dark:border-zinc-800 lg:inline-table">
      <div className="mx-auto w-full max-w-7xl flex items-center gap-x-3 px-4 py-3">
        {blockData.latest_block_height && (
          <div className="h-6 flex items-center gap-x-1.5">
            <div className="text-zinc-400 dark:text-zinc-300 text-xs whitespace-nowrap">
              Latest Block:
            </div>
            <Link
              href={`/block/${blockData.latest_block_height}`}
              target="_blank"
              className="flex items-center text-blue-600 dark:text-blue-500"
            >
              <Number value={blockData.latest_block_height} className="text-xs font-medium" />
            </Link>
            {blockData.avg_block_time && (
              <Number
                value={blockData.avg_block_time}
                prefix="("
                suffix="s)"
                className="text-zinc-400 dark:text-zinc-300 text-xs"
              />
            )}
          </div>
        )}
        <span className="text-zinc-200 dark:text-zinc-700">|</span>
        <div className="flex items-center gap-x-2.5">
          {toArray(validators).length > 0 && (
            <div className="h-6 flex items-center gap-x-1.5">
              <div className="text-zinc-400 dark:text-zinc-300 text-xs">
                Validators:
              </div>
              <Link
                href="/validators"
                target="_blank"
                className="flex items-center text-blue-600 dark:text-blue-500"
              >
                <Number value={validators.filter(d => d.status === 'BOND_STATUS_BONDED').length} className="text-xs font-medium" />
              </Link>
            </div>
          )}
          <div className="h-6 flex items-center gap-x-1.5">
            <div className="text-zinc-400 dark:text-zinc-300 text-xs">
              Threshold:
            </div>
            <Link
              href="https://axelar.network/blog/axelar-governance-explained"
              target="_blank"
              className="flex items-center text-blue-600 dark:text-blue-500"
            >
              <div className="hidden lg:block">
                <Tooltip content="Threshold number of quadratic voting power required to onboard a new EVM chain" className="whitespace-nowrap">
                  <Number
                    value={60}
                    prefix=">"
                    suffix="%"
                    className="text-xs font-medium"
                  />
                </Tooltip>
              </div>
              <div className="block lg:hidden">
                <div className="flex items-center">
                  <Number
                    value={60}
                    prefix=">"
                    suffix="%"
                    className="text-xs font-medium"
                  />
                </div>
              </div>
            </Link>
          </div>
          <div className="h-6 flex items-center gap-x-1.5">
            <div className="text-zinc-400 dark:text-zinc-300 text-xs">
              Rewards:
            </div>
            <Link
              href="https://axelar.network/blog/axelar-governance-explained"
              target="_blank"
              className="flex items-center text-blue-600 dark:text-blue-500"
            >
              <div className="hidden lg:block">
                <Tooltip content="Base inflation rate + Additional chain rewards" className="whitespace-nowrap">
                  <Number
                    value={evmRewardPercent}
                    prefix="1% base + "
                    suffix="% / EVM chain"
                    className="text-xs font-medium"
                  />
                </Tooltip>
              </div>
              <div className="block lg:hidden">
                <div className="flex items-center">
                  <Number
                    value={evmRewardPercent}
                    prefix="1% base + "
                    suffix="% / EVM chain"
                    className="text-xs font-medium"
                  />
                </div>
              </div>
            </Link>
          </div>
          <div className="h-6 flex items-center gap-x-1.5">
            <div className="flex items-center gap-x-1 text-zinc-400 dark:text-zinc-300 text-xs">
              <MdLocalGasStation size={16} />
              <span>Unit:</span>
            </div>
            <Link
              href="https://axelar.network/blog/axelar-governance-explained"
              target="_blank"
              className="flex items-center text-blue-600 dark:text-blue-500"
            >
              <div className="hidden lg:block">
                <Tooltip content="AXL gas fees per transaction" className="whitespace-nowrap">
                  <Number
                    value={0.007}
                    suffix=" uaxl"
                    className="text-xs font-medium"
                  />
                </Tooltip>
              </div>
              <div className="block lg:hidden">
                <div className="flex items-center">
                  <Number
                    value={0.007}
                    suffix=" uaxl"
                    className="text-xs font-medium"
                  />
                </div>
              </div>
            </Link>
          </div>
          <div className="h-6 flex items-center gap-x-1.5">
            <div className="flex items-center gap-x-1 text-zinc-400 dark:text-zinc-300 text-xs">
              <MdLocalGasStation size={16} />
              <span className="whitespace-nowrap">
                Per Transfer:
              </span>
            </div>
            <Link
              href="https://axelar.network/blog/axelar-governance-explained"
              target="_blank"
              className="flex items-center text-blue-600 dark:text-blue-500"
            >
              <div className="hidden lg:block">
                <Tooltip content="AXL gas fees per transaction" className="whitespace-nowrap">
                  <Number
                    value={0.0014}
                    suffix={` ${symbol}`}
                    className="text-xs font-medium"
                  />
                </Tooltip>
              </div>
              <div className="block lg:hidden">
                <div className="flex items-center">
                  <Number
                    value={0.0014}
                    suffix={` ${symbol}`}
                    className="text-xs font-medium"
                  />
                </div>
              </div>
            </Link>
          </div>
        </div>
        <span className="text-zinc-200 dark:text-zinc-700">|</span>
        {networkParameters?.bankSupply?.amount && networkParameters.stakingPool?.bonded_tokens && (
          <div className="h-6 flex items-center gap-x-1.5">
            <div className="text-zinc-400 dark:text-zinc-300 text-xs">
              Staked:
            </div>
            <Link
              href="/validators"
              target="_blank"
              className="flex items-center text-blue-600 dark:text-blue-500"
            >
              <Number
                value={formatUnits(networkParameters.stakingPool.bonded_tokens, 6)}
                format="0,0a"
                noTooltip={true}
                className="text-xs font-medium"
              />
              <Number
                value={formatUnits(networkParameters.bankSupply.amount, 6)}
                format="0,0.00a"
                prefix="/ "
                noTooltip={true}
                className="text-xs font-medium ml-1"
              />
            </Link>
          </div>
        )}
        {inflationData?.inflation > 0 && (
          <>
            {networkParameters?.bankSupply?.amount && networkParameters.stakingPool?.bonded_tokens && (
              <div className="h-6 flex items-center gap-x-1.5">
                <div className="text-zinc-400 dark:text-zinc-300 text-xs">
                  APR:
                </div>
                <Link
                  href="https://wallet.keplr.app/chains/axelar"
                  target="_blank"
                  className="flex items-center text-blue-600 dark:text-blue-500"
                >
                  <Number
                    value={inflationData.inflation * 100 * formatUnits(networkParameters.bankSupply.amount, 6) * (1 - inflationData.communityTax) * (1 - 0.05) / formatUnits(networkParameters.stakingPool.bonded_tokens, 6)}
                    suffix="%"
                    noTooltip={true}
                    className="text-xs font-medium"
                  />
                </Link>
              </div>
            )}
            <div className="h-6 flex items-center gap-x-1.5">
              <div className="text-zinc-400 dark:text-zinc-300 text-xs">
                Inflation:
              </div>
              <Link
                href="/validators"
                target="_blank"
                className="flex items-center text-blue-600 dark:text-blue-500"
              >
                <Number
                  value={inflationData.inflation * 100}
                  suffix="%"
                  noTooltip={true}
                  className="text-xs font-medium"
                />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const SANKEY_TABS = ['transactions', 'volume']

export function Overview() {
  const [data, setData] = useState(null)
  const [networkGraph, setNetworkGraph] = useState(null)
  const [chainFocus, setChainFocus] = useState(null)
  const [sankeyTab, setSankeyTab] = useState(SANKEY_TABS[0])
  const { chains, stats } = useGlobalStore()

  // stats
  useEffect(() => {
    const metrics = ['GMPStatsByChains', 'GMPStatsByContracts', 'GMPTotalVolume', 'transfersStats', 'transfersTotalVolume']

    const getData = async () => {
      if (chains) {
        setData(Object.fromEntries(await Promise.all(toArray(metrics.map(d => new Promise(async resolve => {
          switch (d) {
            case 'GMPStatsByChains':
              resolve([d, { ...(stats?.[d] || await GMPStatsByChains()) }])
              break
            case 'GMPStatsByContracts':
              resolve([d, { ...(stats?.[d] || await GMPStatsByContracts()) }])
              break
            case 'GMPTotalVolume':
              resolve([d, toNumber((stats?.[d] || await GMPTotalVolume()))])
              break
            case 'transfersStats':
              resolve([d, { ...(stats?.[d] || await transfersStats()) }])
              break
            case 'transfersTotalVolume':
              resolve([d, toNumber((stats?.[d] || await transfersTotalVolume()))])
              break
            default:
              resolve()
              break
          }
        }))))))
      }
    }

    getData()
  }, [setData, chains, stats])

  useEffect(() => {
    const getData = async () => {
      if (data) {
        const chainIdsLookup = {}

        setNetworkGraph(_.orderBy(
          Object.entries(
            _.groupBy(toArray(_.concat(
              (await Promise.all(['gmp', 'transfers'].map(d => new Promise(async resolve => {
                switch (d) {
                  case 'gmp':
                    resolve(toArray(data.GMPStatsByChains?.source_chains).flatMap(s => toArray(s.destination_chains).map(d => {
                      let sourceChain = chainIdsLookup[s.key] || getChainData(s.key, chains)?.id
                      chainIdsLookup[s.key] = sourceChain

                      if (!sourceChain) {
                        sourceChain = s.key
                      }

                      let destinationChain = chainIdsLookup[d.key] || getChainData(d.key, chains)?.id
                      chainIdsLookup[d.key] = destinationChain

                      if (!destinationChain) {
                        destinationChain = d.key
                      }

                      return {
                        id: toArray([sourceChain, destinationChain]).join('_'),
                        sourceChain,
                        destinationChain,
                        num_txs: d.num_txs,
                        volume: d.volume,
                      }
                    })))
                    break
                  case 'transfers':
                    resolve(toArray(data.transfersStats?.data).map(d => {
                      let sourceChain = chainIdsLookup[d.source_chain] || getChainData(d.source_chain, chains)?.id
                      chainIdsLookup[d.source_chain] = sourceChain

                      if (!sourceChain) {
                        sourceChain = d.source_chain
                      }

                      let destinationChain = chainIdsLookup[d.destination_chain] || getChainData(d.destination_chain, chains)?.id
                      chainIdsLookup[d.destination_chain] = destinationChain

                      if (!destinationChain) {
                        destinationChain = d.destination_chain
                      }

                      return {
                        id: toArray([sourceChain, destinationChain]).join('_'),
                        sourceChain,
                        destinationChain,
                        num_txs: d.num_txs,
                        volume: d.volume,
                      }
                    }))
                    break
                  default:
                    resolve()
                    break
                }
              })))).flatMap(d => d)
            )).filter(d => d.sourceChain && d.destinationChain), 'id')
          )
          .map(([k, v]) => ({
            ...v[0],
            id: k,
            num_txs: _.sumBy(v, 'num_txs'),
            volume: _.sumBy(v, 'volume'),
          })),
          ['num_txs'], ['desc'],
        ))
      }
    }

    getData()
  }, [data, setNetworkGraph, chains])

  const groupData = (data, by = 'key') => Object.entries(_.groupBy(toArray(data), by)).map(([k, v]) => ({
    key: v[0]?.key || k,
    num_txs: _.sumBy(v, 'num_txs'),
    volume: _.sumBy(v, 'volume'),
    chain: _.orderBy(toArray(_.uniq(toArray(by === 'customKey' ? v[0]?.chain : v.map(d => d.chain))).map(d => getChainData(d, chains))), ['i'], ['asc']).map(d => d.id),
  }))

  const chainPairs = groupData(_.concat(
    toArray(data?.GMPStatsByChains?.source_chains).flatMap(s => toArray(s.destination_chains)
      .filter(d => !chainFocus || find(chainFocus, [s.key, d.key]))
      .map(d => ({
        key: `${s.key}_${d.key}`,
        num_txs: d.num_txs,
        volume: d.volume,
      }))
    ),
    toArray(data?.transfersStats?.data)
      .filter(d => !chainFocus || find(chainFocus, [d.source_chain, d.destination_chain]))
      .map(d => ({
        key: `${d.source_chain}_${d.destination_chain}`,
        num_txs: d.num_txs,
        volume: d.volume,
      })),
  ))

  return (
    <>
      <Metrics />
      <Container className="mt-8">
        {!data ? <Spinner /> :
          <div className="flex flex-col gap-y-8">
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-x-4 gap-y-4 sm:gap-y-0">
                <h2 className="text-2xl font-semibold">
                  Cross-Chain Activity
                </h2>
                {chains && (
                  <Tag className="w-fit capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center gap-x-1.5">
                    <PiRadioButtonFill size={18} className="text-green-600 dark:text-green-500 mt-0.5 -ml-0.5" />
                    <span className="text-lg font-normal">
                      Connected chains: <span className="text-2xl font-medium ml-0.5">
                        {chains.filter(d => !d.deprecated && (!d.maintainer_id || d.gateway?.address)).length}
                      </span>
                    </span>
                  </Tag>
                )}
              </div>
              <Summary data={data} />
            </div>
            <div className="flex flex-col gap-y-4">
              <h2 className="text-2xl font-semibold">
                Network Graph
              </h2>
              <div className="grid lg:grid-cols-3 sm:justify-center lg:justify-end gap-y-8 lg:gap-y-0 lg:gap-x-4">
                <div className="lg:col-span-2">
                  <NetworkGraph
                    data={networkGraph}
                    hideTable={true}
                    setChainFocus={chain => setChainFocus(chain)}
                  />
                </div>
                <div className="max-w-xs sm:max-w-2xl lg:max-w-none flex sm:justify-center lg:justify-end">
                  <SankeyChart
                    data={chainPairs}
                    topN={40}
                    totalValue={sankeyTab === 'transactions' ? toNumber(_.sumBy(data.GMPStatsByChains?.source_chains, 'num_txs')) + toNumber(data.transfersStats?.total) : toNumber(data.GMPTotalVolume) + toNumber(data.transfersTotalVolume)}
                    field={sankeyTab === 'transactions' ? 'num_txs' : 'volume'}
                    title={<div className="max-w-xl flex flex-wrap items-center">
                      {SANKEY_TABS.map((d, i) => (
                        <div
                          key={i}
                          onClick={() => setSankeyTab(d)}
                          className={clsx(
                            'min-w-max capitalize flex items-center cursor-pointer font-medium whitespace-nowrap',
                            d === sankeyTab ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300',
                            i > 0 ? 'ml-4' : '',
                          )}
                        >
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>}
                    valuePrefix={sankeyTab === 'transactions' ? '' : '$'}
                    noBorder={true}
                    className="h-144"
                  />
                </div>
              </div>
            </div>
          </div>
        }
      </Container>
    </>
  )
}
